"""
Price guidance for a harvested lot: what it is worth today and whether to sell
now or hold.

This service combines a rule-based context score with the trained forecast
model when the model can safely produce an output:

    SECTION 1  Static reference price table (the old behaviour, honestly named).
    SECTION 2  Rule-based CONTEXT SCORER — weather + mandi demand/supply -> a
               price adjustment and a sell/hold recommendation. This is the new
               work and it is the part that runs today.
    SECTION 3  Trained ML model integration — a guarded XGBoost 7-period
               forecast, blended with the context-adjusted price only when
               the artifact and prediction pass their health/plausibility checks.
    SECTION 4  Orchestrator — `predict_crop_price()`. Ties the available
               signals together and identifies which ones were used.

Nothing in here invents a data source. When weather or arrivals are missing the
corresponding term is dropped and the response says so.
"""

from app.data.crop_weather_profiles import (
    SHELF_LIFE_MULTIPLIER,
    get_crop_weather_profile,
)
from app.services.weather_service import get_current_weather


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


# ======================================================================
# SECTION 1 — Static reference price table
# ======================================================================
#
# Hand-maintained ₹/kg reference points from historical Agmarknet modal prices.
# This is a lookup, not a forecast. It is the baseline the context scorer in
# SECTION 2 adjusts, and the fallback when no live rate is passed in.

BASE_REFERENCE_PRICES = {
    "Tomato": {"Nashik": 38.5, "Mumbai": 48.0, "Pune": 42.0, "Surat": 40.5, "Default": 35.0},
    "Potato": {"Nashik": 22.0, "Mumbai": 28.5, "Pune": 25.0, "Surat": 26.0, "Default": 22.0},
    "Onion": {"Nashik": 29.0, "Mumbai": 36.5, "Pune": 32.0, "Surat": 30.0, "Default": 28.0},
    "Rice": {"Nashik": 45.0, "Mumbai": 52.0, "Pune": 48.0, "Surat": 50.0, "Default": 45.0},
    "Wheat": {"Nashik": 32.0, "Mumbai": 38.0, "Pune": 35.0, "Surat": 36.0, "Default": 32.0},
    "Mango": {"Nashik": 85.0, "Mumbai": 125.0, "Pune": 105.0, "Surat": 110.0, "Default": 90.0},
    "Banana": {"Nashik": 30.0, "Mumbai": 40.0, "Pune": 36.0, "Surat": 38.0, "Default": 30.0},
    "Grapes": {"Nashik": 82.0, "Mumbai": 95.0, "Pune": 88.0, "Surat": 90.0, "Default": 85.0},
    "Soyabean": {"Nashik": 44.0, "Mumbai": 48.0, "Pune": 46.0, "Surat": 46.0, "Default": 45.0},
    "Maize": {"Nashik": 21.0, "Mumbai": 24.0, "Pune": 22.0, "Surat": 23.0, "Default": 21.0},
}

_DEFAULT_BASELINE_RS_PER_KG = 30.0


def reference_price(crop_type: str, city: str) -> dict:
    """Baseline ₹/kg for a crop/city from the static table. Always resolves."""
    crop_row = BASE_REFERENCE_PRICES.get(crop_type)
    if crop_row is None:
        # try case-insensitive
        for name, row in BASE_REFERENCE_PRICES.items():
            if name.lower() == str(crop_type).strip().lower():
                crop_row = row
                crop_type = name
                break

    if crop_row is None:
        return {
            "cropType": crop_type,
            "city": city,
            "referencePricePerKg": _DEFAULT_BASELINE_RS_PER_KG,
            "matched": False,
        }

    price = crop_row.get(city) or crop_row.get("Default") or _DEFAULT_BASELINE_RS_PER_KG
    return {
        "cropType": crop_type,
        "city": city,
        "referencePricePerKg": round(float(price), 2),
        "matched": city in crop_row,
    }


