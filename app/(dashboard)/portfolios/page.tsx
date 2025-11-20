"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, FolderKanban, Search, AlertTriangle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Helper function to calculate risk level from volatility (same as detail page)
function getRiskLevel(volatility: number): "LOW" | "MEDIUM" | "HIGH" | "NOT SET" {
  if (volatility === 0) return "NOT SET";
  if (volatility < 0.15) return "LOW";
  if (volatility < 0.25) return "MEDIUM";
  return "HIGH";
}

interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  value: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  holdingsCount: number;
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  targetReturn: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  userId: string;
  createdAt: Date | string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  allocations?: Array<{
    id: string;
    weight: number;
    value: number;
    asset: {
      id: string;
      ticker: string;
      name: string;
    };
  }>;
}

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<"all" | "low" | "medium" | "high">("all");

  useEffect(() => {
    fetchPortfolios();
  }, []);

  async function fetchPortfolios() {
    try {
      setLoading(true);
      const res = await fetch("/api/portfolios");
      if (!res.ok) {
        throw new Error("Failed to fetch portfolios");
      }
      const data = await res.json();
      setPortfolios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolios");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;

    try {
      setCreating(true);
      // Use the new create endpoint with default values
      const res = await fetch("/api/portfolios/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          riskTolerance: "MEDIUM",
          targetReturn: 0.12, // 12% default
          stocks: [], // Can add stocks later
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create portfolio");
      }

      const newPortfolio = await res.json();
      setPortfolios((prev) => [...prev, newPortfolio]);
      setOpen(false);
      setName("");
      setDescription("");
      await fetchPortfolios(); // Refresh to get updated list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create portfolio";
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  }

  // Filter portfolios by search query and risk
  const filteredPortfolios = useMemo(() => {
    let result = portfolios;

    // Search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          (p.description && p.description.toLowerCase().includes(lowerQuery))
      );
    }

    // Risk filter
    if (risk !== "all") {
      result = result.filter((p) => {
        if (risk === "low") return p.riskTolerance === "LOW";
        if (risk === "medium") return p.riskTolerance === "MEDIUM";
        if (risk === "high") return p.riskTolerance === "HIGH";
        return true;
      });
    }

    return result;
  }, [portfolios, query, risk]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading portfolios...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </div>
          <Button onClick={fetchPortfolios} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#020618] min-h-screen">
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[36px] leading-[43.2px] font-bold text-slate-100">Your Portfolios</h1>
            <p className="text-[16px] leading-[24px] text-[#9398a1]">Manage and optimize your investment portfolios</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="h-[48px] px-6 bg-gradient-to-r from-[#f79d00] to-[rgba(247,157,0,0.8)] hover:from-[rgba(247,157,0,0.9)] hover:to-[rgba(247,157,0,0.7)] text-slate-100 text-[16px] leading-[24px] rounded-[12px] transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Portfolio
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Portfolio</DialogTitle>
                <DialogDescription>
                  Enter a name and description for your portfolio
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium">
                    Portfolio Name
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Growth Portfolio"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="desc" className="text-sm font-medium">
                    Description (Optional)
                  </label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your investment strategy"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!name.trim() || creating}>
                  {creating ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgba(241,245,249,0.5)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search portfolios..."
              className="w-full h-[50px] pl-[44px] pr-4 bg-[#1e283d] border border-[#1e283d] rounded-[12px] text-[16px] text-slate-100 placeholder:text-[rgba(241,245,249,0.5)] focus:outline-none focus:ring-2 focus:ring-[#f79d00]/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setRisk("all")}
              className={`h-[50px] px-4 rounded-[12px] text-[16px] leading-[24px] capitalize transition-colors ${
                risk === "all"
                  ? "bg-[#0f172b] text-slate-50"
                  : "bg-[#1e283d] text-slate-100 hover:bg-[#1e283d]/80"
              }`}
            >
              all Risk
            </button>
            <button
              onClick={() => setRisk("low")}
              className={`h-[50px] px-4 rounded-[12px] text-[16px] leading-[24px] capitalize transition-colors ${
                risk === "low"
                  ? "bg-[#0f172b] text-slate-50"
                  : "bg-[#1e283d] text-slate-100 hover:bg-[#1e283d]/80"
              }`}
            >
              low Risk
            </button>
            <button
              onClick={() => setRisk("medium")}
              className={`h-[50px] px-4 rounded-[12px] text-[16px] leading-[24px] capitalize transition-colors ${
                risk === "medium"
                  ? "bg-[#0f172b] text-slate-50"
                  : "bg-[#1e283d] text-slate-100 hover:bg-[#1e283d]/80"
              }`}
            >
              medium Risk
            </button>
            <button
              onClick={() => setRisk("high")}
              className={`h-[50px] px-4 rounded-[12px] text-[16px] leading-[24px] capitalize transition-colors ${
                risk === "high"
                  ? "bg-[#0f172b] text-slate-50"
                  : "bg-[#1e283d] text-slate-100 hover:bg-[#1e283d]/80"
              }`}
            >
              high Risk
            </button>
          </div>
        </div>

        {/* Portfolio Grid or Empty State */}
        {filteredPortfolios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolios.map((portfolio) => (
              <a
                key={portfolio.id}
                href={`/portfolios/${portfolio.id}`}
                className="bg-[#0f172b] border border-[#1e283d] rounded-[12px] p-6 hover:border-[#f79d00]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[rgba(247,157,0,0.1)] rounded-lg flex items-center justify-center">
                    <FolderKanban className="w-6 h-6 text-[#f79d00]" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-100">{portfolio.name}</h3>
                {portfolio.description && (
                  <p className="text-sm text-[#9398a1] mb-4 line-clamp-2">
                    {portfolio.description}
                  </p>
                )}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9398a1]">Value</span>
                    <span className="font-medium text-slate-100">
                      {formatCurrency(portfolio.value || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9398a1]">Expected Return</span>
                    <span
                      className={`font-medium ${
                        (portfolio.expectedReturn || 0) >= 0 ? "text-[#00b670]" : "text-destructive"
                      }`}
                    >
                      {formatPercent((portfolio.expectedReturn || 0) * 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9398a1]">Sharpe Ratio</span>
                    <span className="font-medium text-slate-100">{(portfolio.sharpeRatio || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9398a1]">Holdings</span>
                    <span className="font-medium text-slate-100">{portfolio.holdingsCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9398a1]">Risk</span>
                    <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                      (() => {
                        const riskLevel = getRiskLevel(portfolio.volatility || 0);
                        if (riskLevel === "NOT SET") return "bg-gray-500/20 text-gray-400";
                        if (riskLevel === "LOW") return "bg-green-500/20 text-green-400";
                        if (riskLevel === "MEDIUM") return "bg-yellow-500/20 text-yellow-400";
                        return "bg-red-500/20 text-red-400";
                      })()
                    }`}>
                      {getRiskLevel(portfolio.volatility || 0)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderKanban className="w-16 h-16 text-[#9398a1] mb-4" />
            <h3 className="text-[24px] leading-[33.6px] font-semibold mb-2 text-slate-100">No portfolios found</h3>
            <p className="text-[16px] leading-[24px] text-[#9398a1] mb-6">
              {query || risk !== "all"
                ? "Try adjusting your search or filters"
                : "You don't have any portfolios yet"}
            </p>
            {!query && risk === "all" && (
              <button
                onClick={() => setOpen(true)}
                className="h-[48px] px-6 bg-gradient-to-r from-[#f79d00] to-[rgba(247,157,0,0.8)] hover:from-[rgba(247,157,0,0.9)] hover:to-[rgba(247,157,0,0.7)] text-slate-100 text-[16px] leading-[24px] rounded-[12px] transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Your First Portfolio
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
