import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { TrendingUp, Activity, Target, BarChart3 } from 'lucide-react';

interface ReportData {
  portfolioName: string;
  generatedDate: string;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  numAssets: number;
  lstmMetrics: {
    mae: number;
    rmse: number;
    r2Score: number;
    mape: number;
    directionalAccuracy: number;
  };
  garchMetrics: {
    maeVolatility: number;
    rmseVolatility: number;
    aic: number;
    bic: number;
    logLikelihood: number;
    qStatistic: number;
    qStatPValue: number;
    archLMTest: number;
    archLMPValue: number;
  };
  assets: Array<{
    symbol: string;
    name: string;
    predictedReturn: number;
    forecastedVolatility: number;
    weight: number;
    riskContribution: number;
  }>;
  lossData: Array<{ epoch: number; loss: number }>;
  volatilityForecast: Array<{ date: string; actual: number; forecast: number; upper: number; lower: number }>;
  efficientFrontier: Array<{ volatility: number; return: number; sharpe: number }>;
  optimalPortfolio: { volatility: number; return: number };
}

const mockReportData: ReportData = {
  portfolioName: 'NSE Growth Portfolio',
  generatedDate: new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }),
  expectedReturn: 0.26,
  volatility: 0.20,
  sharpeRatio: 1.05,
  numAssets: 6,
  lstmMetrics: {
    mae: 0.0234,
    rmse: 0.0312,
    r2Score: 0.847,
    mape: 4.52,
    directionalAccuracy: 72.5,
  },
  garchMetrics: {
    maeVolatility: 0.0156,
    rmseVolatility: 0.0198,
    aic: -1245.67,
    bic: -1198.34,
    logLikelihood: 632.84,
    qStatistic: 8.42,
    qStatPValue: 0.394,
    archLMTest: 2.15,
    archLMPValue: 0.542,
  },
  assets: [
    {
      symbol: 'SCOM',
      name: 'Safaricom PLC',
      predictedReturn: 0.085,
      forecastedVolatility: 0.123,
      weight: 0.25,
      riskContribution: 0.28,
    },
    {
      symbol: 'EQTY',
      name: 'Equity Group Holdings',
      predictedReturn: 0.121,
      forecastedVolatility: 0.157,
      weight: 0.20,
      riskContribution: 0.24,
    },
    {
      symbol: 'KCB',
      name: 'KCB Group',
      predictedReturn: 0.068,
      forecastedVolatility: 0.112,
      weight: 0.18,
      riskContribution: 0.17,
    },
    {
      symbol: 'EABL',
      name: 'East African Breweries',
      predictedReturn: 0.103,
      forecastedVolatility: 0.185,
      weight: 0.15,
      riskContribution: 0.16,
    },
    {
      symbol: 'BAT',
      name: 'British American Tobacco',
      predictedReturn: 0.052,
      forecastedVolatility: 0.098,
      weight: 0.12,
      riskContribution: 0.08,
    },
    {
      symbol: 'SCBK',
      name: 'Standard Chartered Bank',
      predictedReturn: 0.078,
      forecastedVolatility: 0.134,
      weight: 0.10,
      riskContribution: 0.07,
    },
  ],
  lossData: Array.from({ length: 50 }, (_, i) => ({
    epoch: i + 1,
    loss: 0.5 * Math.exp(-i / 15) + 0.05 + Math.random() * 0.02,
  })),
  volatilityForecast: Array.from({ length: 30 }, (_, i) => {
    const base = 0.15 + Math.sin(i / 5) * 0.03;
    return {
      date: `Day ${i + 1}`,
      actual: i < 20 ? base + Math.random() * 0.02 : null as any,
      forecast: i >= 15 ? base + 0.01 : null as any,
      upper: i >= 15 ? base + 0.04 : null as any,
      lower: i >= 15 ? base - 0.02 : null as any,
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
  optimalPortfolio: { volatility: 0.20, return: 0.26 },
};

export function PortfolioReport({ data = mockReportData }: { data?: ReportData }) {
  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatDecimal = (value: number, decimals: number = 4) => value.toFixed(decimals);

  return (
    <div className="bg-white text-gray-900 print:bg-white">
      {/* PAGE 1 - COVER & SUMMARY */}
      <div className="min-h-screen p-12 flex flex-col page-break-after">
        {/* Header */}
        <div className="border-b border-gray-300 pb-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl text-gray-900">Portfolio Optimization Report</h1>
                <p className="text-sm text-gray-600 mt-1">Generated on: {data.generatedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Model Overview */}
        <div className="mb-10">
          <h2 className="text-xl text-gray-900 mb-6 pb-2 border-b border-gray-200">Model Overview</h2>
          <div className="grid grid-cols-2 gap-6">
            {/* LSTM Card */}
            <div className="border border-gray-300 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg text-gray-900">LSTM Model</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Model Type:</span>
                  <span className="text-gray-900">LSTM Neural Network</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Objective:</span>
                  <span className="text-gray-900">Predict Returns</span>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <span className="text-gray-600">Inputs:</span>
                  <span className="text-gray-900 text-xs">Historical prices, trading volume, technical indicators, market sentiment</span>
                </div>
              </div>
            </div>

            {/* GARCH Card */}
            <div className="border border-gray-300 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg text-gray-900">GARCH Model</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Model Type:</span>
                  <span className="text-gray-900">GARCH(1,1) / EGARCH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Objective:</span>
                  <span className="text-gray-900">Forecast Volatility</span>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <span className="text-gray-600">Features:</span>
                  <span className="text-gray-900 text-xs">Time-varying volatility estimation, volatility clustering detection</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Portfolio Optimization Summary */}
        <div className="flex-1">
          <h2 className="text-xl text-gray-900 mb-6 pb-2 border-b border-gray-200">Portfolio Optimization Summary</h2>
          <div className="mb-8">
            <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg mb-6">
              <span className="text-sm text-gray-600">Portfolio: </span>
              <span className="text-sm text-gray-900">{data.portfolioName}</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6">
            <div className="border border-gray-300 rounded-lg p-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-green-600" />
                <p className="text-xs uppercase tracking-wide text-gray-500">Expected Return</p>
              </div>
              <p className="text-3xl text-green-600">{formatPercent(data.expectedReturn)}</p>
              <p className="text-xs text-gray-500 mt-2">Annualized</p>
            </div>

            <div className="border border-gray-300 rounded-lg p-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-orange-600" />
                <p className="text-xs uppercase tracking-wide text-gray-500">Volatility</p>
              </div>
              <p className="text-3xl text-orange-600">{formatPercent(data.volatility)}</p>
              <p className="text-xs text-gray-500 mt-2">Annualized Std Dev</p>
            </div>

            <div className="border border-gray-300 rounded-lg p-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <p className="text-xs uppercase tracking-wide text-gray-500">Sharpe Ratio</p>
              </div>
              <p className="text-3xl text-blue-600">{data.sharpeRatio.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-2">Risk-adjusted return</p>
            </div>

            <div className="border border-gray-300 rounded-lg p-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <p className="text-xs uppercase tracking-wide text-gray-500">Assets</p>
              </div>
              <p className="text-3xl text-purple-600">{data.numAssets}</p>
              <p className="text-xs text-gray-500 mt-2">Diversified holdings</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 border-t border-gray-300 text-center">
          <p className="text-xs text-gray-500">Page 1 of 3 • LSTM-GARCH Portfolio Optimization Platform</p>
        </div>
      </div>

      {/* PAGE 2 - MODEL METRICS & INTERPRETATION */}
      <div className="min-h-screen p-12 flex flex-col page-break-after">
        {/* Header */}
        <div className="border-b border-gray-300 pb-4 mb-8">
          <h1 className="text-2xl text-gray-900">Model Performance Metrics</h1>
          <p className="text-sm text-gray-600 mt-1">{data.portfolioName}</p>
        </div>

        {/* Section 3: LSTM Performance Metrics */}
        <div className="mb-10">
          <h2 className="text-xl text-gray-900 mb-4 pb-2 border-b border-gray-200">LSTM Performance Metrics</h2>
          
          {/* LSTM Metrics Table */}
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="text-left p-3 text-gray-700 border-b border-gray-300">Metric</th>
                  <th className="text-left p-3 text-gray-700 border-b border-gray-300">Description</th>
                  <th className="text-right p-3 text-gray-700 border-b border-gray-300">Value</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">MAE</td>
                  <td className="p-3 text-gray-600">Mean Absolute Error</td>
                  <td className="p-3 text-right text-gray-900">{formatDecimal(data.lstmMetrics.mae)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">RMSE</td>
                  <td className="p-3 text-gray-600">Root Mean Squared Error</td>
                  <td className="p-3 text-right text-gray-900">{formatDecimal(data.lstmMetrics.rmse)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">R² Score</td>
                  <td className="p-3 text-gray-600">Goodness of fit</td>
                  <td className="p-3 text-right text-gray-900">{formatDecimal(data.lstmMetrics.r2Score)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">MAPE</td>
                  <td className="p-3 text-gray-600">Mean Absolute Percentage Error</td>
                  <td className="p-3 text-right text-gray-900">{data.lstmMetrics.mape.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="p-3 text-gray-900">Directional Accuracy</td>
                  <td className="p-3 text-gray-600">% correct up/down movements</td>
                  <td className="p-3 text-right text-gray-900">{data.lstmMetrics.directionalAccuracy.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LSTM Interpretation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-base text-gray-900 mb-4">Interpretations</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <span className="text-gray-900">MAE / RMSE:</span> Lower values mean the model&apos;s predicted returns are closer to actual returns. RMSE penalizes large errors more strongly.
              </div>
              <div>
                <span className="text-gray-900">R² Score:</span> Measures how much of the variability in returns is explained by the model. Values closer to 1 indicate strong predictive power.
              </div>
              <div>
                <span className="text-gray-900">MAPE:</span> Shows prediction error as a percentage. Lower values indicate higher accuracy across assets.
              </div>
              <div>
                <span className="text-gray-900">Directional Accuracy:</span> Indicates how often the model correctly predicts the direction of returns (up or down). High directional accuracy is crucial for asset allocation.
              </div>
              <div className="pt-2 border-t border-blue-200 mt-4">
                <span className="text-gray-900">Overall:</span> These metrics help determine whether the LSTM model is reliable enough for forward return prediction used in optimization.
              </div>
            </div>
          </div>

          {/* Loss Curve */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <h4 className="text-sm text-gray-700 mb-3">Training Loss Curve</h4>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.lossData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="epoch" stroke="#6b7280" style={{ fontSize: '11px' }} label={{ value: 'Epoch', position: 'insideBottom', offset: -5, style: { fontSize: '11px' } }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} label={{ value: 'Loss', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }} />
                <Tooltip contentStyle={{ fontSize: '11px', backgroundColor: '#fff', border: '1px solid #d1d5db' }} />
                <Line type="monotone" dataKey="loss" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section 4: GARCH Performance Metrics */}
        <div>
          <h2 className="text-xl text-gray-900 mb-4 pb-2 border-b border-gray-200">GARCH Performance Metrics</h2>
          
          {/* GARCH Metrics Table */}
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-purple-50">
                <tr>
                  <th className="text-left p-3 text-gray-700 border-b border-gray-300">Metric</th>
                  <th className="text-left p-3 text-gray-700 border-b border-gray-300">Description</th>
                  <th className="text-right p-3 text-gray-700 border-b border-gray-300">Value</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">MAE (Volatility)</td>
                  <td className="p-3 text-gray-600">Error in forecasted vs. realized volatility</td>
                  <td className="p-3 text-right text-gray-900">{formatDecimal(data.garchMetrics.maeVolatility)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">RMSE (Volatility)</td>
                  <td className="p-3 text-gray-600">Penalizes large volatility forecast errors</td>
                  <td className="p-3 text-right text-gray-900">{formatDecimal(data.garchMetrics.rmseVolatility)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">AIC / BIC</td>
                  <td className="p-3 text-gray-600">Model selection criteria</td>
                  <td className="p-3 text-right text-gray-900">{data.garchMetrics.aic.toFixed(2)} / {data.garchMetrics.bic.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">Log-Likelihood</td>
                  <td className="p-3 text-gray-600">Measures overall model fit</td>
                  <td className="p-3 text-right text-gray-900">{data.garchMetrics.logLikelihood.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">Q-Statistic (Ljung–Box)</td>
                  <td className="p-3 text-gray-600">Tests for autocorrelation in residuals</td>
                  <td className="p-3 text-right text-gray-900">{data.garchMetrics.qStatistic.toFixed(2)} (p={data.garchMetrics.qStatPValue.toFixed(3)})</td>
                </tr>
                <tr>
                  <td className="p-3 text-gray-900">ARCH LM Test</td>
                  <td className="p-3 text-gray-600">Tests for remaining heteroskedasticity</td>
                  <td className="p-3 text-right text-gray-900">{data.garchMetrics.archLMTest.toFixed(2)} (p={data.garchMetrics.archLMPValue.toFixed(3)})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* GARCH Interpretation */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
            <h3 className="text-base text-gray-900 mb-4">Interpretations</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <span className="text-gray-900">MAE / RMSE (Volatility):</span> Lower values indicate the GARCH model accurately captures the magnitude of volatility.
              </div>
              <div>
                <span className="text-gray-900">AIC / BIC:</span> Lower values mean the model is more efficient and avoids overfitting.
              </div>
              <div>
                <span className="text-gray-900">Log-Likelihood:</span> Higher values indicate better modelling of time-varying volatility.
              </div>
              <div>
                <span className="text-gray-900">Q-Statistic:</span> If the p-value is high, residual autocorrelation is low, meaning the volatility model properly captures temporal relationships.
              </div>
              <div>
                <span className="text-gray-900">ARCH LM Test:</span> A high p-value suggests no remaining heteroskedasticity — the model successfully captures volatility clustering.
              </div>
              <div className="pt-2 border-t border-purple-200 mt-4">
                <span className="text-gray-900">Overall:</span> These metrics evaluate the GARCH model&apos;s ability to forecast risk, crucial for optimizing the portfolio&apos;s risk–return profile.
              </div>
            </div>
          </div>

          {/* Volatility Forecast */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <h4 className="text-sm text-gray-700 mb-3">Volatility Forecast with Confidence Intervals</h4>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.volatilityForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} label={{ value: 'Volatility', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }} />
                <Tooltip contentStyle={{ fontSize: '11px', backgroundColor: '#fff', border: '1px solid #d1d5db' }} />
                <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2} dot={false} name="Actual" />
                <Line type="monotone" dataKey="forecast" stroke="#7c3aed" strokeWidth={2} dot={false} name="Forecast" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="upper" stroke="#c084fc" strokeWidth={1} dot={false} name="Upper CI" strokeDasharray="2 2" />
                <Line type="monotone" dataKey="lower" stroke="#c084fc" strokeWidth={1} dot={false} name="Lower CI" strokeDasharray="2 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 border-t border-gray-300 text-center">
          <p className="text-xs text-gray-500">Page 2 of 3 • LSTM-GARCH Portfolio Optimization Platform</p>
        </div>
      </div>

      {/* PAGE 3 - OPTIMIZATION OUTPUT & PREDICTIONS */}
      <div className="min-h-screen p-12 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-300 pb-4 mb-8">
          <h1 className="text-2xl text-gray-900">Optimization Output & Predictions</h1>
          <p className="text-sm text-gray-600 mt-1">{data.portfolioName}</p>
        </div>

        {/* Section 5: Prediction Snapshot */}
        <div className="mb-10">
          <h2 className="text-xl text-gray-900 mb-4 pb-2 border-b border-gray-200">Prediction Snapshot</h2>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 text-gray-700 border-b border-gray-300">Asset</th>
                  <th className="text-left p-3 text-gray-700 border-b border-gray-300">Name</th>
                  <th className="text-right p-3 text-gray-700 border-b border-gray-300">Predicted Return</th>
                  <th className="text-right p-3 text-gray-700 border-b border-gray-300">Forecasted Volatility</th>
                  <th className="text-right p-3 text-gray-700 border-b border-gray-300">Weight (%)</th>
                  <th className="text-right p-3 text-gray-700 border-b border-gray-300">Risk Contribution</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {data.assets.map((asset, index) => (
                  <tr key={asset.symbol} className={index !== data.assets.length - 1 ? 'border-b border-gray-200' : ''}>
                    <td className="p-3 text-gray-900">{asset.symbol}</td>
                    <td className="p-3 text-gray-600">{asset.name}</td>
                    <td className="p-3 text-right text-green-600">{formatPercent(asset.predictedReturn)}</td>
                    <td className="p-3 text-right text-orange-600">{formatPercent(asset.forecastedVolatility)}</td>
                    <td className="p-3 text-right text-gray-900">{formatPercent(asset.weight)}</td>
                    <td className="p-3 text-right text-gray-600">{formatPercent(asset.riskContribution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 6: Efficient Frontier */}
        <div className="mb-10">
          <h2 className="text-xl text-gray-900 mb-4 pb-2 border-b border-gray-200">Efficient Frontier</h2>
          <div className="border border-gray-300 rounded-lg p-6 bg-white">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  dataKey="volatility" 
                  name="Volatility" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Volatility (Risk)', position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
                  tickFormatter={(value) => formatPercent(value)}
                />
                <YAxis 
                  type="number" 
                  dataKey="return" 
                  name="Return" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                  tickFormatter={(value) => formatPercent(value)}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ fontSize: '12px', backgroundColor: '#fff', border: '1px solid #d1d5db' }}
                  formatter={(value: any) => formatPercent(value)}
                />
                <Scatter 
                  data={data.efficientFrontier} 
                  fill="#3b82f6" 
                  line={{ stroke: '#2563eb', strokeWidth: 2 }}
                  shape="circle"
                />
                <ReferenceDot
                  x={data.optimalPortfolio.volatility}
                  y={data.optimalPortfolio.return}
                  r={8}
                  fill="#10b981"
                  stroke="#059669"
                  strokeWidth={2}
                  label={{ value: 'Optimal', position: 'top', style: { fontSize: '11px', fill: '#059669' } }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 text-center mt-4">
              The efficient frontier shows the set of optimal portfolios. The green dot represents the selected optimal portfolio with maximum Sharpe ratio.
            </p>
          </div>
        </div>

        {/* Section 7: Portfolio Interpretation */}
        <div className="mb-8">
          <h2 className="text-xl text-gray-900 mb-4 pb-2 border-b border-gray-200">Interpretation of Optimization Output</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex gap-3">
                <span className="text-green-600 mt-1">•</span>
                <p>Higher predicted return assets receive higher weights only if volatility forecasts remain low.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-green-600 mt-1">•</span>
                <p>If GARCH indicates rising volatility, weights shift toward more stable assets.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-green-600 mt-1">•</span>
                <p>Sharpe ratio summarizes the balance between return and risk — higher is better.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-green-600 mt-1">•</span>
                <p>Weight distribution reflects model confidence and asset contribution to total risk.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Disclaimer */}
        <div className="mt-auto pt-8 border-t border-gray-300">
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">
              <span className="text-gray-700">Disclaimer:</span> This report is generated for informational purposes only and does not constitute financial advice. 
              Past performance and model predictions do not guarantee future results. Investment decisions should be made based on individual 
              circumstances and in consultation with qualified financial advisors.
            </p>
          </div>
          <p className="text-xs text-gray-500 text-center">Page 3 of 3 • LSTM-GARCH Portfolio Optimization Platform • Confidential</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .page-break-after {
            page-break-after: always;
          }
          @page {
            margin: 0.5in;
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}
