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

          {/* Statistics - Compact version */}
          <div className="flex flex-wrap gap-3 text-sm text-mountain-600 dark:text-mountain-400 mt-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium text-primary-600">{route.distance_km.toFixed(1)} km</span>
            </div>
            
            <div className="flex items-center gap-1">
              <ArrowUp className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-600">+{route.elevation_gain_m}m</span>
            </div>
            
            <div className="flex items-center gap-1">
              <ArrowDown className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-600">-{Math.round(totalElevationLoss)}m</span>
            </div>
            
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-purple-600">{totalTime}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="font-medium text-orange-600">{Math.round(maxElevation)}m</span>
            </div>
            
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="font-medium text-teal-600">{Math.round(minElevation)}m</span>
            </div>
            
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="font-medium text-rose-600">{route.difficulty_level}</span>
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
