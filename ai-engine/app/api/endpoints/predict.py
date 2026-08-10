from fastapi import APIRouter
from app.schemas.models import PricePredictionRequest
from app.services.price_service import predict_crop_price

router = APIRouter()

@router.post("/predict-price")
def predict_price_endpoint(payload: PricePredictionRequest):
    return predict_crop_price(
        crop_type=payload.cropType,
        city=payload.state,
        quantity_kg=payload.quantityKg
    )
