# LSTM-GARCH Stock Prediction Pipeline

## Introduction

This document outlines the refactoring of a Google Colab research notebook (`NSE_LSTM.ipynb`) into a robust, reproducible, and deployable LSTM-GARCH stock prediction pipeline for the Nairobi Securities Exchange (NSE). The primary goal is to ensure full reproducibility, modularity, and seamless integration with a Next.js frontend, served by a FastAPI backend.

## Project Structure (within `ml` folder)

The `ml` directory now contains a well-organized structure for the machine learning pipeline:

```
ml/
├── config/
│   ├── __init__.py
│   └── core.py
├── datasets/
│   └── ... (NSE_data_all_stocks_2023.csv, etc.)
├── pipeline/
│   ├── __init__.py
│   └── model.py
├── processing/
│   ├── __init__.py
│   ├── data_manager.py
│   ├── features.py
│   └── validation.py
├── requirements/
│   └── requirements.txt
├── tests/
│   ├── __init__.py
│   └── test_reproducibility.py
├── trained_models/
│   └── ... (saved models and metadata)
├── Dockerfile
├── mypy.ini
├── predict.py
├── reproducibility.py
├── setup.py
├── tox.ini
└── train_pipeline.py
```

-   **`config/core.py`**: Centralized configuration management using `pydantic_settings.BaseSettings` for all paths, parameters, and environment variables.
-   **`datasets/`**: Stores raw and processed datasets.
-   **`pipeline/model.py`**: Defines and compiles the LSTM and GARCH models.
-   **`processing/data_manager.py`**: Handles loading, preprocessing, and scaling of datasets, and saving/loading of trained models.
-   **`processing/features.py`**: Contains functions for generating financial features such as returns, volatility, and moving averages.
-   **`processing/validation.py`**: Defines Pydantic schemas for validating input data.
-   **`requirements/requirements.txt`**: Lists all pinned Python dependencies for deterministic builds.
-   **`tests/`**: Contains unit and integration tests, including reproducibility tests.
-   **`trained_models/`**: Stores trained model artifacts and associated metadata.
-   **`Dockerfile`**: Defines the Docker image for deploying the FastAPI prediction service.
-   **`mypy.ini`**: Configuration file for `mypy` static type checking.
-   **`predict.py`**: FastAPI application that loads the trained model and exposes `/predict` and `/health` endpoints.
-   **`reproducibility.py`**: Utility functions for setting deterministic seeds, hashing data, and logging run metadata.
-   **`setup.py`**: Project setup file for packaging the `ml` module.
-   **`tox.ini`**: Configuration for `tox` to manage testing, linting, and type checking environments.
-   **`train_pipeline.py`**: Orchestrates the end-to-end model training process.

## Reproducibility

Reproducibility is a core aspect of this pipeline, ensured through several mechanisms:

1.  **Deterministic Seeds**: `numpy`, `tensorflow`, and `random` seeds are set using `reproducibility.set_seeds()` to ensure consistent random number generation across runs.
2.  **Centralized Configuration**: All parameters, paths, and environment variables are managed via `config/core.py`, making it easy to track and control experimental settings.
3.  **Metadata Logging**: Each training run logs essential metadata (model version, random seeds, dataset hash, training parameters, performance metrics) to facilitate tracking and debugging.
4.  **Dataset Hashing**: The `reproducibility.hash_data()` function generates a unique hash for the dataset, ensuring that the exact data used for training can be verified.
5.  **Reproducibility Tests**: A dedicated test (`tests/test_reproducibility.py`) verifies that training the model twice with the same configuration and data yields identical model weights.

## Pipeline Components in Detail

### `processing/data_manager.py`

-   **`load_dataset()`**: Loads stock data from CSV files in the `datasets/` directory. It includes logic to convert relevant columns (e.g., 'Day Price', 'Volume') to numeric types, handling potential errors gracefully.
-   **`save_pipeline()`**: Saves a trained Keras model to the `trained_models/` directory.
-   **`load_pipeline()`**: Loads a previously saved Keras model from the `trained_models/` directory.

### `processing/features.py`

-   **`calculate_returns()`**: Computes daily percentage returns based on 'Day Price'.
-   **`calculate_volatility()`**: Calculates rolling volatility of returns over a specified window.
-   **`calculate_moving_average()`**: Computes rolling moving averages of 'Day Price' over a specified window.

### `pipeline/model.py`

-   **`create_lstm_model()`**: Defines and compiles a Sequential LSTM model with Dropout layers for stock price prediction.
-   **`create_garch_model()`**: Defines a GARCH model for volatility forecasting (currently not integrated into the main training flow but available).

### `train_pipeline.py`

This script orchestrates the entire training workflow:

1.  Sets deterministic seeds.
2.  Loads the training dataset using `data_manager.load_dataset()`.
3.  Applies feature engineering functions from `features.py`.
4.  Handles missing values by filling them with zeros.
5.  Scales the 'Day Price' data using `MinMaxScaler`.
6.  Prepares the data into sequences suitable for LSTM training.
7.  Creates and trains the LSTM model using `model.create_lstm_model()`.
8.  Saves the trained model using `data_manager.save_pipeline()`.
9.  Logs comprehensive metadata about the training run using `reproducibility.log_run_metadata()`.

### `predict.py`

This is a FastAPI application that serves the trained model:

-   Initializes a FastAPI app instance.
-   Loads the latest trained model (`.h5` file) at startup.
-   Exposes a `/predict` endpoint that accepts input data and returns predictions from the LSTM model.
-   Includes a `/health` endpoint to check the service status.

## Configuration and Environment

-   **`config/core.py`**: Uses `pydantic_settings.BaseSettings` to manage configuration. This allows settings to be loaded from environment variables (e.g., via a `.env` file) or default values, ensuring flexibility and security.
-   **`pathlib`**: All file operations consistently use `pathlib.Path` objects for robust and OS-agnostic path handling.
-   **.env Support**: The `Config` class in `config/core.py` is configured to load variables from a `.env` file, enabling easy management of sensitive information or environment-specific settings.

## Testing and Type Checking

-   **`tox.ini`**: Configures `tox` to create isolated environments for:
    -   **`py`**: Runs `pytest` for general unit tests.
    -   **`test_package`**: Runs `pytest` specifically for `tests/test_reproducibility.py`.
    -   **`train`**: Executes `train_pipeline.py` to verify the end-to-end training process.
    -   **`typechecks`**: Runs `mypy` for static type checking across the codebase.
    -   **`flake8`**: Runs `flake8` for linting and style adherence.
-   **`tests/test_reproducibility.py`**: Contains a test that trains the model twice with the same seed and verifies that the resulting model weights are identical, confirming the pipeline's deterministic nature.
-   **`mypy.ini`**: Configures `mypy` to ignore missing imports for certain libraries (e.g., `pytest`) where type stubs are not readily available, allowing for focused type checking on the application code.

## Deployment

-   **`Dockerfile`**: A concise `Dockerfile` is provided to build a Docker image for the FastAPI prediction service. It sets up the Python environment, installs dependencies, copies the application code, and runs the `predict.py` application using `uvicorn`.

## Synthetic Data Generator Refactoring

The synthetic data generator located in `scripts/data_generator.py` has been refactored to correctly locate the datasets. Previously, it assumed the `datasets` folder was a sibling to the `scripts` folder. Now, it correctly points to `ml/datasets`, ensuring that the generator can access the necessary data for simulation regardless of its execution context.
