// ML API Request/Response Types

// LSTM Prediction Types
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
