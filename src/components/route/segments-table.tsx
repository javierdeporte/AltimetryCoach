
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface Segment {
  id: string;
  segment_index: number;
  distance_km: number;
  elevation_gain_m: number;
  avg_grade_percent: number;
}

interface SegmentsTableProps {
  segments: Segment[];
  onSegmentHover?: (segmentIndex: number | null) => void;
  hoveredSegment?: number | null;
}

export const SegmentsTable: React.FC<SegmentsTableProps> = ({ 
  segments,
  onSegmentHover, 
  hoveredSegment 
}) => {
  const getGradeColor = (grade: number) => {
    const absGrade = Math.abs(grade);
    if (absGrade > 8) return 'text-red-600 dark:text-red-400';
    if (absGrade > 4) return 'text-earth-600 dark:text-earth-400';
    if (absGrade > 0) return 'text-primary-600 dark:text-primary-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getSegmentName = (index: number) => {
    const names = [
      'Inicio del sendero',
      'Ascenso principal',
      'Tramo intermedio',
      'Descenso técnico',
      'Tramo final',
      'Regreso'
    ];
    return names[index] || `Segmento ${index + 1}`;
  };

  // Calcular pérdida de elevación estimada (simplificado)
  const calculateElevationLoss = (segment: Segment) => {
    // Si el gradiente promedio es negativo, usar eso como pérdida
    if (segment.avg_grade_percent < 0) {
      return Math.abs((segment.avg_grade_percent / 100) * segment.distance_km * 1000);
    }
    // Si es positivo, asumir pérdida mínima
    return Math.round(segment.distance_km * 5); // 5m de pérdida por km como estimación
  };

  if (segments.length === 0) {
    return (
      <div className="bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 overflow-hidden">
        <div className="p-6 border-b border-primary-200 dark:border-mountain-700">
          <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
            Análisis de Segmentos de Ruta
          </h3>
          <p className="text-sm text-mountain-600 dark:text-mountain-400 mt-1">
            No hay segmentos disponibles para esta ruta
          </p>
        </div>
        <div className="p-6 text-center">
          <p className="text-mountain-600 dark:text-mountain-400">
            Los segmentos se generarán automáticamente al procesar el archivo GPX
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 overflow-hidden">
      <div className="p-6 border-b border-primary-200 dark:border-mountain-700">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Análisis de Segmentos de Ruta
        </h3>
        <p className="text-sm text-mountain-600 dark:text-mountain-400 mt-1">
          Desglose detallado de cambios de elevación y gradientes
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-primary-200 dark:border-mountain-700">
              <TableHead className="text-mountain-700 dark:text-mountain-300">Segmento</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Distancia</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Ganancia</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Pérdida</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Gradiente Promedio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <TableRow 
                key={segment.id} 
                className={`border-primary-200 dark:border-mountain-700 cursor-pointer transition-colors ${
                  hoveredSegment === segment.segment_index
                    ? 'bg-primary-100 dark:bg-primary-900/20'
                    : 'hover:bg-primary-50 dark:hover:bg-mountain-700'
                }`}
                onMouseEnter={() => onSegmentHover?.(segment.segment_index)}
                onMouseLeave={() => onSegmentHover?.(null)}
              >
                <TableCell className="font-medium text-mountain-800 dark:text-mountain-200">
                  {getSegmentName(segment.segment_index)}
                </TableCell>
                <TableCell className="text-mountain-600 dark:text-mountain-400">
                  {segment.distance_km.toFixed(1)} km
                </TableCell>
                <TableCell className="text-primary-600 dark:text-primary-400">
                  +{Math.round(segment.elevation_gain_m)}m
                </TableCell>
                <TableCell className="text-blue-600 dark:text-blue-400">
                  -{Math.round(calculateElevationLoss(segment))}m
                </TableCell>
                <TableCell className={getGradeColor(segment.avg_grade_percent)}>
                  {segment.avg_grade_percent > 0 ? '+' : ''}{segment.avg_grade_percent.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
