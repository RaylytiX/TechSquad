from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "postgres"
    LIMIT_ITEMS_PER_PAGE: int = 10

    # Model Segmentation
    PATHTOMODEL: str = "yolov11n-seg.pt"

    # Images
    APPLYLOADFORMATFILE: list = ["png", "jpeg"]
    FILE_SAVE_FOLDER: str = "frontend/public/media"

    # Auth
    SECRET_KEY: str = "example"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    #CORS
    HOSTS: list = ["http://localhost:5173"]
    METHODS: list = ["GET", "POST"]
    HEADERS: list = ["*"]
    CREDENTIALS: bool = True
    LIMIT_ITEMS_PER_PAGE: int = 10
    model_config = SettingsConfigDict(env_file="backend/configs/.env")

settings = Settings()   
