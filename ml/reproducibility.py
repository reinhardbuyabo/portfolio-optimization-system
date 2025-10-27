import random
import numpy as np
import tensorflow as tf
import hashlib
import json
from pathlib import Path
import pandas as pd
import os


def set_seeds(seed: int = 42) -> None:
    """Set seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)


def hash_dataframe(data: pd.DataFrame) -> str:
    """Hash a pandas DataFrame to ensure consistency."""
    return hashlib.sha256(
        pd.util.hash_pandas_object(data, index=True).values
    ).hexdigest()


def hash_files_and_timestamps(data_dir: Path) -> list[dict]:
    """Compute SHA256 hash and timestamp for each relevant file in a directory."""
    file_metadata = []
    all_files = [f for f in data_dir.iterdir() if f.suffix == '.csv']

    # Exclude sector and other non-stock data
    all_files = [f for f in all_files if 'sectors' not in f.name and 'daily_sales_french_bakery' not in f.name]

    for file_path in sorted(all_files):  # Sort for consistent order
        with open(file_path, 'rb') as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        timestamp = os.path.getmtime(file_path)
        file_metadata.append({
            "file_name": file_path.name,
            "hash": file_hash,
            "timestamp": timestamp
        })
    return file_metadata


def log_run_metadata(metadata: dict, file_path: Path) -> None:
    """Log metadata for a training run."""
    with open(file_path, 'w') as f:
        json.dump(metadata, f, indent=4)
