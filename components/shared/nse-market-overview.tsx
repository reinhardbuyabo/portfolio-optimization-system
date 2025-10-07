"use client";

import { useEffect, useRef } from "react";

interface NSEMarketOverviewProps {
  width?: string | number;
  height?: string | number;
  theme?: "light" | "dark";
}

/**
 * TradingView Market Overview widget showing NSE top stocks
 */
export function NSEMarketOverview({
  width = "100%",
  height = 400,
  theme = "light",
}: NSEMarketOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: theme,
      dateRange: "12M",
      showChart: true,
      locale: "en",
      width,
      height,
      largeChartUrl: "",
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      plotLineColorGrowing: "rgba(41, 98, 255, 1)",
      plotLineColorFalling: "rgba(255, 74, 104, 1)",
      gridLineColor: "rgba(240, 243, 250, 0)",
      scaleFontColor: "rgba(106, 109, 120, 1)",
      belowLineFillColorGrowing: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorFalling: "rgba(255, 74, 104, 0.12)",
      belowLineFillColorGrowingBottom: "rgba(41, 98, 255, 0)",
      belowLineFillColorFallingBottom: "rgba(255, 74, 104, 0)",
      symbolActiveColor: "rgba(41, 98, 255, 0.12)",
      tabs: [
        {
          title: "NSE Top Stocks",
          symbols: [
            { s: "NSE:SCOM", d: "Safaricom PLC" },
            { s: "NSE:EQTY", d: "Equity Group Holdings" },
            { s: "NSE:KCB", d: "KCB Group" },
            { s: "NSE:EABL", d: "East African Breweries" },
            { s: "NSE:ABSA", d: "Absa Bank Kenya" },
            { s: "NSE:BAMB", d: "Bamburi Cement" },
          ],
        },
      ],
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [width, height, theme]);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}
