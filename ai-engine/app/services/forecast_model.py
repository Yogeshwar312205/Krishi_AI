"""
The trained mandi-price forecast model — SECTION 3 of the price service.

What it predicts: modal price ~7 reporting periods ahead, in ₹/quintal, for one
(market, commodity) series. Trained on the Agmarknet daily archive
2023-06-06 → 2025-06-06, narrowed to **Maharashtra** and **five commodities**
(Onion, Potato, Rice, Tomato, Wheat). Training notebook and the original
artifact sit in ``app/models/``.

Artifacts, in load order
------------------------
1. ``mandi_price_model.ubj`` + ``mandi_price_model.meta.json`` — preferred.
   The booster in XGBoost's own portable format plus a plain-JSON sidecar
   (feature order, label-encoder classes, horizon). No joblib, no scikit-learn,
   no version roulette. Produced by ``scripts/export_price_model.py``.

2. ``mandi_price_model.pkl`` — the raw notebook output, used only if the pair
   above is missing. Loading it requires repairing the fitted intercept: the
   training run wrote ``base_score`` in array form (``[2.424006E3]``), which
   XGBoost 2.1.x cannot parse and silently resets to 0.5 — making every
   prediction ~₹2424/quintal too low, negative for the cheap crops. The true
   value is still in the pickle's bytes, so it is read back out and restored.

Everything degrades. A missing artifact, an unreadable one, an unknown crop, or
a model that fails the load-time health check all resolve to
``available: False`` with a reason attached — the caller falls back to the
rule-based path in ``price_service.py``. Nothing here raises.
"""

from __future__ import annotations

import json
import os
import re
import warnings
from datetime import date, datetime
from statistics import mean, pstdev

from app.core.config import settings

# Commodities the model was trained on (its commodity encoder classes).
MODEL_COMMODITIES = ("Onion", "Potato", "Rice", "Tomato", "Wheat")
MODEL_STATE = "Maharashtra"
HORIZON_PERIODS = 7

# The untrained XGBoost default. Seeing this as the *fitted* intercept on a
# regression booster means the value did not survive the load.
_UNTRAINED_BASE_SCORE = 0.5

# Largest 7-period move we will publish from the model.
#
# Mandi prices genuinely can move more than this in a week — but the model
# cannot tell us so reliably. Fed a price far below its training range (tomato
# at ₹8/kg against a training mean nearer ₹24) it regresses hard toward the
# intercept and returns +280%. A farmer shown "the rate triples this week" acts
# on it, so a prediction outside this band is withheld with its reason recorded
# rather than clamped into a number nothing supports.
MAX_PLAUSIBLE_CHANGE_PCT = 35.0

_model = None     # {"booster", "featureCols", "encoders", "nDaysAhead", ...}
_status = None    # {"loaded", "healthy", "reason", "artifact", ...}


# --------------------------------------------------------------------- paths


def _models_dir() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))


def _resolve(path: str) -> str:
    if os.path.isabs(path):
        return path
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.join(root, path)


# ------------------------------------------------------------------- loading


def _load_portable() -> tuple[dict | None, str | None]:
    """The .ubj + .meta.json pair. Returns (model, error)."""
    ubj = os.path.join(_models_dir(), "mandi_price_model.ubj")
    meta_path = os.path.join(_models_dir(), "mandi_price_model.meta.json")
    if not (os.path.exists(ubj) and os.path.exists(meta_path)):
        return None, "portable .ubj/.meta.json pair not present"

    try:
        import xgboost as xgb
        with open(meta_path, encoding="utf-8") as fh:
            meta = json.load(fh)
        booster = xgb.Booster()
        booster.load_model(ubj)
        return {
            "booster": booster,
            "featureCols": meta["featureCols"],
            "encoders": meta["encoders"],
            "nDaysAhead": meta.get("nDaysAhead", HORIZON_PERIODS),
            "artifact": "mandi_price_model.ubj",
            "baseScore": meta.get("baseScore"),
        }, None
    except Exception as e:  # noqa: BLE001
        return None, f"could not load .ubj: {e.__class__.__name__}: {e}"


