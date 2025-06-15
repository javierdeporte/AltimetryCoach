
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { ElevationChartD3 } from './elevation-chart-d3';
import { 
  analyzeIntelligentSegments, 
  DEFAULT_SEGMENTATION_PARAMS,
  getSegmentTypeLabel 
} from '../../utils/intelligentSegmentation';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface ElevationPoint {
  distance: number;
  elevation: number;
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
  const [params, setParams] = useState(DEFAULT_SEGMENTATION_PARAMS);
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  // Calculate intelligent segments in real-time
  const intelligentSegments = useMemo(() => {
    if (!elevationData || elevationData.length === 0) return [];
    return analyzeIntelligentSegments(elevationData, params);
  }, [elevationData, params]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (intelligentSegments.length === 0) return null;
    
    const totalAscent = intelligentSegments
      .filter(s => s.type === 'asc')
      .reduce((sum, s) => sum + s.elevationGain, 0);
    
    const totalDescent = intelligentSegments
      .filter(s => s.type === 'desc')
      .reduce((sum, s) => sum + s.elevationLoss, 0);
    
    const avgSegmentDistance = intelligentSegments
      .reduce((sum, s) => sum + s.distance, 0) / intelligentSegments.length;
    
    return {
      totalSegments: intelligentSegments.length,
      ascentSegments: intelligentSegments.filter(s => s.type === 'asc').length,
      descentSegments: intelligentSegments.filter(s => s.type === 'desc').length,
      horizontalSegments: intelligentSegments.filter(s => s.type === 'hor').length,
      totalAscent: Math.round(totalAscent),
      totalDescent: Math.round(totalDescent),
      avgSegmentDistance: avgSegmentDistance.toFixed(1)
    };
  }, [intelligentSegments]);

  const handleResetParams = () => {
    setParams(DEFAULT_SEGMENTATION_PARAMS);
  };

  const handleSaveSegments = () => {
    if (onSaveSegments) {
      // Convert intelligent segments to the format expected by the database
      const segmentsForDB = intelligentSegments.map((segment, index) => ({
        segment_index: index,
        start_lat: 0, // These would need to be calculated from actual GPX data
        start_lng: 0,
        end_lat: 0,
        end_lng: 0,
        distance_km: segment.distance,
        elevation_gain_m: Math.round(segment.elevationGain),
        avg_grade_percent: segment.avgGrade * (180 / Math.PI), // Convert from degrees to percentage
        segment_type: segment.type
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
            <Settings className="w-5 h-5" />
            Análisis de Segmentos Inteligentes
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          {/* Controls Panel */}
          <div className="lg:w-80 flex-shrink-0 space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
                Parámetros de Segmentación
              </h3>
              
              {/* Grade Threshold */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Umbral de Cambio de Grado: {params.gradeThreshol}°
                </label>
                <Slider
                  value={[params.gradeThreshold]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, gradeThreshold: value[0] }))}
                  min={5}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Cambio mínimo de pendiente para crear un nuevo segmento
                </p>
              </div>

              {/* Minimum Sustained Distance */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Distancia Mínima Sostenida: {params.minSustainedDistance}m
                </label>
                <Slider
                  value={[params.minSustainedDistance]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, minSustainedDistance: value[0] }))}
                  min={50}
                  max={500}
                  step={25}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Distancia mínima que debe mantenerse una pendiente
                </p>
              </div>

              {/* Smoothing Window */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                  Suavizado de Datos: {params.smoothingWindow} puntos
                </label>
                <Slider
                  value={[params.smoothingWindow]}
                  onValueChange={(value) => setParams(prev => ({ ...prev, smoothingWindow: value[0] }))}
                  min={3}
                  max={15}
                  step={2}
                  className="w-full"
                />
                <p className="text-xs text-mountain-600 dark:text-mountain-400">
                  Ventana de suavizado para reducir ruido en los datos
                </p>
              </div>

              <Button onClick={handleResetParams} variant="outline" className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Valores por Defecto
              </Button>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="space-y-3 border-t border-primary-200 dark:border-mountain-700 pt-4">
                <h4 className="text-md font-semibold text-mountain-800 dark:text-mountain-200">
                  Estadísticas de Segmentación
                </h4>
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
                  Vista Previa de Segmentación
                </h3>
                <div className="flex gap-2 text-sm">
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
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <ElevationChartD3
                  elevationData={elevationData}
                  intelligentSegments={intelligentSegments}
                  options={{
                    width: 800,
                    height: 400,
                    backgroundColor: 'transparent'
                  }}
                />
              </div>

              {/* Segments List */}
              {intelligentSegments.length > 0 && (
                <div className="mt-4 max-h-40 overflow-y-auto border border-primary-200 dark:border-mountain-700 rounded-lg">
                  <div className="bg-primary-50 dark:bg-mountain-700 px-3 py-2 text-sm font-semibold">
                    Segmentos Detectados
                  </div>
                  <div className="divide-y divide-primary-200 dark:divide-mountain-700">
                    {intelligentSegments.map((segment, index) => (
                      <div key={index} className="px-3 py-2 text-sm flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded" 
                            style={{ backgroundColor: segment.color }}
                          ></div>
                          <span className="font-medium">
                            {getSegmentTypeLabel(segment.type)} #{index + 1}
                          </span>
                        </div>
                        <div className="text-xs text-mountain-600 dark:text-mountain-400">
                          {segment.distance.toFixed(1)}km • {segment.avgGrade.toFixed(1)}°
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
          <Button onClick={handleSaveSegments} disabled={intelligentSegments.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Aplicar Segmentos ({intelligentSegments.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
