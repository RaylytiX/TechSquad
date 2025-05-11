from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "postgres"

    # Model Segmentation
    API_MODEL: str = "http://127.0.0.1:8001"
    PATHTOMODEL: str = "yolov11n-seg.pt"

    # Images
    APPLYLOADFORMATFILE: list = ["png", "jpeg"]

    # Auth
    SECRET_KEY: str = "example"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file="backend/configs/.env")

settings = Settings()