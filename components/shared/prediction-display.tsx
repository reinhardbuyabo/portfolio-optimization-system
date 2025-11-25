"use client";

import React from 'react';
import { CombinedPrediction } from '@/types/ml-api';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

interface PredictionDisplayProps {
  prediction: CombinedPrediction;
  currentPrice?: number;
}

const PredictionDisplay: React.FC<PredictionDisplayProps> = ({ prediction, currentPrice }) => {
  const { symbol, lstm, garch, errors } = prediction;

  // Calculate price movement if LSTM prediction available
  const priceMovement = lstm && currentPrice
    ? ((lstm.prediction - currentPrice) / currentPrice) * 100
    : null;

  const isPriceBullish = priceMovement !== null && priceMovement > 0;

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{symbol}</h3>
        {currentPrice && (
          <span className="text-sm text-gray-500">
            Current: <span className="font-semibold">{currentPrice.toFixed(2)} KES</span>
          </span>
        )}
      </div>

      {/* LSTM Prediction */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isPriceBullish ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          <h4 className="font-medium text-gray-900 dark:text-white">Price Prediction</h4>
        </div>

        {lstm ? (
          <div className="ml-7 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Predicted Price:</span>
              <span className={`text-lg font-bold ${isPriceBullish ? 'text-green-600' : 'text-red-600'}`}>
                {lstm.prediction.toFixed(2)} KES
              </span>
            </div>
            {priceMovement !== null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Expected Change:</span>
                <span className={`text-sm font-semibold ${isPriceBullish ? 'text-green-600' : 'text-red-600'}`}>
                  {priceMovement > 0 ? '+' : ''}{priceMovement.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Range:</span>
              <span className="text-gray-600 dark:text-gray-400">
                {lstm.price_range.min.toFixed(2)} - {lstm.price_range.max.toFixed(2)} KES
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Confidence (scaled):</span>
              <span className="text-gray-600 dark:text-gray-400">
                {lstm.prediction_scaled.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Execution time:</span>
              <span className="text-gray-600 dark:text-gray-400">
                {lstm.execution_time.toFixed(3)}s
              </span>
            </div>
          </div>
        ) : (
          <div className="ml-7 flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{errors?.lstm || 'Prediction failed'}</span>
          </div>
        )}
      </div>

      {/* GARCH Volatility */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <h4 className="font-medium text-gray-900 dark:text-white">Volatility Forecast</h4>
        </div>

        {garch ? (
          <div className="ml-7 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Annualized Volatility:</span>
              <span className="text-lg font-bold text-blue-600">
                {(garch.volatility_annualized * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Daily Variance:</span>
              <span className="text-gray-600 dark:text-gray-400">
                {garch.forecasted_variance.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Risk Level:</span>
              <span className={`font-semibold ${
                garch.volatility_annualized > 0.4 ? 'text-red-600' :
                garch.volatility_annualized > 0.25 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {garch.volatility_annualized > 0.4 ? 'High' :
                 garch.volatility_annualized > 0.25 ? 'Moderate' :
                 'Low'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Execution time:</span>
              <span className="text-gray-600 dark:text-gray-400">
                {garch.execution_time.toFixed(3)}s
              </span>
            </div>
          </div>
        ) : (
          <div className="ml-7 flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{errors?.garch || 'Forecast failed'}</span>
          </div>
        )}
      </div>

      {/* Interpretation */}
      {lstm && garch && (
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>
              <span className="font-semibold">Interpretation:</span> The model predicts{' '}
              {isPriceBullish ? 'an increase' : 'a decrease'} of{' '}
              {priceMovement !== null ? `${Math.abs(priceMovement).toFixed(2)}%` : 'N/A'} with{' '}
              {garch.volatility_annualized > 0.4 ? 'high' :
               garch.volatility_annualized > 0.25 ? 'moderate' : 'low'}{' '}
              risk.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionDisplay;
