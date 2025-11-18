import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency, formatPercent } from './utils';

interface ExportData {
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

export async function generatePortfolioReport(data: ExportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Portfolio Investment Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  // Date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Portfolio Overview Section
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Portfolio Overview', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const overviewLines = [
    `Portfolio Name: ${data.portfolioName}`,
    `Total Value: ${formatCurrency(data.portfolioValue)}`,
    `Status: ${data.status}`,
    `Risk Tolerance: ${data.riskTolerance}`,
    `Target Return: ${formatPercent(data.targetReturn * 100)}`,
  ];
  
  if (data.lastOptimized) {
    overviewLines.push(`Last Optimized: ${new Date(data.lastOptimized).toLocaleDateString()}`);
  }

  overviewLines.forEach(line => {
    pdf.text(line, 20, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Performance Metrics Section
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Performance Metrics', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const metricsLines = data.mlMetrics ? [
    `Expected Return: ${formatPercent(data.mlMetrics.meanReturn * 100)} (ML Predicted)`,
    `Volatility: ${formatPercent(data.mlMetrics.meanVolatility * 100)} (ML Predicted)`,
    `Sharpe Ratio: ${data.mlMetrics.sharpeRatio.toFixed(2)} (ML Calculated)`,
    `Risk Class: ${data.mlMetrics.riskClass} (ML Based)`,
  ] : [
    `Expected Return: ${formatPercent(data.expectedReturn * 100)}`,
    `Volatility: ${formatPercent(data.volatility * 100)}`,
    `Sharpe Ratio: ${data.sharpeRatio.toFixed(2)}`,
  ];

  metricsLines.forEach(line => {
    pdf.text(line, 20, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Holdings Section
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Portfolio Holdings', 20, yPosition);
  yPosition += 10;

  // Table headers
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ticker', 20, yPosition);
  pdf.text('Name', 45, yPosition);
  pdf.text('Weight', 100, yPosition);
  pdf.text('Value', 125, yPosition);
  
  if (data.mlMetrics) {
    pdf.text('Predicted', 155, yPosition);
    pdf.text('Exp. Return', 175, yPosition);
  }
  
  yPosition += 7;

  // Draw line under headers
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);

  // Table rows
  pdf.setFont('helvetica', 'normal');
  data.holdings.forEach((holding) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
      
      // Repeat headers on new page
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ticker', 20, yPosition);
      pdf.text('Name', 45, yPosition);
      pdf.text('Weight', 100, yPosition);
      pdf.text('Value', 125, yPosition);
      if (data.mlMetrics) {
        pdf.text('Predicted', 155, yPosition);
        pdf.text('Exp. Return', 175, yPosition);
      }
      yPosition += 7;
      pdf.setFont('helvetica', 'normal');
    }

    pdf.text(holding.ticker, 20, yPosition);
    pdf.text(holding.name.substring(0, 25), 45, yPosition);
    pdf.text(formatPercent(holding.weight * 100), 100, yPosition);
    pdf.text(formatCurrency(holding.value), 125, yPosition);
    
    if (data.mlMetrics && holding.predictedPrice !== undefined) {
      pdf.text(formatCurrency(holding.predictedPrice), 155, yPosition);
      pdf.text(formatPercent((holding.expectedReturn || 0) * 100), 175, yPosition);
    }
    
    yPosition += 7;
  });

  yPosition += 10;

  // Optimization Recommendations Section
  if (data.optimizedWeights && data.optimizedWeights.length > 0) {
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Optimization Recommendations', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Based on ML predictions and Sharpe Ratio optimization:', 20, yPosition);
    yPosition += 10;

    // Optimization table headers
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Stock', 20, yPosition);
    pdf.text('Current', 60, yPosition);
    pdf.text('Optimized', 90, yPosition);
    pdf.text('Change', 125, yPosition);
    pdf.text('Exp. Return', 155, yPosition);
    yPosition += 7;

    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);

    // Optimization rows
    pdf.setFont('helvetica', 'normal');
    data.optimizedWeights.forEach((opt) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }

      const currentHolding = data.holdings.find(h => h.ticker === opt.symbol);
      const currentWeight = currentHolding?.weight || 0;
      const change = (opt.weight - currentWeight) * 100;

      pdf.text(opt.symbol, 20, yPosition);
      pdf.text(formatPercent(currentWeight * 100), 60, yPosition);
      pdf.text(formatPercent(opt.weight * 100), 90, yPosition);
      
      // Color code the change
      if (change > 0) {
        pdf.setTextColor(0, 150, 0); // Green for increase
        pdf.text(`+${change.toFixed(1)}%`, 125, yPosition);
      } else if (change < 0) {
        pdf.setTextColor(200, 0, 0); // Red for decrease
        pdf.text(`${change.toFixed(1)}%`, 125, yPosition);
      } else {
        pdf.text('0.0%', 125, yPosition);
      }
      
      pdf.setTextColor(0, 0, 0); // Reset to black
      pdf.text(formatPercent(opt.expectedReturn * 100), 155, yPosition);
      
      yPosition += 7;
    });
  }

  // Add footer to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    pdf.text(
      'Portfolio Optimization System - Confidential',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `${data.portfolioName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

export async function captureChartAsImage(chartElementId: string): Promise<string | null> {
  const chartElement = document.getElementById(chartElementId);
  if (!chartElement) return null;

  try {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing chart:', error);
    return null;
  }
}

export async function generateEnhancedReport(
  data: ExportData,
  allocationChartId?: string,
  riskReturnChartId?: string
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title Page
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Portfolio Investment Report', pageWidth / 2, 60, { align: 'center' });
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.portfolioName, pageWidth / 2, 80, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 100, { align: 'center' });
  
  // Add allocation chart if available
  if (allocationChartId) {
    const chartImage = await captureChartAsImage(allocationChartId);
    if (chartImage) {
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Asset Allocation', 20, yPosition);
      yPosition += 10;
      pdf.addImage(chartImage, 'PNG', 20, yPosition, pageWidth - 40, 120);
    }
  }

  // Add risk-return chart if available
  if (riskReturnChartId) {
    const chartImage = await captureChartAsImage(riskReturnChartId);
    if (chartImage) {
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Risk-Return Analysis', 20, yPosition);
      yPosition += 10;
      pdf.addImage(chartImage, 'PNG', 20, yPosition, pageWidth - 40, 120);
    }
  }

  // Continue with text-based content
  pdf.addPage();
  yPosition = 20;

  // Portfolio Overview
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Portfolio Overview', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const overviewLines = [
    `Total Value: ${formatCurrency(data.portfolioValue)}`,
    `Status: ${data.status}`,
    `Risk Tolerance: ${data.riskTolerance}`,
    `Target Return: ${formatPercent(data.targetReturn * 100)}`,
  ];

  overviewLines.forEach(line => {
    pdf.text(line, 20, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Performance Metrics
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Performance Metrics', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  if (data.mlMetrics) {
    const mlLines = [
      'ML-Based Predictions:',
      `  Expected Return: ${formatPercent(data.mlMetrics.meanReturn * 100)}`,
      `  Volatility: ${formatPercent(data.mlMetrics.meanVolatility * 100)}`,
      `  Sharpe Ratio: ${data.mlMetrics.sharpeRatio.toFixed(2)}`,
      `  Risk Classification: ${data.mlMetrics.riskClass}`,
    ];
    mlLines.forEach(line => {
      if (line.startsWith('  ')) {
        pdf.setFont('helvetica', 'normal');
      } else {
        pdf.setFont('helvetica', 'bold');
      }
      pdf.text(line, 20, yPosition);
      yPosition += 7;
    });
  }

  yPosition += 5;

  // Holdings Table
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Portfolio Holdings', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ticker', 20, yPosition);
  pdf.text('Weight', 80, yPosition);
  pdf.text('Value', 110, yPosition);
  if (data.mlMetrics) {
    pdf.text('Expected Return', 145, yPosition);
  }
  yPosition += 7;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);

  pdf.setFont('helvetica', 'normal');
  data.holdings.forEach((holding) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.text(holding.ticker, 20, yPosition);
    pdf.text(formatPercent(holding.weight * 100), 80, yPosition);
    pdf.text(formatCurrency(holding.value), 110, yPosition);
    
    if (data.mlMetrics && holding.expectedReturn !== undefined) {
      pdf.text(formatPercent(holding.expectedReturn * 100), 145, yPosition);
    }
    
    yPosition += 7;
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const fileName = `${data.portfolioName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}