# ======================================================================
# SECTION 2 — Rule-based context scorer
# ======================================================================
#
# Two independent signals, then a combined recommendation:
#
#   weatherRiskScore   0..100  how hostile today's weather is to holding this
#                              crop (heat, cold, rain, humidity, wind), scaled
#                              by the crop's shelf-life tier.
#   sellPressureScore  0..100  from mandi arrivals vs a baseline. 50 = balanced,
#                              >50 = oversupply (prices soft, lean to sell),
#                              <50 = scarcity (lean to hold).
#
# Both feed `contextAdjustmentPct` (applied to the baseline price) and a
# SELL_NOW / SELL_SOON / HOLD / HOLD_STRONG call with plain-language reasons.

# How much of the weather risk turns into an expected quality discount at the
# gate, by shelf-life tier. A wet day costs a tomato grower far more than a
# wheat grower.
_WEATHER_DISCOUNT_WEIGHT = {"fast": 1.00, "medium": 0.55, "slow": 0.30}

# --- tunables, named once so the "working" section can quote them exactly ---
#
# Price adjustment: how strongly each signal moves the realizable ₹/kg.
_ADJ_MARKET_K = 0.08          # market pressure of 1.0 -> -8% on the baseline
_ADJ_WEATHER_K = 0.06         # weather risk of 1.0 -> -6% * tier weight
_ADJ_FLOOR, _ADJ_CEIL = -0.15, 0.12   # caps on the total adjustment

# Sell/hold call: weights on the urgency and hold sides of `netUrgency`.
_W_WEATHER_URGENCY = 0.55     # weather risk pushing toward selling
_W_MARKET_URGENCY = 0.45      # a soft/oversupplied market pushing toward selling
_W_BENIGN_HOLD = 0.30         # benign weather on a storable crop -> hold credit
_W_MARKET_HOLD = 0.60         # a firm/scarce market -> hold credit
_BENIGN_RISK_MAX = 0.15       # weather risk below this counts as "benign"

# netUrgency thresholds -> recommendation bucket.
_REC_THRESHOLDS = (
    ("SELL_NOW", 0.55),
    ("SELL_SOON", 0.25),
    ("HOLD", -0.15),
    ("HOLD_STRONG", None),     # anything lower
)


def score_weather_risk(crop_type: str, weather: dict) -> dict:
    """
    0..100 risk that today's weather degrades a harvested lot of `crop_type`
    before it can be sold. Returns available=False (and score None) when there
    is no usable weather reading.
    """
    profile = get_crop_weather_profile(crop_type)
    tier = profile["shelf_life_tier"]

    if not weather or not weather.get("available"):
        return {
            "available": False,
            "score": None,
            "reason": (weather or {}).get("reason", "no weather data"),
            "cropProfileMatched": profile["matched"],
            "shelfLifeTier": tier,
        }

    temp = weather.get("temperatureC")
    humidity = weather.get("humidityPct")
    wind = weather.get("windMps")
    rain_mm = weather.get("rain1hMm") or 0.0
    precipitating = bool(weather.get("isPrecipitating"))

    ideal_lo, ideal_hi = profile["ideal_temp_c"]
    heat_c = profile["heat_stress_c"]
    cold_c = profile["cold_stress_c"]

    reasons = []
    heat_term = cold_term = rain_term = humidity_term = wind_term = 0.0

    if temp is not None:
        if temp >= heat_c:
            heat_term = 0.45 * _clamp((temp - heat_c) / 8.0, 0.25, 1.0)
            reasons.append(f"{temp:.0f}°C is at or past the heat-stress point for {profile['cropType'] or crop_type} ({heat_c:.0f}°C)")
        elif temp > ideal_hi:
            heat_term = 0.15 * _clamp((temp - ideal_hi) / max(heat_c - ideal_hi, 1.0), 0.0, 1.0)
            reasons.append(f"{temp:.0f}°C is above the comfortable range (up to {ideal_hi:.0f}°C)")

        if temp <= cold_c:
            cold_term = 0.35 * _clamp((cold_c - temp) / 6.0, 0.25, 1.0)
            reasons.append(f"{temp:.0f}°C risks chilling injury (below {cold_c:.0f}°C)")
        elif temp < ideal_lo:
            cold_term = 0.10 * _clamp((ideal_lo - temp) / max(ideal_lo - cold_c, 1.0), 0.0, 1.0)

    if precipitating:
        intensity = _clamp(rain_mm / 5.0, 0.30, 1.0)  # any rain counts; 5 mm/h = full weight
        rain_term = profile["rain_penalty"] * intensity
        cond = weather.get("condition") or "rain"
        reasons.append(f"{cond.lower()} on an open lot ({rain_mm:.1f} mm/h) — moisture damage and grade loss")

    if humidity is not None and humidity > 70:
        humidity_term = profile["humidity_penalty"] * _clamp((humidity - 70) / 25.0, 0.0, 1.0)
        if temp is not None and temp > ideal_hi:
            humidity_term *= 1.30  # humid heat rots produce fastest
        if humidity_term > 0.03:
            reasons.append(f"humidity {humidity:.0f}% accelerates rot")

    if wind is not None and wind > 8:
        wind_term = profile["wind_penalty"] * _clamp((wind - 8) / 12.0, 0.0, 1.0)

    raw = heat_term + cold_term + rain_term + humidity_term + wind_term
    risk = _clamp(raw * SHELF_LIFE_MULTIPLIER[tier], 0.0, 1.0)

    if not reasons:
        reasons.append("weather is benign for holding this crop today")

    return {
        "available": True,
        "score": round(risk * 100.0, 1),
        "riskFraction": round(risk, 4),
        "shelfLifeTier": tier,
        "cropProfileMatched": profile["matched"],
        "components": {
            "heat": round(heat_term, 4),
            "cold": round(cold_term, 4),
            "rain": round(rain_term, 4),
            "humidity": round(humidity_term, 4),
            "wind": round(wind_term, 4),
        },
        "reasons": reasons,
    }


