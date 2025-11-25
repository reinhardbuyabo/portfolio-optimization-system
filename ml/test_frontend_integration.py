#!/usr/bin/env python3
"""
Frontend Integration Test Suite for API v4

Tests all endpoints that the frontend will use for stock predictions.

Author: Reinhard
Date: 2024-11-18
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
import json
import numpy as np
from typing import List, Dict
from datetime import datetime

# API base URL
API_BASE = "http://localhost:8000/api/v4"


def generate_sample_prices(base_price: float = 20.0, seed: int = 42) -> List[float]:
    """Generate sample price data for testing."""
    np.random.seed(seed)
    returns = np.random.normal(0.001, 0.02, 60)
    prices = base_price * np.exp(np.cumsum(returns))
    return prices.tolist()


def test_health_check():
    """Test 1: Health Check - Frontend needs to verify API is available."""
    print("\n" + "="*80)
    print("TEST 1: HEALTH CHECK")
    print("="*80)
    print("Purpose: Frontend checks if API is available before making predictions")
    
    resp = requests.get(f"{API_BASE}/health")
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ Status: {data['status']}")
        print(f"✅ Service: {data['service']}")
        print(f"✅ Coverage: {data['total_coverage']} stocks")
        print(f"✅ Specific Models: {data['specific_models']}")
        print(f"✅ General Model: {data['general_model_stocks']} stocks")
        return True
    else:
        print(f"❌ Health check failed: {resp.status_code}")
        return False


def test_get_available_stocks():
    """Test 2: Get Available Stocks - Frontend needs list of stocks for dropdown."""
    print("\n" + "="*80)
    print("TEST 2: GET AVAILABLE STOCKS")
    print("="*80)
    print("Purpose: Frontend populates stock selection dropdown")
    
    resp = requests.get(f"{API_BASE}/models/available")
    
    if resp.status_code == 200:
        data = resp.json()
        stocks = data['available_stocks']
        print(f"✅ Total Available: {len(stocks)} stocks")
        print(f"✅ Model Version: {data['model_version']}")
        print(f"\n📋 Available stocks for dropdown:")
        for i in range(0, min(20, len(stocks)), 5):
            row = stocks[i:i+5]
            print(f"   {', '.join(f'{s:6s}' for s in row)}")
        if len(stocks) > 20:
            print(f"   ... and {len(stocks) - 20} more")
        return stocks
    else:
        print(f"❌ Failed to get stocks: {resp.status_code}")
        return []


def test_single_prediction_stock_specific():
    """Test 3: Single Prediction (Stock-Specific Model) - Most accurate predictions."""
    print("\n" + "="*80)
    print("TEST 3: SINGLE PREDICTION (STOCK-SPECIFIC MODEL)")
    print("="*80)
    print("Purpose: Get high-accuracy prediction for top stocks (SCOM, EQTY, KCB, BAMB, EABL)")
    
    recent_prices = generate_sample_prices(17.0, seed=100)
    
    payload = {
        "symbol": "SCOM",
        "horizon": "10d",
        "recent_prices": recent_prices
    }
    
    resp = requests.post(f"{API_BASE}/predict", json=payload)
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ Stock: {data['symbol']}")
        print(f"✅ Predicted Price: {data['prediction']:.2f} KES")
        print(f"✅ Horizon: {data['horizon']}")
        print(f"✅ Model Type: {data['model_version']}")
        print(f"✅ Accuracy (MAPE): {data['mape']:.2f}%")
        print(f"✅ Cached: {data['cached']}")
        print(f"✅ Response Time: {data['execution_time']:.3f}s")
        print(f"\n💡 Frontend Display:")
        print(f"   Current Price: {recent_prices[-1]:.2f} KES")
        print(f"   10-day Forecast: {data['prediction']:.2f} KES")
        change = ((data['prediction'] - recent_prices[-1]) / recent_prices[-1]) * 100
        arrow = "📈" if change > 0 else "📉"
        print(f"   Expected Change: {arrow} {change:+.2f}%")
        return True
    else:
        print(f"❌ Prediction failed: {resp.status_code}")
        return False


def test_single_prediction_general():
    """Test 4: Single Prediction (General Model) - Good coverage for other stocks."""
    print("\n" + "="*80)
    print("TEST 4: SINGLE PREDICTION (GENERAL MODEL)")
    print("="*80)
    print("Purpose: Get prediction for stocks without specific models")
    
    recent_prices = generate_sample_prices(33.0, seed=200)
    
    payload = {
        "symbol": "BKG",
        "horizon": "10d",
        "recent_prices": recent_prices
    }
    
    resp = requests.post(f"{API_BASE}/predict", json=payload)
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ Stock: {data['symbol']}")
        print(f"✅ Predicted Price: {data['prediction']:.2f} KES")
        print(f"✅ Model Type: {data['model_version']}")
        print(f"✅ Accuracy (MAPE): {data['mape']:.2f}%")
        print(f"✅ Response Time: {data['execution_time']:.3f}s")
        return True
    else:
        print(f"❌ Prediction failed: {resp.status_code}")
        return False


def test_batch_prediction():
    """Test 5: Batch Prediction - Multiple stocks at once for portfolio analysis."""
    print("\n" + "="*80)
    print("TEST 5: BATCH PREDICTION")
    print("="*80)
    print("Purpose: Frontend gets predictions for user's portfolio (5-10 stocks)")
    
    recent_prices = generate_sample_prices(20.0)
    
    # Typical user portfolio
    portfolio = ['SCOM', 'EQTY', 'KCB', 'BKG', 'KPLC', 'NCBA', 'NBK']
    
    payload = {
        "symbols": portfolio,
        "horizon": "10d",
        "recent_prices": recent_prices
    }
    
    resp = requests.post(f"{API_BASE}/predict/batch", json=payload)
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ Total Stocks: {data['summary']['total']}")
        print(f"✅ Successful: {data['summary']['successful']}")
        print(f"✅ Failed: {data['summary']['failed']}")
        print(f"✅ Total Response Time: {data['execution_time']:.3f}s")
        print(f"✅ Average per stock: {data['execution_time']/data['summary']['total']:.3f}s")
        
        print(f"\n📊 Portfolio Predictions:")
        print(f"{'Stock':<8} {'Prediction':<12} {'Model Type':<20} {'MAPE':<8} {'Cached'}")
        print("-" * 70)
        
        for pred in data['predictions']:
            model_icon = "📊" if "specific" in pred['model_version'] else "📈"
            model_type = pred['model_version'].replace('v4_log_', '').replace('_', ' ').title()
            print(f"{pred['symbol']:<8} {pred['prediction']:>8.2f} KES   {model_icon} {model_type:<16} {pred['mape']:>5.2f}%  {str(pred['cached']):<5}")
        
        return len(data['predictions']) == len(portfolio)
    else:
        print(f"❌ Batch prediction failed: {resp.status_code}")
        return False


def test_different_horizons():
    """Test 6: Different Time Horizons - 1d, 5d, 10d, 30d predictions."""
    print("\n" + "="*80)
    print("TEST 6: DIFFERENT TIME HORIZONS")
    print("="*80)
    print("Purpose: Frontend offers 1-day, 5-day, 10-day, 30-day forecast options")
    
    recent_prices = generate_sample_prices(17.0)
    horizons = ["1d", "5d", "10d", "30d"]
    
    print(f"\n📅 SCOM Predictions Across Time Horizons:")
    print(f"{'Horizon':<10} {'Prediction':<15} {'Response Time'}")
    print("-" * 45)
    
    results = []
    for horizon in horizons:
        payload = {
            "symbol": "SCOM",
            "horizon": horizon,
            "recent_prices": recent_prices
        }
        
        resp = requests.post(f"{API_BASE}/predict", json=payload)
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"{horizon:<10} {data['prediction']:>8.2f} KES     {data['execution_time']:>6.3f}s")
            results.append(True)
        else:
            print(f"{horizon:<10} ❌ Failed")
            results.append(False)
    
    return all(results)


def test_model_info():
    """Test 7: Get Model Info - Show model quality to users."""
    print("\n" + "="*80)
    print("TEST 7: MODEL INFO")
    print("="*80)
    print("Purpose: Frontend shows model accuracy and details to users")
    
    test_stocks = [
        ("SCOM", "Stock-Specific"),
        ("BKG", "General")
    ]
    
    all_success = True
    for symbol, expected_type in test_stocks:
        resp = requests.get(f"{API_BASE}/models/{symbol}")
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"\n📋 {symbol} Model Info:")
            print(f"   Available: {data['available']}")
            print(f"   Model Type: {data['model_version']}")
            print(f"   Test MAPE: {data['test_mape']:.2f}%")
            print(f"   Cached: {data['cached']}")
            if data.get('training_date'):
                print(f"   Last Trained: {data['training_date'][:10]}")
        else:
            print(f"❌ Failed to get info for {symbol}")
            all_success = False
    
    return all_success


def test_error_handling():
    """Test 8: Error Handling - Invalid inputs."""
    print("\n" + "="*80)
    print("TEST 8: ERROR HANDLING")
    print("="*80)
    print("Purpose: Frontend handles errors gracefully")
    
    tests = [
        ("Invalid stock symbol", {"symbol": "INVALID", "horizon": "10d", "recent_prices": generate_sample_prices()}),
        ("Missing recent_prices", {"symbol": "SCOM", "horizon": "10d"}),
        ("Invalid horizon", {"symbol": "SCOM", "horizon": "99d", "recent_prices": generate_sample_prices()}),
        ("Too few prices", {"symbol": "SCOM", "horizon": "10d", "recent_prices": [1, 2, 3]}),
    ]
    
    for test_name, payload in tests:
        resp = requests.post(f"{API_BASE}/predict", json=payload)
        
        if resp.status_code >= 400:
            print(f"✅ {test_name}: Properly rejected (status {resp.status_code})")
        else:
            print(f"⚠️  {test_name}: Should have been rejected but got {resp.status_code}")
    
    return True


def test_performance():
    """Test 9: Performance - Response times for UI responsiveness."""
    print("\n" + "="*80)
    print("TEST 9: PERFORMANCE")
    print("="*80)
    print("Purpose: Ensure API is fast enough for good UX")
    
    recent_prices = generate_sample_prices()
    
    # Test single prediction speed
    times = []
    for i in range(5):
        payload = {
            "symbol": "SCOM",
            "horizon": "10d",
            "recent_prices": recent_prices
        }
        resp = requests.post(f"{API_BASE}/predict", json=payload)
        if resp.status_code == 200:
            times.append(resp.json()['execution_time'])
    
    avg_time = sum(times) / len(times)
    print(f"✅ Average single prediction: {avg_time:.3f}s")
    print(f"✅ Min: {min(times):.3f}s, Max: {max(times):.3f}s")
    
    # Test batch speed
    payload = {
        "symbols": ['SCOM', 'EQTY', 'KCB', 'BKG', 'KPLC'],
        "horizon": "10d",
        "recent_prices": recent_prices
    }
    resp = requests.post(f"{API_BASE}/predict/batch", json=payload)
    
    if resp.status_code == 200:
        batch_time = resp.json()['execution_time']
        print(f"✅ Batch (5 stocks): {batch_time:.3f}s")
        print(f"✅ Average per stock: {batch_time/5:.3f}s")
    
    # Performance targets for good UX
    single_ok = avg_time < 0.5  # Under 500ms
    batch_ok = batch_time < 2.0  # Under 2s for 5 stocks
    
    if single_ok and batch_ok:
        print(f"\n✅ Performance is excellent for frontend UX!")
        return True
    else:
        print(f"\n⚠️  Performance may impact UX (targets: single<500ms, batch<2s)")
        return False


def test_cache_behavior():
    """Test 10: Cache Behavior - Verify caching improves performance."""
    print("\n" + "="*80)
    print("TEST 10: CACHE BEHAVIOR")
    print("="*80)
    print("Purpose: Verify repeated requests are faster (cached)")
    
    recent_prices = generate_sample_prices()
    
    # First request (cache miss)
    payload = {"symbol": "EQTY", "horizon": "10d", "recent_prices": recent_prices}
    resp1 = requests.post(f"{API_BASE}/predict", json=payload)
    time1 = resp1.json()['execution_time']
    cached1 = resp1.json()['cached']
    
    # Second request (should be cached)
    resp2 = requests.post(f"{API_BASE}/predict", json=payload)
    time2 = resp2.json()['execution_time']
    cached2 = resp2.json()['cached']
    
    print(f"First request: {time1:.3f}s (cached: {cached1})")
    print(f"Second request: {time2:.3f}s (cached: {cached2})")
    
    if time2 < time1:
        speedup = (time1 / time2)
        print(f"✅ Cache speedup: {speedup:.1f}x faster")
        return True
    else:
        print(f"⚠️  Cache not providing speedup")
        return False


def run_all_tests():
    """Run all frontend integration tests."""
    print("\n" + "█"*80)
    print("█" + " "*78 + "█")
    print("█" + "  FRONTEND INTEGRATION TEST SUITE - API v4".center(78) + "█")
    print("█" + " "*78 + "█")
    print("█"*80)
    
    tests = [
        ("Health Check", test_health_check),
        ("Get Available Stocks", test_get_available_stocks),
        ("Single Prediction (Specific)", test_single_prediction_stock_specific),
        ("Single Prediction (General)", test_single_prediction_general),
        ("Batch Prediction", test_batch_prediction),
        ("Different Horizons", test_different_horizons),
        ("Model Info", test_model_info),
        ("Error Handling", test_error_handling),
        ("Performance", test_performance),
        ("Cache Behavior", test_cache_behavior),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name} crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print("\n" + "="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! API is ready for frontend integration!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Review errors above.")
        return 1


if __name__ == "__main__":
    try:
        exit_code = run_all_tests()
        sys.exit(exit_code)
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to API")
        print("Make sure the FastAPI server is running:")
        print("  cd ml && tox -e serve-dev")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
