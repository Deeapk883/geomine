import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App Info
    PROJECT_NAME: str = "GeoMine AI Engine"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Paths (matches your singular 'weight/' folder)
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_WEIGHTS_PATH: str = os.path.join(BASE_DIR, "weight", "best_efficientnet_b0.pth")
    NORM_STATS_PATH: str = os.path.join(BASE_DIR, "weight", "norm_stats.pt")
    
    # Inference Parameters
    PATCH_SIZE: int = 32
    STRIDE: int = 16
    CONFIDENCE_THRESHOLD: float = 0.5
    MIN_MINE_PIXELS: int = 4  # Filter out noise smaller than 400m²
    
    # Database
    DB_PATH: str = os.path.join(BASE_DIR, "db", "geomine_cache.db")

settings = Settings()