def _recover_base_score_from_pickle(pkl_path: str) -> float | None:
    """
    Read the fitted intercept out of the pickle's embedded booster bytes.

    ``base_score`` appears in the UBJSON payload followed by a length-prefixed
    string — ``[2.424006E3]`` (array form) or ``5E-1`` (scalar). Anything other
    than the 0.5 default is the value the training run actually fitted.
    """
    try:
        raw = open(pkl_path, "rb").read()
    except OSError:
        return None

    values = []
    for m in re.finditer(rb"base_score", raw):
        hit = re.search(
            rb"\[?\s*(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*\]?",
            raw[m.end(): m.end() + 40],
        )
        if hit:
            try:
                values.append(float(hit.group(1)))
            except ValueError:
                pass

    fitted = [v for v in values if abs(v - _UNTRAINED_BASE_SCORE) > 1e-9]
    return max(fitted) if fitted else None


def _load_pickle() -> tuple[dict | None, str | None]:
    """The original joblib bundle, with the intercept repaired."""
    pkl = _resolve(settings.PRICE_MODEL_PATH)
    if not os.path.exists(pkl):
        return None, f"model file not found at {pkl}"

    try:
        import joblib
        with warnings.catch_warnings():
            # Cross-version unpickle chatter from sklearn/xgboost is expected
            # and handled by the health check; don't spam the server log.
            warnings.simplefilter("ignore")
            bundle = joblib.load(pkl)
    except Exception as e:  # noqa: BLE001
        return None, f"could not load pickle: {e.__class__.__name__}: {e}"

    missing = [k for k in ("model", "encoders", "feature_cols") if k not in bundle]
    if missing:
        return None, f"bundle missing keys: {missing}"

    booster = bundle["model"].get_booster()

    # Repair the intercept: explicit override first, else recover from the file.
    override = settings.PRICE_MODEL_BASE_SCORE.strip()
    repaired = None
    if override:
        try:
            repaired = float(override)
        except ValueError:
            repaired = None
    if repaired is None:
        repaired = _recover_base_score_from_pickle(pkl)
    if repaired is not None:
        try:
            booster.set_param({"base_score": repaired})
        except Exception:  # noqa: BLE001
            repaired = None

    return {
        "booster": booster,
        "featureCols": list(bundle["feature_cols"]),
        "encoders": {n: [str(c) for c in le.classes_] for n, le in bundle["encoders"].items()},
        "nDaysAhead": bundle.get("n_days_ahead", HORIZON_PERIODS),
        "artifact": os.path.basename(pkl),
        "baseScore": repaired,
        "interceptRepaired": repaired is not None,
    }, None


def _load() -> dict | None:
    global _model, _status
    if _status is not None:
        return _model

    model, err_portable = _load_portable()
    if model is None:
        model, err_pickle = _load_pickle()
        if model is None:
            _status = {
                "loaded": False, "healthy": False,
                "reason": f"{err_portable}; {err_pickle}",
            }
            return None

    health = _health_check(model)
    _model = model if health["healthy"] else None
    _status = {
        **health,
        "loaded": True,
        "artifact": model["artifact"],
        "baseScore": model.get("baseScore"),
        "interceptRepaired": bool(model.get("interceptRepaired")),
    }
    return _model


# --------------------------------------------------------------- health check

# One plausible recent price level per crop, ₹/quintal, for the self-test.
_HEALTH_LEVELS = {"Onion": 2500.0, "Potato": 1400.0, "Rice": 3200.0, "Tomato": 2000.0, "Wheat": 2400.0}


def _health_check(model: dict) -> dict:
    """
    Predict a canned flat series per crop. A 7-period-ahead price model fed a
    flat history should land near that level; anything wildly outside means the
    artifact is not usable (the lost-intercept failure is what this catches).
    """
    try:
        bad = []
        for crop, level in _HEALTH_LEVELS.items():
            pred = _raw_predict(
                model, commodity=crop, market=None, district=None,
                history_qtl=[level] * 14,
                min_price_qtl=level * 0.9, max_price_qtl=level * 1.1,
                as_of=date(2025, 6, 1),
            )
            if pred is None or not (0.4 * level <= pred <= 2.5 * level):
                bad.append(f"{crop}: in≈{level:.0f} out={pred if pred is None else f'{pred:.0f}'}")

        if bad:
            return {
                "healthy": False,
                "reason": (
                    "predictions are out of range (" + "; ".join(bad) + "). The artifact's "
                    "fitted intercept did not survive loading — re-run "
                    "scripts/export_price_model.py, or set PRICE_MODEL_BASE_SCORE."
                ),
            }
        return {"healthy": True, "reason": "ok"}
    except Exception as e:  # noqa: BLE001
        return {"healthy": False, "reason": f"health check errored: {e.__class__.__name__}: {e}"}


