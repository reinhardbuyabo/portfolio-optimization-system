from pydantic_settings import BaseSettings
from pathlib import Path

def get_project_root() -> Path:
    """
    Search upwards from the current file to find the project root,
    which is identified by the presence of the 'pyproject.toml' file.
    """
    # Start from the directory containing this file
    path = Path(__file__).parent
    while not (path / 'pyproject.toml').exists():
        # If we reach the filesystem root, stop and raise an error
        if path == path.parent:
            raise FileNotFoundError(f"Could not find project root with 'pyproject.toml' from {__file__}")
        path = path.parent
    return path


class Settings(BaseSettings):
    # More robust path definitions
    ROOT_DIR: Path = get_project_root()
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