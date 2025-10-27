"use client";

import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  width?: string | number;
  height?: string | number;
  interval?: string;
  theme?: "light" | "dark";
  style?: string;
}

/**
 * TradingView chart widget for Nairobi Securities Exchange (NSE) stocks
 * Displays real-time or delayed market data
 */
export function TradingViewChart({
  symbol,
  width = "100%",
  height = 500,
  interval = "D",
  theme = "light",
  style = "1",
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== "undefined") {
        new (window as any).TradingView.widget({
          width,
          height,
          symbol,
          interval,
          timezone: "Africa/Nairobi",
          theme,
          style,
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current?.id || "tradingview-widget",
        });
      }
    };

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, width, height, interval, theme, style]);

  return (
    <div
      ref={containerRef}
      id={`tradingview-widget-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`}
      className="tradingview-widget-container"
    />
  );
}
