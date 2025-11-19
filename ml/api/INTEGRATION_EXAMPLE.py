"""
Example: How to integrate improved LSTM endpoints into existing API

Add this to ml/api/main.py to enable the improved endpoints
"""

# Add to imports (around line 10)
from .routes.lstm_improved import router as lstm_improved_router

# Add to routers section (around line 70)
# This adds the improved endpoints while keeping original ones
app.include_router(
    lstm_improved_router, 
    prefix="/api/v1/predict", 
    tags=["lstm-improved"]
)

"""
This gives you both endpoints:

Original (keep for backwards compatibility):
  POST /api/v1/predict/lstm
  POST /api/v1/predict/lstm/batch

Improved (use for new predictions):
  POST /api/v1/predict/lstm/improved
  POST /api/v1/predict/lstm/batch/improved

The improved endpoints:
  - Load stock-specific models when available
  - Fall back to general model with stock-specific scaling
  - Prevent negative predictions
  - Return prediction change and percentage
  - Report which model type was used
"""

# Example usage in your frontend/client:
"""
// Updated API call
const prediction = await fetch('/api/v1/predict/lstm/improved', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: 'SCOM',
    prediction_days: 60,
    data: [
      { 'Day Price': 14.50 },
      { 'Day Price': 14.65 },
      // ... 60 days of data
    ]
  })
});

const result = await prediction.json();
console.log(`Current: ${result.current_price}`);
console.log(`Predicted: ${result.prediction}`);
console.log(`Change: ${result.predicted_change_pct}%`);
console.log(`Model: ${result.model_type}`);
"""
