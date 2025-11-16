import React from 'react';
import { useParams } from 'react-router-dom';
import { ElevationChartD3 } from '@/components/route/elevation-chart-d3';
import { SegmentsTable } from '@/components/route/segments-table';
import { Badge } from '@/components/ui/badge';
import { usePublicRouteData } from '@/hooks/usePublicRouteData';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate } from '@/utils/routeUtils';
import { useSegmentAnalysis } from '@/hooks/useSegmentAnalysis';
import { useRouteCalculations } from '@/hooks/useRouteCalculations';

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
      <div className="container mx-auto p-4 space-y-3">
        {/* Header */}
        <div className="bg-white dark:bg-mountain-800 rounded-lg shadow-lg p-6">
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
              {route.name}
            </h1>
            {analysisType !== 'none' && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mb-2">
                {getAnalysisLabel()}
              </Badge>
            )}
          </div>

          {/* Route type, date info and statistics in same row */}
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <Badge className={`${getRouteTypeColor(route.route_type)} text-sm`}>
              {getRouteTypeLabel(route.route_type)}
            </Badge>
            <span className="text-sm text-mountain-600 dark:text-mountain-400">
              {getDisplayDate(route)}
            </span>
            <span className="text-sm text-mountain-600 dark:text-mountain-400">
              Dificultad: {route.difficulty_level}
            </span>
            
            {/* Statistics - exact same as dashboard */}
            <div className="flex flex-wrap gap-3 text-xs text-mountain-600 dark:text-mountain-400">
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium text-primary-600">{route.distance_km?.toFixed(1)} km</span>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="font-medium text-green-600">+{route.elevation_gain_m}m</span>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="font-medium text-blue-600">-{Math.round(calculations.totalElevationLoss)}m</span>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-purple-600">{calculations.estimatedTime}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="font-medium text-orange-600">{Math.round(calculations.maxElevation)}m</span>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="font-medium text-teal-600">{Math.round(calculations.minElevation)}m</span>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="font-medium text-rose-600">
                  {(elevationData.reduce((acc, point, index) => {
                    if (index === 0) return 0;
                    const elevationDiff = point.elevation - elevationData[index - 1].elevation;
                    const distanceDiff = (point.distance - elevationData[index - 1].distance) * 1000;
                    return acc + (distanceDiff > 0 ? (elevationDiff / distanceDiff) * 100 : 0);
                  }, 0) / (elevationData.length - 1)).toFixed(1)}% prom.
                </span>
              </div>
            </div>
          </div>

          {route.description && (
            <p className="text-mountain-600 dark:text-mountain-400 mt-2">
              {route.description}
            </p>
          )}
        </div>

        {/* Elevation Chart - exact same as dashboard */}
        <div className="w-full">
          <ElevationChartD3
            elevationData={elevationData}
            onPointHover={() => {}}
            options={{
              height: 320,
              backgroundColor: 'transparent'
            }}
            advancedSegments={calculatedSegments}
            macroBoundaries={macroBoundaries}
            showGradeLabels={showGradeLabels}
          />
        </div>

        {/* Segments Table - exact same as dashboard */}
        <SegmentsTable 
          segments={[]}
          advancedSegments={calculatedSegments}
          isAdvancedMode={analysisType !== 'none'}
          onSegmentHover={() => {}}
        />

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
