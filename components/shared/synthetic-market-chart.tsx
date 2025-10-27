
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DataPoint {
  date: string;
  close: number;
}

interface StockData {
  symbol: string;
  data: DataPoint[];
}

interface SyntheticMarketChartProps {
  data: StockData[];
  selectedSymbol: string | null;
  marketHorizon: string;
}

const SyntheticMarketChart: React.FC<SyntheticMarketChartProps> = ({ data, selectedSymbol, marketHorizon }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (data && data.length > 0 && ref.current) {
      const svg = d3.select(ref.current);
      svg.selectAll("*").remove(); // Clear previous chart

      const margin = { top: 50, right: 30, bottom: 40, left: 50 };
      const width = 800 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const stockToDisplay = data.find(d => d.symbol === selectedSymbol) || data[0];
      
      const parseDate = marketHorizon === '1H' ? d3.timeParse("%Y-%m-%d %H:%M:%S") : d3.timeParse("%Y-%m-%d");
      const parsedData = stockToDisplay.data.map(d => ({
        date: parseDate(d.date) as Date,
        close: d.close
      }));

      g.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text(stockToDisplay.symbol);

      const x = d3.scaleTime()
        .domain(d3.extent(parsedData, d => d.date) as [Date, Date])
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([d3.min(parsedData, d => d.close) as number, d3.max(parsedData, d => d.close) as number])
        .range([height, 0]);

      // Add the gradient
      const gradient = svg.append("defs").append("linearGradient")
        .attr("id", "line-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", y(0))
        .attr("x2", 0).attr("y2", y(d3.max(parsedData, d => d.close) as number));

      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#2d6a4f").attr("stop-opacity", 0.4);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#2d6a4f").attr("stop-opacity", 0);

      const line = d3.line<any>()
        .x(d => x(d.date))
        .y(d => y(d.close));

      const area = d3.area<any>()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.close));

      g.append("path")
        .datum(parsedData)
        .attr("fill", "url(#line-gradient)")
        .attr("d", area);

      g.append("path")
        .datum(parsedData)
        .attr("fill", "none")
        .attr("stroke", "#2d6a4f")
        .attr("stroke-width", 2)
        .attr("d", line);

      // Tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px");

      const focus = g.append('g')
        .append('circle')
        .style("fill", "#2d6a4f")
        .attr('r', 5)
        .style("opacity", 0)

      svg.append('rect')
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .on('mouseover', () => { focus.style("opacity", 1); tooltip.style("opacity", 1); })
        .on('mouseout', () => { focus.style("opacity", 0); tooltip.style("opacity", 0); })
        .on('mousemove', (event) => {
          const [xCoord] = d3.pointer(event);
          const x0 = x.invert(xCoord - margin.left);
          const i = d3.bisector((d: any) => d.date).left(parsedData, x0, 1);
          const selectedData = parsedData[i - 1];
          if(selectedData) {
            focus.attr("cx", x(selectedData.date) + margin.left).attr("cy", y(selectedData.close) + margin.top);
            tooltip
              .html(`<strong>Date:</strong> ${d3.timeFormat("%Y-%m-%d %H:%M")(selectedData.date)}<br/><strong>Price:</strong> ${selectedData.close.toFixed(2)}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          }
        });

      // Axes
      const xAxis = g.append("g")
        .attr("transform", `translate(0,${height})`)
      
      let ticks, tickFormat;

      switch (marketHorizon) {
        case '1H':
          ticks = d3.timeMinute.every(10);
          tickFormat = d3.timeFormat("%H:%M");
          break;
        case '1D':
          ticks = d3.timeHour.every(6);
          tickFormat = d3.timeFormat("%H:%M");
          break;
        case '3D':
          ticks = d3.timeDay.every(1);
          tickFormat = d3.timeFormat("%b %d");
          break;
        case '1W':
          ticks = d3.timeDay.every(1);
          tickFormat = d3.timeFormat("%b %d");
          break;
        case '1M':
          ticks = d3.timeWeek.every(1);
          tickFormat = d3.timeFormat("%b %d");
          break;
        case '3M':
          ticks = d3.timeMonth.every(1);
          tickFormat = d3.timeFormat("%b");
          break;
        case '1Y':
          ticks = d3.timeMonth.every(3);
          tickFormat = d3.timeFormat("%b %Y");
          break;
        case '5Y':
          ticks = d3.timeYear.every(1);
          tickFormat = d3.timeFormat("%Y");
          break;
        default:
          ticks = 5;
          tickFormat = d3.timeFormat("%b %d");
      }

      xAxis.call(d3.axisBottom(x).ticks(ticks).tickFormat(tickFormat));

      g.append("g")
        .call(d3.axisLeft(y));
    }
  }, [data, selectedSymbol, marketHorizon]);

  return (
    <svg ref={ref} width={800} height={400}></svg>
  );
};

export default SyntheticMarketChart;
