
import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

interface ElevationPoint {
  distance: number;
  elevation: number;
  segmentIndex?: number;
  incline?: number;
  displayDistance: number;
  displayElevation: number;
}

interface AdvancedSegment {
  startIndex: number;
  endIndex: number;
  startPoint: ElevationPoint;
  endPoint: ElevationPoint;
  slope: number;
  intercept: number;
  rSquared: number;
  type: 'asc' | 'desc' | 'hor';
  color: string;
}

interface ElevationChartD3Props {
  elevationData: ElevationPoint[];
  onPointHover?: (segmentIndex: number | null) => void;
  hoveredSegment?: number | null;
  options?: {
    width?: number;
    height?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
    lineColor?: string;
    axisColor?: string;
    textColor?: string;
    guideLineColor?: string;
    backgroundColor?: string;
    useMiles?: boolean;
    useFeet?: boolean;
    xAxisTicks?: number | null;
    yAxisTicks?: number | null;
  };
  intelligentSegments?: Array<{
    startIndex: number;
    endIndex: number;
    type: 'asc' | 'desc' | 'hor';
    avgGrade: number;
    color: string;
  }>;
  advancedSegments?: AdvancedSegment[];
  showGradientVisualization?: boolean;
}

const MIN_CHART_WIDTH = 200;
const MIN_CHART_HEIGHT = 150;

