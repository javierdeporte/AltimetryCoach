
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
  console.log('ElevationChart render with', elevationData.length, 'points');

  // Validar datos de entrada
  const validData = useMemo(() => {
    if (!Array.isArray(elevationData) || elevationData.length === 0) {
      console.log('No valid elevation data, using mock data');
      return [
        { distance: 0, elevation: 1200, segmentIndex: 0 },
        { distance: 3.2, elevation: 1350, segmentIndex: 0 },
        { distance: 6.0, elevation: 1630, segmentIndex: 1 },
        { distance: 10.1, elevation: 1510, segmentIndex: 2 },
        { distance: 13.6, elevation: 1270, segmentIndex: 3 },
        { distance: 16.0, elevation: 1460, segmentIndex: 4 },
      ];
    }
    return elevationData.slice(0, 100); // Limitar a 100 puntos para rendimiento
  }, [elevationData]);

  const isUsingRealData = elevationData.length > 0;

  // Calcular estadísticas básicas de forma segura
  const stats = useMemo(() => {
    if (validData.length === 0) {
      return { totalGain: 0, totalLoss: 0, totalDistance: 0 };
    }

    let totalGain = 0;
    let totalLoss = 0;
    
    for (let i = 1; i < validData.length; i++) {
      const diff = validData[i].elevation - validData[i - 1].elevation;
      if (diff > 0) {
        totalGain += diff;
      } else {
        totalLoss += Math.abs(diff);
      }
    }

    const totalDistance = validData[validData.length - 1]?.distance || 0;

    return { totalGain, totalLoss, totalDistance };
  }, [validData]);

  // Generar datos del gráfico de forma simple
  const chartData = useMemo(() => {
    if (validData.length === 0) return null;

    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    
    const distances = validData.map(d => d.distance);
    const elevations = validData.map(d => d.elevation);
    
    const minDistance = Math.min(...distances);
    const maxDistance = Math.max(...distances);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    
    const xScale = (distance: number) => 
      padding.left + ((distance - minDistance) / (maxDistance - minDistance)) * (width - padding.left - padding.right);
    
    const yScale = (elevation: number) => 
      padding.top + ((maxElevation - elevation) / (maxElevation - minElevation)) * (height - padding.top - padding.bottom);

    const points = validData.map(point => ({
      x: xScale(point.distance),
      y: yScale(point.elevation),
      ...point
    }));

    const pathData = points.map((point, index) => 
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(' ');

    const areaData = pathData + ` L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

    return {
      width,
      height,
      padding,
      points,
      pathData,
      areaData,
      minDistance,
      maxDistance,
      minElevation,
      maxElevation
    };
  }, [validData]);

  if (!chartData) {
    return (
      <div className="h-80 bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 p-6">
        <div className="flex items-center justify-center h-full">
          <p className="text-mountain-600 dark:text-mountain-400">No hay datos de elevación disponibles</p>
        </div>
      </div>
    );
  }

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
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isUsingRealData ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)"} stopOpacity={0.6} />
              <stop offset="100%" stopColor={isUsingRealData ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)"} stopOpacity={0.1} />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={chartData.areaData}
            fill="url(#elevationGradient)"
          />

          {/* Elevation line */}
          <path
            d={chartData.pathData}
            fill="none"
            stroke={isUsingRealData ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)"}
            strokeWidth={2}
          />

          {/* Data points */}
          {chartData.points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={point.segmentIndex === hoveredSegment ? 6 : 4}
              fill={point.segmentIndex === hoveredSegment ? "rgb(239, 68, 68)" : (isUsingRealData ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)")}
              stroke="white"
              strokeWidth={2}
              className="cursor-pointer transition-all"
              onMouseEnter={() => onPointHover?.(point.segmentIndex ?? null)}
              onMouseLeave={() => onPointHover?.(null)}
            />
          ))}

          {/* Simple axis labels */}
          <text
            x={chartData.width / 2}
            y={chartData.height - 5}
            textAnchor="middle"
            fontSize="14"
            fill="currentColor"
            className="text-mountain-700 dark:text-mountain-300"
          >
            Distancia (km)
          </text>
          <text
            x={15}
            y={chartData.height / 2}
            textAnchor="middle"
            fontSize="14"
            fill="currentColor"
            className="text-mountain-700 dark:text-mountain-300"
            transform={`rotate(-90, 15, ${chartData.height / 2})`}
          >
            Elevación (m)
          </text>
        </svg>
      </div>
    </div>
  );
};
