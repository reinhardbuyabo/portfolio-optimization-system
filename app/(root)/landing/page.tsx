"use client";

import { useState } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import {
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
    SYMBOL_INFO_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";

function Home() {
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;
    
    // Featured stock symbols for NSE
    const featuredStocks = [
        { symbol: "NSE:SCOM", name: "Safaricom PLC" },
        { symbol: "NSE:EQTY", name: "Equity Group" },
        { symbol: "NSE:KCB", name: "KCB Group" },
        { symbol: "NSE:EABL", name: "EABL" },
    ];
    
    const [selectedStock, setSelectedStock] = useState("NSE:SCOM");
    
    return (
        <div className="flex min-h-screen home-wrapper">
            {/* Hero Section */}
            <section className="w-full mb-8">
                <div className="mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-2">
                        Nairobi Stock Exchange Dashboard
                    </h1>
                    <p className="text-gray-400 text-base md:text-lg">
                        Real-time market data, analysis, and insights for NSE stocks
                    </p>
                </div>
            </section>

            {/* Market Overview Section */}
            <section className="w-full mb-8">
                <TradingViewWidget
                    title="NSE Market Overview"
                    scriptUrl={`${scriptUrl}market-overview.js`}
                    config={MARKET_OVERVIEW_WIDGET_CONFIG}
                    height={400}
                />
            </section>

            {/* Stock Quotes Section */}
            <section className="w-full mb-8">
                <TradingViewWidget
                    title="Live Stock Quotes"
                    scriptUrl={`${scriptUrl}market-quotes.js`}
                    config={MARKET_DATA_WIDGET_CONFIG}
                    height={500}
                />
            </section>

            {/* Featured Stock Analysis Section */}
            <section className="w-full mb-8">
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-100 mb-4">Featured Stock Analysis</h2>
                    <div className="flex flex-wrap gap-2">
                        {featuredStocks.map((stock) => (
                            <button
                                key={stock.symbol}
                                onClick={() => setSelectedStock(stock.symbol)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    selectedStock === stock.symbol
                                        ? "bg-yellow-500 text-gray-900"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }`}
                            >
                                {stock.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Symbol Info Widget */}
                <div className="mb-6">
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}symbol-info.js`}
                        config={SYMBOL_INFO_WIDGET_CONFIG(selectedStock)}
                        height={170}
                    />
                </div>

                {/* Advanced Chart */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                    <div className="xl:col-span-2">
                        <TradingViewWidget
                            title="Price Chart"
                            scriptUrl={`${scriptUrl}advanced-chart.js`}
                            config={CANDLE_CHART_WIDGET_CONFIG(selectedStock)}
                            height={500}
                        />
                    </div>
                    <div className="xl:col-span-1">
                        <TradingViewWidget
                            title="Technical Analysis"
                            scriptUrl={`${scriptUrl}technical-analysis.js`}
                            config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(selectedStock)}
                            height={500}
                        />
                    </div>
                </div>

                {/* Company Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <TradingViewWidget
                            title="Company Profile"
                            scriptUrl={`${scriptUrl}symbol-profile.js`}
                            config={COMPANY_PROFILE_WIDGET_CONFIG(selectedStock)}
                            height={440}
                        />
                    </div>
                    <div>
                        <TradingViewWidget
                            title="Fundamental Data"
                            scriptUrl={`${scriptUrl}financials.js`}
                            config={COMPANY_FINANCIALS_WIDGET_CONFIG(selectedStock)}
                            height={440}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
