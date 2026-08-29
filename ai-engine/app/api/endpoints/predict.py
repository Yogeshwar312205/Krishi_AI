from datetime import date, timedelta

from fastapi import APIRouter

from app.schemas.models import (
    PriceContextRequest,
    PriceForecastRequest,
    PricePredictionRequest,
)
from app.services import forecast_model
from app.services.price_service import (
    build_context_advice,
    predict_crop_price,
    reference_price,
)

router = APIRouter()


@router.post("/predict-price")
def predict_price_endpoint(payload: PricePredictionRequest):
    """
    Baseline price + rule-based context adjustment + sell/hold call, and the
    trained model's 7-period forecast blended in when it is available and
    history is supplied. All context fields are optional.
    """
    city = payload.city or payload.state
    return predict_crop_price(
        crop_type=payload.cropType,
        city=city,
        quantity_kg=payload.quantityKg,
        latitude=payload.latitude,
        longitude=payload.longitude,
        live_price_per_kg=payload.livePricePerKg,
        current_arrivals_qtl=payload.currentArrivalsQuintals,
        baseline_arrivals_qtl=payload.baselineArrivalsQuintals,
        trailing_avg_price_per_kg=payload.trailingAvgPricePerKg,
        weather_override=payload.weatherOverride,
        history_per_kg=payload.historyPerKg,
        market_name=payload.market,
        district_name=payload.district,
        min_price_per_kg=payload.minPricePerKg,
        max_price_per_kg=payload.maxPricePerKg,
    )


@router.post("/price-context")
def price_context_endpoint(payload: PriceContextRequest):
    """Just the context advice for a price the caller already has."""
    from app.services.weather_service import get_current_weather

    if payload.weatherOverride is not None:
        weather = {"available": True, "source": "caller-supplied weather", **payload.weatherOverride}
    elif payload.latitude is not None and payload.longitude is not None:
        weather = get_current_weather(payload.latitude, payload.longitude)
    else:
        weather = {"available": False, "reason": "no coordinates supplied", "source": "weather not requested"}

    return build_context_advice(
        payload.cropType,
        payload.baselinePricePerKg,
        weather=weather,
        current_arrivals_qtl=payload.currentArrivalsQuintals,
        baseline_arrivals_qtl=payload.baselineArrivalsQuintals,
        current_price_per_kg=payload.currentPricePerKg or payload.baselinePricePerKg,
        trailing_avg_price_per_kg=payload.trailingAvgPricePerKg,
    )


@router.post("/price-forecast")
def price_forecast_endpoint(payload: PriceForecastRequest):
    """
    The trained model's ~7-period-ahead modal price, plus a chart series: the
    supplied history as the solid past, then a straight projection to the model
    point as the dashed future with a widening band.

    `available: false` (with a reason) when the model can't produce a number —
    the caller should fall back to its own history-trend line.
    """
    hist = [float(x) for x in (payload.historyPerKg or []) if x and float(x) > 0]
    if not hist:
        return {"available": False, "reason": "no price history supplied"}

    result = forecast_model.predict_modal_price_7d(
        commodity=payload.cropType,
        market=payload.market,
        district=payload.district,
        history_per_kg=hist,
        min_price_per_kg=payload.minPricePerKg,
        max_price_per_kg=payload.maxPricePerKg,
    )
    if not result.get("available"):
        return {"available": False, "reason": result.get("reason"), "modelInfo": forecast_model.model_info()}

    horizon = result["horizonPeriods"]
    last = hist[-1]
    predicted = result["predictedModalPricePerKg"]

    # Dates: use supplied ones for the past, then one calendar day per period.
    n_past = min(len(hist), 7)
    past_hist = hist[-n_past:]
    if payload.historyDates and len(payload.historyDates) >= n_past:
        past_dates = payload.historyDates[-n_past:]
    else:
        today = date.today()
        past_dates = [(today - timedelta(days=n_past - 1 - i)).isoformat() for i in range(n_past)]
    base_day = date.fromisoformat(past_dates[-1])

    points = []
    for i, (value, iso) in enumerate(zip(past_hist, past_dates)):
        points.append({
            "offset": i - (n_past - 1),
            "date": iso,
            "isFuture": False,
            "value": round(value, 2),
            "low": round(value, 2),
            "high": round(value, 2),
        })
    for step in range(1, horizon + 1):
        frac = step / horizon
        value = round(last + (predicted - last) * frac, 2)
        spread = round(abs(value) * 0.02 * step, 2)  # widens with distance
        points.append({
            "offset": step,
            "date": (base_day + timedelta(days=step)).isoformat(),
            "isFuture": True,
            "value": value,
            "low": round(value - spread, 2),
            "high": round(value + spread, 2),
        })

    return {
        "available": True,
        "points": points,
        "horizonPeriods": horizon,
        "predictedPricePerKg": predicted,
        "lastKnownPricePerKg": result["lastKnownPricePerKg"],
        "changePct": result["changePct"],
        "marketMatched": result["marketMatched"],
        "basis": result["basis"],
        "source": result["source"],
        "note": "Intermediate days are a straight projection to the model's 7-period point, not day-by-day predictions.",
    }


@router.get("/model-info")
def model_info_endpoint():
    """Status and coverage of the trained forecast model."""
    return forecast_model.model_info()


@router.get("/price-reference")
def price_reference_endpoint(cropType: str, city: str = "Default"):
    """Raw static-table baseline, no context. Handy for debugging."""
    return reference_price(cropType, city)
