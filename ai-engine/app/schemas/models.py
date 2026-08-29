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

    # --- context for the rule-based scorer (all optional) ---
    # City used to pick a row from the static reference table.
    city: Optional[str] = Field(None, example="Nashik")
    # Farm/mandi coordinates — trigger a live OpenWeather lookup when present.
    latitude: Optional[float] = Field(None, example=19.9975)
    longitude: Optional[float] = Field(None, example=73.7898)
    # Live mandi rate (₹/kg). When given, it is the baseline instead of the table.
    livePricePerKg: Optional[float] = Field(None, example=41.5)
    # Mandi arrivals for this crop: today's total vs a typical day (quintals).
    currentArrivalsQuintals: Optional[float] = Field(None, example=48000.0)
    baselineArrivalsQuintals: Optional[float] = Field(None, example=32000.0)
    # Trailing average modal rate (₹/kg) for the price-momentum signal.
    trailingAvgPricePerKg: Optional[float] = Field(None, example=36.0)
    # Pre-fetched weather, to skip the OpenWeather call (tests / caller has it).
    weatherOverride: Optional[Dict[str, Any]] = None

    # --- inputs for the trained forecast model (SECTION 3), all optional ---
    # Recent modal prices ₹/kg, oldest→newest, to drive the model's lags.
    historyPerKg: Optional[List[float]] = None
    market: Optional[str] = Field(None, example="Lasalgaon")
    district: Optional[str] = Field(None, example="Nashik")
    minPricePerKg: Optional[float] = None
    maxPricePerKg: Optional[float] = None


class PriceContextRequest(BaseModel):
    """Focused request for /price-context — just the sell/hold advice."""
    cropType: str = Field(..., example="Tomato")
    baselinePricePerKg: float = Field(..., example=38.5)
    latitude: Optional[float] = Field(None, example=19.9975)
    longitude: Optional[float] = Field(None, example=73.7898)
    currentArrivalsQuintals: Optional[float] = None
    baselineArrivalsQuintals: Optional[float] = None
    currentPricePerKg: Optional[float] = None
    trailingAvgPricePerKg: Optional[float] = None
    weatherOverride: Optional[Dict[str, Any]] = None


class PriceForecastRequest(BaseModel):
    """Request for /price-forecast — the trained model's 7-period-ahead price
    plus a chart series (history + projection)."""
    cropType: str = Field(..., example="Onion")
    historyPerKg: List[float] = Field(..., example=[24.0, 25.5, 26.0, 25.0, 27.0])
    market: Optional[str] = Field(None, example="Lasalgaon")
    district: Optional[str] = Field(None, example="Nashik")
    minPricePerKg: Optional[float] = None
    maxPricePerKg: Optional[float] = None
    historyDates: Optional[List[str]] = Field(None, description="ISO dates aligned to historyPerKg")

class SpoilageCalculationRequest(BaseModel):
    cropType: str
    travelHours: float
    ambientTempCelsius: float = 32.0
    isRefrigerated: bool = False
