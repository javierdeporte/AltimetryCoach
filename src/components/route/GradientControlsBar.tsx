import React from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { RotateCcw, X, Zap } from 'lucide-react';
import { GradientSegmentationV2Params } from '../../utils/gradientSegmentationV2';

interface GradientControlsBarProps {
  params: GradientSegmentationV2Params;
  setParams: (params: GradientSegmentationV2Params) => void;
  stats: {
    totalSegments: number;
    ascentSegments: number;
    descentSegments: number;
    horizontalSegments: number;
    avgRSquared: string;
    avgSegmentDistance: string;
  } | null;
  onReset: () => void;
  onClose: () => void;
}

export const GradientControlsBar: React.FC<GradientControlsBarProps> = ({
  params,
  setParams,
  stats,
  onReset,
  onClose
}) => {
  const handleParamChange = (key: keyof GradientSegmentationV2Params, value: number) => {
    setParams({
      ...params,
      [key]: value
    });
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
            Análisis Híbrido por Gradiente + R²
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-yellow-700 hover:bg-yellow-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Prominence Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Prominencia (m): {params.prominenciaMinima}
          </label>
          <Slider
            value={[params.prominenciaMinima]}
            onValueChange={(value) => handleParamChange('prominenciaMinima', value[0])}
            min={5}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Gradient Change Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Cambio Gradiente (%): {params.cambioGradiente}
          </label>
          <Slider
            value={[params.cambioGradiente]}
            onValueChange={(value) => handleParamChange('cambioGradiente', value[0])}
            min={1}
            max={10}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* NEW: R² Quality Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Calidad R² Mín: {(params.calidadR2Minima * 100).toFixed(0)}%
          </label>
          <Slider
            value={[params.calidadR2Minima]}
            onValueChange={(value) => handleParamChange('calidadR2Minima', value[0])}
            min={0.70}
            max={0.98}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Distance Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Distancia Mín (m): {Math.round(params.distanciaMinima * 1000)}
          </label>
          <Slider
            value={[params.distanciaMinima]}
            onValueChange={(value) => handleParamChange('distanciaMinima', value[0])}
            min={0.05}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
      </div>

      {/* Enhanced Stats Display */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-4 border-t border-yellow-200 dark:border-yellow-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.totalSegments}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">Segmentos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.ascentSegments}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">Ascenso</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.descentSegments}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">Descenso</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.horizontalSegments}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">Horizontal</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.avgRSquared}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">R² Promedio</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.avgSegmentDistance}km</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">Dist. Promedio</div>
          </div>
        </div>
      )}
    </div>
  );
};
