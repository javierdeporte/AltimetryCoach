
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface ElevationPoint {
  distance: number;
  elevation: number;
  segmentIndex?: number;
}

interface ElevationChartProps {
  elevationData: ElevationPoint[];
  onPointHover?: (segmentIndex: number | null) => void;
  hoveredSegment?: number | null;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({ 
  elevationData, 
  onPointHover,
  hoveredSegment 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 300 });

  // Mock data if no real data provided
  const mockData: ElevationPoint[] = [
    { distance: 0, elevation: 1200, segmentIndex: 0 },
    { distance: 3.2, elevation: 1350, segmentIndex: 0 },
    { distance: 6.0, elevation: 1630, segmentIndex: 1 },
    { distance: 10.1, elevation: 1510, segmentIndex: 2 },
    { distance: 13.6, elevation: 1270, segmentIndex: 3 },
    { distance: 16.0, elevation: 1460, segmentIndex: 4 },
  ];

  const data = elevationData.length > 0 ? elevationData : mockData;

  // Calculate stats
  const stats = {
    totalGain: data.reduce((acc, point, index) => {
      if (index === 0) return 0;
      const diff = point.elevation - data[index - 1].elevation;
      return acc + (diff > 0 ? diff : 0);
    }, 0),
    totalLoss: data.reduce((acc, point, index) => {
      if (index === 0) return 0;
      const diff = point.elevation - data[index - 1].elevation;
      return acc + (diff < 0 ? Math.abs(diff) : 0);
    }, 0),
    totalDistance: data[data.length - 1]?.distance || 0
  };

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width - 48, height: 300 }); // 48px for padding
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // D3 chart rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.distance) as [number, number])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.elevation) as [number, number])
      .nice()
      .range([height, 0]);

    // Line generator
    const line = d3.line<ElevationPoint>()
      .x(d => xScale(d.distance))
      .y(d => yScale(d.elevation))
      .curve(d3.curveCardinal);

    // Area generator for gradient fill
    const area = d3.area<ElevationPoint>()
      .x(d => xScale(d.distance))
      .y0(height)
      .y1(d => yScale(d.elevation))
      .curve(d3.curveCardinal);

    // Gradient definition
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "elevationGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", 0).attr("y2", height);

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "rgb(34, 197, 94)")
      .attr("stop-opacity", 0.6);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "rgb(34, 197, 94)")
      .attr("stop-opacity", 0.1);

    // Grid lines
    g.selectAll(".grid-line-y")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "rgb(203, 213, 225)")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.5);

    g.selectAll(".grid-line-x")
      .data(xScale.ticks(8))
      .enter()
      .append("line")
      .attr("class", "grid-line-x")
      .attr("x1", d => xScale(d))
      .attr("x2", d => xScale(d))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "rgb(203, 213, 225)")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.3);

    // Area fill
    g.append("path")
      .datum(data)
      .attr("fill", "url(#elevationGradient)")
      .attr("d", area);

    // Elevation line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "rgb(34, 197, 94)")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Data points
    g.selectAll(".data-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", d => xScale(d.distance))
      .attr("cy", d => yScale(d.elevation))
      .attr("r", 4)
      .attr("fill", d => d.segmentIndex === hoveredSegment ? "rgb(239, 68, 68)" : "rgb(34, 197, 94)")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("r", 6);
        if (onPointHover && d.segmentIndex !== undefined) {
          onPointHover(d.segmentIndex);
        }
      })
      .on("mouseout", function(event, d) {
        d3.select(this).attr("r", 4);
        if (onPointHover) {
          onPointHover(null);
        }
      });

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .text("Distance (km)");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .text("Elevation (m)");

  }, [data, dimensions, hoveredSegment]);

  return (
    <div ref={containerRef} className="h-80 bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Elevation Profile
        </h3>
        <div className="flex gap-4 text-sm text-mountain-600 dark:text-mountain-400">
          <span>↗ Gain: +{Math.round(stats.totalGain)}m</span>
          <span>↘ Loss: -{Math.round(stats.totalLoss)}m</span>
          <span>📏 Distance: {stats.totalDistance.toFixed(1)}km</span>
        </div>
      </div>
      
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full"
      />
    </div>
  );
};
