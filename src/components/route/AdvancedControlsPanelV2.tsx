
import React from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { AdvancedSegmentationParamsV2 } from '@/utils/advancedSegmentationV2';
import { RotateCcw, X, Eye, EyeOff } from 'lucide-react';

const ParamSliderV2 = ({ label, description, value, onValueChange, min, max, step, formatValue }: {
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

interface AdvancedControlsPanelV2Props {
  params: AdvancedSegmentationParamsV2;
  setParams: React.Dispatch<React.SetStateAction<AdvancedSegmentationParamsV2>>;
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
    tacticalHighlights: number;
  } | null;
  showTacticalHighlights: boolean;
  setShowTacticalHighlights: (show: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

export const AdvancedControlsPanelV2: React.FC<AdvancedControlsPanelV2Props> = ({
  params,
  setParams,
  stats,
  showTacticalHighlights,
  setShowTacticalHighlights,
  onReset,
  onClose,
}) => {
  return (
    <div className="w-96 h-screen flex-shrink-0 bg-white dark:bg-mountain-800 border-l border-primary-200 dark:border-mountain-700 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-mountain-700">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Análisis V2 - Parámetros
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-4 p-4 rounded-lg border border-primary-200 dark:border-mountain-700">
          <h4 className="font-medium text-primary-600">Macro-Segmentación (Picos y Valles)</h4>
          <ParamSliderV2 
            label="Prominencia Mínima"
            description="Altura mínima que debe tener un pico o valle para ser considerado un punto de división principal."
            value={params.macroProminence}
            onValueChange={(val) => setParams(p => ({...p, macroProminence: val}))}
            min={10} max={100} step={5}
            formatValue={(val) => `${val} m`}
          />
        </div>

        <div className="space-y-4 p-4 rounded-lg border border-primary-200 dark:border-mountain-700">
          <h4 className="font-medium text-primary-600">Micro-Segmentación (Cambio de Pendiente)</h4>
          <ParamSliderV2 
            label="Umbral de Cambio de Pendiente"
            description="Diferencia de pendiente necesaria para crear un nuevo segmento. Mayor = menos segmentos."
            value={params.slopeChangeThreshold}
            onValueChange={(val) => setParams(p => ({...p, slopeChangeThreshold: val}))}
            min={1.0} max={8.0} step={0.5}
            formatValue={(val) => `${val.toFixed(1)}%`}
          />
          <ParamSliderV2 
            label="Distancia Mínima"
            description="Distancia mínima para un micro-segmento. Evita segmentos muy cortos."
            value={params.microMinDistance}
            onValueChange={(val) => setParams(p => ({...p, microMinDistance: val}))}
            min={0.1} max={1.0} step={0.1}
            formatValue={(val) => `${val.toFixed(1)} km`}
          />
          <ParamSliderV2 
            label="Puntos Mínimos"
            description="Número de puntos de datos necesarios por segmento."
            value={params.minSegmentPoints}
            onValueChange={(val) => setParams(p => ({...p, minSegmentPoints: val}))}
            min={5} max={50} step={1}
            formatValue={(val) => `${val}`}
          />
        </div>

        <div className="space-y-4 p-4 rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
          <h4 className="font-medium text-orange-600">Análisis Táctico</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showTacticalHighlights ? <Eye className="w-4 h-4 text-orange-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
              <span className="text-sm font-medium">Resaltar Rampas Críticas</span>
            </div>
            <Switch
              checked={showTacticalHighlights}
              onCheckedChange={setShowTacticalHighlights}
            />
          </div>
          
          <ParamSliderV2 
            label="Umbral de Pendiente Crítica"
            description="Pendiente mínima para considerar una rampa como tácticamente crítica."
            value={params.highlightSlopeThreshold}
            onValueChange={(val) => setParams(p => ({...p, highlightSlopeThreshold: val}))}
            min={8.0} max={25.0} step={1.0}
            formatValue={(val) => `${val.toFixed(0)}%`}
          />
        </div>

        {stats && (
          <div className="space-y-3 pt-4">
            <h4 className="text-md font-semibold text-mountain-800 dark:text-mountain-200">
              Métricas V2
            </h4>
            
            <div className="bg-primary-50 dark:bg-mountain-700 p-3 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {stats.qualityRating}
                </div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">
                  Calidad Informativa (R² = {stats.avgRSquared})
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-primary-50 dark:bg-mountain-700 p-2 rounded">
                <div className="font-semibold text-primary-600 dark:text-primary-400">{stats.totalSegments}</div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">Segmentos</div>
              </div>
              <div className="bg-orange-50 dark:bg-mountain-700 p-2 rounded">
                <div className="font-semibold text-orange-600 dark:text-orange-400">{stats.tacticalHighlights}</div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">Rampas Críticas</div>
              </div>
              <div className="bg-green-50 dark:bg-mountain-700 p-2 rounded">
                <div className="font-semibold text-green-600 dark:text-green-400">{stats.ascentSegments}</div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">Ascensos</div>
              </div>
              <div className="bg-blue-50 dark:bg-mountain-700 p-2 rounded">
                <div className="font-semibold text-blue-600 dark:text-blue-400">{stats.descentSegments}</div>
                <div className="text-xs text-mountain-600 dark:text-mountain-400">Descensos</div>
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
          Restaurar Parámetros V2
        </Button>
      </div>
    </div>
  );
};
