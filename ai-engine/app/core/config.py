import os
from pydantic_settings import BaseSettings if False else object

class Settings:
    PROJECT_NAME: str = "KrishiFlow AI & VRP Optimization Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")

settings = Settings()
