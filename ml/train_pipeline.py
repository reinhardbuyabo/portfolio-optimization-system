from config.core import settings
from processing.data_manager import load_dataset, save_pipeline, save_preprocessor
from processing.preprocessor import DataPreprocessor
from pipeline.lstm_model import create_lstm_model
from reproducibility import set_seeds, hash_dataframe, hash_files_and_timestamps, log_run_metadata
import numpy as np
import datetime


def run_training():
    """Train the model."""
    # Set seeds
    set_seeds(settings.SEED)

    # Load data
    data = load_dataset()

    # Hash individual data files and get timestamps
    file_hashes_and_timestamps = hash_files_and_timestamps(settings.DATA_DIR)

    # Initialize and fit preprocessor
    preprocessor = DataPreprocessor()
    processed_data = preprocessor.fit_transform(data.copy())

    # Save the preprocessor
    save_preprocessor(
        preprocessor_to_persist=preprocessor,
        save_file_name=f"preprocessor_{settings.MODEL_VERSION}.joblib"
    )

    # Use 'Day Price Scaled' from processed_data for model training
    scaled_data = processed_data['Day Price Scaled'].values.reshape(-1, 1)

    # Create training data
    prediction_days = 60
    x_train, y_train = [], []

    for x in range(prediction_days, len(scaled_data)):
        x_train.append(scaled_data[x - prediction_days:x, 0])
        y_train.append(scaled_data[x, 0])

    x_train, y_train = np.array(x_train), np.array(y_train)
    x_train = np.reshape(x_train, (x_train.shape[0], x_train.shape[1], 1))

    # Create and train the LSTM model
    lstm_model = create_lstm_model(input_shape=(x_train.shape[1], 1))
    lstm_model.fit(
        x_train, y_train, epochs=settings.EPOCHS, batch_size=settings.BATCH_SIZE
    )

    # Save the pipeline
    save_pipeline(
        pipeline_to_persist=lstm_model, 
        save_file_name=f"{settings.MODEL_VERSION}.h5"
    )

    # Log metadata
    metadata = {
        "run_timestamp": datetime.datetime.now().isoformat(),
        "model_version": settings.MODEL_VERSION,
        "seed": settings.SEED,
        "epochs": settings.EPOCHS,
        "batch_size": settings.BATCH_SIZE,
        "combined_dataset_hash": hash_dataframe(data),
        "individual_file_metadata": file_hashes_and_timestamps,
    }
    log_run_metadata(
        metadata,
        file_path=settings.TRAINED_MODEL_DIR / f"{settings.MODEL_VERSION}_metadata.json",
    )


if __name__ == "__main__":
    run_training()
