"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { UIPortfolio } from "@/types";
import { formatCurrency, formatPercent, formatNumber, getRiskCategory, riskTextClass } from "@/lib/utils";
import { Check, AlertCircle, TrendingUp, Activity, BarChart3, Loader2 } from "lucide-react";

interface SavePortfolioModalProps {
  open: boolean;
  onClose: () => void;
  portfolio: UIPortfolio | null;
  onConfirm: (portfolio: UIPortfolio) => Promise<void>;
  mode: "create" | "update";
}

export function SavePortfolioModal({ open, onClose, portfolio, onConfirm, mode }: SavePortfolioModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!portfolio) return null;

  const handleConfirm = async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      await onConfirm(portfolio);
      setStatus("success");
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 1500);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to save portfolio");
    }
  };

  const handleClose = () => {
    if (status !== "loading") {
      onClose();
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const riskCategory = getRiskCategory(portfolio.volatility);
  const riskClass = riskTextClass(riskCategory);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{mode === "create" ? "Confirm Portfolio Creation" : "Confirm Portfolio Update"}</DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl mb-2">Portfolio {mode === "create" ? "Created" : "Updated"} Successfully!</h3>
            <p className="text-muted-foreground">Your changes have been saved</p>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl mb-2">Error Saving Portfolio</h3>
            <p className="text-muted-foreground mb-6">{errorMessage || "Please try again later"}</p>
            <button onClick={() => setStatus("idle")} className="px-6 py-2 bg-muted hover:bg-muted/70 rounded-lg transition-colors">
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Portfolio Summary */}
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <h3 className="mb-4">Portfolio Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Portfolio Name</span>
                  <span className="font-medium">{portfolio.name}</span>
                </div>
                {portfolio.description && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Description</span>
                    <span className="font-medium text-right max-w-xs">{portfolio.description}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Number of Stocks</span>
                  <span className="font-medium">{portfolio.holdings.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Capital</span>
                  <span className="font-medium">{formatCurrency(portfolio.totalValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Risk Level</span>
                  <span className={`font-medium capitalize ${riskClass}`}>{riskCategory} Risk</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Expected Return</span>
                </div>
                <p className={`text-2xl font-medium ${portfolio.totalReturn >= 0 ? "text-success" : "text-destructive"}`}>{formatPercent(portfolio.totalReturn)}</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Volatility</span>
                </div>
                <p className="text-2xl font-medium">{formatPercent(portfolio.volatility)}</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Sharpe Ratio</span>
                </div>
                <p className="text-2xl font-medium">{formatNumber(portfolio.sharpeRatio, 2)}</p>
              </div>
            </div>

            {/* Holdings Preview */}
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <h3 className="mb-4">Holdings Preview</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {portfolio.holdings.map((h) => (
                  <div key={h.symbol} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium">{h.symbol}</p>
                      <p className="text-xs text-muted-foreground">{h.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPercent(h.weight)}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(h.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-chart-1/10 border border-chart-1/30 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-chart-1 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-chart-1 mb-1">Important</p>
                <p className="text-muted-foreground">
                  {mode === "create"
                    ? "Once created, you can modify this portfolio at any time. Make sure all the information is correct before proceeding."
                    : "Your portfolio will be updated with the new allocations and settings. This action cannot be undone."}
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "idle" && (
          <DialogFooter>
            <button onClick={handleClose} className="px-6 py-2 hover:bg-muted rounded-lg transition-colors" disabled={status === "loading"}>
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={status === "loading"} className="px-8 py-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Portfolio...
                </>
              ) : (
                <>{mode === "create" ? "Create Portfolio" : "Save Changes"}</>
              )}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
