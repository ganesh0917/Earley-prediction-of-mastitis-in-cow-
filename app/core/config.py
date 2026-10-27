from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=PROJECT_ROOT / ".env", extra="ignore")
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/originw2745"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:3000"
    environment_provider: str = "open_meteo"
    environment_base_url: str = "https://api.open-meteo.com/v1/forecast"
    environment_api_key: str = ""
    environment_latitude: float = 11.0168
    environment_longitude: float = 76.9558
    mqtt_enabled: bool = True
    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883
    mqtt_client_id: str = "originw2745-api"

    @property
    def cors_origin_list(self): 
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

def get_settings():
    return Settings()
