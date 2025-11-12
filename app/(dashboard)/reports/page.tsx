"use client";

import { useMemo, useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { FileText, Download, Calendar, Filter } from "lucide-react";

interface Portfolio {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [reportType, setReportType] = useState<"summary" | "detailed" | "performance">("summary");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("all");
  const [dateRange, setDateRange] = useState("30d");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, []);

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
    setGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setGenerating(false);
    alert(`Report generated successfully as ${format.toUpperCase()}`);
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
        <h1 className="mb-2">Reports & Export</h1>
        <p className="text-muted-foreground">Generate and download portfolio reports with embedded charts and metrics</p>
      </div>

      {/* Report Generator */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-6">Generate New Report</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="report-type" className="block text-sm mb-2">Report Type</label>
            <select id="report-type" value={reportType} onChange={(e) => setReportType(e.target.value as any)} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
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
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /><span className="text-sm">Performance Metrics</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /><span className="text-sm">Holdings Breakdown</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /><span className="text-sm">Charts & Visualizations</span></label>
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
