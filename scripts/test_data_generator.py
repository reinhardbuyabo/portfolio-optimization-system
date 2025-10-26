
from data_generator import generate_synthetic_data

def test_generate_synthetic_data_1H():
    """
    Tests the synthetic data generator for the 1H horizon.
    """
    data = generate_synthetic_data("1H")
    assert isinstance(data, dict)
    assert "time_series" in data
    assert len(data["time_series"][0]["data"]) == 61
    assert isinstance(data, dict)
    assert "time_series" in data
    assert "summary" in data

    if data["time_series"]:
        assert "symbol" in data["time_series"][0]
        assert "data" in data["time_series"][0]
        assert isinstance(data["time_series"][0]["symbol"], str)
        assert isinstance(data["time_series"][0]["data"], list)
        if data["time_series"][0]["data"]:
            assert "date" in data["time_series"][0]["data"][0]
            assert "open" in data["time_series"][0]["data"][0]
            assert "high" in data["time_series"][0]["data"][0]
            assert "low" in data["time_series"][0]["data"][0]
            assert "close" in data["time_series"][0]["data"][0]
            assert "volume" in data["time_series"][0]["data"][0]
            assert "change" in data["time_series"][0]["data"][0]
            assert "pct_change" in data["time_series"][0]["data"][0]

    if data["summary"]:
        assert "symbol" in data["summary"][0]
        assert "price" in data["summary"][0]
        assert "change" in data["summary"][0]
        assert "pct_change" in data["summary"][0]
        assert "open" in data["summary"][0]
        assert "high" in data["summary"][0]
        assert "low" in data["summary"][0]
        assert "volume" in data["summary"][0]