# ------------------------------------------------------------------- encoding


def _encode(encoders: dict, name: str, value) -> tuple[int | None, bool]:
    """
    (encoded index, matched?). An unknown or absent value returns ``None``,
    which the caller feeds to XGBoost as NaN.

    Returning index 0 instead — the obvious shortcut — would silently claim the
    lot is in whichever market sorts first ('Achalpur'), so an unrecognised
    mandi would be priced as a real and unrelated one. NaN is the honest
    encoding: XGBoost treats it as missing and takes the default branch the
    trees already learned.
    """
    classes = encoders.get(name)
    if not classes or value is None:
        return None, False

    lut = {str(c).strip().lower(): i for i, c in enumerate(classes)}
    target = str(value).strip().lower()
    if target in lut:
        return lut[target], True

    # Reconcile feed names ("Lasalgaon APMC", "Pune(Moshi)") with the training
    # market strings, the same noise-word rule data/traders.js uses.
    def clean(s: str) -> str:
        return re.sub(r"\s+", " ", s.replace("(", " ").replace(")", " ")
                      .replace(" apmc", "").replace(" market", "")).strip()

    wanted = clean(target)
    for cls, idx in lut.items():
        if clean(cls) == wanted:
            return idx, True
    return None, False


# ----------------------------------------------------------------- prediction


def _lag(hist: list[float], k: int) -> float:
    return hist[-k] if len(hist) >= k else hist[0]


