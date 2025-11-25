
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TOP_STOCKS } from '@/lib/constants';

interface StockSummary {
  symbol: string;
  price: number;
  change: number;
  pct_change: number;
}

interface StockHeatmapProps {
  data: StockSummary[];
}

const StockHeatmap: React.FC<StockHeatmapProps> = ({ data }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (data && data.length > 0 && ref.current) {
      const svg = d3.select(ref.current);
      svg.selectAll("*").remove();

      const width = 800;
      const height = 400;

      const colorScale = d3.scaleLinear<string>()
        .domain([-0.1, 0, 0.1])
        .range(["#d7191c", "#ffffbf", "#1a9641"]);

      const treemap = d3.treemap()
        .size([width, height])
        .padding(2);

      const root = d3.hierarchy({ children: data })
        .sum((d: any) => TOP_STOCKS.includes(d.symbol) ? 10 : 1)
        .sort((a, b) => b.value! - a.value!)

      treemap(root);

      const cells = svg.selectAll("g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

      cells.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => colorScale(d.data.pct_change));

      cells.append("text")
        .attr("x", d => (d.x1 - d.x0) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "black")
        .style("font-size", d => `${Math.min((d.x1 - d.x0) / 4, 20)}px`)
        .text(d => d.data.symbol);

      cells.append("text")
        .attr("x", d => (d.x1 - d.x0) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2 + Math.min((d.x1 - d.x0) / 4, 20))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "black")
        .style("font-size", d => `${Math.min((d.x1 - d.x0) / 6, 12)}px`)
        .text(d => `${(d.data.pct_change * 100).toFixed(2)}%`);
    }
  }, [data]);

  return (
    <svg ref={ref} width={800} height={400}></svg>
  );
};

export default StockHeatmap;