def score_demand_pressure(current_arrivals_qtl, baseline_arrivals_qtl) -> dict:
    """
    Pressure to sell from mandi supply. `current_arrivals_qtl` is today's total
    arrivals for the crop across reporting markets; `baseline_arrivals_qtl` is a
    typical/median day. Returns available=False when either is missing.

    pressure  in [-1, 1]:  +1 = heavy oversupply, -1 = severe scarcity.
    """
    try:
        current = float(current_arrivals_qtl)
        baseline = float(baseline_arrivals_qtl)
    except (TypeError, ValueError):
        return {"available": False, "score": None, "reason": "arrivals not supplied"}

    if baseline <= 0 or current < 0:
        return {"available": False, "score": None, "reason": "arrivals not usable"}

    ratio = current / baseline
    if ratio >= 1.0:
        pressure = _clamp((ratio - 1.0) / 1.0, 0.0, 1.0)   # 2x a normal day = full sell pressure
        direction = "oversupply"
    else:
        pressure = -_clamp((1.0 - ratio) / 0.6, 0.0, 1.0)  # 0.4x a normal day = full scarcity signal
        direction = "scarcity"

    pct = (ratio - 1.0) * 100.0
    if direction == "oversupply":
        reason = f"arrivals {ratio:.2f}x a normal day (+{pct:.0f}%) — prices soft, more lots coming"
    else:
        reason = f"arrivals {ratio:.2f}x a normal day ({pct:.0f}%) — thin supply supports a firmer price"

    return {
        "available": True,
        "score": round((pressure + 1.0) / 2.0 * 100.0, 1),  # 0..100, 50 = balanced
        "pressure": round(pressure, 4),
        "demandSupplyRatio": round(ratio, 3),
        "direction": direction,
        "reasons": [reason],
    }


def score_price_momentum(current_price_per_kg, trailing_avg_price_per_kg) -> dict:
    """
    Demand/supply proxy from the mandi's OWN recent modal prices — real
    Agmarknet history, no synthesised volume. Today's price well below its
    trailing average means a soft market (lean to sell before it slips
    further); well above means a firm market (lean to hold).

    Returns available=False when there is no trailing average to compare to.

    pressure in [-1, 1]:  +1 = price falling hard (sell), -1 = price surging (hold).
    """
    try:
        current = float(current_price_per_kg)
        trailing = float(trailing_avg_price_per_kg)
    except (TypeError, ValueError):
        return {"available": False, "score": None, "reason": "price history not supplied"}

    if trailing <= 0 or current <= 0:
        return {"available": False, "score": None, "reason": "price history not usable"}

    gap = (current - trailing) / trailing  # + = above average, - = below
    # +-15% off the trailing average = full-strength signal.
    pressure = -_clamp(gap / 0.15, -1.0, 1.0)
    direction = "softening" if gap < 0 else "firming"

    reason = (
        f"today's rate is {abs(gap) * 100:.0f}% "
        f"{'below' if gap < 0 else 'above'} its {trailing:.0f} ₹/kg recent average "
        f"— market is {direction}"
    )

    return {
        "available": True,
        "score": round((pressure + 1.0) / 2.0 * 100.0, 1),
        "pressure": round(pressure, 4),
        "priceVsTrailingPct": round(gap * 100.0, 1),
        "direction": direction,
        "reasons": [reason],
    }


