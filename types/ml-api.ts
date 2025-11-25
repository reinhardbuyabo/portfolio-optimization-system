// ML API Request/Response Types

// ============================================================================
// V4 Stock-Specific API Types (New - Log Transformed Models)
// ============================================================================

export interface StockPredictionV4Request {
  symbol: string;
  horizon: '1d' | '5d' | '10d' | '30d';
  recent_prices: number[]; // 60 recent closing prices
}

export interface StockPredictionV4Response {
  symbol: string;
  prediction: number; // Predicted price in KES
  horizon: string;
  confidence_interval?: {
    lower: number;
    upper: number;
  } | null;
  mape?: number; // Model accuracy (Mean Absolute Percentage Error)
  model_version: string; // e.g., "v4_log_stock_specific" or "v4_log_general"
  execution_time: number; // In seconds
  cached: boolean;
  timestamp: string;
}

export interface BatchPredictionV4Request {
  symbols: string[];
  horizon: '1d' | '5d' | '10d' | '30d';
  recent_prices: number[]; // 60 recent prices (same for all stocks or stock-specific)
}

export interface BatchPredictionV4Response {
  predictions: StockPredictionV4Response[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    errors?: Array<{ symbol: string; error: string }> | null;
  };
  execution_time: number;
  timestamp: string;
}

export interface ModelInfoV4 {
  symbol: string;
  available: boolean;
  cached: boolean;
  training_date?: string | null;
  test_mape?: number | null;
  model_version: string;
}

export interface ModelsAvailableV4Response {
  total_stocks: number;
  trained_models: number;
  available_stocks: string[];
  models_by_sector?: Record<string, string[]> | null;
  model_version: string;
  cache_stats: {
    total_coverage: number;
    specific_models: number;
    general_model_stocks: number;
    cache_size: number;
    cache_capacity: number;
    cache_hit_rate: number;
  };
}

export interface HealthV4Response {
  status: string;
  service: string;
  total_coverage: number;
  specific_models: number;
  general_model_stocks: number;
  cache_size: string;
  cache_hit_rate: string;
  timestamp: string;
}

// ============================================================================
// Legacy V1 LSTM Prediction Types (Kept for backward compatibility)
// ============================================================================

export interface LSTMPredictionRequest {
  symbol: string;
  data: Array<{ 'Day Price': number }>;
  prediction_days?: number;
}

export interface LSTMPredictionResponse {
  symbol: string;
  prediction: number; // Actual price in KES
  prediction_scaled: number; // Scaled value (0-1)
  price_range: {
    min: number;
    max: number;
  };
  execution_time: number;
  horizon: number;
}

export interface LSTMBatchRequest {
  predictions: LSTMPredictionRequest[];
}

export interface LSTMBatchResponse {
  results: (LSTMPredictionResponse & { status: 'success' | 'error'; error?: string })[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    total_time: number;
  };
  execution_time: number;
}

// GARCH Volatility Types
export interface GARCHVolatilityRequest {
  symbol: string;
  log_returns: number[];
  train_frac?: number;
}

export interface GARCHVolatilityResponse {
  symbol: string;
  forecasted_variance: number; // Daily variance
  realized_variance?: number; // Optional realized variance
  volatility_annualized: number; // Annualized volatility (calculated: sqrt(variance * 252))
  execution_time: number;
}

export interface GARCHBatchRequest {
  predictions: GARCHVolatilityRequest[];
}

export interface GARCHBatchResponse {
  results: (GARCHVolatilityResponse & { status: 'success' | 'error'; error?: string })[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    total_time: number;
  };
  execution_time: number;
}

// Combined Prediction Types
export interface CombinedPrediction {
  symbol: string;
  lstm: LSTMPredictionResponse | null;
  garch: GARCHVolatilityResponse | null;
  errors?: {
    lstm?: string;
    garch?: string;
  };
}

export interface CombinedBatchPredictionRequest {
  symbols: string[];
  historical_data: {
    [symbol: string]: {
      prices: number[];
      returns: number[];
    };
  };
}

export interface CombinedBatchPredictionResponse {
  predictions: CombinedPrediction[];
  summary: {
    total: number;
    lstm_successful: number;
    lstm_failed: number;
    garch_successful: number;
    garch_failed: number;
    total_time: number;
  };
}

// Health Check Types
export interface HealthResponse {
  status: string;
  timestamp: string;
  model_loaded: boolean;
}

// Error Response
export interface ErrorResponse {
  detail: string;
}

// Database Persistence Types (matching Prisma models)
export interface StoredLSTMPrediction {
  id: string;
  symbol: string;
  predictionDate: Date;
  prediction: number;
  predictionScaled: number;
  priceRangeMin: number;
  priceRangeMax: number;
  executionTime: number;
  inputDataPoints: number;
  createdAt: Date;
}

export interface StoredGARCHVolatility {
  id: string;
  symbol: string;
  predictionDate: Date;
  forecastedVariance: number;
  volatilityAnnualized: number;
  executionTime: number;
  inputDataPoints: number;
  createdAt: Date;
}

export interface StoredPredictionBatch {
  id: string;
  symbols: string[];
  totalCount: number;
  successCount: number;
  failureCount: number;
  totalTime: number;
  createdAt: Date;
}
