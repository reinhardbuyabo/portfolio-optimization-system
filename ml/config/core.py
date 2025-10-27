from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Paths
    ROOT_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = ROOT_DIR / "datasets"
    TRAINED_MODEL_DIR: Path = ROOT_DIR / "trained_models"

    # Data

    # Model
    MODEL_VERSION: str = "0.0.1"

    # Training
    BATCH_SIZE: int = 32
    EPOCHS: int = 10

    # Reproducibility
    SEED: int = 42

    class Config:
        env_file = ".env"
        extra = 'ignore'


settings = Settings()