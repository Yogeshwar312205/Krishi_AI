"""
How friendly a given weather condition is to a crop that has ALREADY been
harvested and is waiting to be sold / moved to a mandi.

This is not an agronomy model for a standing crop. The KrishiFlow farmer has a
lot on the ground ready to ship, so what matters here is how fast today's
weather degrades that lot and how much of a quality discount to expect at the
gate:

  - Heat and humidity accelerate rot and wilting (worse for leafy / soft fruit).
  - Rain on an open lot means mould, caking and outright rejection for grain.
  - A few crops (banana, mango) also take chilling injury if it turns cold.

Every number is a hand-set judgement call, documented, and deliberately coarse.
It feeds a rule-based score (see services/price_service.py, SECTION 2), never a
trained model. Tune the table, not the caller.

`shelf_life_tier` scales the whole weather sensitivity:
    fast   -> x1.30  (sell within a day or two regardless)
    medium -> x1.00
    slow   -> x0.60  (grain / tubers tolerate a bad-weather day)

Penalty weights are contributions to a 0..1 "weather risk" fraction BEFORE the
tier multiplier and the final clamp. Keep the four penalties roughly summing to
<= 1.0 for a plausible worst case so the clamp is a guard, not the norm.
"""

# ---------------------------------------------------------------- the table

CROP_WEATHER_PROFILES = {
    "Tomato": {
        "ideal_temp_c": [10.0, 27.0],
        "heat_stress_c": 33.0,       # above this, soft fruit collapses fast
        "cold_stress_c": 4.0,
        "rain_penalty": 0.35,        # split skins, fungal rot on a wet lot
        "humidity_penalty": 0.30,
        "wind_penalty": 0.05,
        "shelf_life_tier": "fast",
        "notes": "Bruises and rots within a day of heat + damp. Move quickly.",
    },
    "Onion": {
        "ideal_temp_c": [5.0, 30.0],
        "heat_stress_c": 38.0,
        "cold_stress_c": -2.0,
        "rain_penalty": 0.45,        # wet onions sprout and rot; big discount
        "humidity_penalty": 0.25,
        "wind_penalty": 0.03,
        "shelf_life_tier": "slow",
        "notes": "Keeps well dry. Rain on an uncovered lot is the real risk.",
    },
    "Potato": {
        "ideal_temp_c": [4.0, 25.0],
        "heat_stress_c": 32.0,
        "cold_stress_c": 2.0,
        "rain_penalty": 0.35,
        "humidity_penalty": 0.20,
        "wind_penalty": 0.02,
        "shelf_life_tier": "slow",
        "notes": "Greening in sun, soft rot in standing water. Otherwise hardy.",
    },
    "Rice": {
        "ideal_temp_c": [5.0, 35.0],
        "heat_stress_c": 42.0,
        "cold_stress_c": -5.0,
        "rain_penalty": 0.55,        # wet paddy discolours, sprouts, drops grade
        "humidity_penalty": 0.30,
        "wind_penalty": 0.05,
        "shelf_life_tier": "slow",
        "notes": "Dry grain is stable for weeks; rain on an unturned heap is the hit.",
    },
    "Wheat": {
        "ideal_temp_c": [5.0, 35.0],
        "heat_stress_c": 42.0,
        "cold_stress_c": -5.0,
        "rain_penalty": 0.55,
        "humidity_penalty": 0.30,
        "wind_penalty": 0.05,
        "shelf_life_tier": "slow",
        "notes": "Same as paddy: the enemy is moisture, not a warm afternoon.",
    },
    "Mango": {
        "ideal_temp_c": [12.0, 27.0],
        "heat_stress_c": 34.0,
        "cold_stress_c": 8.0,        # chilling injury, blackened skin
        "rain_penalty": 0.30,
        "humidity_penalty": 0.35,    # anthracnose / sap burn in humid heat
        "wind_penalty": 0.05,
        "shelf_life_tier": "fast",
        "notes": "Ripens through any delay. Humid heat browns it within hours.",
    },
    "Banana": {
        "ideal_temp_c": [13.0, 27.0],
        "heat_stress_c": 33.0,
        "cold_stress_c": 12.0,       # very cold-sensitive; peel greys < 12 C
        "rain_penalty": 0.25,
        "humidity_penalty": 0.35,
        "wind_penalty": 0.05,
        "shelf_life_tier": "fast",
        "notes": "Both a hot day and a cold night push it toward over-ripe.",
    },
    "Grapes": {
        "ideal_temp_c": [8.0, 26.0],
        "heat_stress_c": 32.0,
        "cold_stress_c": 3.0,
        "rain_penalty": 0.50,        # berry split and downy mildew after rain
        "humidity_penalty": 0.35,
        "wind_penalty": 0.05,
        "shelf_life_tier": "fast",
        "notes": "Table grapes crack and mould fast once wet.",
    },
    "Soyabean": {
        "ideal_temp_c": [5.0, 35.0],
        "heat_stress_c": 42.0,
        "cold_stress_c": -3.0,
        "rain_penalty": 0.45,
        "humidity_penalty": 0.25,
        "wind_penalty": 0.03,
        "shelf_life_tier": "slow",
        "notes": "Oilseed; wet seed loses grade and oil content.",
    },
    "Maize": {
        "ideal_temp_c": [5.0, 38.0],
        "heat_stress_c": 43.0,
        "cold_stress_c": -3.0,
        "rain_penalty": 0.50,        # aflatoxin risk on damp cobs
        "humidity_penalty": 0.30,
        "wind_penalty": 0.04,
        "shelf_life_tier": "slow",
        "notes": "Dry it or sell it before rain — mould risk is a hard discount.",
    },
}

# Used for any commodity not in the table (Agmarknet reports ~119 of them).
# Deliberately middle-of-the-road: medium shelf life, moderate rain hit.
DEFAULT_CROP_WEATHER_PROFILE = {
    "ideal_temp_c": [8.0, 32.0],
    "heat_stress_c": 38.0,
    "cold_stress_c": 2.0,
    "rain_penalty": 0.35,
    "humidity_penalty": 0.25,
    "wind_penalty": 0.05,
    "shelf_life_tier": "medium",
    "notes": "No crop-specific profile; using a moderate default.",
}

SHELF_LIFE_MULTIPLIER = {
    "fast": 1.30,
    "medium": 1.00,
    "slow": 0.60,
}


def get_crop_weather_profile(crop_type: str) -> dict:
    """Case-insensitive lookup with a documented fallback."""
    if not crop_type:
        return {**DEFAULT_CROP_WEATHER_PROFILE, "matched": False, "cropType": None}

    for name, profile in CROP_WEATHER_PROFILES.items():
        if name.lower() == crop_type.strip().lower():
            return {**profile, "matched": True, "cropType": name}

    return {**DEFAULT_CROP_WEATHER_PROFILE, "matched": False, "cropType": crop_type}
