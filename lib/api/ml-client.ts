import {
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
 */
export class MLClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || `${ML_API_BASE_URL}/api/${ML_API_VERSION}`;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
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

  /**
   * Check ML API health status
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
