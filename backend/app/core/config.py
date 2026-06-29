from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/telegram_crm"
    SECRET_KEY: str = "change-this-in-production-super-secret-key"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    SESSION_ENCRYPTION_KEY: str = "change-this-encryption-key-32-chars"
    
    class Config:
        env_file = ".env"


settings = Settings()
