#!/usr/bin/env python3
"""
Test script for Stock Prediction API v4 (Log Transformations)

Tests the FastAPI endpoints for stock-specific predictions.

Usage:
    python3 test_api_v4.py

Author: Reinhard
Date: 2024-11-18
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
import json
import numpy as np
import pandas as pd

# API base URL
API_BASE = "http://localhost:8000/api/v4"


def print_section(title):
    """Print section header."""
    print(f"\n{'='*80}")
    print(f"{title}")
    print(f"{'='*80}")


def test_health():
    """Test health check endpoint."""
    print_section("TEST 1: Health Check")
    
    response = requests.get(f"{API_BASE}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    print("✅ Health check passed")


def test_available_models():
    """Test models availability endpoint."""
    print_section("TEST 2: Available Models")
    
    response = requests.get(f"{API_BASE}/models/available")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    assert response.status_code == 200
    assert "available_stocks" in data
    print(f"✅ Found {data['trained_models']} trained models")


def test_model_info():
    """Test model info endpoint."""
    print_section("TEST 3: Model Info for SCOM")
    
    response = requests.get(f"{API_BASE}/models/SCOM")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    assert response.status_code == 200
    assert data["available"] == True
    print("✅ Model info retrieved")


def test_registry_stats():
    """Test registry statistics."""
    print_section("TEST 4: Registry Statistics")
    
    response = requests.get(f"{API_BASE}/stats")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    assert response.status_code == 200
    print("✅ Registry stats retrieved")


def test_single_prediction():
    """Test single stock prediction."""
    print_section("TEST 5: Single Stock Prediction")
    
    # Generate dummy recent prices (60 days around 17 KES)
    np.random.seed(42)
    base_price = 17.0
    returns = np.random.normal(0.001, 0.02, 60)
    prices = base_price * np.exp(np.cumsum(returns))
    recent_prices = prices.tolist()
    
    print(f"Using {len(recent_prices)} recent prices")
    print(f"Price range: {min(recent_prices):.2f} - {max(recent_prices):.2f} KES")
    
    payload = {
        "symbol": "SCOM",
        "horizon": "10d",
        "recent_prices": recent_prices
    }
    
    response = requests.post(f"{API_BASE}/predict", json=payload)
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        print(f"\n📊 Prediction Results:")
        print(f"  Symbol:     {data['symbol']}")
        print(f"  Horizon:    {data['horizon']}")
        print(f"  Prediction: {data['prediction']:.2f} KES")
        print(f"  MAPE:       {data.get('mape', 'N/A'):.2f}%" if data.get('mape') else f"  MAPE:       N/A")
        print(f"  Cached:     {data['cached']}")
        print(f"  Time:       {data['execution_time']:.3f}s")
        
        print("✅ Single prediction successful")
    else:
        print(f"❌ Prediction failed: {response.text}")


def test_batch_prediction():
    """Test batch prediction (will fail without DB integration)."""
    print_section("TEST 6: Batch Prediction")
    
    payload = {
        "symbols": ["SCOM", "EQTY", "KCB"],
        "horizon": "10d"
    }
    
    response = requests.post(f"{API_BASE}/predict/batch", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")  # First 500 chars
    
    # This will fail without recent_prices or DB integration
    print("⚠️  Batch prediction requires DB integration (not yet implemented)")


def test_model_not_found():
    """Test prediction for non-existent model."""
    print_section("TEST 7: Model Not Found")
    
    # Generate dummy prices
    recent_prices = [100.0] * 60
    
    payload = {
        "symbol": "NONEXISTENT",
        "horizon": "10d",
        "recent_prices": recent_prices
    }
    
    response = requests.post(f"{API_BASE}/predict", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    assert response.status_code == 404
    print("✅ Correctly handled non-existent model")


def test_cache_behavior():
    """Test model caching."""
    print_section("TEST 8: Cache Behavior")
    
    # Generate dummy prices
    np.random.seed(42)
    base_price = 17.0
    returns = np.random.normal(0.001, 0.02, 60)
    prices = base_price * np.exp(np.cumsum(returns))
    recent_prices = prices.tolist()
    
    payload = {
        "symbol": "SCOM",
        "horizon": "10d",
        "recent_prices": recent_prices
    }
    
    # First request (cache miss)
    response1 = requests.post(f"{API_BASE}/predict", json=payload)
    data1 = response1.json()
    print(f"First request:")
    print(f"  Cached: {data1['cached']}")
    print(f"  Time:   {data1['execution_time']:.3f}s")
    
    # Second request (should be cached)
    response2 = requests.post(f"{API_BASE}/predict", json=payload)
    data2 = response2.json()
    print(f"\nSecond request:")
    print(f"  Cached: {data2['cached']}")
    print(f"  Time:   {data2['execution_time']:.3f}s")
    
    # Check cache stats
    stats = requests.get(f"{API_BASE}/stats").json()
    print(f"\nCache Statistics:")
    print(f"  Hit Rate:    {stats['cache_hit_rate']}%")
    print(f"  Total Reqs:  {stats['total_requests']}")
    print(f"  Cache Hits:  {stats['cache_hits']}")
    print(f"  Cache Size:  {stats['cache_size']}/{stats['cache_capacity']}")
    
    assert data2['cached'] == True
    print("\n✅ Cache working correctly")


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("STOCK PREDICTION API v4 TEST SUITE")
    print("="*80)
    print(f"API Base URL: {API_BASE}")
    
    try:
        # Test if API is running
        test_health()
        
        # Test model discovery
        test_available_models()
        test_model_info()
        test_registry_stats()
        
        # Test predictions
        test_single_prediction()
        test_batch_prediction()
        
        # Test error handling
        test_model_not_found()
        
        # Test caching
        test_cache_behavior()
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED")
        print("="*80)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to API")
        print("Make sure the FastAPI server is running:")
        print("  cd ml && uvicorn api.main:app --reload --port 8000")
        sys.exit(1)
    
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
