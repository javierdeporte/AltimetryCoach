
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { ElevationChartD3 } from './elevation-chart-d3';
import { 
  segmentProfileAdvanced, 
  DEFAULT_ADVANCED_SEGMENTATION_PARAMS,
  getAdvancedSegmentTypeLabel 
} from '../../utils/advancedSegmentation';
import { Settings, Save, RotateCcw, TrendingUp } from 'lucide-react';

interface ElevationPoint {
  distance: number;
  elevation: number;
  displayDistance: number;
  displayElevation: number;
  segmentIndex?: number;
}

interface IntelligentSegmentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  elevationData: ElevationPoint[];
  onSaveSegments?: (segments: any[]) => void;
}

export const IntelligentSegmentationModal: React.FC<IntelligentSegmentationModalProps> = ({
  isOpen,
  onClose,
  elevationData,
  onSaveSegments
}) => {
  const [params, setParams] = useState(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);

  // Process elevation data to ensure it has the required displayDistance and displayElevation properties
  const processedElevationData = useMemo(() => {
    return elevationData.map(point => ({
      ...point,
      displayDistance: point.displayDistance || point.distance,
      displayElevation: point.displayElevation || point.elevation
    }));
  }, [elevationData]);

  // Calculate advanced segments in real-time
  const advancedSegments = useMemo(() => {
    if (!processedElevationData || processedElevationData.length === 0) return [];
    return segmentProfileAdvanced(processedElevationData, params);
  }, [processedElevationData, params]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (advancedSegments.length === 0) return null;
    
    const totalAscent = advancedSegments
      .filter(s => s.type === 'asc')
      .reduce((sum, s) => sum + s.elevationGain, 0);
    
    const totalDescent = advancedSegments
      .filter(s => s.type === 'desc')
      .reduce((sum, s) => sum + s.elevationLoss, 0);
    
    const avgSegmentDistance = advancedSegments
      .reduce((sum, s) => sum + s.distance, 0) / advancedSegments.length;
    
    const avgRSquared = advancedSegments
      .reduce((sum, s) => sum + s.rSquared, 0) / advancedSegments.length;
    
    return {
      totalSegments: advancedSegments.length,
      ascentSegments: advancedSegments.filter(s => s.type === 'asc').length,
      descentSegments: advancedSegments.filter(s => s.type === 'desc').length,
      horizontalSegments: advancedSegments.filter(s => s.type === 'hor').length,
      totalAscent: Math.round(totalAscent),
      totalDescent: Math.round(totalDescent),
      avgSegmentDistance: avgSegmentDistance.toFixed(1),
      avgRSquared: avgRSquared.toFixed(3),
      qualityRating: avgRSquared >= 0.95 ? 'Excelente' : avgRSquared >= 0.90 ? 'Bueno' : avgRSquared >= 0.85 ? 'Regular' : 'Bajo'
    };
  }, [advancedSegments]);

  const handleResetParams = () => {
    setParams(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);
  };

  const handleSaveSegments = () => {
    if (onSaveSegments) {
      // Convert advanced segments to the format expected by the database
      const segmentsForDB = advancedSegments.map((segment, index) => ({
        segment_index: index,
        start_lat: 0, // These would need to be calculated from actual GPX data
        start_lng: 0,
        end_lat: 0,
        end_lng: 0,
        distance_km: segment.distance,
        elevation_gain_m: Math.round(segment.elevationGain),
        avg_grade_percent: (segment.slope * 100), // Convert slope to percentage
        segment_type: segment.type,
        r_squared: segment.rSquared,
        slope: segment.slope,
        intercept: segment.intercept
      }));
      
      onSaveSegments(segmentsForDB);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Análisis Avanzado de Segmentos con Regresión Lineal
          </DialogTitle>
          <p className="text-sm text-mountain-600 dark:text-mountain-400">
            Algoritmo de ventana creciente con control de calidad R²
          </p>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          {/* Controls Panel */}
          <div className="lg:w-80 flex-shrink-0 space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
                Parámetros de Segmentación Avanzada
              </h3>
              
              {/* R² Threshold */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Umbral de Calidad R²: {params.rSquaredThreshold.toFixed(3)}
                </label>
                <Slider
                  value={[params.rSquaredThreshold]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, rSquaredThreshold: value[0] }))}
                  min={0.80}
                  max={0.98}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Coeficiente de determinación mínimo para mantener un segmento
                </p>
              </div>

              {/* Minimum Points */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Puntos Mínimos por Segmento: {params.minSegmentPoints}
                </label>
                <Slider
                  value={[params.minSegmentPoints]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, minSegmentPoints: value[0] }))}
                  min={10}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Número mínimo de puntos para formar un segmento válido
                </p>
              </div>

              {/* Minimum Distance */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Distancia Mínima: {params.minSegmentDistance.toFixed(1)} km
                </label>
                <Slider
                  value={[params.minSegmentDistance]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, minSegmentDistance: value[0] }))}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Distancia mínima para considerar un segmento
                </p>
              </div>

              <Button onClick={handleResetParams} variant="outline" className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Valores por Defecto
              </Button>
            </div>

            {/* Enhanced Statistics */}
            {stats && (
              <div className="space-y-3 border-t border-primary-200 dark:border-mountain-700 pt-4">
                <h4 className="text-md font-semibold text-mountain-800 dark:text-mountain-200">
                  Métricas de Calidad
                </h4>
                
                {/* Quality Rating */}
                <div className="bg-primary-50 dark:bg-mountain-700 p-3 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                      {stats.qualityRating}
                    </div>
                    <div className="text-xs text-mountain-600 dark:text-mountain-400">
                      Calidad del Ajuste (R² = {stats.avgRSquared})
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-primary-50 dark:bg-mountain-700 p-2 rounded">
                    <div className="font-semibold text-primary-600 dark:text-primary-400">
                      {stats.totalSegments}
                    </div>
                    <div className="text-xs text-mountain-600 dark:text-mountain-400">
                      Total Segmentos
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-mountain-700 p-2 rounded">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {stats.ascentSegments}
                    </div>
                    <div className="text-xs text-mountain-600 dark:text-mountain-400">
                      Ascensos
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-mountain-700 p-2 rounded">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {stats.descentSegments}
                    </div>
                    <div className="text-xs text-mountain-600 dark:text-mountain-400">
                      Descensos
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-mountain-700 p-2 rounded">
                    <div className="font-semibold text-gray-600 dark:text-gray-400">
                      {stats.horizontalSegments}
                    </div>
                    <div className="text-xs text-mountain-600 dark:text-mountain-400">
                      Horizontales
                    </div>
                  </div>
                </div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400 space-y-1">
                  <div>Ganancia total: +{stats.totalAscent}m</div>
                  <div>Pérdida total: -{stats.totalDescent}m</div>
                  <div>Distancia promedio: {stats.avgSegmentDistance}km</div>
                </div>
              </div>
            )}
          </div>

          {/* Chart Preview */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
                  Vista Previa con Líneas de Regresión
                </h3>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    Ascenso
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    Descenso
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-500 rounded"></div>
                    Horizontal
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-red-600 border-dashed border-t"></div>
                    Tendencias
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <ElevationChartD3
                  elevationData={processedElevationData}
                  advancedSegments={advancedSegments}
                  options={{
                    width: 800,
                    height: 400,
                    backgroundColor: 'transparent'
                  }}
                />
              </div>

              {/* Enhanced Segments List */}
              {advancedSegments.length > 0 && (
                <div className="mt-4 max-h-40 overflow-y-auto border border-primary-200 dark:border-mountain-700 rounded-lg">
                  <div className="bg-primary-50 dark:bg-mountain-700 px-3 py-2 text-sm font-semibold">
                    Segmentos Detectados (con Calidad R²)
                  </div>
                  <div className="divide-y divide-primary-200 dark:divide-mountain-700">
                    {advancedSegments.map((segment, index) => (
                      <div key={index} className="px-3 py-2 text-sm flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded" 
                            style={{ backgroundColor: segment.color }}
                          ></div>
                          <span className="font-medium">
                            {getAdvancedSegmentTypeLabel(segment.type)} #{index + 1}
                          </span>
                        </div>
                        <div className="text-xs text-mountain-600 dark:text-mountain-400 flex gap-2">
                          <span>{segment.distance.toFixed(1)}km</span>
                          <span>R²={segment.rSquared.toFixed(3)}</span>
                          <span>{(segment.slope * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t border-primary-200 dark:border-mountain-700">
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button onClick={handleSaveSegments} disabled={advancedSegments.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Aplicar Segmentos Avanzados ({advancedSegments.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
