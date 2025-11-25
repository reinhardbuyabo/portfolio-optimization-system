import {
  // V4 Types (New)
  StockPredictionV4Request,
  StockPredictionV4Response,
  BatchPredictionV4Request,
  BatchPredictionV4Response,
  ModelInfoV4,
  ModelsAvailableV4Response,
  HealthV4Response,
  // Legacy V1 Types
  LSTMPredictionRequest,
  LSTMPredictionResponse,
  LSTMBatchRequest,
  LSTMBatchResponse,
  GARCHVolatilityRequest,
  GARCHVolatilityResponse,
  GARCHBatchRequest,
  GARCHBatchResponse,
  HealthResponse,
  ErrorResponse,
} from '@/types/ml-api';

// ML API Base URL - configurable via environment variable
const ML_API_BASE_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000';
const ML_API_VERSION = 'v1';
const ML_API_V4_VERSION = 'v4';

class MLAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MLAPIError';
  }
}

/**
 * ML API Client for LSTM predictions and GARCH volatility forecasting
 * Supports both V1 (legacy) and V4 (stock-specific log models) APIs
 */
export class MLClient {
  private baseUrl: string;
  private v4BaseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || `${ML_API_BASE_URL}/api/${ML_API_VERSION}`;
    this.v4BaseUrl = `${ML_API_BASE_URL}/api/${ML_API_V4_VERSION}`;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {},
    useV4 = false
  ): Promise<T> {
    const baseUrl = useV4 ? this.v4BaseUrl : this.baseUrl;
    const url = `${baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData: ErrorResponse = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use default error message
        }
        throw new MLAPIError(errorMessage, response.status);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof MLAPIError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new MLAPIError(`Failed to connect to ML API: ${error.message}`);
      }
      throw new MLAPIError('Unknown error occurred while calling ML API');
    }
  }

  // ============================================================================
  // V4 Stock-Specific Prediction Methods (New - Recommended)
  // ============================================================================

  /**
   * Check V4 API health status
   */
  async checkHealthV4(): Promise<HealthV4Response> {
    return this.fetchAPI<HealthV4Response>('/health', {}, true);
  }

  /**
   * Get available stock models (V4)
   */
  async getAvailableModelsV4(): Promise<ModelsAvailableV4Response> {
    return this.fetchAPI<ModelsAvailableV4Response>('/models/available', {}, true);
  }

  /**
   * Get model information for a specific stock (V4)
   */
  async getModelInfoV4(symbol: string): Promise<ModelInfoV4> {
    return this.fetchAPI<ModelInfoV4>(`/models/${symbol.toUpperCase()}`, {}, true);
  }

  /**
   * Predict stock price using V4 model (stock-specific or general)
   */
  async predictStockV4(request: StockPredictionV4Request): Promise<StockPredictionV4Response> {
    return this.fetchAPI<StockPredictionV4Response>('/predict', {
      method: 'POST',
      body: JSON.stringify(request),
    }, true);
  }

  /**
   * Batch predict multiple stocks using V4 models
   */
  async predictBatchV4(request: BatchPredictionV4Request): Promise<BatchPredictionV4Response> {
    return this.fetchAPI<BatchPredictionV4Response>('/predict/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    }, true);
  }

  /**
   * Clear V4 model cache (admin)
   */
  async clearCacheV4(): Promise<{ status: string; message: string; timestamp: string }> {
    return this.fetchAPI<{ status: string; message: string; timestamp: string }>(
      '/cache/clear',
      { method: 'POST' },
      true
    );
  }

  /**
   * Refresh V4 model registry (admin - use after training new models)
   */
  async refreshRegistryV4(): Promise<{
    status: string;
    message: string;
    available_models: number;
    stocks: string[];
    timestamp: string;
  }> {
    return this.fetchAPI<{
      status: string;
      message: string;
      available_models: number;
      stocks: string[];
      timestamp: string;
    }>('/refresh', { method: 'POST' }, true);
  }

  /**
   * Get V4 registry statistics (cache hit rate, etc.)
   */
  async getStatsV4(): Promise<{
    total_coverage: number;
    specific_models: number;
    general_model_stocks: number;
    cache_size: number;
    cache_capacity: number;
    cache_hit_rate: number;
    cached_stocks: string[];
    timestamp: string;
  }> {
    return this.fetchAPI('/stats', {}, true);
  }

  // ============================================================================
  // Legacy V1 Methods (Kept for backward compatibility)
  // ============================================================================

  /**
   * Check ML API health status (V1)
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.fetchAPI<HealthResponse>('/health');
  }

  /**
   * Get single LSTM price prediction
   */
  async predictLSTM(request: LSTMPredictionRequest): Promise<LSTMPredictionResponse> {
    return this.fetchAPI<LSTMPredictionResponse>('/predict/lstm', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get batch LSTM price predictions
   */
  async predictLSTMBatch(request: LSTMBatchRequest): Promise<LSTMBatchResponse> {
    return this.fetchAPI<LSTMBatchResponse>('/predict/lstm/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get single GARCH volatility forecast
   */
  async predictGARCH(request: GARCHVolatilityRequest): Promise<GARCHVolatilityResponse> {
    return this.fetchAPI<GARCHVolatilityResponse>('/predict/garch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get batch GARCH volatility forecasts
   */
  async predictGARCHBatch(request: GARCHBatchRequest): Promise<GARCHBatchResponse> {
    return this.fetchAPI<GARCHBatchResponse>('/predict/garch/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get combined LSTM and GARCH predictions for a single stock
   */
  async predictCombined(
    symbol: string,
    prices: number[],
    returns: number[]
  ): Promise<{
    lstm: LSTMPredictionResponse | null;
    garch: GARCHVolatilityResponse | null;
    errors?: { lstm?: string; garch?: string };
  }> {
    const results: {
      lstm: LSTMPredictionResponse | null;
      garch: GARCHVolatilityResponse | null;
      errors?: { lstm?: string; garch?: string };
    } = {
      lstm: null,
      garch: null,
    };

    // Convert prices array to API format: [{'Day Price': value}, ...]
    const formattedData = prices.map(price => ({ 'Day Price': price }));

    // Run both predictions in parallel
    const [lstmResult, garchResult] = await Promise.allSettled([
      this.predictLSTM({ 
        symbol, 
        data: formattedData,
        prediction_days: 60
      }),
      this.predictGARCH({ 
        symbol, 
        log_returns: returns,
        train_frac: 0.8
      }),
    ]);

    // Handle LSTM result
    if (lstmResult.status === 'fulfilled') {
      results.lstm = lstmResult.value;
    } else {
      results.errors = {
        ...results.errors,
        lstm: lstmResult.reason?.message || 'LSTM prediction failed',
      };
    }

    // Handle GARCH result
    if (garchResult.status === 'fulfilled') {
      const garchData = garchResult.value;
      // Calculate annualized volatility: sqrt(daily_variance * 252 trading days)
      const volatility_annualized = Math.sqrt(garchData.forecasted_variance * 252);
      results.garch = {
        ...garchData,
        volatility_annualized,
      };
    } else {
      results.errors = {
        ...results.errors,
        garch: garchResult.reason?.message || 'GARCH prediction failed',
      };
    }

    return results;
  }
}

// Export singleton instance
export const mlClient = new MLClient();

// Export error class for error handling
export { MLAPIError };
