
import React from 'react';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { RotateCcw, X } from 'lucide-react';
import { AdvancedSegmentationV2Params, DEFAULT_V2_PARAMS } from '../../utils/advancedSegmentationV2';

interface AdvancedControlsBarV2Props {
  params: AdvancedSegmentationV2Params;
  setParams: (params: AdvancedSegmentationV2Params) => void;
  onReset: () => void;
  onClose: () => void;
  onRefineSegments?: () => void;
  isLoading?: boolean;
  progress?: number;
  stats?: {
    totalSegments: number;
    ascentSegments: number;
    descentSegments: number;
    horizontalSegments: number;
    avgRSquared: string;
    qualityRating: string;
  } | null;
}

export const AdvancedControlsBarV2: React.FC<AdvancedControlsBarV2Props> = ({
  params,
  setParams,
  onReset,
  onClose,
  onRefineSegments,
  isLoading = false,
  progress = 0,
  stats
}) => {
  const handleProminenciaChange = (value: number[]) => {
    setParams({ ...params, prominenciaMinima: value[0] });
  };

  const handleDistanciaChange = (value: number[]) => {
    setParams({ ...params, distanciaMinima: value[0] });
  };

  const handleDiferenciaChange = (value: number[]) => {
    setParams({ ...params, diferenciaPendiente: value[0] });
  };

  return (
    <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-lg p-4 mb-4 shadow-sm">
      {/* Compact Header with Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
            <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
              Análisis Experimental V2
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
          {onRefineSegments && (
            <Button
              onClick={onRefineSegments}
              disabled={isLoading}
              variant="default"
              size="sm"
              className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isLoading ? 'Calculando...' : 'Calcular/Refinar Segmentos'}
            </Button>
          )}
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

      {/* Progress Bar */}
      {isLoading && (
        <div className="mb-4">
          <Progress value={progress} className="w-full h-2" />
          <p className="text-xs text-center text-mountain-500 dark:text-mountain-400 mt-1">
            {progress.toFixed(0)}% completado
          </p>
        </div>
      )}

      {/* Compact Sliders Grid */}
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
            Relevancia: Longitud mínima de segmentos
          </p>
        </div>

        {/* Slider 3: Diferencia de Pendiente */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
              Diferencia de Pendiente
            </label>
            <span className="text-xs text-mountain-500 dark:text-mountain-400 bg-mountain-100 dark:bg-mountain-700 px-2 py-1 rounded">
              {(params.diferenciaPendiente * 100).toFixed(1)}%
            </span>
          </div>
          <Slider
            value={[params.diferenciaPendiente]}
            onValueChange={handleDiferenciaChange}
            min={0.01}
            max={0.15}
            step={0.005}
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
