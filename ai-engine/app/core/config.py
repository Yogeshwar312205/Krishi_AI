import os

from dotenv import load_dotenv
from pydantic import BaseModel

# Load ai-engine/.env if present. Safe no-op when the file is absent (prod may
# inject real environment variables instead). See ai-engine/.env.example.
load_dotenv()


class Settings(BaseModel):
    PROJECT_NAME: str = "KrishiFlow AI & VRP Optimization Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # OpenWeather "Current Weather Data" API key. Used only by the rule-based
    # context scorer (app/services/price_service.py, SECTION 2). Absent key =>
    # the weather term is dropped from the score, nothing breaks.
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")

    # Trained XGBoost mandi-price forecast model (SECTION 3). Relative paths are
    # resolved against ai-engine/. If the file is missing or fails its load-time
    # health check, the model is simply reported unavailable.
    PRICE_MODEL_PATH: str = os.getenv("PRICE_MODEL_PATH", "app/models/mandi_price_model.pkl")

    # Repair hatch for a pickle that lost its fitted intercept across an XGBoost
    # version change (base_score reverts to 0.5 and predictions come out far too
    # low). Set this to the training target's mean modal price in ₹/quintal to
    # restore it. Leave empty to trust the pickle as-is; the health check will
    # disable the model if it still looks broken.
    PRICE_MODEL_BASE_SCORE: str = os.getenv("PRICE_MODEL_BASE_SCORE", "")


settings = Settings()
