import math

# Perishability decay constants (k values per hour at 25°C)
CROP_DECAY_CONSTANTS = {
    "Tomato": 0.035,
    "Potato": 0.008,
    "Onion": 0.005,
    "Mango": 0.045,
    "Banana": 0.038,
    "Rice": 0.001,
    "Wheat": 0.001
}

def calculate_spoilage_loss(crop_type: str, travel_hours: float, ambient_temp: float = 32.0, is_refrigerated: bool = False) -> dict:
    """
    Mathematical perishability model:
    Spoilage% = min(100, (1 - e^(-k * travel_hours * temp_factor)) * 100)
    """
    base_k = CROP_DECAY_CONSTANTS.get(crop_type, 0.02)
    
    # Temperature factor Q10 rule (decay doubles every 10°C increase above 20°C)
    effective_temp = 4.0 if is_refrigerated else ambient_temp
    temp_factor = math.pow(2.0, (effective_temp - 20.0) / 10.0)
    
    spoilage_ratio = 1.0 - math.exp(-base_k * travel_hours * temp_factor)
    spoilage_percent = min(100.0, round(spoilage_ratio * 100.0, 2))
    
    return {
        "cropType": crop_type,
        "travelHours": travel_hours,
        "effectiveTempCelsius": effective_temp,
        "isRefrigerated": is_refrigerated,
        "spoilageRiskPercent": spoilage_percent,
        "usableCropRatio": round(1.0 - (spoilage_percent / 100.0), 4)
    }
