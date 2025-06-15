import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { ElevationChartD3 } from './elevation-chart-d3';
import { 
  segmentProfileAdvanced, 
  DEFAULT_ADVANCED_SEGMENTATION_PARAMS,
  getAdvancedSegmentTypeLabel 
} from '../../utils/advancedSegmentation';
import { Settings, Save, RotateCcw, TrendingUp } from 'lucide-react';
import { AdvancedSegment, AdvancedSegmentationParams, ElevationPoint } from '@/utils/types';

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
  const [params, setParams] = useState<AdvancedSegmentationParams>(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);

  // Calculate advanced segments in real-time
  const advancedSegments = useMemo(() => {
    if (!elevationData || elevationData.length === 0) return [];
    console.log("Recalculating segments with params:", params);
    return segmentProfileAdvanced(elevationData, params);
  }, [elevationData, params]);

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

  const ParamSlider = ({ label, description, value, onValueChange, min, max, step, formatValue }: {
    label: string;
    description: string;
    value: number;
    onValueChange: (val: number) => void;
    min: number;
    max: number;
    step: number;
    formatValue: (val: number) => string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
        {label}: {formatValue(value)}
      </label>
      <Slider
        value={[value]}
        onValueChange={(v) => onValueChange(v[0])}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      <p className="text-xs text-mountain-600 dark:text-mountain-400">
        {description}
      </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Análisis Híbrido de Segmentos
          </DialogTitle>
          <DialogDescription>
            Ajusta los parámetros para optimizar la detección de segmentos según tu estrategia deportiva.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          {/* Controls Panel */}
          <div className="lg:w-96 flex-shrink-0 space-y-6 overflow-y-auto p-2">
            <div className="space-y-4 p-4 rounded-lg border">
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
                Parámetros de Segmentación
              </h3>
              
              <div className="space-y-4">
                <h4 className="font-medium text-primary-600">Macro-Segmentación (Picos y Valles)</h4>
                <ParamSlider 
                  label="Prominencia Mínima"
                  description="Altura mínima que debe tener un pico o valle para ser considerado un punto de división principal."
                  value={params.macroProminence}
                  onValueChange={(val) => setParams(p => ({...p, macroProminence: val}))}
                  min={10} max={100} step={5}
                  formatValue={(val) => `${val} m`}
                />
                <ParamSlider 
                  label="Distancia Mínima (Macro)"
                  description="Distancia mínima entre picos/valles principales para evitar divisiones muy seguidas."
                  value={params.macroMinDistance}
                  onValueChange={(val) => setParams(p => ({...p, macroMinDistance: val}))}
                  min={0.2} max={2.0} step={0.1}
                  formatValue={(val) => `${val.toFixed(1)} km`}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-primary-600">Micro-Segmentación (Regresión Lineal)</h4>
                <ParamSlider 
                  label="Calidad de Ajuste (R²)"
                  description="Qué tan recta debe ser una sección para ser un segmento. Más alto = más estricto."
                  value={params.rSquaredThreshold}
                  onValueChange={(val) => setParams(p => ({...p, rSquaredThreshold: val}))}
                  min={0.80} max={0.99} step={0.01}
                  formatValue={(val) => val.toFixed(2)}
                />
                 <ParamSlider 
                  label="Distancia Mínima (Micro)"
                  description="Distancia mínima para un micro-segmento. Absorbe variaciones cortas como las que mencionaste."
                  value={params.microMinDistance}
                  onValueChange={(val) => setParams(p => ({...p, microMinDistance: val}))}
                  min={0.1} max={1.0} step={0.1}
                  formatValue={(val) => `${val.toFixed(1)} km`}
                />
                <ParamSlider 
                  label="Puntos Mínimos"
                  description="Número de puntos de datos necesarios. Aumentar si el GPS es ruidoso."
                  value={params.minSegmentPoints}
                  onValueChange={(val) => setParams(p => ({...p, minSegmentPoints: val}))}
                  min={10} max={50} step={1}
                  formatValue={(val) => `${val}`}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-primary-600">Post-Procesamiento</h4>
                 <ParamSlider 
                  label="Umbral de Fusión de Pendiente"
                  description="Si dos segmentos seguidos tienen pendientes muy parecidas, se unen. Más alto = menos fusiones."
                  value={params.slopeChangeThreshold}
                  onValueChange={(val) => setParams(p => ({...p, slopeChangeThreshold: val}))}
                  min={0.05} max={0.20} step={0.01}
                  formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                />
              </div>
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
                  elevationData={elevationData}
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

        <DialogFooter className="pt-4 border-t">
          <Button onClick={handleResetParams} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
          <Button onClick={onClose} variant="secondary">
            Cerrar
          </Button>
          <Button onClick={handleSaveSegments} disabled={advancedSegments.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Aplicar y Guardar ({advancedSegments.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
