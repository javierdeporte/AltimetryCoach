import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AdvancedSegment } from '@/utils/types';

interface Segment {
  id: string;
  segment_index: number;
  distance_km: number;
  elevation_gain_m: number;
  avg_grade_percent: number;
}

interface SegmentsTableProps {
  segments: Segment[];
  advancedSegments?: AdvancedSegment[];
  isAdvancedMode?: boolean;
  onSegmentHover?: (segmentIndex: number | null) => void;
  hoveredSegment?: number | null;
}

export const SegmentsTable: React.FC<SegmentsTableProps> = ({ 
  segments,
  advancedSegments = [],
  isAdvancedMode = false,
  onSegmentHover, 
  hoveredSegment 
}) => {
  console.log('SegmentsTable - Advanced mode:', isAdvancedMode, 'Advanced segments:', advancedSegments.length);

  // Use advanced segments data when in advanced mode, otherwise use basic segments
  const displaySegments = React.useMemo(() => {
    if (isAdvancedMode && advancedSegments.length > 0) {
      return advancedSegments.map((advSeg, index) => {
        const distance = advSeg.distance;
        const elevationGain = advSeg.elevationGain;
        const elevationLoss = advSeg.elevationLoss;
        
        // Calculate grade from slope 
        const gradePercent = advSeg.slope * 100;
        
        return {
          id: `advanced-${index}`,
          segment_index: index,
          distance_km: distance,
          elevation_gain_m: elevationGain,
          elevation_loss_m: elevationLoss,
          avg_grade_percent: gradePercent,
          rSquared: advSeg.rSquared,
          type: advSeg.type
        };
      });
    }
    
    return segments.map(seg => ({
      ...seg,
      elevation_loss_m: calculateElevationLoss(seg),
      rSquared: null,
      type: null
    }));
  }, [isAdvancedMode, advancedSegments, segments]);

  const getGradeColor = (grade: number) => {
    const absGrade = Math.abs(grade);
    if (absGrade > 8) return 'text-red-600 dark:text-red-400';
    if (absGrade > 4) return 'text-earth-600 dark:text-earth-400';
    if (absGrade > 0) return 'text-primary-600 dark:text-primary-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getSegmentName = (index: number, type?: string | null) => {
    if (isAdvancedMode && type) {
      const typeLabels = {
        'asc': 'Ascenso',
        'desc': 'Descenso',
        'hor': 'Plano'
      };
      return `${typeLabels[type as keyof typeof typeLabels]} ${index + 1}`;
    }
    
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

  // Calcular pérdida de elevación estimada para segmentos básicos
  function calculateElevationLoss(segment: Segment) {
    if (segment.avg_grade_percent < 0) {
      return Math.abs((segment.avg_grade_percent / 100) * segment.distance_km * 1000);
    }
    return Math.round(segment.distance_km * 5);
  }

  const getQualityIndicator = (rSquared: number | null) => {
    if (rSquared === null) return null;
    
    const quality = rSquared * 100;
    let colorClass = 'text-red-500';
    let label = 'Baja';
    
    if (quality >= 95) {
      colorClass = 'text-green-600';
      label = 'Excelente';
    } else if (quality >= 90) {
      colorClass = 'text-primary-600';
      label = 'Muy Buena';
    } else if (quality >= 85) {
      colorClass = 'text-yellow-600';
      label = 'Buena';
    } else if (quality >= 80) {
      colorClass = 'text-orange-600';
      label = 'Regular';
    }
    
    return (
      <span className={`text-xs ${colorClass} font-medium`} title={`R² = ${rSquared.toFixed(3)}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 overflow-hidden">
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
              {displaySegments.length > 0 
                ? `${displaySegments.length} segmentos ${isAdvancedMode ? 'generados por regresión lineal' : 'básicos'}` 
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
      
      {displaySegments.length === 0 ? (
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-mountain-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600 dark:text-mountain-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-mountain-600 dark:text-mountain-400">
            No hay segmentos disponibles para esta ruta
          </p>
          <p className="text-sm text-mountain-500 dark:text-mountain-500 mt-2">
            Los datos GPX se están procesando para generar los segmentos
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-primary-200 dark:border-mountain-700">
                <TableHead className="text-mountain-700 dark:text-mountain-300">Segmento</TableHead>
                <TableHead className="text-mountain-700 dark:text-mountain-300">Distancia</TableHead>
                <TableHead className="text-mountain-700 dark:text-mountain-300">Ganancia</TableHead>
                <TableHead className="text-mountain-700 dark:text-mountain-300">Pérdida</TableHead>
                <TableHead className="text-mountain-700 dark:text-mountain-300">Gradiente Promedio</TableHead>
                {isAdvancedMode && (
                  <TableHead className="text-mountain-700 dark:text-mountain-300">Calidad</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySegments.map((segment, index) => (
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
                    <div className="flex items-center gap-2">
                      {getSegmentName(segment.segment_index, segment.type)}
                      {isAdvancedMode && segment.type && (
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: segment.type === 'asc' ? '#22c55e' : 
                                           segment.type === 'desc' ? '#ef4444' : '#6b7280' 
                          }}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-mountain-600 dark:text-mountain-400">
                    {segment.distance_km.toFixed(1)} km
                  </TableCell>
                  <TableCell className="text-primary-600 dark:text-primary-400">
                    +{Math.round(segment.elevation_gain_m)}m
                  </TableCell>
                  <TableCell className="text-blue-600 dark:text-blue-400">
                    -{Math.round(segment.elevation_loss_m)}m
                  </TableCell>
                  <TableCell className={getGradeColor(segment.avg_grade_percent)}>
                    {segment.avg_grade_percent > 0 ? '+' : ''}{segment.avg_grade_percent.toFixed(1)}%
                  </TableCell>
                  {isAdvancedMode && (
                    <TableCell>
                      {getQualityIndicator(segment.rSquared)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
