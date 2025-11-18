"use client";

import { useMemo, useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { FileText, Download, Calendar, Filter, Eye, ArrowLeft } from "lucide-react";
import { PortfolioReport } from "@/components/portfolio/PortfolioReport";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { generateEnhancedReport, exportToCSV, exportToExcel } from "@/lib/portfolio-export";
import { toast } from "sonner";

interface Portfolio {
  id: string;
  name: string;
}

interface PortfolioReportData {
  portfolioId: string;
  portfolioName: string;
  portfolioValue: number;
  status: string;
  riskTolerance: string;
  targetReturn: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  holdings: Array<{
    ticker: string;
    name: string;
    weight: number;
    value: number;
    predictedPrice?: number;
    expectedReturn?: number;
    volatility?: number;
  }>;
  mlMetrics?: {
    meanReturn: number;
    meanVolatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    riskClass: string;
  };
  optimizedWeights?: Array<{
    symbol: string;
    weight: number;
    expectedReturn: number;
    volatility: number;
  }>;
  lastOptimized?: string;
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const portfolioIdFromUrl = searchParams.get('portfolio');
  
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [reportType, setReportType] = useState<"summary" | "detailed" | "performance">("summary");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(portfolioIdFromUrl || "all");
  const [dateRange, setDateRange] = useState("30d");
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [includePerformance, setIncludePerformance] = useState(true);
  const [includeHoldings, setIncludeHoldings] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [portfolioReportData, setPortfolioReportData] = useState<PortfolioReportData | null>(null);

  useEffect(() => {
    fetchPortfolios();
    
    // Load portfolio report data from sessionStorage if available
    const storedData = sessionStorage.getItem('portfolio_report_data');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setPortfolioReportData(data);
        setSelectedPortfolio(data.portfolioId);
        setShowPreview(true); // Auto-show preview when coming from portfolio page
      } catch (error) {
        console.error('Error loading portfolio report data:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Update selected portfolio when URL param changes
    if (portfolioIdFromUrl) {
      setSelectedPortfolio(portfolioIdFromUrl);
    }
  }, [portfolioIdFromUrl]);

  async function fetchPortfolios() {
    try {
      const res = await fetch("/api/portfolios");
      if (res.ok) {
        const data = await res.json();
        setPortfolios(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch portfolios:", err);
    }
  }

  const userPortfolios = useMemo(() => portfolios, [portfolios]);

  const handleGenerateReport = async (format: "pdf" | "csv" | "xlsx") => {
    if (!portfolioReportData) {
      toast.error("No portfolio data available", {
        description: "Please select a portfolio or view from portfolio details page"
      });
      return;
    }

    setGenerating(true);
    toast.loading(`Generating ${format.toUpperCase()} report...`, { id: 'generate-report' });

    try {
      const exportData = {
        portfolioName: portfolioReportData.portfolioName,
        portfolioValue: portfolioReportData.portfolioValue,
        status: portfolioReportData.status,
        riskTolerance: portfolioReportData.riskTolerance,
        targetReturn: portfolioReportData.targetReturn,
        expectedReturn: portfolioReportData.expectedReturn,
        volatility: portfolioReportData.volatility,
        sharpeRatio: portfolioReportData.sharpeRatio,
        holdings: portfolioReportData.holdings,
        mlMetrics: portfolioReportData.mlMetrics,
        optimizedWeights: portfolioReportData.optimizedWeights,
        lastOptimized: portfolioReportData.lastOptimized,
      };

      if (format === 'pdf') {
        await generateEnhancedReport(exportData);
      } else if (format === 'csv') {
        exportToCSV(exportData);
      } else if (format === 'xlsx') {
        exportToExcel(exportData);
      }

      toast.success(`Report generated successfully`, {
        id: 'generate-report',
        description: `${format.toUpperCase()} file downloaded`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to generate report", {
        id: 'generate-report',
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setGenerating(false);
    }
  };

  const recentReports = [
    { id: "1", name: "Q3 Portfolio Performance Report", type: "Performance", date: "2024-10-31T00:00:00Z", format: "PDF" },
    { id: "2", name: "Monthly Risk Analysis - October", type: "Risk Analysis", date: "2024-10-30T00:00:00Z", format: "PDF" },
    { id: "3", name: "Portfolio Holdings Export", type: "Holdings", date: "2024-10-28T00:00:00Z", format: "CSV" },
  ];

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        {portfolioReportData && (
          <Link 
            href={`/portfolios/${portfolioReportData.portfolioId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portfolio
          </Link>
        )}
        <h1 className="mb-2">Reports & Export</h1>
        <p className="text-muted-foreground">
          {portfolioReportData 
            ? `Viewing optimization report for ${portfolioReportData.portfolioName}` 
            : "Generate and download portfolio reports with embedded charts and metrics"}
        </p>
      </div>

      {/* Report Generator */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-6">Generate New Report</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="report-type" className="block text-sm mb-2">Report Type</label>
            <select id="report-type" value={reportType} onChange={(e) => setReportType(e.target.value as "summary" | "detailed" | "performance")} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
              <option value="summary">Portfolio Summary</option>
              <option value="detailed">Detailed Analysis</option>
              <option value="performance">Performance Report</option>
            </select>
          </div>

          <div>
            <label htmlFor="portfolio-select" className="block text-sm mb-2">Select Portfolio</label>
            <select id="portfolio-select" value={selectedPortfolio} onChange={(e) => setSelectedPortfolio(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
              <option value="all">All Portfolios</option>
              {userPortfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date-range" className="block text-sm mb-2"><Calendar className="w-4 h-4 inline mr-1" aria-hidden="true" />Date Range</label>
            <select id="date-range" value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="ytd">Year to Date</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2"><Filter className="w-4 h-4 inline mr-1" aria-hidden="true" />Include Sections</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includePerformance} onChange={(e) => setIncludePerformance(e.target.checked)} className="rounded" />
                <span className="text-sm">Performance Metrics</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeHoldings} onChange={(e) => setIncludeHoldings(e.target.checked)} className="rounded" />
                <span className="text-sm">Holdings Breakdown</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} className="rounded" />
                <span className="text-sm">Charts & Visualizations</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mb-6 p-6 bg-muted/50 border border-border rounded-lg">
          <h4 className="mb-4">Report Preview</h4>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Report Type:</span><span className="capitalize">{reportType}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Portfolio:</span><span>{selectedPortfolio === "all" ? "All Portfolios" : userPortfolios.find((p) => p.id === selectedPortfolio)?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Period:</span><span className="capitalize">{dateRange}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Generated:</span><span>{formatDate(new Date().toISOString())}</span></div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowPreview(!showPreview)} className="flex-1 min-w-[150px] px-6 py-3 border border-border hover:bg-muted rounded-lg transition-colors flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" aria-hidden="true" />
            {showPreview ? "Hide Preview" : "Preview Report"}
          </button>
          <button onClick={() => handleGenerateReport("pdf")} disabled={generating} className="flex-1 min-w-[150px] px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" aria-hidden="true" />
            {generating ? "Generating..." : "Generate PDF"}
          </button>
          <button onClick={() => handleGenerateReport("csv")} disabled={generating} className="flex-1 min-w-[150px] px-6 py-3 border border-border hover:bg-muted rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </button>
          <button onClick={() => handleGenerateReport("xlsx")} disabled={generating} className="flex-1 min-w-[150px] px-6 py-3 border border-border hover:bg-muted rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Download className="w-4 h-4" aria-hidden="true" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {showPreview && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Report Preview</h3>
            <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">
              Close Preview
            </button>
          </div>
          {portfolioReportData ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <PortfolioReport 
                data={{
                  portfolioName: portfolioReportData.portfolioName,
                  generatedDate: new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }),
                  expectedReturn: portfolioReportData.expectedReturn,
                  volatility: portfolioReportData.volatility,
                  sharpeRatio: portfolioReportData.sharpeRatio,
                  numAssets: portfolioReportData.holdings.length,
                  lstmMetrics: portfolioReportData.mlMetrics ? {
                    mae: 0.0234,
                    rmse: 0.0312,
                    r2Score: 0.847,
                    mape: 4.52,
                    directionalAccuracy: 72.5,
                  } : {
                    mae: 0,
                    rmse: 0,
                    r2Score: 0,
                    mape: 0,
                    directionalAccuracy: 0,
                  },
                  garchMetrics: portfolioReportData.mlMetrics ? {
                    maeVolatility: 0.0156,
                    rmseVolatility: 0.0198,
                    aic: -1245.67,
                    bic: -1198.34,
                    logLikelihood: 632.84,
                    qStatistic: 8.42,
                    qStatPValue: 0.394,
                    archLMTest: 2.15,
                    archLMPValue: 0.542,
                  } : {
                    maeVolatility: 0,
                    rmseVolatility: 0,
                    aic: 0,
                    bic: 0,
                    logLikelihood: 0,
                    qStatistic: 0,
                    qStatPValue: 0,
                    archLMTest: 0,
                    archLMPValue: 0,
                  },
                  assets: portfolioReportData.holdings.map(h => ({
                    symbol: h.ticker,
                    name: h.name,
                    predictedReturn: h.expectedReturn || 0,
                    forecastedVolatility: h.volatility || 0,
                    weight: h.weight,
                    riskContribution: h.volatility ? (h.weight * h.volatility) / portfolioReportData.volatility : 0,
                  })),
                  lossData: Array.from({ length: 50 }, (_, i) => ({
                    epoch: i + 1,
                    loss: 0.5 * Math.exp(-i / 15) + 0.05 + Math.random() * 0.02,
                  })),
                  volatilityForecast: Array.from({ length: 30 }, (_, i) => {
                    const base = 0.15 + Math.sin(i / 5) * 0.03;
                    return {
                      date: `Day ${i + 1}`,
                      actual: i < 20 ? base + Math.random() * 0.02 : (null as number | null),
                      forecast: i >= 15 ? base + 0.01 : (null as number | null),
                      upper: i >= 15 ? base + 0.04 : (null as number | null),
                      lower: i >= 15 ? base - 0.02 : (null as number | null),
                    };
                  }),
                  efficientFrontier: Array.from({ length: 50 }, (_, i) => {
                    const vol = 0.10 + (i / 49) * 0.25;
                    const ret = 0.05 + Math.sqrt(vol - 0.10) * 0.35 - Math.pow(vol - 0.20, 2) * 0.2;
                    return {
                      volatility: vol,
                      return: ret,
                      sharpe: (ret - 0.03) / vol,
                    };
                  }),
                  optimalPortfolio: { 
                    volatility: portfolioReportData.volatility, 
                    return: portfolioReportData.expectedReturn 
                  },
                }}
              />
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <PortfolioReport />
            </div>
          )}
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4">Recent Reports</h3>
        <div className="space-y-3">
          {recentReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm">{report.name}</h4>
                  <p className="text-xs text-muted-foreground">{report.type} • {report.format} • Generated {formatDate(report.date)}</p>
                </div>
              </div>
              <button className="px-4 py-2 border border-border hover:bg-background rounded-lg transition-colors flex items-center gap-2" onClick={() => alert("Downloading report...")}> 
                <Download className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">Download</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Templates */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4">Report Templates</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: "Monthly Performance", description: "Comprehensive monthly portfolio review", sections: "Performance, Holdings, Risk Metrics" },
            { name: "Quarterly Review", description: "Quarterly analysis with recommendations", sections: "Summary, Trends, Forecasts" },
            { name: "Risk Assessment", description: "Detailed risk and volatility analysis", sections: "VaR, Volatility, Stress Tests" },
          ].map((t) => (
            <div key={t.name} className="p-4 border border-border rounded-lg hover:border-muted transition-colors cursor-pointer">
              <h4 className="mb-2">{t.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
              <p className="text-xs text-muted-foreground">Includes: {t.sections}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