def _raw_predict(model, *, commodity, market, district,
                 history_qtl, min_price_qtl, max_price_qtl, as_of):
    hist = [float(x) for x in history_qtl if x is not None and float(x) > 0]
    if not hist:
        return None

    encoders = model["encoders"]
    feature_cols = model["featureCols"]

    c_enc, c_ok = _encode(encoders, "commodity", commodity)
    if not c_ok:
        return None  # a crop the model was never trained on
    d_enc, _ = _encode(encoders, "district", district)
    m_enc, _ = _encode(encoders, "market", market)

    last7 = hist[-7:]
    last14 = hist[-14:]

    feat = {
        "district_enc": d_enc,
        "market_enc": m_enc,
        "commodity_enc": c_enc,
        "lag_1": _lag(hist, 1),
        "lag_3": _lag(hist, 3),
        "lag_7": _lag(hist, 7),
        "lag_14": _lag(hist, 14),
        "roll_mean_7": mean(last7),
        "roll_std_7": pstdev(last7) if len(last7) > 1 else 0.0,
        "roll_mean_14": mean(last14),
        "price_range": max(float(max_price_qtl) - float(min_price_qtl), 0.0),
        "day_of_week": as_of.weekday(),
        "month": as_of.month,
        "day_of_year": as_of.timetuple().tm_yday,
        "min_price": float(min_price_qtl),
        "max_price": float(max_price_qtl),
    }

    import numpy as np
    import xgboost as xgb

    # None -> NaN, which DMatrix reads as missing (see _encode).
    row = [np.nan if feat[c] is None else feat[c] for c in feature_cols]
    matrix = xgb.DMatrix(
        np.array([row], dtype=np.float32),
        feature_names=feature_cols,
        missing=np.nan,
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return float(model["booster"].predict(matrix)[0])


# ----------------------------------------------------------------- public API


def model_status() -> dict:
    """{loaded, healthy, reason, artifact, ...}. Triggers the one-time load."""
    _load()
    return dict(_status or {"loaded": False, "healthy": False, "reason": "not initialised"})


def model_available() -> bool:
    s = model_status()
    return bool(s.get("loaded") and s.get("healthy"))


def model_info() -> dict:
    """Status and coverage — for /model-info and the UI's forecast NOTE."""
    from app.data.crop_weather_profiles import CROP_WEATHER_PROFILES

    status = model_status()
    info = {
        "trained": True,
        "available": model_available(),
        "status": status,
        "commodities": list(MODEL_COMMODITIES),
        "state": MODEL_STATE,
        "horizonPeriods": HORIZON_PERIODS,
        "target": "modal price (₹/quintal), ~7 reporting periods ahead",
        "algorithm": "XGBoost regressor (gradient-boosted trees)",
        "trainedOn": "Agmarknet daily mandi prices, 2023-06-06 to 2025-06-06",
        # Crops with a hand-tuned weather profile for the rule-based scorer
        # (price_service SECTION 2). Any other crop still gets advice, from a
        # documented generic default.
        "ruleBasedCrops": list(CROP_WEATHER_PROFILES.keys()),
    }
    if _model:
        info["marketsKnown"] = len(_model["encoders"].get("market", []))
        info["districtsKnown"] = len(_model["encoders"].get("district", []))
    return info


def predict_modal_price_7d(
    *,
    commodity: str,
    market: str | None,
    district: str | None,
    history_per_kg: list[float],
    min_price_per_kg: float | None = None,
    max_price_per_kg: float | None = None,
    as_of: date | datetime | None = None,
) -> dict:
    """
    ~7-period-ahead modal price for one crop at one market.

    ``history_per_kg`` is recent modal prices in ₹/kg, oldest→newest (the state
    daily-average series is fine — the model leans mostly on the trend).
    min/max are today's for that market in ₹/kg, defaulting to ±10% of the last
    history point. Everything returned is ₹/kg.
    """
    model = _load()
    if model is None:
        return {"available": False, "reason": model_status().get("reason", "model unavailable")}

    canonical = next((c for c in MODEL_COMMODITIES if c.lower() == str(commodity).strip().lower()), None)
    if canonical is None:
        return {
            "available": False,
            "reason": f"{commodity} is not one of the model's crops ({', '.join(MODEL_COMMODITIES)})",
        }

    hist = [float(x) * 100.0 for x in (history_per_kg or []) if x and float(x) > 0]  # ₹/kg -> ₹/quintal
    if not hist:
        return {"available": False, "reason": "no price history supplied"}

    last = hist[-1]
    lo = float(min_price_per_kg) * 100.0 if min_price_per_kg else last * 0.9
    hi = float(max_price_per_kg) * 100.0 if max_price_per_kg else last * 1.1

    if as_of is None:
        as_of = date.today()
    elif isinstance(as_of, datetime):
        as_of = as_of.date()

    _, m_ok = _encode(model["encoders"], "market", market)
    _, d_ok = _encode(model["encoders"], "district", district)

    predicted = _raw_predict(
        model, commodity=canonical, market=market, district=district,
        history_qtl=hist, min_price_qtl=lo, max_price_qtl=hi, as_of=as_of,
    )
    if predicted is None or predicted <= 0:
        return {"available": False, "reason": "model returned a non-positive price"}

    change_pct = (predicted - last) / last * 100.0

    # Outside its training price range the model regresses toward the global
    # intercept and returns moves nothing supports. Withhold rather than show.
    if abs(change_pct) > MAX_PLAUSIBLE_CHANGE_PCT:
        return {
            "available": False,
            "reason": (
                f"model output withheld: it predicts {change_pct:+.0f}% in {HORIZON_PERIODS} periods "
                f"from ₹{last / 100:.2f}/kg, beyond the ±{MAX_PLAUSIBLE_CHANGE_PCT:.0f}% we will publish. "
                f"Today's {canonical} rate is likely outside the range the model was trained on."
            ),
            "withheldPredictionPerKg": round(predicted / 100.0, 2),
            "withheldChangePct": round(change_pct, 1),
        }

    return {
        "available": True,
        "predictedModalPricePerKg": round(predicted / 100.0, 2),
        "predictedModalPricePerQuintal": round(predicted, 1),
        "lastKnownPricePerKg": round(last / 100.0, 2),
        "changePct": round(change_pct, 1),
        "horizonPeriods": HORIZON_PERIODS,
        "commodity": canonical,
        "market": market,
        "district": district,
        "marketMatched": m_ok,
        "districtMatched": d_ok,
        "historyPoints": len(hist),
        "basis": (
            "XGBoost 7-period-ahead modal price; lag and rolling features from "
            "the supplied Agmarknet history"
            + ("" if m_ok else "; no specific market matched, so the market feature "
                               "is left missing and the crop's state-wide signal "
                               "carries the prediction")
        ),
        "source": f"trained XGBoost model ({model['artifact']})",
    }
