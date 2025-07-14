
import React from 'react';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { RotateCcw, X, Zap } from 'lucide-react';
import { GradientSegmentationParams, DEFAULT_GRADIENT_PARAMS } from '../../utils/gradientSegmentation';

interface GradientControlsBarProps {
  params: GradientSegmentationParams;
  setParams: (params: GradientSegmentationParams) => void;
  onReset: () => void;
  onClose: () => void;
  stats?: {
    totalSegments: number;
    ascentSegments: number;
    descentSegments: number;
    horizontalSegments: number;
  } | null;
}

export const GradientControlsBar: React.FC<GradientControlsBarProps> = ({
  params,
  setParams,
  onReset,
  onClose,
  stats
}) => {
  const handleProminenciaChange = (value: number[]) => {
    setParams({ ...params, prominenciaMinima: value[0] });
  };

  const handleDistanciaChange = (value: number[]) => {
    setParams({ ...params, distanciaMinima: value[0] });
  };

  const handleGradienteChange = (value: number[]) => {
    setParams({ ...params, cambioGradiente: value[0] });
  };

  return (
    <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-lg p-4 mb-4 shadow-sm">
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
              Análisis por Gradiente
            </h3>
          </div>
          
          {/* Inline Stats */}
          {stats && (
            <div className="flex items-center gap-4 text-xs text-mountain-600 dark:text-mountain-400">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-mountain-800 dark:text-mountain-200">{stats.totalSegments}</span>
                <span>Total</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-green-600">{stats.ascentSegments}</span>
                <span>Ascensos</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-blue-600">{stats.descentSegments}</span>
                <span>Descensos</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-600">{stats.horizontalSegments}</span>
                <span>Planos</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Slider 1: Prominencia Mínima */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
              Prominencia Mínima
            </label>
            <span className="text-xs text-mountain-500 dark:text-mountain-400 bg-mountain-100 dark:bg-mountain-700 px-2 py-1 rounded">
              {params.prominenciaMinima}m
            </span>
          </div>
          <Slider
            value={[params.prominenciaMinima]}
            onValueChange={handleProminenciaChange}
            min={10}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-mountain-500 dark:text-mountain-400">
            Estratégico: Define picos y valles principales
          </p>
        </div>

        {/* Slider 2: Distancia Mínima */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
              Distancia Mínima
            </label>
            <span className="text-xs text-mountain-500 dark:text-mountain-400 bg-mountain-100 dark:bg-mountain-700 px-2 py-1 rounded">
              {params.distanciaMinima.toFixed(2)}km
            </span>
          </div>
          <Slider
            value={[params.distanciaMinima]}
            onValueChange={handleDistanciaChange}
            min={0.05}
            max={1.0}
            step={0.05}
            className="w-full"
          />
          <p className="text-xs text-mountain-500 dark:text-mountain-400">
            Filtro: Longitud mínima de segmentos
          </p>
        </div>

        {/* Slider 3: Cambio de Gradiente */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
              Cambio de Gradiente
            </label>
            <span className="text-xs text-mountain-500 dark:text-mountain-400 bg-mountain-100 dark:bg-mountain-700 px-2 py-1 rounded">
              {params.cambioGradiente.toFixed(1)}%
            </span>
          </div>
          <Slider
            value={[params.cambioGradiente]}
            onValueChange={handleGradienteChange}
            min={1}
            max={15}
            step={0.5}
            className="w-full"
          />
          <p className="text-xs text-mountain-500 dark:text-mountain-400">
            Sensibilidad: Cambio mínimo para dividir
          </p>
        </div>
      </div>
    </div>
  );
};
