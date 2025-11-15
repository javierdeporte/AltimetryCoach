import React from 'react';
import { useParams } from 'react-router-dom';
import { ElevationChartD3 } from '@/components/route/elevation-chart-d3';
import { SegmentsTable } from '@/components/route/segments-table';
import { Badge } from '@/components/ui/badge';
import { usePublicRouteData } from '@/hooks/usePublicRouteData';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate } from '@/utils/routeUtils';
import { useSegmentAnalysis } from '@/hooks/useSegmentAnalysis';
import { useRouteCalculations } from '@/hooks/useRouteCalculations';
import { RouteStatistics } from '@/components/route/route-statistics';

const SharedRoute = () => {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  
  const { route, elevationData, analysisType, analysisParams, showGradeLabels, isLoading, error } = 
    usePublicRouteData(shareSlug || '');

  // Use custom hooks for calculations and analysis
  const { segments: calculatedSegments, macroBoundaries } = useSegmentAnalysis(elevationData, analysisType, analysisParams);
  const calculations = useRouteCalculations(route, elevationData);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-mountain-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-mountain-600 dark:text-mountain-400">Cargando ruta compartida...</p>
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-mountain-900">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
            Ruta no encontrada
          </h1>
          <p className="text-mountain-600 dark:text-mountain-400 mb-4">
            {error || 'Esta ruta compartida no existe o ha sido desactivada'}
          </p>
        </div>
      </div>
    );
  }

  const getAnalysisLabel = () => {
    switch (analysisType) {
      case 'experimental':
        return 'Análisis Experimental V2';
      case 'advanced':
        return 'Análisis Avanzado V1';
      case 'gradient':
        return 'Análisis por Gradiente';
      default:
        return 'Sin análisis';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-mountain-900">
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-mountain-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
                {route.name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`${getRouteTypeColor(route.route_type)}`}>
                  {getRouteTypeLabel(route.route_type)}
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {getAnalysisLabel()}
                </Badge>
                <span className="text-sm text-mountain-600 dark:text-mountain-400">
                  {getDisplayDate(route)}
                </span>
              </div>
            </div>
          </div>

          {route.description && (
            <p className="text-mountain-600 dark:text-mountain-400 mb-4">
              {route.description}
            </p>
          )}

          {/* Statistics - using shared component */}
          <RouteStatistics
            distance={route.distance_km}
            elevationGain={route.elevation_gain_m}
            elevationLoss={calculations.totalElevationLoss}
            estimatedTime={calculations.estimatedTime}
            maxElevation={calculations.maxElevation}
            minElevation={calculations.minElevation}
            difficulty={route.difficulty_level}
            variant="compact"
          />
        </div>

        {/* Elevation Chart */}
        <div className="bg-white dark:bg-mountain-800 rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-bold text-mountain-800 dark:text-mountain-200 mb-4">
            Perfil de Elevación
          </h2>
          <ElevationChartD3
            elevationData={elevationData}
            advancedSegments={calculatedSegments}
            macroBoundaries={macroBoundaries}
            showGradientVisualization={analysisType === 'gradient'}
            showGradeLabels={showGradeLabels}
            onPointHover={() => {}}
          />
        </div>

        {/* Segments Table */}
        {calculatedSegments.length > 0 && (
          <div className="bg-white dark:bg-mountain-800 rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold text-mountain-800 dark:text-mountain-200 mb-4">
              Segmentos ({calculatedSegments.length})
            </h2>
            <SegmentsTable
              segments={[]}
              advancedSegments={calculatedSegments}
              isAdvancedMode={true}
              onSegmentHover={() => {}}
            />
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-sm text-mountain-500 dark:text-mountain-400">
          <p>Esta es una vista pública de una ruta compartida</p>
          <p className="mt-1">🏔️ Powered by GPXpert</p>
        </div>
      </div>
    </div>
  );
};

export default SharedRoute;
