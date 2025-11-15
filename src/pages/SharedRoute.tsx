import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ElevationChartD3 } from '@/components/route/elevation-chart-d3';
import { SegmentsTable } from '@/components/route/segments-table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { usePublicRouteData } from '@/hooks/usePublicRouteData';
import { segmentProfileAdvanced } from '@/utils/advancedSegmentation';
import { segmentProfileV2 } from '@/utils/advancedSegmentationV2';
import { segmentProfileGradient } from '@/utils/gradientSegmentation';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate } from '@/utils/routeUtils';

const SharedRoute = () => {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const [showGradeLabels, setShowGradeLabels] = useState(false);
  
  const { route, elevationData, analysisType, analysisParams, isLoading, error } = 
    usePublicRouteData(shareSlug || '');

  // Calculate segments based on analysis type
  const { segments: calculatedSegments, macroBoundaries } = useMemo(() => {
    if (!elevationData || elevationData.length === 0) {
      return { segments: [], macroBoundaries: [] };
    }

    switch (analysisType) {
      case 'experimental':
        return segmentProfileV2(elevationData, analysisParams);
      case 'advanced':
        return segmentProfileAdvanced(elevationData, analysisParams);
      case 'gradient':
        return segmentProfileGradient(elevationData, analysisParams);
      default:
        return { segments: [], macroBoundaries: [] };
    }
  }, [elevationData, analysisType, analysisParams]);

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

  const totalElevationLoss = route.elevation_loss_m || elevationData.reduce((acc, point, index) => {
    if (index === 0) return 0;
    const diff = point.elevation - elevationData[index - 1].elevation;
    return acc + (diff < 0 ? Math.abs(diff) : 0);
  }, 0);

  const maxElevation = elevationData.length > 0 ? Math.max(...elevationData.map(p => p.elevation)) : 0;
  const minElevation = elevationData.length > 0 ? Math.min(...elevationData.map(p => p.elevation)) : 0;

  const estimatedTime = (route.distance_km / 5) * 60;
  const hours = Math.floor(estimatedTime / 60);
  const minutes = Math.round(estimatedTime % 60);
  const totalTime = `${hours}h ${minutes}m`;

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

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-4">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-4">
              <div className="text-sm text-mountain-600 dark:text-mountain-400 mb-1">Distancia</div>
              <div className="text-2xl font-bold text-primary-600">{route.distance_km.toFixed(1)} km</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
              <div className="text-sm text-mountain-600 dark:text-mountain-400 mb-1 flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                Desnivel +
              </div>
              <div className="text-2xl font-bold text-green-600">+{route.elevation_gain_m}m</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
              <div className="text-sm text-mountain-600 dark:text-mountain-400 mb-1 flex items-center gap-1">
                <ArrowDown className="w-3 h-3" />
                Desnivel -
              </div>
              <div className="text-2xl font-bold text-blue-600">-{Math.round(totalElevationLoss)}m</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
              <div className="text-sm text-mountain-600 dark:text-mountain-400 mb-1">Tiempo est.</div>
              <div className="text-2xl font-bold text-purple-600">{totalTime}</div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
              <div className="text-sm text-mountain-600 dark:text-mountain-400 mb-1">Altitud máx</div>
              <div className="text-2xl font-bold text-orange-600">{Math.round(maxElevation)}m</div>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-lg p-4">
              <div className="text-sm text-mountain-600 dark:text-mountain-400 mb-1">Altitud mín</div>
              <div className="text-2xl font-bold text-teal-600">{Math.round(minElevation)}m</div>
            </div>
            
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 rounded-lg p-4">
              <div className="text-sm text-mountain-600 dark:text-mountain-400 mb-1">Dificultad</div>
              <div className="text-2xl font-bold text-rose-600">{route.difficulty_level}</div>
            </div>
          </div>
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
            hoveredSegment={null}
            onPointHover={() => {}}
            showGradeLabels={showGradeLabels}
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