_RECOMMENDATION_TEXT = {
    "SELL_NOW": "Sell now. Conditions are working against this lot.",
    "SELL_SOON": "Sell within a day or two — the odds get worse, not better.",
    "HOLD": "No rush. Holding a little longer is reasonable.",
    "HOLD_STRONG": "Hold. Conditions favour a better price soon.",
}


def build_context_advice(
    crop_type: str,
    baseline_price_per_kg: float,
    *,
    weather: dict | None = None,
    current_arrivals_qtl=None,
    baseline_arrivals_qtl=None,
    current_price_per_kg=None,
    trailing_avg_price_per_kg=None,
) -> dict:
    """
    Pure function: given a baseline price and whatever context is available,
    return the adjusted price, the sell/hold call, and every intermediate the
    caller might want to show its working.

    Two market signals feed the "demand/supply" side, either or both optional:
      - arrivals today vs a normal day   (score_demand_pressure)
      - today's rate vs its trailing avg (score_price_momentum) — real history
    They are averaged into one `marketPressure` in [-1, 1]: + = sell, - = hold.
    """
    weather_risk = score_weather_risk(crop_type, weather or {})
    arrivals = score_demand_pressure(current_arrivals_qtl, baseline_arrivals_qtl)
    momentum = score_price_momentum(current_price_per_kg, trailing_avg_price_per_kg)
    profile = get_crop_weather_profile(crop_type)
    tier = profile["shelf_life_tier"]

    _mp = [s["pressure"] for s in (arrivals, momentum) if s["available"]]
    market_pressure = sum(_mp) / len(_mp) if _mp else None

    # ---- price adjustment -------------------------------------------------
    # Each term is recorded as (label, value, explanation) so the `working`
    # section below can print the sum exactly as it was computed.
    adj = 0.0
    adj_parts = {}
    adj_terms = []

    if market_pressure is not None:
        supply_adj = -market_pressure * _ADJ_MARKET_K
        adj += supply_adj
        adj_parts["market"] = round(supply_adj, 4)
        adj_terms.append((
            "market", supply_adj,
            f"market pressure {market_pressure:+.2f} × {_ADJ_MARKET_K:.2f} = {supply_adj * 100:+.1f}%",
        ))

    if weather_risk["available"]:
        weather_adj = -weather_risk["riskFraction"] * _ADJ_WEATHER_K * _WEATHER_DISCOUNT_WEIGHT[tier]
        adj += weather_adj
        adj_parts["weatherQualityDiscount"] = round(weather_adj, 4)
        adj_terms.append((
            "weatherQualityDiscount", weather_adj,
            f"weather risk {weather_risk['riskFraction']:.2f} × {_ADJ_WEATHER_K:.2f} × "
            f"{_WEATHER_DISCOUNT_WEIGHT[tier]:.2f} ({tier}-perishing) = {weather_adj * 100:+.1f}%",
        ))

    adj_uncapped = adj
    adj = _clamp(adj, _ADJ_FLOOR, _ADJ_CEIL)
    adjusted_price = round(baseline_price_per_kg * (1.0 + adj), 2)

    # ---- sell / hold call --------------------------------------------------
    urgency = 0.0
    hold_signal = 0.0
    urgency_terms = []   # (label, value, explanation)
    hold_terms = []

    if weather_risk["available"]:
        u = weather_risk["riskFraction"] * _W_WEATHER_URGENCY
        urgency += u
        urgency_terms.append((
            "weather", u,
            f"weather risk {weather_risk['riskFraction']:.2f} × {_W_WEATHER_URGENCY:.2f}",
        ))
        if weather_risk["riskFraction"] < _BENIGN_RISK_MAX and tier != "fast":
            hold_signal += _W_BENIGN_HOLD
            hold_terms.append((
                "benignWeather", _W_BENIGN_HOLD,
                f"weather risk {weather_risk['riskFraction']:.2f} < {_BENIGN_RISK_MAX} on a "
                f"{tier}-perishing crop → +{_W_BENIGN_HOLD:.2f} to hold",
            ))

    if market_pressure is not None:
        if market_pressure > 0:
            u = market_pressure * _W_MARKET_URGENCY
            urgency += u
            urgency_terms.append((
                "market", u,
                f"market pressure {market_pressure:+.2f} (soft) × {_W_MARKET_URGENCY:.2f}",
            ))
        else:
            h = -market_pressure * _W_MARKET_HOLD
            hold_signal += h
            hold_terms.append((
                "market", h,
                f"market pressure {market_pressure:+.2f} (firm) × {_W_MARKET_HOLD:.2f}",
            ))

    net = urgency - hold_signal

    rec = "HOLD_STRONG"
    for name, floor in _REC_THRESHOLDS:
        if floor is None or net >= floor:
            rec = name
            break

    # ---- confidence — heuristic, based on how much context we actually had
    confidence = 0.40
    if weather_risk["available"]:
        confidence += 0.25
    if arrivals["available"]:
        confidence += 0.15
    if momentum["available"]:
        confidence += 0.10
    if profile["matched"]:
        confidence += 0.10
    confidence = round(min(confidence, 0.95), 2)

    reasons = []
    if weather_risk["available"]:
        reasons.extend(weather_risk["reasons"])
    else:
        reasons.append(f"weather not factored in ({weather_risk['reason']})")
    if arrivals["available"]:
        reasons.extend(arrivals["reasons"])
    if momentum["available"]:
        reasons.extend(momentum["reasons"])
    if not arrivals["available"] and not momentum["available"]:
        reasons.append("no mandi demand/supply signal available")

    working = _build_working(
        crop_type=crop_type,
        profile=profile,
        baseline_price=baseline_price_per_kg,
        weather_risk=weather_risk,
        arrivals=arrivals,
        momentum=momentum,
        market_pressure=market_pressure,
        adj_terms=adj_terms,
        adj_uncapped=adj_uncapped,
        adj=adj,
        adjusted_price=adjusted_price,
        urgency_terms=urgency_terms,
        hold_terms=hold_terms,
        urgency=urgency,
        hold_signal=hold_signal,
        net=net,
        rec=rec,
        confidence=confidence,
    )

    return {
        "engine": "rule-based context scorer v1",
        "recommendation": rec,
        "recommendationText": _RECOMMENDATION_TEXT[rec],
        "netUrgency": round(net, 3),
        "confidence": confidence,
        "confidenceBasis": "heuristic — share of context signals available, not a model probability",
        "baselinePricePerKg": round(baseline_price_per_kg, 2),
        "contextAdjustmentPct": round(adj * 100.0, 2),
        "contextAdjustmentParts": adj_parts,
        "contextAdjustedPricePerKg": adjusted_price,
        "weatherRisk": weather_risk,
        "marketPressure": round(market_pressure, 4) if market_pressure is not None else None,
        "arrivalsSignal": arrivals,
        "priceMomentumSignal": momentum,
        "reasons": reasons,
        # Full audit trail: how every number above was produced. See _build_working.
        "working": working,
        "sources": [s for s in (
            (weather or {}).get("source", "weather not supplied"),
            "mandi arrivals (caller-supplied)" if arrivals["available"] else None,
            "Agmarknet recent price history" if momentum["available"] else None,
            "KrishiFlow static reference price table",
        ) if s],
    }


