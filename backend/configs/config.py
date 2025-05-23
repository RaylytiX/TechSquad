from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_HOST: str = ""
    POSTGRES_PORT: int = 0
    POSTGRES_DB: str = ""
    LIMIT_ITEMS_PER_PAGE: int = 0

    #S3
    S3_SERVICE_NAME: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_REGION: str = ""
    S3_ENDPOINT_URL: str = ""
    S3_BUCKET_NAME_IMAGES: str = ""
    S3_BUCKET_NAME_PDF: str = ""
    S3_PUBLIC_URL: str = ""

    # Model Segmentation
    PATHTOMODEL: str = ""

    # Images
    APPLYLOADFORMATFILE: list = ["png", "jpeg"]
    FILE_SAVE_FOLDER: str = ""
    #IMAGE_SAVE_FOLDER: str = "../runs/segment/predict/"
    GRID_ROWS: int = 1
    GRID_COLS: int = 28

    # Auth
    SECRET_KEY: str = ""
    ALGORITHM: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 0

    # CORS
    HOSTS: list = ["*"]
    METHODS: list = ["*"]
    HEADERS: list = ["*"]
    CREDENTIALS: bool = False
    LIMIT_ITEMS_PER_PAGE: int = 0
    model_config = SettingsConfigDict(env_file="configs/.env")

settings = Settings()   