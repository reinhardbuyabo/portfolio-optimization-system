import time
import numpy as np
from fastapi.testclient import TestClient
from loguru import logger
from api.main import app

client = TestClient(app)


def test_garch_single_metrics():
    np.random.seed(42)
    log_returns = np.random.normal(0, 0.01, 200).tolist()
    payload = {"symbol": "AAPL", "log_returns": log_returns, "train_frac": 0.8}
    start = time.perf_counter()
    res = client.post("/api/v1/predict/garch", json=payload)
    duration = time.perf_counter() - start
    logger.info("/predict/garch responded in {:.2f}s", duration)
    assert res.status_code == 200
    body = res.json()
    assert "execution_time" in body and body["execution_time"] >= 0
    assert body["forecasted_variance"] >= 0


def test_garch_batch_metrics():
    np.random.seed(123)
    log_returns = np.random.normal(0, 0.01, 200).tolist()
    payload = {"stocks": [
        {"symbol": "AAPL", "log_returns": log_returns},
        {"symbol": "MSFT", "log_returns": log_returns},
    ], "max_workers": 2}
    start = time.perf_counter()
    res = client.post("/api/v1/predict/garch/batch", json=payload)
    duration = time.perf_counter() - start
    logger.info("/predict/garch/batch responded in {:.2f}s", duration)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2
    assert "execution_time" in body and body["execution_time"] >= 0
    assert isinstance(body["results"], list) and len(body["results"]) == 2
    assert "execution_time" in body["results"][0]
