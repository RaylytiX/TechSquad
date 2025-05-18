from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_HOST: str = ""
    DB_PORT: int = 0
    DB_NAME: str = ""
    LIMIT_ITEMS_PER_PAGE: int = 0

    # Model Segmentation
    PATHTOMODEL: str = ""

    # Images
    APPLYLOADFORMATFILE: list = ["png", "jpeg"]
    FILE_SAVE_FOLDER: str = ""
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