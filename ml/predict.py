import tensorflow as tf
from fastapi import FastAPI
from pydantic import BaseModel
from processing.data_manager import load_pipeline, load_preprocessor
from processing.preprocessor import DataPreprocessor
from config.core import settings
import numpy as np
import pandas as pd


app = FastAPI()


pipeline: tf.keras.Model = load_pipeline(
    file_name=f"{settings.MODEL_VERSION}.h5"
)

preprocessor: DataPreprocessor = load_preprocessor(
    file_name=f"preprocessor_{settings.MODEL_VERSION}.joblib"
)


class PredictionInput(BaseModel):
    data: list


@app.post("/predict")
def predict(input_data: PredictionInput):
    """Make a prediction."""
    # Convert input data to DataFrame
    input_df = pd.DataFrame(input_data.data)

    # Preprocess the input data
    processed_input = preprocessor.transform(input_df.copy())

    # Extract scaled data for prediction
    scaled_input = processed_input['Day Price Scaled'].values.reshape(-1, 1)

    # Create sequences for LSTM prediction (assuming a single sequence for now)
    # This part needs to be aligned with how x_train was created in train_pipeline.py
    # For simplicity, let's assume input_data.data already represents a sequence
    # of length prediction_days. A more robust solution would involve managing
    # a sliding window or state.
    prediction_days = 60 # This should ideally come from settings or the preprocessor
    if len(scaled_input) < prediction_days:
        return {"error": f"Input data must contain at least {prediction_days} samples for prediction."}
    
    # Take the last `prediction_days` samples for prediction
    prediction_input_sequence = scaled_input[-prediction_days:].reshape(1, prediction_days, 1)

    prediction = pipeline.predict(prediction_input_sequence)
    return {"prediction": prediction.tolist()}


@app.get("/health")
def health():
    return {"status": "ok"}
