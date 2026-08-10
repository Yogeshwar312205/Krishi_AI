from fastapi import APIRouter
from app.schemas.models import SpoilageCalculationRequest
from app.services.spoilage_service import calculate_spoilage_loss

router = APIRouter()

@router.post("/calculate-spoilage")
def calculate_spoilage_endpoint(payload: SpoilageCalculationRequest):
    return calculate_spoilage_loss(
        crop_type=payload.cropType,
        travel_hours=payload.travelHours,
        ambient_temp=payload.ambientTempCelsius,
        is_refrigerated=payload.isRefrigerated
    )
