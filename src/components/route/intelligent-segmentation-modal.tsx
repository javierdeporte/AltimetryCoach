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
import { Switch } from '../ui/switch';

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
            Análisis Corregido: Inflexiones con Tendencias Validadas
          </DialogTitle>
          <p className="text-sm text-mountain-600 dark:text-mountain-400">
            Lógica de 3 prioridades con parámetros separados y coherentes
          </p>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          {/* Controls Panel */}
          <div className="lg:w-80 flex-shrink-0 space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
                Parámetros Corregidos
              </h3>
              
              {/* R² Threshold (Priority 3) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  R² Seguridad (P3): {params.rSquaredThreshold.toFixed(3)}
                </label>
                <Slider
                  value={[params.rSquaredThreshold]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, rSquaredThreshold: value[0] }))}
                  min={0.70}
                  max={0.95}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Red de seguridad para casos complejos
                </p>
              </div>

              {/* Window Distance - Now configurable */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Ventana Análisis: {params.windowDistance.toFixed(2)} km
                </label>
                <Slider
                  value={[params.windowDistance]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, windowDistance: value[0] }))}
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Distancia para análisis local de inflexiones
                </p>
              </div>

              {/* Inflection Sensitivity - Only for elevation */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Sensibilidad Elevación: {params.inflectionSensitivity.toFixed(1)}m
                </label>
                <Slider
                  value={[params.inflectionSensitivity]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, inflectionSensitivity: value[0] }))}
                  min={0.5}
                  max={8.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Diferencia elevación para picos/valles (solo metros)
                </p>
              </div>

              {/* NEW: Slope Threshold - Separate from elevation */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Umbral Pendiente: {params.slopeThreshold.toFixed(1)}%
                </label>
                <Slider
                  value={[params.slopeThreshold]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, slopeThreshold: value[0] }))}
                  min={1.0}
                  max={10.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Pendiente mínima para cambios dirección (solo porcentaje)
                </p>
              </div>

              {/* Slope Change Threshold - Early warning */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Alerta Cambio: {params.slopeChangeThreshold.toFixed(1)}%
                </label>
                <Slider
                  value={[params.slopeChangeThreshold]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, slopeChangeThreshold: value[0] }))}
                  min={1.0}
                  max={15.0}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Alerta temprana, no corte directo (Prioridad 2)
                </p>
              </div>

              {/* Minimum Distance - For trend validation */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Validación Tendencia: {params.minSegmentDistance.toFixed(1)} km
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
                  Distancia para validar nueva tendencia post-inflexión
                </p>
              </div>

              {/* Inflection Points Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-mountain-700 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                    Inflexiones Validadas (P1)
                  </span>
                  <p className="text-xs text-mountain-500">
                    Máxima prioridad: tendencias post-inflexión validadas
                  </p>
                </div>
                <Switch
                  checked={params.detectInflectionPoints}
                  onCheckedChange={(checked) => setParams(prev => ({ ...prev, detectInflectionPoints: checked }))}
                />
              </div>

              <Button onClick={handleResetParams} variant="outline" className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Parámetros Corregidos
              </Button>
            </div>

            {/* Enhanced Statistics */}
            {stats && (
              <div className="space-y-3 border-t border-primary-200 dark:border-mountain-700 pt-4">
                <h4 className="text-md font-semibold text-mountain-800 dark:text-mountain-200">
                  Métricas Corregidas
                </h4>
                
                {/* Quality Rating */}
                <div className="bg-primary-50 dark:bg-mountain-700 p-3 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                      {stats.qualityRating}
                    </div>
                    <div className="text-xs text-mountain-600 dark:text-mountain-400">
                      Calidad con Lógica Corregida (R² = {stats.avgRSquared})
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-primary-50 dark:bg-mountain-700 p-2 rounded">
                    <div className="font-semibold text-primary-600 dark:text-primary-400">
                      {stats.totalSegments}
                    </div>
                    <div className="text-xs text-mountain-600 dark:text-mountain-400">
                      Segmentos Totales
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
                  Vista Previa con Lógica Corregida
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
                    Regresiones
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
                    Segmentos con Lógica Corregida (3 Prioridades)
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
                          <span title={segment.cutReason}>✂️</span>
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
            Aplicar Lógica Corregida ({advancedSegments.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