# ---- transparency ------------------------------------------------------------


def _build_working(**k) -> dict:
    """
    A step-by-step audit trail for one `build_context_advice` call: the inputs
    that were available, every weighted term with its arithmetic, the two
    running totals, and which threshold the result fell into. Nothing here
    influences the recommendation — it only explains it.

    Returns:
        {
          "steps":       [ {n, title, inputs?, terms?, math, result}, ... ],
          "transcript":  ["Step 1 — ...", ...],   # flat, printable
          "weights":     { ...the tunables used... },
          "thresholds":  { bucket: rule },
        }
    """
    profile = k["profile"]
    tier = profile["shelf_life_tier"]
    steps = []

    # Step 1 — what we had to work with
    inputs = {
        "weather": "available" if k["weather_risk"]["available"]
        else f"missing ({k['weather_risk'].get('reason')})",
        "mandiArrivals": "available" if k["arrivals"]["available"] else "not supplied",
        "priceHistory": "available" if k["momentum"]["available"] else "not supplied",
        "cropProfile": "matched" if profile["matched"]
        else f"default (no profile for {k['crop_type']})",
    }
    steps.append({
        "n": 1, "title": "Inputs available", "inputs": inputs,
        "math": f"baseline price = ₹{k['baseline_price']:.2f}/kg",
        "result": f"crop treated as {tier}-perishing",
    })

    # Step 2 — weather risk
    if k["weather_risk"]["available"]:
        c = k["weather_risk"]["components"]
        nonzero = {name: v for name, v in c.items() if v}
        raw = sum(c.values())
        steps.append({
            "n": 2, "title": "Weather risk",
            "terms": [f"{name} +{v:.3f}" for name, v in nonzero.items()] or ["all components 0"],
            "math": f"Σ = {raw:.3f}, × {SHELF_LIFE_MULTIPLIER[tier]:.2f} ({tier} tier), "
                    f"clamped 0–1 → {k['weather_risk']['riskFraction']:.3f}",
            "result": f"weatherRiskScore = {k['weather_risk']['score']}/100",
        })
    else:
        steps.append({
            "n": 2, "title": "Weather risk", "terms": [],
            "math": "skipped — no weather reading",
            "result": "weatherRiskScore = n/a",
        })

    # Step 3 — market pressure (demand/supply)
    sig_bits = []
    if k["arrivals"]["available"]:
        sig_bits.append(f"arrivals {k['arrivals']['pressure']:+.2f}")
    if k["momentum"]["available"]:
        sig_bits.append(f"price-momentum {k['momentum']['pressure']:+.2f}")
    if k["market_pressure"] is not None:
        steps.append({
            "n": 3, "title": "Market pressure (demand/supply)",
            "terms": sig_bits,
            "math": f"mean of {len(sig_bits)} signal(s) = {k['market_pressure']:+.3f}  "
                    f"(+ = soft/sell, − = firm/hold)",
            "result": f"marketPressure = {k['market_pressure']:+.3f}",
        })
    else:
        steps.append({
            "n": 3, "title": "Market pressure (demand/supply)", "terms": [],
            "math": "skipped — no arrivals and no price history",
            "result": "marketPressure = n/a",
        })

    # Step 4 — price adjustment
    adj_lines = [expl for _, _, expl in k["adj_terms"]] or ["no context terms → 0%"]
    capped = "" if abs(k["adj_uncapped"] - k["adj"]) < 1e-9 else \
        f" (uncapped {k['adj_uncapped'] * 100:+.1f}%, capped to {_ADJ_FLOOR * 100:.0f}…{_ADJ_CEIL * 100:.0f}%)"
    steps.append({
        "n": 4, "title": "Price adjustment",
        "terms": adj_lines,
        "math": f"total {k['adj'] * 100:+.1f}%{capped} → "
                f"₹{k['baseline_price']:.2f} × {1 + k['adj']:.3f}",
        "result": f"contextAdjustedPrice = ₹{k['adjusted_price']:.2f}/kg",
    })

    # Step 5 — sell / hold call
    u_lines = [f"{expl} = {val:+.3f}" for _, val, expl in k["urgency_terms"]] or ["none"]
    h_lines = [f"{expl} = {val:+.3f}" for _, val, expl in k["hold_terms"]] or ["none"]
    threshold_hit = next(
        (f"≥ {floor:+.2f}" for name, floor in _REC_THRESHOLDS if name == k["rec"] and floor is not None),
        "below all thresholds",
    )
    steps.append({
        "n": 5, "title": "Sell / hold call",
        "terms": [f"urgency: {'; '.join(u_lines)}", f"hold: {'; '.join(h_lines)}"],
        "math": f"netUrgency = {k['urgency']:.3f} − {k['hold_signal']:.3f} = {k['net']:+.3f}; "
                f"{threshold_hit} → {k['rec']}",
        "result": f"{k['rec']} · confidence {k['confidence']}",
    })

    transcript = [
        f"Step {s['n']} — {s['title']}: {s['math']}  ⇒  {s['result']}"
        for s in steps
    ]

    return {
        "steps": steps,
        "transcript": transcript,
        "weights": {
            "priceAdj.marketK": _ADJ_MARKET_K,
            "priceAdj.weatherK": _ADJ_WEATHER_K,
            "priceAdj.tierWeight": _WEATHER_DISCOUNT_WEIGHT,
            "priceAdj.cap": [_ADJ_FLOOR, _ADJ_CEIL],
            "call.weatherUrgency": _W_WEATHER_URGENCY,
            "call.marketUrgency": _W_MARKET_URGENCY,
            "call.benignWeatherHold": _W_BENIGN_HOLD,
            "call.marketHold": _W_MARKET_HOLD,
        },
        "thresholds": {
            "SELL_NOW": "netUrgency ≥ 0.55",
            "SELL_SOON": "0.25 ≤ netUrgency < 0.55",
            "HOLD": "−0.15 ≤ netUrgency < 0.25",
            "HOLD_STRONG": "netUrgency < −0.15",
        },
        "disclaimer": "Rule-based heuristic, not a trained model. Every weight above "
                      "is a hand-set judgement call in price_service.py SECTION 2.",
    }


