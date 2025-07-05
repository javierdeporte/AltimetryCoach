
import React from 'react';
import { AdvancedSegment } from '@/utils/types';

interface SegmentsTableHeaderInfoProps {
  isAdvancedMode: boolean;
  displaySegmentsLength: number;
  advancedSegments: AdvancedSegment[];
}

export const SegmentsTableHeaderInfo: React.FC<SegmentsTableHeaderInfoProps> = ({
  isAdvancedMode,
  displaySegmentsLength,
  advancedSegments
}) => {
  return (
    <div className="p-6 border-b border-primary-200 dark:border-mountain-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
            Análisis de Segmentos de Ruta
            {isAdvancedMode && (
              <span className="ml-2 text-sm bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded">
                Modo Avanzado
              </span>
            )}
          </h3>
          <p className="text-sm text-mountain-600 dark:text-mountain-400 mt-1">
            {displaySegmentsLength > 0 
              ? `${displaySegmentsLength} segmentos ${isAdvancedMode ? 'generados por regresión lineal' : 'básicos'}` 
              : 'Los segmentos se generarán automáticamente al procesar el archivo GPX'
            }
          </p>
        </div>
        {isAdvancedMode && advancedSegments.length > 0 && (
          <div className="text-right text-sm text-mountain-600 dark:text-mountain-400">
            <div>R² Promedio: {(advancedSegments.reduce((acc, s) => acc + s.rSquared, 0) / advancedSegments.length).toFixed(3)}</div>
            <div>Calidad: {Math.round((advancedSegments.reduce((acc, s) => acc + s.rSquared, 0) / advancedSegments.length) * 100)}%</div>
          </div>
        )}
      </div>
    </div>
  );
};
