import pandas as pd
import tensorflow as tf
from config.core import settings
import joblib


def load_dataset() -> pd.DataFrame:
    """Load all datasets from the datasets directory and concatenate them."""
    all_files = [f for f in settings.DATA_DIR.iterdir() if f.suffix == '.csv']

    # Exclude sector and other non-stock data
    all_files = [f for f in all_files if 'sectors' not in f.name and 'daily_sales_french_bakery' not in f.name]

    if not all_files:
        raise FileNotFoundError("No CSV files found in the datasets directory.")

    df = pd.concat((pd.read_csv(f) for f in all_files))
    for col in ['Day Price', '12m Low', '12m High', 'Day Low', 'Day High', 'Previous', 'Change', 'Volume', 'Adjusted Price']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    return df


def save_pipeline(*, pipeline_to_persist: tf.keras.Model, save_file_name: str) -> None:
    """Save the Keras model."""
    save_path = settings.TRAINED_MODEL_DIR / save_file_name
    pipeline_to_persist.save(save_path)


def load_pipeline(*, file_name: str) -> tf.keras.Model:
    """Load a Keras model."""
    file_path = settings.TRAINED_MODEL_DIR / file_name
    return tf.keras.models.load_model(file_path)


def save_preprocessor(*, preprocessor_to_persist: object, save_file_name: str) -> None:
    """Save the DataPreprocessor instance."""
    save_path = settings.TRAINED_MODEL_DIR / save_file_name
    joblib.dump(preprocessor_to_persist, save_path)


def load_preprocessor(*, file_name: str) -> object:
    """Load a DataPreprocessor instance."""
    file_path = settings.TRAINED_MODEL_DIR / file_name
    return joblib.load(file_path)
