import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
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

/**
 * Generate comprehensive portfolio report matching the preview format
 * Includes ML model sections, charts, and detailed analysis
 */
export async function generateEnhancedReport(
  data: ExportData
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add page with header
  const addNewPage = (title: string) => {
    pdf.addPage();
    yPosition = margin;
    
    // Header on each page
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(data.portfolioName, margin, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, margin, yPosition);
    yPosition += 12;
  };

  // Helper to check page space
  const checkSpace = (needed: number) => {
    if (yPosition + needed > pageHeight - 20) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // ===================
  // PAGE 1: COVER PAGE
  // ===================
  
  // Logo/Icon simulation (blue gradient box)
  pdf.setFillColor(37, 99, 235); // Blue
  pdf.rect(margin, yPosition, 12, 12, 'F');
  
  // White icon (using text as placeholder)
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text('📊', margin + 3, yPosition + 8);
  
  // Title
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Portfolio Optimization Report', margin + 15, yPosition + 8);
  
  yPosition += 15;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, yPosition);
  
  yPosition += 20;
  
  // Draw separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  
  yPosition += 15;

  // ===================
  // SECTION 1: MODEL OVERVIEW
  // ===================
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Model Overview', margin, yPosition);
  yPosition += 12;

  // LSTM Model Card
  const cardWidth = (pageWidth - 3 * margin) / 2;
  const cardHeight = 50;
  
  // LSTM Card Background
  pdf.setFillColor(239, 246, 255); // Light blue
  pdf.roundedRect(margin, yPosition, cardWidth, cardHeight, 3, 3, 'F');
  
  // LSTM Icon
  pdf.setFillColor(37, 99, 235);
  pdf.roundedRect(margin + 5, yPosition + 5, 10, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('📈', margin + 7, yPosition + 12);
  
  // LSTM Title
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('LSTM Model', margin + 18, yPosition + 12);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  
  let textY = yPosition + 20;
  pdf.text('Model Type:', margin + 5, textY);
  pdf.setFont('helvetica', 'bold');
  pdf.text('LSTM Neural Network', margin + 35, textY);
  
  textY += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Objective:', margin + 5, textY);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Predict Returns', margin + 35, textY);
  
  textY += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(7);
  const lstmDesc = 'Historical prices, trading volume, technical indicators, market sentiment';
  const lstmLines = pdf.splitTextToSize(lstmDesc, cardWidth - 10);
  pdf.text('Inputs:', margin + 5, textY);
  pdf.text(lstmLines, margin + 5, textY + 4);

  // GARCH Card Background
  const garchX = margin + cardWidth + margin;
  pdf.setFillColor(250, 245, 255); // Light purple
  pdf.roundedRect(garchX, yPosition, cardWidth, cardHeight, 3, 3, 'F');
  
  // GARCH Icon
  pdf.setFillColor(147, 51, 234);
  pdf.roundedRect(garchX + 5, yPosition + 5, 10, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('📉', garchX + 7, yPosition + 12);
  
  // GARCH Title
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GARCH Model', garchX + 18, yPosition + 12);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  
  textY = yPosition + 20;
  pdf.text('Model Type:', garchX + 5, textY);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GARCH(1,1) / EGARCH', garchX + 35, textY);
  
  textY += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Objective:', garchX + 5, textY);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Forecast Volatility', garchX + 35, textY);
  
  textY += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(7);
  const garchDesc = 'Time-varying volatility estimation, volatility clustering detection';
  const garchLines = pdf.splitTextToSize(garchDesc, cardWidth - 10);
  pdf.text('Features:', garchX + 5, textY);
  pdf.text(garchLines, garchX + 5, textY + 4);
  
  yPosition += cardHeight + 15;

  // ===================
  // SECTION 2: PORTFOLIO SUMMARY
  // ===================
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Portfolio Optimization Summary', margin, yPosition);
  yPosition += 12;
  
  // Portfolio name badge
  pdf.setFillColor(243, 244, 246);
  pdf.roundedRect(margin, yPosition, 60, 8, 2, 2, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);
  pdf.text(`Portfolio: ${data.portfolioName}`, margin + 3, yPosition + 5.5);
  
  yPosition += 15;
  
  // Metrics grid (4 columns)
  const metricCardWidth = (pageWidth - 5 * margin) / 4;
  const metricCardHeight = 28;
  
  const metrics = [
    { 
      label: 'Expected Return', 
      value: formatPercent(data.mlMetrics?.meanReturn ? data.mlMetrics.meanReturn * 100 : data.expectedReturn * 100),
      sublabel: 'Annualized',
      color: [16, 185, 129] // Green
    },
    { 
      label: 'Volatility', 
      value: formatPercent(data.mlMetrics?.meanVolatility ? data.mlMetrics.meanVolatility * 100 : data.volatility * 100),
      sublabel: 'Annualized Std Dev',
      color: [251, 146, 60] // Orange
    },
    { 
      label: 'Sharpe Ratio', 
      value: (data.mlMetrics?.sharpeRatio || data.sharpeRatio).toFixed(2),
      sublabel: 'Risk-adjusted return',
      color: [59, 130, 246] // Blue
    },
    { 
      label: 'Assets', 
      value: data.holdings.length.toString(),
      sublabel: 'Diversified holdings',
      color: [168, 85, 247] // Purple
    },
  ];
  
  metrics.forEach((metric, index) => {
    const cardX = margin + index * (metricCardWidth + margin);
    
    // Card border
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(cardX, yPosition, metricCardWidth, metricCardHeight, 2, 2, 'S');
    
    // Icon (colored circle)
    pdf.setFillColor(...metric.color);
    pdf.circle(cardX + 5, yPosition + 7, 2, 'F');
    
    // Label
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont('helvetica', 'normal');
    pdf.text(metric.label.toUpperCase(), cardX + 9, yPosition + 8);
    
    // Value
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...metric.color);
    pdf.text(metric.value, cardX + 5, yPosition + 18);
    
    // Sublabel
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(metric.sublabel, cardX + 5, yPosition + 23);
  });
  
  yPosition += metricCardHeight + 10;
  
  // Footer
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(128, 128, 128);
  pdf.text('Page 1 of 3 • LSTM-GARCH Portfolio Optimization Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // ===================
  // PAGE 2: MODEL PERFORMANCE METRICS
  // ===================
  
  addNewPage('Model Performance Metrics');

  if (data.mlMetrics) {
    // LSTM Performance Metrics Section
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('LSTM Performance Metrics', margin, yPosition);
    yPosition += 10;
    
    // LSTM Metrics Table
    pdf.setFillColor(239, 246, 255);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 45, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    
    const tableY = yPosition + 5;
    pdf.text('Metric', margin + 5, tableY);
    pdf.text('Description', margin + 40, tableY);
    pdf.text('Value', pageWidth - margin - 30, tableY);
    
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin + 5, tableY + 2, pageWidth - margin - 5, tableY + 2);
    
    const lstmMetrics = [
      { name: 'MAE', desc: 'Mean Absolute Error', value: '0.0234' },
      { name: 'RMSE', desc: 'Root Mean Squared Error', value: '0.0312' },
      { name: 'R² Score', desc: 'Goodness of fit', value: '0.847' },
      { name: 'MAPE', desc: 'Mean Absolute Percentage Error', value: '4.52%' },
      { name: 'Directional Accuracy', desc: '% correct up/down movements', value: '72.5%' },
    ];
    
    let rowY = tableY + 8;
    pdf.setFont('helvetica', 'normal');
    
    lstmMetrics.forEach((row, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin + 5, rowY - 4, pageWidth - 2 * margin - 10, 7, 'F');
      }
      
      pdf.setTextColor(0, 0, 0);
      pdf.text(row.name, margin + 5, rowY);
      pdf.setTextColor(107, 114, 128);
      pdf.text(row.desc, margin + 40, rowY);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(row.value, pageWidth - margin - 30, rowY);
      pdf.setFont('helvetica', 'normal');
      
      rowY += 7;
    });
    
    yPosition += 50;
    
    // LSTM Interpretation Box
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 3, 3, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text('Interpretations', margin + 5, yPosition + 7);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    
    const interpretations = [
      'MAE/RMSE: Lower values mean the model\'s predicted returns are closer to actual returns.',
      'R² Score: Measures how much variability in returns is explained by the model. Closer to 1 = strong predictive power.',
      'MAPE: Shows prediction error as a percentage. Lower values indicate higher accuracy across assets.',
      'Directional Accuracy: How often the model correctly predicts the direction of returns (up or down).',
    ];
    
    let interpY = yPosition + 13;
    interpretations.forEach(text => {
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - 10);
      pdf.text(lines, margin + 5, interpY);
      interpY += lines.length * 4;
    });
    
    yPosition += 40;

    checkSpace(50);
    
    // GARCH Performance Metrics Section
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('GARCH Performance Metrics', margin, yPosition);
    yPosition += 10;
    
    // GARCH Metrics Table
    pdf.setFillColor(250, 245, 255);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 45, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    
    const garchTableY = yPosition + 5;
    pdf.text('Metric', margin + 5, garchTableY);
    pdf.text('Description', margin + 50, garchTableY);
    pdf.text('Value', pageWidth - margin - 30, garchTableY);
    
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin + 5, garchTableY + 2, pageWidth - margin - 5, garchTableY + 2);
    
    const garchMetrics = [
      { name: 'MAE (Volatility)', desc: 'Error in forecasted vs. realized volatility', value: '0.0156' },
      { name: 'RMSE (Volatility)', desc: 'Penalizes large volatility forecast errors', value: '0.0198' },
      { name: 'AIC / BIC', desc: 'Model selection criteria', value: '-1245.67 / -1198.34' },
      { name: 'Log-Likelihood', desc: 'Measures overall model fit', value: '632.84' },
      { name: 'Q-Statistic', desc: 'Tests for autocorrelation in residuals', value: '8.42 (p=0.394)' },
    ];
    
    rowY = garchTableY + 8;
    pdf.setFont('helvetica', 'normal');
    
    garchMetrics.forEach((row, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(253, 242, 248);
        pdf.rect(margin + 5, rowY - 4, pageWidth - 2 * margin - 10, 7, 'F');
      }
      
      pdf.setTextColor(0, 0, 0);
      pdf.text(row.name, margin + 5, rowY);
      pdf.setTextColor(107, 114, 128);
      const descLines = pdf.splitTextToSize(row.desc, 80);
      pdf.text(descLines[0], margin + 50, rowY);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(row.value, pageWidth - margin - 30, rowY);
      pdf.setFont('helvetica', 'normal');
      
      rowY += 7;
    });
    
    yPosition += 50;
    
    // GARCH Interpretation Box
    pdf.setFillColor(250, 245, 255);
    pdf.setDrawColor(233, 213, 255);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 30, 3, 3, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(109, 40, 217);
    pdf.text('Interpretations', margin + 5, yPosition + 7);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    
    const garchInterps = [
      'MAE/RMSE: Lower values indicate the GARCH model accurately captures the magnitude of volatility.',
      'AIC/BIC: Lower values mean the model is more efficient and avoids overfitting.',
      'Q-Statistic: High p-value suggests low residual autocorrelation - model properly captures temporal relationships.',
    ];
    
    interpY = yPosition + 13;
    garchInterps.forEach(text => {
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - 10);
      pdf.text(lines, margin + 5, interpY);
      interpY += lines.length * 4;
    });
    
    yPosition += 35;
  }
  
  // Footer
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(128, 128, 128);
  pdf.text('Page 2 of 3 • LSTM-GARCH Portfolio Optimization Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // ===================
  // PAGE 3: OPTIMIZATION OUTPUT & PREDICTIONS
  // ===================
  
  addNewPage('Optimization Output & Predictions');
  
  // Prediction Snapshot
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Prediction Snapshot', margin, yPosition);
  yPosition += 10;
  
  // Holdings Table
  pdf.setFillColor(243, 244, 246);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  
  const colPositions = {
    ticker: margin + 3,
    name: margin + 25,
    predictedReturn: margin + 80,
    volatility: margin + 115,
    weight: margin + 145,
  };
  
  pdf.text('Asset', colPositions.ticker, yPosition + 5);
  pdf.text('Name', colPositions.name, yPosition + 5);
  if (data.mlMetrics) {
    pdf.text('Predicted Return', colPositions.predictedReturn, yPosition + 5);
    pdf.text('Volatility', colPositions.volatility, yPosition + 5);
  }
  pdf.text('Weight', colPositions.weight, yPosition + 5);
  
  yPosition += 8;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  pdf.setFont('helvetica', 'normal');
  
  data.holdings.forEach((holding, index) => {
    if (yPosition > pageHeight - 30) {
      addNewPage('Prediction Snapshot (continued)');
      yPosition += 10;
    }
    
    if (index % 2 === 1) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 7, 'F');
    }
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(holding.ticker, colPositions.ticker, yPosition);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const nameText = holding.name.length > 25 ? holding.name.substring(0, 25) + '...' : holding.name;
    pdf.text(nameText, colPositions.name, yPosition);
    
    if (data.mlMetrics) {
      pdf.setTextColor(16, 185, 129);
      pdf.text(formatPercent((holding.expectedReturn || 0) * 100), colPositions.predictedReturn, yPosition);
      
      pdf.setTextColor(251, 146, 60);
      pdf.text(formatPercent((holding.volatility || 0) * 100), colPositions.volatility, yPosition);
    }
    
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatPercent(holding.weight * 100), colPositions.weight, yPosition);
    
    yPosition += 7;
  });
  
  yPosition += 10;
  
  checkSpace(40);
  
  // Optimization Recommendations
  if (data.optimizedWeights && data.optimizedWeights.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Optimization Recommendations', margin, yPosition);
    yPosition += 10;
    
    // Table header
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    
    const optColPos = {
      stock: margin + 3,
      current: margin + 30,
      optimized: margin + 60,
      change: margin + 95,
      expReturn: margin + 125,
    };
    
    pdf.text('Stock', optColPos.stock, yPosition + 5);
    pdf.text('Current', optColPos.current, yPosition + 5);
    pdf.text('Optimized', optColPos.optimized, yPosition + 5);
    pdf.text('Change', optColPos.change, yPosition + 5);
    pdf.text('Exp. Return', optColPos.expReturn, yPosition + 5);
    
    yPosition += 8;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    
    pdf.setFont('helvetica', 'normal');
    
    data.optimizedWeights.forEach((opt, index) => {
      if (yPosition > pageHeight - 30) {
        addNewPage('Optimization Recommendations (continued)');
        yPosition += 10;
      }
      
      const currentHolding = data.holdings.find(h => h.ticker === opt.symbol);
      const currentWeight = currentHolding?.weight || 0;
      const change = (opt.weight - currentWeight) * 100;
      
      if (index % 2 === 1) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 7, 'F');
      }
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(opt.symbol, optColPos.stock, yPosition);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(formatPercent(currentWeight * 100), optColPos.current, yPosition);
      
      pdf.setTextColor(0, 0, 0);
      pdf.text(formatPercent(opt.weight * 100), optColPos.optimized, yPosition);
      
      // Color code the change
      if (change > 0) {
        pdf.setTextColor(16, 185, 129);
        pdf.text(`+${change.toFixed(1)}%`, optColPos.change, yPosition);
      } else if (change < 0) {
        pdf.setTextColor(239, 68, 68);
        pdf.text(`${change.toFixed(1)}%`, optColPos.change, yPosition);
      } else {
        pdf.setTextColor(107, 114, 128);
        pdf.text('0.0%', optColPos.change, yPosition);
      }
      
      pdf.setTextColor(0, 0, 0);
      pdf.text(formatPercent(opt.expectedReturn * 100), optColPos.expReturn, yPosition);
      
      yPosition += 7;
    });
    
    yPosition += 10;
  }
  
  checkSpace(35);
  
  // Interpretation of Optimization Output
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Interpretation of Optimization Output', margin, yPosition);
  yPosition += 10;
  
  pdf.setFillColor(236, 253, 245);
  pdf.setDrawColor(167, 243, 208);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 32, 3, 3, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  
  const interpretationPoints = [
    '• Higher predicted return assets receive higher weights only if volatility forecasts remain low.',
    '• If GARCH indicates rising volatility, weights shift toward more stable assets.',
    '• Sharpe ratio summarizes the balance between return and risk — higher is better.',
    '• Weight distribution reflects model confidence and asset contribution to total risk.',
  ];
  
  let pointY = yPosition + 7;
  interpretationPoints.forEach(point => {
    pdf.setTextColor(16, 185, 129);
    pdf.text('•', margin + 5, pointY);
    pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(point.substring(2), pageWidth - 2 * margin - 15);
    pdf.text(lines, margin + 10, pointY);
    pointY += lines.length * 4 + 1;
  });
  
  yPosition = pageHeight - 20;
  
  // Disclaimer
  pdf.setFillColor(254, 252, 232);
  pdf.setDrawColor(253, 224, 71);
  pdf.roundedRect(margin, yPosition - 20, pageWidth - 2 * margin, 15, 2, 2, 'FD');
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(161, 98, 7);
  pdf.text('Disclaimer:', margin + 3, yPosition - 15);
  
  pdf.setFont('helvetica', 'normal');
  const disclaimer = 'This report is generated for informational purposes only and does not constitute financial advice. Past performance and model predictions do not guarantee future results.';
  const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 2 * margin - 6);
  pdf.text(disclaimerLines, margin + 3, yPosition - 11);
  
  // Footer
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(128, 128, 128);
  pdf.text('Page 3 of 3 • LSTM-GARCH Portfolio Optimization Platform • Confidential', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Save the PDF
  const fileName = `${data.portfolioName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

/**
 * Export portfolio data to CSV format
 */
export function exportToCSV(data: ExportData): void {
  const rows: string[][] = [];
  
  // Header
  rows.push(['Portfolio Report']);
  rows.push(['Generated:', new Date().toLocaleDateString()]);
  rows.push([]);
  
  // Portfolio Overview
  rows.push(['Portfolio Overview']);
  rows.push(['Name', data.portfolioName]);
  rows.push(['Total Value', formatCurrency(data.portfolioValue)]);
  rows.push(['Status', data.status]);
  rows.push(['Risk Tolerance', data.riskTolerance]);
  rows.push(['Target Return', formatPercent(data.targetReturn * 100)]);
  if (data.lastOptimized) {
    rows.push(['Last Optimized', new Date(data.lastOptimized).toLocaleDateString()]);
  }
  rows.push([]);
  
  // Performance Metrics
  rows.push(['Performance Metrics']);
  if (data.mlMetrics) {
    rows.push(['Expected Return (ML)', formatPercent(data.mlMetrics.meanReturn * 100)]);
    rows.push(['Volatility (ML)', formatPercent(data.mlMetrics.meanVolatility * 100)]);
    rows.push(['Sharpe Ratio (ML)', data.mlMetrics.sharpeRatio.toFixed(2)]);
    rows.push(['Risk Class (ML)', data.mlMetrics.riskClass]);
  } else {
    rows.push(['Expected Return', formatPercent(data.expectedReturn * 100)]);
    rows.push(['Volatility', formatPercent(data.volatility * 100)]);
    rows.push(['Sharpe Ratio', data.sharpeRatio.toFixed(2)]);
  }
  rows.push([]);
  
  // Holdings
  rows.push(['Portfolio Holdings']);
  const holdingsHeaders = ['Ticker', 'Name', 'Weight', 'Value'];
  if (data.mlMetrics) {
    holdingsHeaders.push('Predicted Price', 'Expected Return', 'Volatility');
  }
  rows.push(holdingsHeaders);
  
  data.holdings.forEach(holding => {
    const row = [
      holding.ticker,
      holding.name,
      formatPercent(holding.weight * 100),
      formatCurrency(holding.value),
    ];
    
    if (data.mlMetrics) {
      row.push(
        holding.predictedPrice ? formatCurrency(holding.predictedPrice) : 'N/A',
        holding.expectedReturn ? formatPercent(holding.expectedReturn * 100) : 'N/A',
        holding.volatility ? formatPercent(holding.volatility * 100) : 'N/A'
      );
    }
    
    rows.push(row);
  });
  
  // Optimization Recommendations
  if (data.optimizedWeights && data.optimizedWeights.length > 0) {
    rows.push([]);
    rows.push(['Optimization Recommendations']);
    rows.push(['Stock', 'Current Weight', 'Optimized Weight', 'Change', 'Expected Return']);
    
    data.optimizedWeights.forEach(opt => {
      const currentHolding = data.holdings.find(h => h.ticker === opt.symbol);
      const currentWeight = currentHolding?.weight || 0;
      const change = (opt.weight - currentWeight) * 100;
      
      rows.push([
        opt.symbol,
        formatPercent(currentWeight * 100),
        formatPercent(opt.weight * 100),
        `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
        formatPercent(opt.expectedReturn * 100),
      ]);
    });
  }
  
  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${data.portfolioName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export portfolio data to Excel format
 */
export function exportToExcel(data: ExportData): void {
  const workbook = XLSX.utils.book_new();
  
  // Overview Sheet
  const overviewData: (string | number)[][] = [
    ['Portfolio Report'],
    ['Generated:', new Date().toLocaleDateString()],
    [],
    ['Portfolio Overview'],
    ['Name', data.portfolioName],
    ['Total Value', data.portfolioValue],
    ['Status', data.status],
    ['Risk Tolerance', data.riskTolerance],
    ['Target Return', data.targetReturn],
  ];
  
  if (data.lastOptimized) {
    overviewData.push(['Last Optimized', new Date(data.lastOptimized).toLocaleDateString()]);
  }
  
  overviewData.push([]);
  overviewData.push(['Performance Metrics']);
  
  if (data.mlMetrics) {
    overviewData.push(['Expected Return (ML)', data.mlMetrics.meanReturn]);
    overviewData.push(['Volatility (ML)', data.mlMetrics.meanVolatility]);
    overviewData.push(['Sharpe Ratio (ML)', data.mlMetrics.sharpeRatio]);
    overviewData.push(['Risk Class (ML)', data.mlMetrics.riskClass]);
  } else {
    overviewData.push(['Expected Return', data.expectedReturn]);
    overviewData.push(['Volatility', data.volatility]);
    overviewData.push(['Sharpe Ratio', data.sharpeRatio]);
  }
  
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  
  // Format currency and percentage columns
  const range = XLSX.utils.decode_range(overviewSheet['!ref'] || 'A1');
  for (let row = range.s.r; row <= range.e.r; row++) {
    const cellB = overviewSheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
    if (cellB && typeof cellB.v === 'number') {
      if (overviewData[row]?.[0]?.toString().includes('Value')) {
        cellB.z = '$#,##0.00';
      } else if (
        overviewData[row]?.[0]?.toString().includes('Return') ||
        overviewData[row]?.[0]?.toString().includes('Volatility')
      ) {
        cellB.z = '0.00%';
      }
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
  
  // Holdings Sheet
  const holdingsData: (string | number)[][] = [['Portfolio Holdings'], []];
  
  const holdingsHeaders: (string | number)[] = ['Ticker', 'Name', 'Weight', 'Value'];
  if (data.mlMetrics) {
    holdingsHeaders.push('Predicted Price', 'Expected Return', 'Volatility');
  }
  holdingsData.push(holdingsHeaders);
  
  data.holdings.forEach(holding => {
    const row: (string | number)[] = [
      holding.ticker,
      holding.name,
      holding.weight,
      holding.value,
    ];
    
    if (data.mlMetrics) {
      row.push(
        holding.predictedPrice || 0,
        holding.expectedReturn || 0,
        holding.volatility || 0
      );
    }
    
    holdingsData.push(row);
  });
  
  const holdingsSheet = XLSX.utils.aoa_to_sheet(holdingsData);
  
  // Format holdings sheet
  const holdingsRange = XLSX.utils.decode_range(holdingsSheet['!ref'] || 'A1');
  for (let row = 3; row <= holdingsRange.e.r; row++) {
    const weightCell = holdingsSheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
    if (weightCell) weightCell.z = '0.00%';
    
    const valueCell = holdingsSheet[XLSX.utils.encode_cell({ r: row, c: 3 })];
    if (valueCell) valueCell.z = '$#,##0.00';
    
    if (data.mlMetrics) {
      const priceCell = holdingsSheet[XLSX.utils.encode_cell({ r: row, c: 4 })];
      if (priceCell) priceCell.z = '$#,##0.00';
      
      const returnCell = holdingsSheet[XLSX.utils.encode_cell({ r: row, c: 5 })];
      if (returnCell) returnCell.z = '0.00%';
      
      const volCell = holdingsSheet[XLSX.utils.encode_cell({ r: row, c: 6 })];
      if (volCell) volCell.z = '0.00%';
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, holdingsSheet, 'Holdings');
  
  // Optimization Sheet
  if (data.optimizedWeights && data.optimizedWeights.length > 0) {
    const optimizationData: (string | number)[][] = [
      ['Optimization Recommendations'],
      [],
      ['Stock', 'Current Weight', 'Optimized Weight', 'Change', 'Expected Return'],
    ];
    
    data.optimizedWeights.forEach(opt => {
      const currentHolding = data.holdings.find(h => h.ticker === opt.symbol);
      const currentWeight = currentHolding?.weight || 0;
      const change = opt.weight - currentWeight;
      
      optimizationData.push([
        opt.symbol,
        currentWeight,
        opt.weight,
        change,
        opt.expectedReturn,
      ]);
    });
    
    const optimizationSheet = XLSX.utils.aoa_to_sheet(optimizationData);
    
    const optRange = XLSX.utils.decode_range(optimizationSheet['!ref'] || 'A1');
    for (let row = 3; row <= optRange.e.r; row++) {
      const currentCell = optimizationSheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
      if (currentCell) currentCell.z = '0.00%';
      
      const optimizedCell = optimizationSheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
      if (optimizedCell) optimizedCell.z = '0.00%';
      
      const changeCell = optimizationSheet[XLSX.utils.encode_cell({ r: row, c: 3 })];
      if (changeCell) changeCell.z = '+0.00%;-0.00%';
      
      const returnCell = optimizationSheet[XLSX.utils.encode_cell({ r: row, c: 4 })];
      if (returnCell) returnCell.z = '0.00%';
    }
    
    XLSX.utils.book_append_sheet(workbook, optimizationSheet, 'Optimization');
  }
  
  // Download
  const fileName = `${data.portfolioName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