# ======================================================================
# SECTION 3 — Trained ML model
# ======================================================================
#
# A gradient-boosted (XGBoost) regressor predicting modal price ~7 reporting
# periods ahead, trained on the 2023–2025 Agmarknet archive for Maharashtra and
# five crops (Onion, Potato, Rice, Tomato, Wheat). Artifact and loader:
# app/services/forecast_model.py + app/models/mandi_price_model.pkl.
#
# The loader health-checks the pickle on first use. If it fails that check (the
# current artifact does — a version-portability issue lost its intercept),
# `model_available()` is False and SECTION 4 runs on the reference table +
# context scorer alone, exactly as before. See forecast_model.py for the fix.
#
# How the model folds in when healthy: it predicts a 7-period-ahead price; that
# is blended with the rule-based context-adjusted price via `blend_prices`
# (default weight 0.5). Both numbers, and which one is which, are in the
# response — the model never silently replaces the transparent path.

from app.services import forecast_model  # noqa: E402


def model_is_available() -> bool:
    return forecast_model.model_available()


def predict_price_model(features: dict) -> dict:
    """
    7-period-ahead modal price from the trained model, in ₹/kg.

    `features` needs at least: cropType, and either `historyPerKg` (list, ₹/kg,
    oldest→newest) to drive the lag features. `market`, `district`,
    `minPricePerKg`, `maxPricePerKg` sharpen it. Returns the forecast_model
    result dict (see that module); `available: False` with a reason when the
    model can't speak to this input.
    """
    return forecast_model.predict_modal_price_7d(
        commodity=features.get("cropType"),
        market=features.get("market"),
        district=features.get("district"),
        history_per_kg=features.get("historyPerKg") or [],
        min_price_per_kg=features.get("minPricePerKg"),
        max_price_per_kg=features.get("maxPricePerKg"),
        as_of=features.get("asOf"),
    )


