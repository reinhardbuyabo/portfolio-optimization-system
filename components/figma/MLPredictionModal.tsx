"use client";

import { CombinedPrediction } from '@/types/ml-api';
import { Stock } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Activity, AlertCircle, X } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface MLPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictions: CombinedPrediction[];
  stocks: Stock[];
}

export function MLPredictionModal({ isOpen, onClose, predictions, stocks }: MLPredictionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">ML Predictions Results</DialogTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {predictions.map((prediction) => {
            const stock = stocks.find(s => s.symbol === prediction.symbol);
            const currentPrice = stock?.currentPrice;
            const { symbol, lstm, garch, errors } = prediction;

            // Calculate price movement
            const priceMovement = lstm && currentPrice
              ? ((lstm.prediction - currentPrice) / currentPrice) * 100
              : null;
            const isPriceBullish = priceMovement !== null && priceMovement > 0;

            // Determine risk level
            const riskLevel = garch
              ? garch.volatility_annualized > 0.4
                ? 'High'
                : garch.volatility_annualized > 0.25
                ? 'Moderate'
                : 'Low'
              : null;

            const riskColor = riskLevel === 'High'
              ? 'text-destructive'
              : riskLevel === 'Moderate'
              ? 'text-warning'
              : 'text-success';

            return (
              <div
                key={symbol}
                className="bg-card border border-border rounded-lg p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#F79D00]">{symbol}</h3>
                    <p className="text-sm text-muted-foreground">{stock?.name || 'Unknown'}</p>
                  </div>
                  {currentPrice && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Current Price</div>
                      <div className="font-semibold">{formatCurrency(currentPrice)}</div>
                    </div>
                  )}
                </div>

                {/* LSTM Prediction */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {isPriceBullish ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                    <h4 className="font-medium">Price Prediction (LSTM)</h4>
                  </div>

                  {lstm ? (
                    <div className="ml-7 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Predicted Price:</span>
                        <span className={`text-xl font-bold ${isPriceBullish ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(lstm.prediction)}
                        </span>
                      </div>
                      {priceMovement !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Expected Change:</span>
                          <span className={`font-semibold ${isPriceBullish ? 'text-success' : 'text-destructive'}`}>
                            {priceMovement > 0 ? '+' : ''}{formatPercent(priceMovement)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Price Range:</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(lstm.price_range.min)} - {formatCurrency(lstm.price_range.max)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Execution time:</span>
                        <span className="text-muted-foreground">{lstm.execution_time.toFixed(3)}s</span>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-7 flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{errors?.lstm || 'Prediction failed'}</span>
                    </div>
                  )}
                </div>

                {/* GARCH Volatility */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-info" />
                    <h4 className="font-medium">Volatility Forecast (GARCH)</h4>
                  </div>

                  {garch ? (
                    <div className="ml-7 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Annualized Volatility:</span>
                        <span className="text-xl font-bold text-info">
                          {(garch.volatility_annualized * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Risk Level:</span>
                        <span className={`font-semibold ${riskColor}`}>
                          {riskLevel}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Daily Variance:</span>
                        <span className="text-muted-foreground">
                          {garch.forecasted_variance.toFixed(6)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Execution time:</span>
                        <span className="text-muted-foreground">{garch.execution_time.toFixed(3)}s</span>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-7 flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{errors?.garch || 'Forecast failed'}</span>
                    </div>
                  )}
                </div>

                {/* Interpretation */}
                {lstm && garch && (
                  <div className="pt-3 border-t border-border">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Interpretation:</span> The model predicts{' '}
                        {isPriceBullish ? 'an increase' : 'a decrease'} of{' '}
                        {priceMovement !== null ? `${Math.abs(priceMovement).toFixed(2)}%` : 'N/A'} with{' '}
                        <span className={riskColor}>{riskLevel?.toLowerCase()}</span> risk.
                        {riskLevel === 'High' && ' Consider risk management strategies.'}
                        {riskLevel === 'Low' && ' This stock shows relatively stable behavior.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        {predictions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="font-medium mb-3">Batch Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Predictions</div>
                <div className="text-2xl font-bold">{predictions.length}</div>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <div className="text-sm text-muted-foreground">LSTM Success</div>
                <div className="text-2xl font-bold text-success">
                  {predictions.filter(p => p.lstm !== null).length}
                </div>
              </div>
              <div className="p-3 bg-info/10 rounded-lg">
                <div className="text-sm text-muted-foreground">GARCH Success</div>
                <div className="text-2xl font-bold text-info">
                  {predictions.filter(p => p.garch !== null).length}
                </div>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <div className="text-sm text-muted-foreground">High Risk Stocks</div>
                <div className="text-2xl font-bold text-warning">
                  {predictions.filter(p => p.garch && p.garch.volatility_annualized > 0.4).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