export const ElevationChartD3: React.FC<ElevationChartD3Props> = ({ 
  elevationData, 
  onPointHover,
  hoveredSegment,
  options = {},
  intelligentSegments = [],
  advancedSegments = [],
  showGradientVisualization = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default options
  const defaultOptions = {
    width: 600,
    height: 300,
    marginTop: 20,
    marginRight: 20,
    marginBottom: 50,
    marginLeft: 60,
    lineColor: '#22c55e',
    axisColor: '#6b7280',
    textColor: '#374151',
    guideLineColor: '#ef4444',
    backgroundColor: 'transparent',
    useMiles: false,
    useFeet: false,
    xAxisTicks: null,
    yAxisTicks: null,
  };

  const opts = { ...defaultOptions, ...options };

  // Calculate inclines for elevation data
  const processedData = React.useMemo(() => {
    if (!elevationData || elevationData.length < 2) return [];
    
    return elevationData.map((point, index) => {
      let incline = 0;
      if (index > 0) {
        const elevationDiff = point.elevation - elevationData[index - 1].elevation;
        const distanceDiff = (point.distance - elevationData[index - 1].distance) * 1000; // Convert to meters
        if (distanceDiff > 0) {
          incline = (elevationDiff / distanceDiff) * 100; // Percentage
        }
      }
      
      return {
        ...point,
        displayDistance: opts.useMiles ? point.distance * 0.621371 : point.distance,
        displayElevation: opts.useFeet ? point.elevation * 3.28084 : point.elevation,
        incline
      };
    });
  }, [elevationData, opts.useMiles, opts.useFeet]);

  // Calculate gradient color scale
  const gradientColorScale = React.useMemo(() => {
    if (!showGradientVisualization || processedData.length === 0) return null;
    
    const inclines = processedData.map(p => Math.abs(p.incline));
    const maxIncline = Math.max(...inclines, 15); // Minimum scale of 15%
    
    return d3.scaleSequential()
      .domain([0, maxIncline])
      .interpolator(d3.interpolateRdYlGn);
  }, [processedData, showGradientVisualization]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || processedData.length === 0) return;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${opts.width} ${opts.height}`)
      .style("background-color", opts.backgroundColor)
      .style("overflow", "visible");

    // Clear previous content
    svg.selectAll("*").remove();

    // Calculate domains
    const elevationPoints = processedData.map(p => p.displayElevation);
    const [minEle, maxEle] = d3.extent(elevationPoints) as [number, number];
    const eleRange = maxEle - minEle;
    let padding = eleRange * 0.1;
    if (eleRange === 0) padding = opts.useFeet ? 50 * 3.28084 : 15;
    
    const yDomain = [minEle - padding, maxEle + padding];
    
    // Ensure minimum visible range
    if (yDomain[1] - yDomain[0] < (opts.useFeet ? 10 * 3.28084 : 3)) {
      const mid = (yDomain[0] + yDomain[1]) / 2;
      yDomain[0] = mid - (opts.useFeet ? 5 * 3.28084 : 1.5);
      yDomain[1] = mid + (opts.useFeet ? 5 * 3.28084 : 1.5);
    }

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.displayDistance) || 1])
      .range([opts.marginLeft, opts.width - opts.marginRight]);

    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([opts.height - opts.marginBottom, opts.marginTop]);

    // Line generator
    const lineGenerator = d3.line<typeof processedData[0]>()
      .x(d => xScale(d.displayDistance))
      .y(d => yScale(d.displayElevation))
      .curve(d3.curveCardinal);

    const chartContent = svg.append("g").attr("class", "chart-content");

    // Draw gradient visualization if enabled
    if (showGradientVisualization && gradientColorScale) {
      processedData.forEach((point, index) => {
        if (index === 0) return;
        
        const prevPoint = processedData[index - 1];
        const gradientIntensity = Math.abs(point.incline);
        const color = gradientColorScale(gradientIntensity);
        
        chartContent.append("line")
          .attr("x1", xScale(prevPoint.displayDistance))
          .attr("y1", yScale(prevPoint.displayElevation))
          .attr("x2", xScale(point.displayDistance))
          .attr("y2", yScale(point.displayElevation))
          .attr("stroke", color)
          .attr("stroke-width", 4)
          .attr("opacity", 0.7);
      });
    }

    // Draw intelligent segments backgrounds if available
    if (intelligentSegments.length > 0) {
      intelligentSegments.forEach(segment => {
        const startPoint = processedData[segment.startIndex];
        const endPoint = processedData[segment.endIndex];
        
        if (startPoint && endPoint) {
          chartContent.append("rect")
            .attr("x", xScale(startPoint.displayDistance))
            .attr("y", opts.marginTop)
            .attr("width", xScale(endPoint.displayDistance) - xScale(startPoint.displayDistance))
            .attr("height", opts.height - opts.marginTop - opts.marginBottom)
            .attr("fill", segment.color)
            .attr("opacity", 0.1);
        }
      });
    }

    // Draw advanced segments backgrounds if available
    if (advancedSegments.length > 0) {
      advancedSegments.forEach(segment => {
        const startPoint = processedData[segment.startIndex];
        const endPoint = processedData[segment.endIndex];
        
        if (startPoint && endPoint) {
          chartContent.append("rect")
            .attr("x", xScale(startPoint.displayDistance))
            .attr("y", opts.marginTop)
            .attr("width", xScale(endPoint.displayDistance) - xScale(startPoint.displayDistance))
            .attr("height", opts.height - opts.marginTop - opts.marginBottom)
            .attr("fill", segment.color)
            .attr("opacity", 0.15);
        }
      });
    }

    // Draw elevation line
    chartContent.append("path")
      .datum(processedData)
      .attr("class", "elevation-line")
      .attr("fill", "none")
      .attr("stroke", showGradientVisualization ? "none" : opts.lineColor)
      .attr("stroke-width", showGradientVisualization ? 0 : 2.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", lineGenerator);

    // Draw red regression trend lines for advanced segments
    if (advancedSegments.length > 0) {
      chartContent.append("g")
        .attr("class", "trend-lines")
        .selectAll("line")
        .data(advancedSegments)
        .join("line")
          .attr("stroke", "#dc2626") // Red color for trend lines
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4, 4")
          .attr("x1", d => xScale(d.startPoint.displayDistance))
          .attr("y1", d => yScale(d.slope * d.startPoint.displayDistance + d.intercept))
          .attr("x2", d => xScale(d.endPoint.displayDistance))
          .attr("y2", d => yScale(d.slope * d.endPoint.displayDistance + d.intercept))
          .attr("opacity", 0.8);
    }

    // Draw segment dividers if available
    if (intelligentSegments.length > 0) {
      intelligentSegments.forEach((segment, index) => {
        if (index < intelligentSegments.length - 1) {
          const endPoint = processedData[segment.endIndex];
          if (endPoint) {
            chartContent.append("line")
              .attr("x1", xScale(endPoint.displayDistance))
              .attr("x2", xScale(endPoint.displayDistance))
              .attr("y1", opts.marginTop)
              .attr("y2", opts.height - opts.marginBottom)
              .attr("stroke", "#dc2626")
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "5,5")
              .attr("opacity", 0.7);
          }
        }
      });
    }

    // X-axis
    const numXTicks = opts.xAxisTicks || Math.max(2, Math.floor(opts.width / 80));
    chartContent.append("g")
      .attr("transform", `translate(0,${opts.height - opts.marginBottom})`)
      .call(d3.axisBottom(xScale).ticks(numXTicks).tickSizeOuter(0))
      .attr("class", "x-axis axis")
      .call(g => g.selectAll("text").style("fill", opts.textColor).style("font-size", "10px"))
      .call(g => g.selectAll(".tick line").style("stroke", opts.axisColor))
      .call(g => g.select(".domain").style("stroke", opts.axisColor))
      .append("text")
        .attr("class", "axis-label")
        .attr("x", opts.width - opts.marginRight)
        .attr("y", opts.marginBottom - 10)
        .attr("fill", opts.textColor)
        .attr("text-anchor", "end")
        .attr("font-weight", "bold")
        .style("font-size", "12px")
        .text(`Distance (${opts.useMiles ? "mi" : "km"})`);

    // Y-axis
    const numYTicks = opts.yAxisTicks || Math.max(2, Math.floor(opts.height / 40));
    chartContent.append("g")
      .attr("transform", `translate(${opts.marginLeft},0)`)
      .call(d3.axisLeft(yScale).ticks(numYTicks))
      .attr("class", "y-axis axis")
      .call(g => g.selectAll("text").style("fill", opts.textColor).style("font-size", "10px"))
      .call(g => g.selectAll(".tick line").style("stroke", opts.axisColor))
      .call(g => g.select(".domain").style("stroke", opts.axisColor))
      .append("text")
        .attr("class", "axis-label")
        .attr("x", -opts.marginLeft + 5)
        .attr("y", opts.marginTop - 8)
        .attr("fill", opts.textColor)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .style("font-size", "12px")
        .text(`Elevation (${opts.useFeet ? "ft" : "m"})`);

    // Interactive elements
    const focus = chartContent.append("g").attr("class", "focus").style("display", "none");

    focus.append("line").attr("class", "guide-line-y").attr("stroke", opts.guideLineColor).attr("stroke-width", 1).attr("stroke-dasharray", "3,3");
    focus.append("line").attr("class", "guide-line-x").attr("stroke", opts.guideLineColor).attr("stroke-width", 1).attr("stroke-dasharray", "3,3").attr("x1", opts.marginLeft);
    focus.append("circle").attr("class", "focus-circle").attr("r", 5).attr("fill", opts.guideLineColor).attr("stroke", "white").attr("stroke-width", 1.5);
    
    const distanceText = focus.append("text").attr("class", "distance-text").attr("text-anchor", "middle").attr("fill", opts.guideLineColor).style("font-size", "10px").attr("y", opts.height - opts.marginBottom + 18);
    const elevationText = focus.append("text").attr("class", "elevation-text").attr("text-anchor", "end").attr("dominant-baseline", "middle").attr("fill", opts.guideLineColor).style("font-size", "10px").attr("x", opts.marginLeft - 8);
    
    const inclineGroup = focus.append("g").attr("class", "incline-display-group");
    const inclineIcon = inclineGroup.append("path").attr("class", "incline-icon").attr("fill", opts.guideLineColor).attr("transform", "translate(0, -5) scale(0.8)");
    const inclineValue = inclineGroup.append("text").attr("class", "incline-value-text").attr("fill", opts.guideLineColor).style("font-size", "10px").attr("text-anchor", "start").attr("dominant-baseline", "middle").attr("x", 12);
    
    const inclineThreshold = 1.5;

    // Event rectangle for mouse interactions
    svg.append("rect")
      .attr("class", "event-rect")
      .attr("width", opts.width - opts.marginLeft - opts.marginRight)
      .attr("height", opts.height - opts.marginTop - opts.marginBottom)
      .attr("transform", `translate(${opts.marginLeft},${opts.marginTop})`)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mouseover", () => {
        if (processedData.length > 0) {
          focus.style("display", null);
        }
      })
      .on("mouseout", () => {
        focus.style("display", "none");
        onPointHover?.(null);
      })
      .on("mousemove", (event) => {
        if (!svgRef.current || processedData.length === 0) return;

        const pointer = d3.pointer(event, svg.node());
        const xValue = xScale.invert(pointer[0]);

        const bisector = d3.bisector((d: typeof processedData[0]) => d.displayDistance).left;
        let index = bisector(processedData, xValue, 1);
        
        if (index <= 0) index = 1;
        if (index >= processedData.length) index = processedData.length;

        const p0 = processedData[index - 1];
        const p1 = processedData[index < processedData.length ? index : index - 1];
        const currentPoint = (xValue - p0.displayDistance > p1.displayDistance - xValue) ? p1 : p0;

        if (currentPoint) {
          const cx = xScale(currentPoint.displayDistance);
          const cy = yScale(currentPoint.displayElevation);
          
          focus.select(".guide-line-y").attr("x1", cx).attr("x2", cx).attr("y1", opts.height - opts.marginBottom).attr("y2", cy);
          focus.select(".guide-line-x").attr("y1", cy).attr("y2", cy).attr("x1", opts.marginLeft).attr("x2", cx);
          focus.select(".focus-circle").attr("transform", `translate(${cx},${cy})`);
          
          distanceText.attr("x", cx).text(`${currentPoint.displayDistance.toFixed(2)} ${opts.useMiles ? 'mi' : 'km'}`);
          elevationText.attr("y", cy).text(`${currentPoint.displayElevation.toFixed(opts.useFeet ? 0 : 1)} ${opts.useFeet ? 'ft' : 'm'}`);

          inclineGroup.attr("transform", `translate(${cx + 10}, ${cy - 10})`);
          if (currentPoint.incline !== undefined) {
            inclineValue.text(`${currentPoint.incline.toFixed(1)}%`);
            if (currentPoint.incline > inclineThreshold) {
              inclineIcon.attr("d", "M5 0 L10 8 L0 8 Z"); // Up arrow
            } else if (currentPoint.incline < -inclineThreshold) {
              inclineIcon.attr("d", "M5 8 L10 0 L0 0 Z"); // Down arrow
            } else {
              inclineIcon.attr("d", "M0 4 L10 4 M0 4 L2 2 M0 4 L2 6 M10 4 L8 2 M10 4 L8 6"); // Flat arrow
            }
            inclineIcon.style("display", null);
            inclineValue.style("display", null);
          } else {
            inclineIcon.style("display", "none");
            inclineValue.text("N/A");
          }

          // Notify hover for segment synchronization
          onPointHover?.(currentPoint.segmentIndex ?? null);
        }
      });

  }, [processedData, opts, intelligentSegments, advancedSegments, onPointHover, showGradientVisualization, gradientColorScale]);

  return (
    <div 
      ref={containerRef} 
      className="relative chart-container bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 p-6" 
      style={{ 
        width: `${opts.width}px`, 
        height: `${opts.height + 100}px`, 
        backgroundColor: opts.backgroundColor === 'transparent' ? undefined : opts.backgroundColor,
        overflow: 'hidden' 
      }} 
      aria-label="Elevation profile chart" 
      role="img"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Perfil de Elevación con Análisis de Regresión
        </h3>
        <div className="flex gap-4 text-sm text-mountain-600 dark:text-mountain-400">
          <span>📏 Distancia: {processedData.length > 0 ? processedData[processedData.length - 1]?.displayDistance.toFixed(1) : '0'} {opts.useMiles ? 'mi' : 'km'}</span>
          {advancedSegments.length > 0 && (
            <span>🎯 Segmentos: {advancedSegments.length}</span>
          )}
          {advancedSegments.length > 0 && (
            <span>📊 R² promedio: {(advancedSegments.reduce((acc, s) => acc + s.rSquared, 0) / advancedSegments.length).toFixed(3)}</span>
          )}
        </div>
      </div>
      
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: `${opts.height}px` }} />
      
      {advancedSegments.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-mountain-600 dark:text-mountain-400">
          <span>Leyenda:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-600 border-dashed border-t-2"></div>
            <span>Líneas de regresión (tendencia)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-50"></div>
            <span>Tipos de segmento</span>
          </div>
        </div>
      )}
      
      {processedData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-mountain-600 dark:text-mountain-400">No hay datos de elevación disponibles</p>
        </div>
      )}
    </div>
  );
};
