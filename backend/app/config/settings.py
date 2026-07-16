from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Lector de Placas UAGRM"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/alpr_db"

    # Auth configuration
    SECRET_KEY: str = "change-this-in-env"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Local OCR pipeline configuration
    OCR_LANGUAGES: str = "es,en"
    OCR_GPU: bool = False
    OCR_QUANTIZE: bool = False
    OCR_CONFIDENCE_THRESHOLD: float = 0.40
    OCR_UPSCALE_FACTOR: float = 2.0
    OCR_USE_GRAYSCALE: bool = True
    OCR_USE_CONTRAST: bool = True
    OCR_DENOISE: bool = True
    OCR_USE_THRESHOLD: bool = False
    OCR_ROI_X: int | None = None
    OCR_ROI_Y: int | None = None
    OCR_ROI_WIDTH: int | None = None
    OCR_ROI_HEIGHT: int | None = None

    # Local camera agent configuration. The agent runs as a separate process.
    CAMERA_INDEX: int = 0
    CAMERA_RTSP_URL: str = ""
    CAMERA_API_URL: str = "http://127.0.0.1:8000/api/v1/plates/analyze"
    CAMERA_ANALYSIS_INTERVAL_SECONDS: float = 2.0
    CAMERA_DUPLICATE_COOLDOWN_SECONDS: float = 30.0
    CAMERA_RECONNECT_DELAY_SECONDS: float = 5.0
    CAMERA_REQUEST_TIMEOUT_SECONDS: float = 30.0
    CAMERA_REQUEST_RETRIES: int = 2
    CAMERA_REQUEST_RETRY_DELAY_SECONDS: float = 1.0
    CAMERA_JPEG_QUALITY: int = 90

    @field_validator(
        "DEBUG",
        "OCR_GPU",
        "OCR_QUANTIZE",
        "OCR_USE_GRAYSCALE",
        "OCR_USE_CONTRAST",
        "OCR_DENOISE",
        "OCR_USE_THRESHOLD",
        mode="before",
    )
    @classmethod
    def normalize_bool(cls, value: object) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production"}:
                return False
        return bool(value)

    @field_validator("OCR_ROI_X", "OCR_ROI_Y", "OCR_ROI_WIDTH", "OCR_ROI_HEIGHT", mode="before")
    @classmethod
    def empty_roi_to_none(cls, value: object) -> object:
        return None if value == "" else value

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
