"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UIPortfolio } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface BatchRunModalProps {
  open: boolean;
  onClose: () => void;
  portfolios: any[]; // Accept any portfolio structure with allocations
}

export function BatchRunModal({ open, onClose, portfolios }: BatchRunModalProps) {
  const router = useRouter();
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    currentSymbol?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset state when modal is closed
      setIsRunning(false);
      setError(null);
      setProgress(null);
      setSelectedPortfolio(null);
    }
  }, [open]);

  const runBatchPrediction = async (portfolio: any) => {
    setSelectedPortfolio(portfolio.id);
    setIsRunning(true);
    setError(null);
    setProgress({ current: 0, total: 100 });

    console.log('🚀 Starting batch prediction for portfolio:', portfolio.id);
    console.log('📋 Portfolio allocations:', portfolio.allocations);
    
    try {
      // Extract symbols from allocations
      const symbols = portfolio.allocations?.map((a: any) => a.asset.ticker) || [];
      
      console.log('🎯 Symbols to predict:', symbols);
      
      if (symbols.length === 0) {
        const errorMsg = "Portfolio has no assets to run predictions on";
        setError(errorMsg);
        toast.error("No assets in portfolio", {
          description: errorMsg
        });
        setIsRunning(false);
        return;
      }
      
      toast.loading(`Running predictions for ${symbols.length} stocks...`, {
        id: 'batch-prediction'
      });
      
      setProgress({ current: 10, total: 100, currentSymbol: "Fetching historical data..." });
      
      // V4 API requires recent_prices (last 60 days from most recent date)
      // Fetch historical data for each stock and use most recent 60 days
      // This ensures we use Oct 31, Oct 30, etc. if today is Nov 1st
      
      try {
        // First, check which stocks have V4 models available
        const modelsResponse = await fetch('/api/ml/v4/models');
        const modelsData = await modelsResponse.json();
        const availableStocks = modelsData.available_stocks || [];
        
        // Separate stocks into V4-available and V1-fallback
        const v4Stocks = symbols.filter(s => availableStocks.includes(s));
        const v1Stocks = symbols.filter(s => !availableStocks.includes(s));
        
        if (v1Stocks.length > 0) {
          toast.info(`Using V1 model for ${v1Stocks.length} stock(s)`, {
            description: `${v1Stocks.join(', ')} - V4 models not available`
          });
        }
        
        setProgress({ current: 20, total: 100, currentSymbol: "Preparing predictions..." });
        
        const allResults: any[] = [];
        
        // Process V4 stocks individually
        if (v4Stocks.length > 0) {
          setProgress({ current: 30, total: 100, currentSymbol: "Running V4 predictions..." });
          
          const v4ProgressIncrement = 50 / v4Stocks.length; // 50% of progress for V4 stocks
          
          for (let i = 0; i < v4Stocks.length; i++) {
            const symbol = v4Stocks[i];
            setProgress({ 
              current: 30 + (i * v4ProgressIncrement), 
              total: 100, 
              currentSymbol: `Predicting ${symbol}...` 
            });
            
            try {
              // Fetch historical data for this specific stock
              console.log(`📊 Fetching historical data for ${symbol}...`);
              const historicalRes = await fetch(`/api/stocks/historical?symbol=${symbol}&days=60`);
              
              console.log(`📊 Historical data response for ${symbol}:`, historicalRes.status);
              
              if (!historicalRes.ok) {
                console.warn(`Failed to fetch historical data for ${symbol}: ${historicalRes.status}`);
                const errorText = await historicalRes.text();
                console.error(`Error details:`, errorText);
                allResults.push({
                  symbol,
                  status: 'error',
                  error: `Failed to fetch historical data (${historicalRes.status})`,
                  model_version: 'v4',
                });
                continue;
              }
              
              const historicalData = await historicalRes.json();
              console.log(`📊 Historical data for ${symbol}:`, historicalData.prices?.length || 0, 'records');
              
              // The API returns 'prices' array with 'price' field, not 'data' with 'close'
              const pricesData = historicalData.prices || historicalData.data || [];
              
              // Sort by date descending and take most recent 60 prices
              const sortedData = pricesData
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 60);
              
              const recentPrices = sortedData
                .reverse() // Reverse to get chronological order (oldest to newest)
                .map((d: any) => d.price || d.close); // Handle both 'price' and 'close' fields
              
              console.log(`📊 Recent prices for ${symbol}:`, recentPrices.length, 'prices');
              
              if (recentPrices.length < 60) {
                console.warn(`Insufficient data for ${symbol}: ${recentPrices.length} days`);
                allResults.push({
                  symbol,
                  status: 'error',
                  error: `Insufficient historical data (need 60 days, got ${recentPrices.length})`,
                  model_version: 'v4',
                });
                continue;
              }
              
              // Make individual V4 prediction
              const v4Response = await fetch("/api/ml/v4/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  symbol,
                  horizon: '1d',
                  recent_prices: recentPrices
                }),
              });
              
              if (v4Response.ok) {
                const v4Result = await v4Response.json();
                
                // Get current price from historical data (most recent price)
                const currentPrice = recentPrices[recentPrices.length - 1];
                const predictedPrice = v4Result.prediction;
                
                console.log(`V4 prediction for ${symbol}: current=${currentPrice}, predicted=${predictedPrice}`);
                
                // Calculate expected return: (predicted - current) / current
                const expectedReturn = (predictedPrice - currentPrice) / currentPrice;
                
                // Estimate volatility from MAPE (rough approximation)
                // MAPE represents prediction error, can be used as proxy for volatility
                const volatilityAnnualized = (v4Result.mape || 10) / 100;
                
                const result = {
                  symbol: v4Result.symbol,
                  status: 'success',
                  prediction: v4Result.prediction,
                  model_version: v4Result.model_version,
                  mape: v4Result.mape,
                  horizon: v4Result.horizon,
                  cached: v4Result.cached,
                  execution_time: v4Result.execution_time,
                  // Add StockPrediction format fields
                  currentPrice,
                  lstm: {
                    prediction: predictedPrice,
                    horizon: 1, // 1 day ahead
                  },
                  garch: {
                    volatility_annualized: volatilityAnnualized,
                  },
                  expectedReturn,
                };
                
                console.log('V4 result formatted:', result);
                allResults.push(result);
              } else {
                const errorData = await v4Response.json().catch(() => ({ error: 'Failed to parse error response' }));
                console.error(`❌ V4 prediction failed for ${symbol}:`, v4Response.status, errorData);
                allResults.push({
                  symbol,
                  status: 'error',
                  error: errorData.error || `V4 prediction failed (${v4Response.status})`,
                  model_version: 'v4',
                });
              }
            } catch (err) {
              console.error(`Error predicting ${symbol}:`, err);
              allResults.push({
                symbol,
                status: 'error',
                error: err instanceof Error ? err.message : 'Prediction failed',
                model_version: 'v4',
              });
            }
          }
        }
        
        setProgress({ current: 80, total: 100, currentSymbol: "Running V1 predictions..." });
        
        // Run V1 predictions for stocks without V4 models
        if (v1Stocks.length > 0) {
          // Fetch historical data and prepare for V1 API
          const v1PrepareResponse = await fetch('/api/ml/prepare-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: v1Stocks })
          });
          
          if (!v1PrepareResponse.ok) {
            console.error('V1 data preparation failed, skipping V1 stocks');
          } else {
            const v1PreparedData = await v1PrepareResponse.json();
            
            // Run V1 combined predictions
            const v1Response = await fetch('/api/ml/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                symbols: v1Stocks,
                historical_data: v1PreparedData.historical_data
              })
            });
            
            if (!v1Response.ok) {
              console.error('V1 predictions failed');
            } else {
              const v1Predictions = await v1Response.json();
              
              // Transform V1 predictions to StockPrediction format
              const v1Results = (v1Predictions.predictions || [])
                .filter((p: any) => p.lstm !== null && p.lstm !== undefined)
                .map((pred: any) => {
                  // Log what we're receiving from V1
                  console.log('V1 prediction received for', pred.symbol, ':', pred);
                  
                  // Get current price from prediction or fetch from market data
                  const currentPrice = pred.current_price || pred.currentPrice || 0;
                  const predictedPrice = pred.lstm?.prediction || 0;
                  
                  if (currentPrice === 0) {
                    console.warn(`Warning: No current price for ${pred.symbol}, using 0`);
                  }
                  
                  const expectedReturn = currentPrice > 0 
                    ? (predictedPrice - currentPrice) / currentPrice 
                    : 0;
                  
                  // Use GARCH volatility if available, otherwise estimate from prediction variance
                  const volatilityAnnualized = pred.garch?.volatility_annualized || 0.15; // Default 15%
                  
                  const result = {
                    symbol: pred.symbol,
                    status: 'success',
                    prediction: predictedPrice,
                    mape: null, // V1 doesn't provide MAPE
                    model_version: 'v1_general',
                    horizon: '1d',
                    cached: false,
                    execution_time: pred.lstm?.execution_time || 0,
                    // Add StockPrediction format fields
                    currentPrice,
                    lstm: {
                      prediction: predictedPrice,
                      horizon: 1,
                    },
                    garch: {
                      volatility_annualized: volatilityAnnualized,
                    },
                    expectedReturn,
                  };
                  
                  console.log('V1 result formatted:', result);
                  return result;
                });
              
              allResults.push(...v1Results);
            }
          }
        }
        
        setProgress({ current: 80, total: 100, currentSymbol: "Storing results..." });
        
        console.log('📊 All predictions before validation:', allResults);
        console.log('📊 Total results:', allResults.length);
        
        if (allResults.length === 0) {
          console.error('❌ No predictions were generated at all!');
          throw new Error('No predictions were generated. All stocks may have failed. Check if models are available.');
        }
        
        // Log how many succeeded vs failed
        const successCount = allResults.filter(p => p.status === 'success').length;
        const errorCount = allResults.filter(p => p.status === 'error').length;
        console.log(`📊 Prediction status: ${successCount} success, ${errorCount} errors`);
        
        if (successCount === 0) {
          console.error('❌ All predictions failed!');
          console.log('Error details:', allResults.filter(p => p.status === 'error'));
          throw new Error(`All ${errorCount} predictions failed. Check if ML API is running.`);
        }

        // Enhanced validation with current price fallback
        const validPredictions = [];
        const invalidPredictions = [];
        
        for (const pred of allResults) {
          // Check if prediction failed
          if (pred.status !== 'success') {
            invalidPredictions.push({ symbol: pred.symbol, reason: 'Status not success', status: pred.status });
            continue;
          }
          
          // Check required fields
          if (!pred.symbol) {
            invalidPredictions.push({ symbol: 'UNKNOWN', reason: 'Missing symbol' });
            continue;
          }
          
          if (!pred.lstm || pred.lstm.prediction === undefined) {
            invalidPredictions.push({ symbol: pred.symbol, reason: 'Missing LSTM prediction', lstm: pred.lstm });
            continue;
          }
          
          // If currentPrice is missing, try to get it from portfolio allocation
          if (!pred.currentPrice || pred.currentPrice === 0) {
            console.warn(`⚠️ Missing currentPrice for ${pred.symbol}, attempting to fetch from portfolio`);
            
            // Try to get current price from portfolio allocation
            const allocation = portfolio.allocations.find((a: any) => a.asset.ticker === pred.symbol);
            if (allocation && allocation.asset.data && allocation.asset.data.length > 0) {
              const latestData = allocation.asset.data[0];
              pred.currentPrice = latestData.close;
              
              // Recalculate expectedReturn with correct current price
              pred.expectedReturn = (pred.lstm.prediction - pred.currentPrice) / pred.currentPrice;
              
              console.log(`✓ Found currentPrice for ${pred.symbol}: ${pred.currentPrice}`);
            } else {
              console.error(`❌ Could not find currentPrice for ${pred.symbol}`);
              invalidPredictions.push({ 
                symbol: pred.symbol, 
                reason: 'Missing currentPrice and not found in portfolio',
                hasAllocation: !!allocation,
                hasData: !!(allocation?.asset?.data?.length)
              });
              continue;
            }
          }
          
          // Add GARCH if missing (use default volatility)
          if (!pred.garch || !pred.garch.volatility_annualized) {
            console.warn(`⚠️ Missing GARCH for ${pred.symbol}, using default volatility`);
            pred.garch = {
              volatility_annualized: 0.15 // Default 15% volatility
            };
          }
          
          validPredictions.push(pred);
        }
        
        console.log('✅ Valid predictions:', validPredictions.length, '/', allResults.length);
        console.log('❌ Invalid predictions:', invalidPredictions.length);
        
        if (invalidPredictions.length > 0) {
          console.log('Invalid prediction details:', invalidPredictions);
        }
        
        if (validPredictions.length === 0) {
          console.error('❌ No valid predictions to save!');
          console.log('All results:', JSON.stringify(allResults, null, 2));
          throw new Error('No valid predictions were generated. Check console for details.');
        }

        // Save predictions to database
        try {
          const saveResponse = await fetch('/api/ml/predictions/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictions: validPredictions }),
          });

          if (!saveResponse.ok) {
            console.warn('Failed to save predictions to database');
            const errorText = await saveResponse.text();
            console.error('Database save error:', errorText);
          } else {
            const saveResult = await saveResponse.json();
            console.log('✓ Predictions saved to database:', saveResult);
          }
        } catch (error) {
          console.error('Error saving predictions to database:', error);
          // Don't fail the whole operation if DB save fails
        }

        // Also keep in sessionStorage for immediate access
        const dataToStore = {
          portfolioId: portfolio.id,
          predictions: validPredictions,
          timestamp: new Date().toISOString(),
        };
        
        console.log('💾 Storing to sessionStorage:', dataToStore);
        
        sessionStorage.setItem(
          `portfolio_predictions_${portfolio.id}`,
          JSON.stringify(dataToStore)
        );
        
        // Verify it was stored
        const verification = sessionStorage.getItem(`portfolio_predictions_${portfolio.id}`);
        if (verification) {
          const parsed = JSON.parse(verification);
          console.log('✅ Verified sessionStorage save:', parsed.predictions.length, 'predictions');
        } else {
          console.error('❌ Failed to save to sessionStorage!');
        }

        setProgress({ current: 100, total: 100, currentSymbol: "Complete!" });
        
        const finalSuccessCount = validPredictions.length;
        const finalFailedCount = symbols.length - validPredictions.length;
        
        toast.success("Batch predictions complete", {
          id: 'batch-prediction',
          description: `${finalSuccessCount} successful${finalFailedCount > 0 ? `, ${finalFailedCount} failed` : ''}`
        });
        
        setTimeout(() => {
          onClose();
          router.push(`/portfolios/${portfolio.id}?mlPredictions=true`);
        }, 1000);
        
      } catch (predError: any) {
        // Handle prediction errors
        console.error("Prediction error:", predError);
        throw new Error(predError.message || "Failed to run predictions");
      }

    } catch (err: any) {
      console.error("Batch prediction error:", err);
      const errorMsg = err.message || "Failed to run predictions. Please try again.";
      setError(errorMsg);
      setIsRunning(false);
      setProgress(null);
      
      // Only show toast if we haven't already shown one
      if (!err.message?.includes("Portfolio has no assets")) {
        toast.error("Batch prediction error", {
          id: 'batch-prediction',
          description: errorMsg
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isRunning && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-chart-1" />
            Batch Run ML Predictions
          </DialogTitle>
          <DialogDescription>
            Select a portfolio to run LSTM and GARCH predictions on all holdings
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive mb-1">Prediction Failed</h4>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        {isRunning && progress && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-chart-1/20 rounded-full" />
                <div
                  className="absolute inset-0 w-16 h-16 border-4 border-chart-1 border-t-transparent rounded-full animate-spin"
                />
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="text-lg font-medium mb-1">Running ML Predictions...</p>
              <p className="text-sm text-muted-foreground">
                {progress.currentSymbol || `Processing ${progress.current} of ${progress.total}`}
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-chart-1 to-chart-1/80 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {Math.round((progress.current / progress.total) * 100)}% complete
            </p>
          </div>
        )}

        {!isRunning && (
          <div className="space-y-3">
            {portfolios && portfolios.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No portfolios found</p>
                <button
                  onClick={() => {
                    onClose();
                    router.push("/new/portfolios");
                  }}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  Create a Portfolio
                </button>
              </div>
            ) : (
              portfolios?.map((portfolio) => (
                <div
                  key={portfolio.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-chart-1/50 transition-all cursor-pointer"
                  onClick={() => runBatchPrediction(portfolio)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium mb-1">{portfolio.name}</h3>
                      {portfolio.description && (
                        <p className="text-sm text-muted-foreground">{portfolio.description}</p>
                      )}
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all text-sm">
                      Run Predictions
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Holdings</p>
                      <p className="font-medium">{portfolio.allocations?.length || 0} stocks</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Total Value</p>
                      <p className="font-medium">
                        KES {formatNumber(portfolio.totalValue || 0, 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Sharpe Ratio</p>
                      <p className="font-medium">{formatNumber(portfolio.sharpeRatio || 0, 2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Stocks: {portfolio.allocations?.map((a: any) => a.asset.ticker).join(", ") || "None"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!isRunning && portfolios && portfolios.length > 0 && (
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}




