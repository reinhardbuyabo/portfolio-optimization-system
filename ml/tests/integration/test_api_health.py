import time
from fastapi.testclient import TestClient
from loguru import logger
from api.main import app

client = TestClient(app)

def test_health_endpoint_metrics():
    start = time.perf_counter()
    res = client.get("/api/v1/health")
    duration = time.perf_counter() - start
    logger.info("/health responded in {:.4f}s", duration)
    assert res.status_code == 200
    # X-Process-Time header should be present from middleware
    assert "X-Process-Time" in res.headers