def blend_prices(rule_price: float, model_price: float | None, model_weight: float) -> float:
    """
    Weighted blend of the rule-based price and the model price. `model_weight`
    is 0..1; 0 (the default when the model is unavailable) returns the rule
    price untouched.
    """
    if not model_price or model_weight <= 0.0:
        return rule_price
    w = _clamp(model_weight, 0.0, 1.0)
    return round(rule_price * (1.0 - w) + model_price * w, 2)


# ======================================================================
# SECTION 4 — Orchestrator
# ======================================================================


def predict_crop_price(
    crop_type: str,
    city: str,
    quantity_kg: float,
    *,
    latitude: float | None = None,
    longitude: float | None = None,
    live_price_per_kg: float | None = None,
    current_arrivals_qtl=None,
    baseline_arrivals_qtl=None,
    trailing_avg_price_per_kg: float | None = None,
    weather_override: dict | None = None,
    history_per_kg: list | None = None,
    market_name: str | None = None,
    district_name: str | None = None,
    min_price_per_kg: float | None = None,
    max_price_per_kg: float | None = None,
) -> dict:
    """
    Price guidance for one lot.

    Baseline price = the live mandi rate if the caller passes one, otherwise the
    SECTION 1 reference table. The SECTION 2 context scorer then adjusts it for
    weather and demand/supply and attaches a sell/hold call. The SECTION 3 model
    is not wired in (model_weight = 0).

    Backward compatible: the original keys (`predictedPricePerKg`,
    `confidenceScore`, `targetCity`) are still present.
    """
    ref = reference_price(crop_type, city)
    baseline_price = float(live_price_per_kg) if live_price_per_kg else ref["referencePricePerKg"]
    baseline_source = "live mandi rate (caller-supplied)" if live_price_per_kg else "static reference table"

    # Bulk-volume demand premium — a dedicated truckload commands a small premium.
    volume_premium = 0.05 if quantity_kg >= 5000 else (0.02 if quantity_kg >= 2000 else 0.0)
    baseline_price = round(baseline_price * (1.0 + volume_premium), 2)

    # Weather: use an override if given (tests / caller already has it), else
    # fetch from OpenWeather when we have coordinates.
    if weather_override is not None:
        weather = {"available": True, "source": "caller-supplied weather", **weather_override}
    elif latitude is not None and longitude is not None:
        weather = get_current_weather(latitude, longitude)
    else:
        weather = {"available": False, "reason": "no coordinates supplied", "source": "weather not requested"}

    advice = build_context_advice(
        crop_type,
        baseline_price,
        weather=weather,
        current_arrivals_qtl=current_arrivals_qtl,
        baseline_arrivals_qtl=baseline_arrivals_qtl,
        # momentum compares the raw market rate (pre volume premium) to its
        # recent trailing average.
        current_price_per_kg=live_price_per_kg or ref["referencePricePerKg"],
        trailing_avg_price_per_kg=trailing_avg_price_per_kg,
    )

    # SECTION 3 hook — folds the trained model in when it is healthy and has
    # enough history to work with. Falls straight through otherwise.
    model_weight = 0.0
    model_price = None
    model_block = {"status": "unavailable", "reason": forecast_model.model_status().get("reason")}

    if model_is_available() and history_per_kg:
        result = predict_price_model({
            "cropType": ref["cropType"],
            "market": market_name,
            "district": district_name,
            "historyPerKg": history_per_kg,
            "minPricePerKg": min_price_per_kg,
            "maxPricePerKg": max_price_per_kg,
        })
        if result.get("available"):
            model_price = result["predictedModalPricePerKg"]
            model_weight = 0.5
            model_block = {"status": "active", "blendWeight": model_weight, **result}
        else:
            model_block = {"status": "skipped", "reason": result.get("reason")}

    final_price = blend_prices(advice["contextAdjustedPricePerKg"], model_price, model_weight)
    method = "reference/live baseline + rule-based context adjustment"
    if model_weight > 0:
        method += f" + XGBoost 7-period forecast (blend {model_weight:.0%})"

    return {
        # --- original contract (kept) ---
        "cropType": ref["cropType"],
        "targetCity": city,
        "predictedPricePerKg": final_price,
        "confidenceScore": advice["confidence"],
        # --- what actually produced the number ---
        "method": method,
        "baselinePricePerKg": baseline_price,
        "baselineSource": baseline_source,
        "volumePremiumApplied": volume_premium,
        "contextAdjustedPricePerKg": advice["contextAdjustedPricePerKg"],
        "modelPricePerKg": model_price,
        "mlModel": model_block,
        # --- the context advice ---
        "context": advice,
        "recommendation": advice["recommendation"],
        "recommendationText": advice["recommendationText"],
    }
