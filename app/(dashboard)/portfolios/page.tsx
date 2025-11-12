"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, ArrowRight, Search, AlertTriangle } from "lucide-react";
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
import { Card } from "@/components/ui/card";

interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  totalValue?: number;
  totalReturn?: number;
  volatility?: number;
  sharpeRatio?: number;
  userId: string;
  createdAt: Date | string;
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
    } catch (err: any) {
      setError(err.message || "Failed to load portfolios");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;

    try {
      setCreating(true);
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });

      if (!res.ok) {
        throw new Error("Failed to create portfolio");
      }

      const newPortfolio = await res.json();
      setPortfolios((prev) => [...prev, newPortfolio]);
      setOpen(false);
      setName("");
      setDescription("");
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
        const vol = p.volatility ?? 0.15;
        if (risk === "low") return vol < 0.15;
        if (risk === "medium") return vol >= 0.15 && vol < 0.25;
        if (risk === "high") return vol >= 0.25;
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
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolios</h1>
          <p className="text-muted-foreground mt-2">Manage and optimize your portfolios</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Portfolio
            </Button>
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search portfolios..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={risk === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setRisk("all")}
          >
            All
          </Button>
          <Button
            variant={risk === "low" ? "default" : "outline"}
            size="sm"
            onClick={() => setRisk("low")}
          >
            Low Risk
          </Button>
          <Button
            variant={risk === "medium" ? "default" : "outline"}
            size="sm"
            onClick={() => setRisk("medium")}
          >
            Medium
          </Button>
          <Button
            variant={risk === "high" ? "default" : "outline"}
            size="sm"
            onClick={() => setRisk("high")}
          >
            High Risk
          </Button>
        </div>
      </div>

      {/* Portfolio Grid */}
      {filteredPortfolios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortfolios.map((portfolio) => (
            <Link key={portfolio.id} href={`/portfolios/${portfolio.id}`}>
              <Card className="p-6 hover:border-primary transition-colors cursor-pointer h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FolderKanban className="w-6 h-6 text-primary" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{portfolio.name}</h3>
                {portfolio.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {portfolio.description}
                  </p>
                )}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-medium">
                      {formatCurrency(portfolio.totalValue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Return</span>
                    <span
                      className={`font-medium ${
                        (portfolio.totalReturn || 0) >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatPercent(portfolio.totalReturn || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sharpe Ratio</span>
                    <span className="font-medium">{(portfolio.sharpeRatio || 0).toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <FolderKanban className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No portfolios found</h3>
          <p className="text-muted-foreground mb-6">
            {query || risk !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first portfolio to get started"}
          </p>
          {!query && risk === "all" && (
            <Button onClick={() => setOpen(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create Portfolio
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
