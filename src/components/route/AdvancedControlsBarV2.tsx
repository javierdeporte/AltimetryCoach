import React from 'react';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { RotateCcw, X, Brain } from 'lucide-react';
import { AdvancedSegmentationV2Params, DEFAULT_V2_PARAMS } from '../../utils/advancedSegmentationV2';

interface AdvancedControlsBarV2Props {
  params: AdvancedSegmentationV2Params;
  setParams: (params: AdvancedSegmentationV2Params) => void;
  onReset: () => void;
  onClose: () => void;
  onRefineSegments: () => void;
  isRefining: boolean;
  refineProgress: number;
  hasRefinedOnce: boolean;
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
  isRefining,
  refineProgress,
  hasRefinedOnce,
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 flex items-center gap-2">
          <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
          Análisis Experimental V2
        </h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={onRefineSegments}
            disabled={isRefining}
            variant="default"
            size="sm"
            className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Brain className="w-3 h-3 mr-1" />
            {isRefining ? 'Refinando...' : 'Refinar Segmentos'}
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={isRefining}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Slider 1: Prominencia Mínima (Estratégico) - Always visible */}
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

        {/* Slider 2: Distancia Mínima (Relevancia) - Only after refinement */}
        {hasRefinedOnce && (
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
        )}

        {/* Slider 3: Diferencia de Pendiente (Sensibilidad) - Only after refinement */}
        {hasRefinedOnce && (
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
        )}
      </div>

      {/* Progress Bar for Refinement */}
      {isRefining && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
              Optimizando segmentos...
            </span>
            <span className="text-xs text-mountain-500 dark:text-mountain-400">
              {Math.round(refineProgress)}%
            </span>
          </div>
          <Progress value={refineProgress} className="w-full" />
        </div>
      )}

      {/* Statistics Display */}
      {stats && (
        <div className="mt-4 pt-4 border-t border-mountain-200 dark:border-mountain-700">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
            <div className="text-center">
              <div className="font-semibold text-mountain-800 dark:text-mountain-200">{stats.totalSegments}</div>
              <div className="text-mountain-500 dark:text-mountain-400">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{stats.ascentSegments}</div>
              <div className="text-mountain-500 dark:text-mountain-400">Ascensos</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-600">{stats.descentSegments}</div>
              <div className="text-mountain-500 dark:text-mountain-400">Descensos</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-600">{stats.horizontalSegments}</div>
              <div className="text-mountain-500 dark:text-mountain-400">Planos</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-purple-600">{stats.avgRSquared}</div>
              <div className="text-mountain-500 dark:text-mountain-400">R² Prom.</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-orange-600">{stats.qualityRating}</div>
              <div className="text-mountain-500 dark:text-mountain-400">Calidad</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};