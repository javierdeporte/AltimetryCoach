import React from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { AdvancedSegmentationParams } from '@/utils/types';
import { RotateCcw, X } from 'lucide-react';

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

interface AdvancedControlsPanelProps {
  params: AdvancedSegmentationParams;
  setParams: React.Dispatch<React.SetStateAction<AdvancedSegmentationParams>>;
  stats: {
    totalSegments: number;
    ascentSegments: number;
    descentSegments: number;
    horizontalSegments: number;
    totalAscent: number;
    totalDescent: number;
    avgSegmentDistance: string;
    avgRSquared: string;
    qualityRating: string;
  } | null;
  onReset: () => void;
  onClose: () => void;
}

export const AdvancedControlsPanel: React.FC<AdvancedControlsPanelProps> = ({
  params,
  setParams,
  stats,
  onReset,
  onClose,
}) => {
  return (
    <div className="w-96 h-screen flex-shrink-0 bg-white dark:bg-mountain-800 border-l border-primary-200 dark:border-mountain-700 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-mountain-700">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Ajuste de Parámetros
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-4 p-4 rounded-lg border border-primary-200 dark:border-mountain-700">
          <h4 className="font-medium text-primary-600">Macro-Segmentación (Picos y Valles)</h4>
          <ParamSlider 
            label="Prominencia Mínima"
            description="Altura mínima que debe tener un pico o valle para ser considerado un punto de división principal."
            value={params.macroProminence}
            onValueChange={(val) => setParams(p => ({...p, macroProminence: val}))}
            min={10} max={100} step={5}
            formatValue={(val) => `${val} m`}
          />
        </div>

        <div className="space-y-4 p-4 rounded-lg border border-primary-200 dark:border-mountain-700">
          <h4 className="font-medium text-primary-600">Micro-Segmentación (Umbrales)</h4>
          <ParamSlider 
            label="Distancia Mínima"
            description="Longitud mínima para un micro-segmento. Absorbe variaciones cortas y ruidosas."
            value={params.microMinDistance}
            onValueChange={(val) => setParams(p => ({...p, microMinDistance: val}))}
            min={0.1} max={2.0} step={0.1}
            formatValue={(val) => `${val.toFixed(1)} km`}
          />
          <ParamSlider 
            label="Umbral Cambio de Pendiente"
            description="Si dos tramos seguidos tienen pendientes muy diferentes, se dividen. Más alto = menos divisiones."
            value={params.slopeChangeThreshold}
            onValueChange={(val) => setParams(p => ({...p, slopeChangeThreshold: val}))}
            min={0.02} max={0.20} step={0.01}
            formatValue={(val) => `${(val * 100).toFixed(0)}%`}
          />
        </div>

        {stats && (
          <div className="space-y-3 pt-4">
            <h4 className="text-md font-semibold text-mountain-800 dark:text-mountain-200">
              Métricas de Calidad
            </h4>
            
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
                <div className="font-semibold text-primary-600 dark:text-primary-400">{stats.totalSegments}</div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">Total Segmentos</div>
              </div>
              <div className="bg-green-50 dark:bg-mountain-700 p-2 rounded">
                <div className="font-semibold text-green-600 dark:text-green-400">{stats.ascentSegments}</div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">Ascensos</div>
              </div>
              <div className="bg-blue-50 dark:bg-mountain-700 p-2 rounded">
                <div className="font-semibold text-blue-600 dark:text-blue-400">{stats.descentSegments}</div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">Descensos</div>
              </div>
              <div className="bg-gray-50 dark:bg-mountain-700 p-2 rounded">
                <div className="font-semibold text-gray-600 dark:text-gray-400">{stats.horizontalSegments}</div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">Horizontales</div>
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

      <div className="p-4 border-t border-primary-200 dark:border-mountain-700">
        <Button onClick={onReset} variant="outline" className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar Parámetros
        </Button>
      </div>
    </div>
  );
};
