"use client";

import { useEffect, useState } from 'react';
import { StoredLSTMPrediction, StoredGARCHVolatility } from '@/types/ml-api';
import { Search, TrendingUp, Activity, Calendar, RefreshCw } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function MLPredictionsPage() {
  const [lstmPredictions, setLstmPredictions] = useState<StoredLSTMPrediction[]>([]);
  const [garchForecasts, setGarchForecasts] = useState<StoredGARCHVolatility[]>([]);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lstm' | 'garch'>('lstm');

  const fetchPredictions = async (symbol?: string) => {
    setIsLoading(true);
    try {
      const url = symbol 
        ? `/api/ml/predict/history?symbol=${symbol}&limit=100`
        : '/api/ml/predict/history?limit=100';
      
      const response = await fetch(url);
      const data = await response.json();
      
      setLstmPredictions(data.lstm_predictions);
      setGarchForecasts(data.garch_forecasts);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const handleSearch = () => {
    fetchPredictions(searchSymbol || undefined);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">ML Predictions History</h1>
        <p className="text-muted-foreground">Historical LSTM price predictions and GARCH volatility forecasts</p>
      </div>

      {/* Search Bar */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol (e.g., SCOM, EQTY)..."
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSearch} size="sm" className="bg-[#F79D00] hover:bg-[#F79D00]/90">
            Search
          </Button>
          {searchSymbol && (
            <Button
              onClick={() => {
                setSearchSymbol('');
                fetchPredictions();
              }}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          )}
          <Button
            onClick={() => fetchPredictions(searchSymbol || undefined)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('lstm')}
            className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'lstm'
                ? 'border-b-2 border-[#F79D00] text-[#F79D00]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">LSTM Predictions ({lstmPredictions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('garch')}
            className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'garch'
                ? 'border-b-2 border-[#F79D00] text-[#F79D00]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="font-medium">GARCH Volatility ({garchForecasts.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#F79D00]" />
              <p className="text-muted-foreground">Loading predictions...</p>
            </div>
          ) : (
            <>
              {/* LSTM Predictions */}
              {activeTab === 'lstm' && (
                lstmPredictions.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No LSTM predictions found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lstmPredictions.map((prediction) => (
                      <div key={prediction.id} className="bg-muted/30 border border-border rounded-lg p-5 space-y-3">
                        <div className="flex items-start justify-between border-b border-border pb-3">
                          <div>
                            <h4 className="font-semibold text-lg text-[#F79D00]">{prediction.symbol}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(prediction.predictionDate.toString())}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Predicted</div>
                            <div className="text-xl font-bold text-success">
                              {formatCurrency(prediction.prediction)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Scaled Value:</span>
                            <span className="font-medium">{prediction.predictionScaled.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price Range:</span>
                            <span className="font-medium">
                              {formatCurrency(prediction.priceRangeMin)} - {formatCurrency(prediction.priceRangeMax)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Data Points:</span>
                            <span className="font-medium">{prediction.inputDataPoints}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Execution:</span>
                            <span className="text-muted-foreground">{prediction.executionTime.toFixed(3)}s</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* GARCH Forecasts */}
              {activeTab === 'garch' && (
                garchForecasts.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No GARCH forecasts found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {garchForecasts.map((forecast) => {
                      const riskLevel = forecast.volatilityAnnualized > 0.4
                        ? 'High'
                        : forecast.volatilityAnnualized > 0.25
                        ? 'Moderate'
                        : 'Low';
                      
                      const riskColor = riskLevel === 'High'
                        ? 'text-destructive'
                        : riskLevel === 'Moderate'
                        ? 'text-warning'
                        : 'text-success';

                      return (
                        <div key={forecast.id} className="bg-muted/30 border border-border rounded-lg p-5 space-y-3">
                          <div className="flex items-start justify-between border-b border-border pb-3">
                            <div>
                              <h4 className="font-semibold text-lg text-[#F79D00]">{forecast.symbol}</h4>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(forecast.predictionDate.toString())}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Volatility</div>
                              <div className="text-xl font-bold text-info">
                                {(forecast.volatilityAnnualized * 100).toFixed(2)}%
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Risk Level:</span>
                              <span className={`font-semibold ${riskColor}`}>
                                {riskLevel}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Daily Variance:</span>
                              <span className="font-medium">{forecast.forecastedVariance.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Data Points:</span>
                              <span className="font-medium">{forecast.inputDataPoints}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Execution:</span>
                              <span className="text-muted-foreground">{forecast.executionTime.toFixed(3)}s</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && (lstmPredictions.length > 0 || garchForecasts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Total Predictions</span>
            </div>
            <div className="text-3xl font-bold">{lstmPredictions.length}</div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-info" />
              <span className="text-sm text-muted-foreground">Total Forecasts</span>
            </div>
            <div className="text-3xl font-bold">{garchForecasts.length}</div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Unique Stocks</span>
            </div>
            <div className="text-3xl font-bold">
              {new Set([...lstmPredictions.map(p => p.symbol), ...garchForecasts.map(f => f.symbol)]).size}
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">High Risk Stocks</span>
            </div>
            <div className="text-3xl font-bold text-destructive">
              {garchForecasts.filter(f => f.volatilityAnnualized > 0.4).length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
