from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CropDetails(BaseModel):
    cropType: str = Field(..., example="Tomato")
    quantityKg: float = Field(..., example=2000.0)
    harvestTime: Optional[str] = None
    temperatureSensitivity: str = Field("High", example="High")

class VehicleLocation(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., example=[73.7898, 19.9975])

class VehicleData(BaseModel):
    id: Optional[str] = None
    driverName: str
    driverPhone: str
    vehicleType: str
    capacityKg: float
    ratePerKm: float
    isRefrigerated: bool = False
    location: Optional[Any] = None

class MarketData(BaseModel):
    id: str
    name: str
    city: str
    coordinates: List[float]
    basePricesPerKg: Dict[str, float]

class OptimizationRequest(BaseModel):
    farmer_origin: List[float] = Field(..., example=[73.7898, 19.9975]) # [longitude, latitude]
    crop_details: CropDetails
    nearby_vehicles: List[VehicleData]
    markets: List[MarketData]

class PricePredictionRequest(BaseModel):
    cropType: str
    quantityKg: float
    state: str = "Maharashtra"
    season: str = "Monsoon"

class SpoilageCalculationRequest(BaseModel):
    cropType: str
    travelHours: float
    ambientTempCelsius: float = 32.0
    isRefrigerated: bool = False
