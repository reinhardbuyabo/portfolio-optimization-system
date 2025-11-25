import time
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from loguru import logger
from api.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def make_price_series(n=120, start=100.0):
    np.random.seed(0)
    prices = [start]
    for _ in range(n-1):
        prices.append(prices[-1] * (1 + np.random.normal(0, 0.002)))
    df = pd.DataFrame({"Day Price": prices})
    return df


def test_lstm_single_prediction_metrics(client):
    df = make_price_series(100)
    payload = {
        "symbol": "AAPL",
        "data": df.to_dict(orient="records"),
        "prediction_days": 60
    }
    start = time.perf_counter()
    res = client.post("/api/v1/predict/lstm", json=payload)
    duration = time.perf_counter() - start
    logger.info("/predict/lstm responded in {:.2f}s", duration)
    assert res.status_code == 200
    body = res.json()
    assert "execution_time" in body and body["execution_time"] >= 0
    assert isinstance(body["prediction"], (int, float))


def test_lstm_batch_prediction_metrics(client):
    df = make_price_series(100)
    payload = {
        "stocks": [
            {"symbol": "AAPL", "data": df.to_dict(orient="records"), "prediction_days": 60},
            {"symbol": "MSFT", "data": df.to_dict(orient="records"), "prediction_days": 60},
        ],
        "max_workers": 2
    }
    start = time.perf_counter()
    res = client.post("/api/v1/predict/lstm/batch", json=payload)
    duration = time.perf_counter() - start
    logger.info("/predict/lstm/batch responded in {:.2f}s", duration)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2
    assert "execution_time" in body and body["execution_time"] >= 0
    assert isinstance(body["results"], list) and len(body["results"]) == 2
    # per-item metrics present
    assert "execution_time" in body["results"][0]
