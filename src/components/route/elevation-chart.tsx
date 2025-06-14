
import React from 'react';

// TODO: Install D3.js when ready to implement
// import * as d3 from 'd3';

interface ElevationChartProps {
  elevationData: number[];
  onPointHover?: (index: number) => void;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({ elevationData, onPointHover }) => {
  // Mock elevation data for demo
  const mockData = [
    { distance: 0, elevation: 1200 },
    { distance: 2, elevation: 1350 },
    { distance: 4, elevation: 1280 },
    { distance: 6, elevation: 1450 },
    { distance: 8, elevation: 1380 },
    { distance: 10, elevation: 1520 },
    { distance: 12, elevation: 1460 },
    { distance: 14, elevation: 1300 },
    { distance: 16, elevation: 1200 },
  ];

  return (
    <div className="h-64 bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Elevation Profile
        </h3>
        <div className="flex gap-4 text-sm text-mountain-600 dark:text-mountain-400">
          <span>↗ Gain: +320m</span>
          <span>↘ Loss: -320m</span>
          <span>📏 Distance: 16.0km</span>
        </div>
      </div>
      
      <div className="h-48 relative">
        {/* SVG Placeholder for elevation chart */}
        <svg className="w-full h-full" viewBox="0 0 400 180">
          <defs>
            <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="0"
              y1={i * 45}
              x2="400"
              y2={i * 45}
              stroke="rgb(203, 213, 225)"
              strokeWidth="0.5"
              opacity="0.5"
            />
          ))}
          
          {/* Mock elevation line */}
          <path
            d="M 0 120 L 50 80 L 100 100 L 150 60 L 200 90 L 250 40 L 300 70 L 350 110 L 400 120"
            fill="url(#elevationGradient)"
            stroke="rgb(34, 197, 94)"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {mockData.map((point, index) => (
            <circle
              key={index}
              cx={point.distance * 25}
              cy={180 - (point.elevation - 1100) / 5}
              r="3"
              fill="rgb(34, 197, 94)"
              className="cursor-pointer hover:r-4 transition-all"
            />
          ))}
        </svg>
        
        {/* Placeholder text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-white/90 dark:bg-mountain-800/90 rounded-lg p-4 border border-primary-200/50 dark:border-mountain-700/50">
            <p className="text-sm text-mountain-600 dark:text-mountain-400">
              D3.js integration will render interactive elevation chart here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
