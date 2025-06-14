
import React, { useMemo } from 'react';

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
  console.log('ElevationChart received data:', elevationData.length, 'points');

  // Usar datos reales si están disponibles, sino datos mock
  const data = elevationData.length > 0 ? elevationData : [
    { distance: 0, elevation: 1200, segmentIndex: 0 },
    { distance: 3.2, elevation: 1350, segmentIndex: 0 },
    { distance: 6.0, elevation: 1630, segmentIndex: 1 },
    { distance: 10.1, elevation: 1510, segmentIndex: 2 },
    { distance: 13.6, elevation: 1270, segmentIndex: 3 },
    { distance: 16.0, elevation: 1460, segmentIndex: 4 },
  ];

  // Calculate stats and chart dimensions
  const { stats, chartData } = useMemo(() => {
    console.log('Calculating chart stats for', data.length, 'points');
    
    const totalGain = data.reduce((acc, point, index) => {
      if (index === 0) return 0;
      const diff = point.elevation - data[index - 1].elevation;
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    const totalLoss = data.reduce((acc, point, index) => {
      if (index === 0) return 0;
      const diff = point.elevation - data[index - 1].elevation;
      return acc + (diff < 0 ? Math.abs(diff) : 0);
    }, 0);

    const totalDistance = data[data.length - 1]?.distance || 0;

    // Chart dimensions and scales
    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    
    const minDistance = Math.min(...data.map(d => d.distance));
    const maxDistance = Math.max(...data.map(d => d.distance));
    const minElevation = Math.min(...data.map(d => d.elevation));
    const maxElevation = Math.max(...data.map(d => d.elevation));
    
    const xScale = (distance: number) => 
      padding.left + ((distance - minDistance) / (maxDistance - minDistance)) * (width - padding.left - padding.right);
    
    const yScale = (elevation: number) => 
      padding.top + ((maxElevation - elevation) / (maxElevation - minElevation)) * (height - padding.top - padding.bottom);

    // Generate path data
    const pathData = data.map((point, index) => {
      const x = xScale(point.distance);
      const y = yScale(point.elevation);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    // Generate area path data
    const areaData = pathData + ` L ${xScale(data[data.length - 1].distance)} ${height - padding.bottom} L ${xScale(data[0].distance)} ${height - padding.bottom} Z`;

    return {
      stats: { totalGain, totalLoss, totalDistance },
      chartData: {
        width,
        height,
        padding,
        xScale,
        yScale,
        pathData,
        areaData,
        minDistance,
        maxDistance,
        minElevation,
        maxElevation
      }
    };
  }, [data]);

  const { width, height, padding, xScale, yScale, pathData, areaData, minDistance, maxDistance, minElevation, maxElevation } = chartData;

  // Generate grid lines
  const gridLines = useMemo(() => {
    const xTicks = 5;
    const yTicks = 4;
    const xLines = [];
    const yLines = [];

    // X grid lines
    for (let i = 0; i <= xTicks; i++) {
      const distance = minDistance + (maxDistance - minDistance) * (i / xTicks);
      const x = xScale(distance);
      xLines.push({
        x1: x,
        y1: padding.top,
        x2: x,
        y2: height - padding.bottom,
        label: distance.toFixed(1)
      });
    }

    // Y grid lines
    for (let i = 0; i <= yTicks; i++) {
      const elevation = minElevation + (maxElevation - minElevation) * (i / yTicks);
      const y = yScale(elevation);
      yLines.push({
        x1: padding.left,
        y1: y,
        x2: width - padding.right,
        y2: y,
        label: Math.round(elevation).toString()
      });
    }

    return { xLines, yLines };
  }, [xScale, yScale, minDistance, maxDistance, minElevation, maxElevation, width, height, padding]);

  const isUsingRealData = elevationData.length > 0;

  return (
    <div className="h-80 bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
            Perfil de Elevación
          </h3>
          {!isUsingRealData && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Mostrando datos de ejemplo - procesando datos reales...
            </p>
          )}
        </div>
        <div className="flex gap-4 text-sm text-mountain-600 dark:text-mountain-400">
          <span>↗ Ganancia: +{Math.round(stats.totalGain)}m</span>
          <span>↘ Pérdida: -{Math.round(stats.totalLoss)}m</span>
          <span>📏 Distancia: {stats.totalDistance.toFixed(1)}km</span>
        </div>
      </div>
      
      <div className="w-full h-64 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isUsingRealData ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)"} stopOpacity={0.6} />
              <stop offset="100%" stopColor={isUsingRealData ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)"} stopOpacity={0.1} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.yLines.map((line, index) => (
            <line
              key={`y-grid-${index}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgb(203, 213, 225)"
              strokeWidth={0.5}
              opacity={0.5}
            />
          ))}
          {gridLines.xLines.map((line, index) => (
            <line
              key={`x-grid-${index}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgb(203, 213, 225)"
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}

          {/* Area fill */}
          <path
            d={areaData}
            fill="url(#elevationGradient)"
          />

          {/* Elevation line */}
          <path
            d={pathData}
            fill="none"
            stroke={isUsingRealData ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)"}
            strokeWidth={2}
          />

          {/* Data points */}
          {data.map((point, index) => (
            <circle
              key={index}
              cx={xScale(point.distance)}
              cy={yScale(point.elevation)}
              r={point.segmentIndex === hoveredSegment ? 6 : 4}
              fill={point.segmentIndex === hoveredSegment ? "rgb(239, 68, 68)" : (isUsingRealData ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)")}
              stroke="white"
              strokeWidth={2}
              className="cursor-pointer hover:r-6 transition-all"
              onMouseEnter={() => onPointHover?.(point.segmentIndex ?? null)}
              onMouseLeave={() => onPointHover?.(null)}
            />
          ))}

          {/* X Axis labels */}
          {gridLines.xLines.map((line, index) => (
            <text
              key={`x-label-${index}`}
              x={line.x1}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
              className="text-mountain-600 dark:text-mountain-400"
            >
              {line.label}km
            </text>
          ))}

          {/* Y Axis labels */}
          {gridLines.yLines.map((line, index) => (
            <text
              key={`y-label-${index}`}
              x={padding.left - 10}
              y={line.y1 + 4}
              textAnchor="end"
              fontSize="12"
              fill="currentColor"
              className="text-mountain-600 dark:text-mountain-400"
            >
              {line.label}m
            </text>
          ))}

          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            fontSize="14"
            fill="currentColor"
            className="text-mountain-700 dark:text-mountain-300"
          >
            Distancia (km)
          </text>
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            fontSize="14"
            fill="currentColor"
            className="text-mountain-700 dark:text-mountain-300"
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            Elevación (m)
          </text>
        </svg>
      </div>
    </div>
  );
};
