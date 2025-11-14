"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UIPortfolio } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface BatchRunModalProps {
  open: boolean;
  onClose: () => void;
  portfolios: UIPortfolio[];
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

  const runBatchPrediction = async (portfolio: UIPortfolio) => {
    setSelectedPortfolio(portfolio.id);
    setIsRunning(true);
    setError(null);
    setProgress({ current: 0, total: 100 });

    try {
      const symbols = portfolio.holdings.map(h => h.symbol);
      
      setProgress({ current: 25, total: 100, currentSymbol: "Running ML models..." });
      
      const predictRes = await fetch("/api/ml/batch/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols, horizon: 1 }), // Default horizon of 1 day
      });

      if (!predictRes.ok) {
        const errorData = await predictRes.json();
        throw new Error(errorData.detail || "Prediction failed");
      }

      const predictions = await predictRes.json();

      setProgress({ current: 75, total: 100, currentSymbol: "Storing results..." });

      sessionStorage.setItem(
        `portfolio_predictions_${portfolio.id}`,
        JSON.stringify({
          portfolioId: portfolio.id,
          predictions: predictions.results,
          timestamp: new Date().toISOString(),
        })
      );

      setProgress({ current: 100, total: 100, currentSymbol: "Complete!" });
      
      setTimeout(() => {
        onClose();
        router.push(`/portfolios/${portfolio.id}?mlPredictions=true`);
      }, 1000);

    } catch (err: any) {
      console.error("Batch prediction error:", err);
      setError(err.message || "Failed to run predictions. Please try again.");
      setIsRunning(false);
      setProgress(null);
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
                      <p className="font-medium">{portfolio.holdings.length} stocks</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Total Value</p>
                      <p className="font-medium">
                        KES {formatNumber(portfolio.totalValue, 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Sharpe Ratio</p>
                      <p className="font-medium">{formatNumber(portfolio.sharpeRatio, 2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Stocks: {portfolio.holdings.map(h => h.symbol).join(", ")}
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




