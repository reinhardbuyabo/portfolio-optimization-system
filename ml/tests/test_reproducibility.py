import numpy as np
import pandas as pd
from ml.train_pipeline import run_training
from processing.data_manager import load_pipeline
from config.core import settings


def test_reproducibility():
    """
    Test that the model training is reproducible by using a small,
    synthetic dataset and running the training for a single epoch.
    """
    # Create a small, synthetic dataset
    # Needs to be > 60 for the sequence creation to work
    data_size = 70
    synthetic_data = pd.DataFrame({
        'Day Price': np.linspace(100, 150, data_size) + np.random.normal(0, 1, data_size)
    })

    # Run training twice with the synthetic data and minimal epochs
    run_training(data=synthetic_data.copy(), epochs=1, batch_size=8)
    model_1 = load_pipeline(file_name=f"{settings.MODEL_VERSION}.h5")
    weights_1 = model_1.get_weights()

    run_training(data=synthetic_data.copy(), epochs=1, batch_size=8)
    model_2 = load_pipeline(file_name=f"{settings.MODEL_VERSION}.h5")
    weights_2 = model_2.get_weights()

    # Check that the weights are the same
    assert len(weights_1) == len(weights_2), "Models have different number of layers"
    for w1, w2 in zip(weights_1, weights_2):
        assert np.array_equal(w1, w2), "Model weights are not identical"
