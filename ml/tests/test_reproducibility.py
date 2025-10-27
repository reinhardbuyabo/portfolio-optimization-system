import numpy as np
from train_pipeline import run_training
from processing.data_manager import load_pipeline
from config.core import settings


def test_reproducibility():
    """Test that the model is reproducible."""
    # Run training twice
    run_training()
    model_1 = load_pipeline(file_name=f"{settings.MODEL_VERSION}.h5")
    weights_1 = model_1.get_weights()

    run_training()
    model_2 = load_pipeline(file_name=f"{settings.MODEL_VERSION}.h5")
    weights_2 = model_2.get_weights()

    # Check that the weights are the same
    for w1, w2 in zip(weights_1, weights_2):
        assert np.array_equal(w1, w2)
