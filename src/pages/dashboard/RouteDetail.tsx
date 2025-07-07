
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { InteractiveMap } from '../../components/route/interactive-map';
import { ElevationChartD3 } from '../../components/route/elevation-chart-d3';
import { SegmentsTable } from '../../components/route/segments-table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Slider } from '../../components/ui/slider';
import { Switch } from '../../components/ui/switch';
import { ArrowUp, ArrowDown, Map, Settings, ArrowLeft, Brain, Eye, EyeOff, Sliders, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import { useRouteData } from '../../hooks/useRouteData';
import { useNavigate } from 'react-router-dom';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate, getDateSourceLabel } from '../../utils/routeUtils';
import { segmentProfileAdvanced, DEFAULT_ADVANCED_SEGMENTATION_PARAMS } from '../../utils/advancedSegmentation';
import { generatePreviewSegments, refineSegments, AdvancedSegmentationV2Params } from '../../utils/advancedSegmentationV2';
import { AdvancedControlsPanel } from '../../components/route/advanced-controls-panel';
import { AdvancedControlsBarV2 } from '../../components/route/AdvancedControlsBarV2';

const RouteDetail = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  
  // Advanced analysis state (V1)
  const [advancedAnalysisMode, setAdvancedAnalysisMode] = useState(false);
  const [advancedParams, setAdvancedParams] = useState(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);
  
  // Experimental analysis state (V2)
  const [experimentalAnalysisMode, setExperimentalAnalysisMode] = useState(false);
  const [experimentalParams, setExperimentalParams] = useState<AdvancedSegmentationV2Params>({
    prominenciaMinima: 40,
    distanciaMinima: 0.2,
    diferenciaPendiente: 0.10
  });
  const [isRefining, setIsRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState(0);
  const [refinedSegments, setRefinedSegments] = useState<any[]>([]);
  const [hasRefinedOnce, setHasRefinedOnce] = useState(false);
  
  console.log('RouteDetail mounted with routeId:', routeId);
  
  // Verificar que tenemos un routeId válido antes de proceder
  if (!routeId) {
    console.error('No routeId found in URL parameters');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            No se pudo encontrar el ID de la ruta en la URL
          </p>
          <Button onClick={() => navigate('/dashboard/routes')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Rutas
          </Button>
        </div>
      </div>
    );
  }
  
  const { route, segments, elevationData, isLoading, error } = useRouteData(routeId);

  // Transform elevation data to the format expected by D3 chart and advanced segmentation
  const processedElevationData = React.useMemo(() => {
    return elevationData.map(point => ({
      ...point,
      displayDistance: point.distance,
      displayElevation: point.elevation
    }));
  }, [elevationData]);

  // Calculate advanced segments in real-time when V1 mode is active
  const { segments: advancedSegments, macroBoundaries } = useMemo(() => {
    if (!advancedAnalysisMode || processedElevationData.length === 0) {
      return { segments: [], macroBoundaries: [] };
    }
    
    console.log('Calculating V1 advanced segments with params:', advancedParams);
    return segmentProfileAdvanced(processedElevationData, advancedParams);
  }, [advancedAnalysisMode, processedElevationData, advancedParams]);

  // Calculate experimental V2 preview segments in real-time when V2 mode is active
  const { segments: experimentalPreviewSegments, macroBoundaries: experimentalMacroBoundaries } = useMemo(() => {
    if (!experimentalAnalysisMode || processedElevationData.length === 0) {
      return { segments: [], macroBoundaries: [] };
    }
    
    console.log('Calculating V2 preview segments with params:', experimentalParams);
    return generatePreviewSegments(processedElevationData, experimentalParams);
  }, [experimentalAnalysisMode, processedElevationData, experimentalParams]);

  // Calculate advanced segments statistics (works for both V1 and V2)
  const currentSegments = experimentalAnalysisMode 
    ? (refinedSegments.length > 0 ? refinedSegments : experimentalPreviewSegments)
    : advancedSegments;
  const advancedStats = useMemo(() => {
    if (!currentSegments || currentSegments.length === 0) return null;
    
    const totalAscent = currentSegments
      .filter(s => s.type === 'asc')
      .reduce((sum, s) => sum + s.elevationGain, 0);
    
    const totalDescent = currentSegments
      .filter(s => s.type === 'desc')
      .reduce((sum, s) => sum + s.elevationLoss, 0);
    
    const totalDistance = currentSegments.reduce((sum, s) => sum + s.distance, 0);
    const avgSegmentDistance = totalDistance / currentSegments.length;
    
    const avgRSquared = currentSegments
      .reduce((sum, s) => sum + s.rSquared, 0) / currentSegments.length;
    
    return {
      totalSegments: currentSegments.length,
      ascentSegments: currentSegments.filter(s => s.type === 'asc').length,
      descentSegments: currentSegments.filter(s => s.type === 'desc').length,
      horizontalSegments: currentSegments.filter(s => s.type === 'hor').length,
      totalAscent: Math.round(totalAscent),
      totalDescent: Math.round(totalDescent),
      avgSegmentDistance: isNaN(avgSegmentDistance) ? '0.0' : avgSegmentDistance.toFixed(1),
      avgRSquared: isNaN(avgRSquared) ? '0.000' : avgRSquared.toFixed(3),
      qualityRating: avgRSquared >= 0.95 ? 'Excelente' : avgRSquared >= 0.90 ? 'Bueno' : avgRSquared >= 0.85 ? 'Regular' : 'Bajo'
    };
  }, [currentSegments]);

  const handleBackToRoutes = () => {
    navigate('/dashboard/routes');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const resetAdvancedParams = () => {
    setAdvancedParams(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);
  };

  const handleAdvancedModeToggle = (enabled: boolean) => {
    setAdvancedAnalysisMode(enabled);
    if (enabled) {
      setExperimentalAnalysisMode(false); // Mutually exclusive
    }
  };

  const handleExperimentalModeToggle = (enabled: boolean) => {
    setExperimentalAnalysisMode(enabled);
    if (enabled) {
      setAdvancedAnalysisMode(false); // Mutually exclusive
    }
  };

  const resetExperimentalParams = () => {
    setExperimentalParams({
      prominenciaMinima: 40,
      distanciaMinima: 0.2,
      diferenciaPendiente: 0.10
    });
    setRefinedSegments([]);
    setHasRefinedOnce(false);
  };

  const handleRefineSegments = async () => {
    if (!experimentalPreviewSegments.length || isRefining) return;
    
    setIsRefining(true);
    setRefineProgress(0);
    
    try {
      // Extract breakpoints from preview segments
      const initialBreakpoints = experimentalPreviewSegments
        .slice(0, -1) // Exclude last segment
        .map(segment => segment.endIndex);
      
      // Run refinement with progress callback
      const refinedBreakpoints = await new Promise<number[]>((resolve) => {
        // Use setTimeout to allow UI to update
        setTimeout(() => {
          const result = refineSegments(
            initialBreakpoints,
            processedElevationData,
            experimentalParams,
            (progress) => {
              setRefineProgress(progress);
            }
          );
          resolve(result);
        }, 100);
      });
      
      // Create final segments from refined breakpoints
      const allBreakpoints = [0, ...refinedBreakpoints, processedElevationData.length - 1];
      const finalSegments = [];
      
      for (let i = 0; i < allBreakpoints.length - 1; i++) {
        const startIndex = allBreakpoints[i];
        const endIndex = allBreakpoints[i + 1];
        
        const segmentPoints = processedElevationData.slice(startIndex, endIndex + 1);
        const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        
        if (regressionPoints.length >= 2) {
          // Simple regression calculation for final segments
          const n = regressionPoints.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

          for (const p of regressionPoints) {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
            sumY2 += p.y * p.y;
          }

          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;
          
          const rNumerator = (n * sumXY - sumX * sumY);
          const rDenominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
          const rSquared = rDenominator === 0 ? 1 : Math.pow(rNumerator / rDenominator, 2);
          
          const startPoint = segmentPoints[0];
          const endPoint = segmentPoints[segmentPoints.length - 1];
          const elevationChange = endPoint.displayElevation - startPoint.displayElevation;
          const slopePercent = slope * 100;
          
          finalSegments.push({
            startIndex,
            endIndex,
            startPoint,
            endPoint,
            slope,
            intercept,
            rSquared,
            distance: endPoint.displayDistance - startPoint.displayDistance,
            elevationGain: elevationChange > 0 ? elevationChange : 0,
            elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
            type: slopePercent > 2 ? 'asc' : slopePercent < -2 ? 'desc' : 'hor',
            color: slopePercent > 2 ? '#22c55e' : slopePercent < -2 ? '#3b82f6' : '#6b7280'
          });
        }
      }
      
      setRefinedSegments(finalSegments);
      setHasRefinedOnce(true);
    } catch (error) {
      console.error('Error during refinement:', error);
    } finally {
      setIsRefining(false);
      setRefineProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-mountain-600 dark:text-mountain-400">Cargando datos de la ruta...</p>
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {error || 'Ruta no encontrada'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleBackToRoutes} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Rutas
            </Button>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
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
  
  const grades = elevationData.map((point, index) => {
    if (index === 0) return 0;
    const elevationDiff = point.elevation - elevationData[index - 1].elevation;
    const distanceDiff = (point.distance - elevationData[index - 1].distance) * 1000;
    return distanceDiff > 0 ? (elevationDiff / distanceDiff) * 100 : 0;
  });

  const avgGrade = grades.length > 0 ? grades.reduce((acc, grade) => acc + grade, 0) / grades.length : 0;
  const maxGrade = grades.length > 0 ? Math.max(...grades.map(g => Math.abs(g))) : 0;

  const estimatedTime = (route.distance_km / 5) * 60;
  const hours = Math.floor(estimatedTime / 60);
  const minutes = Math.round(estimatedTime % 60);
  const totalTime = `${hours}h ${minutes}m`;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-mountain-900">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Enhanced Header - Row 1: Route Info */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Button 
                onClick={handleBackToRoutes} 
                variant="ghost" 
                size="sm"
                className="p-1 mt-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200">
                    {route.name}
                  </h1>
                  {advancedAnalysisMode && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Análisis Avanzado V1 Activo
                    </Badge>
                  )}
                  {experimentalAnalysisMode && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      Análisis Experimental V2 Activo
                    </Badge>
                  )}
                </div>
                
                {/* Route type and date info */}
                <div className="flex items-center gap-4 mb-3">
                  <Badge className={`${getRouteTypeColor(route.route_type)} text-sm`}>
                    {getRouteTypeLabel(route.route_type)}
                  </Badge>
                  <span className="text-sm text-mountain-600 dark:text-mountain-400" title={getDateSourceLabel(route.date_source)}>
                    {getDisplayDate(route)}
                  </span>
                  <span className="text-sm text-mountain-600 dark:text-mountain-400">
                    Dificultad: {route.difficulty_level}
                  </span>
                </div>
                
                {/* Complete route statistics in a single comprehensive row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-sm text-mountain-600 dark:text-mountain-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-primary-600">{route.distance_km.toFixed(1)} km</div>
                      <div className="text-xs">Distancia</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-semibold text-green-600">+{route.elevation_gain_m}m</div>
                      <div className="text-xs">Ascenso</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-blue-600">-{Math.round(totalElevationLoss)}m</div>
                      <div className="text-xs">Descenso</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-purple-600">{totalTime}</div>
                      <div className="text-xs">Tiempo Est.</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <div>
                      <div className="font-semibold text-orange-600">{Math.round(maxElevation)}m</div>
                      <div className="text-xs">Máx. Elev.</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <div>
                      <div className="font-semibold text-teal-600">{Math.round(minElevation)}m</div>
                      <div className="text-xs">Mín. Elev.</div>
                    </div>
                  </div>
                  
                  
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <div>
                      <div className="font-semibold text-rose-600">{Math.min(maxGrade, 50).toFixed(1)}%</div>
                      <div className="text-xs">Pend. Máx.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Row 2: Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
              {/* Advanced Analysis Toggle V1 */}
              <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-lg px-3 py-2">
                <Brain className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium">Análisis Avanzado</span>
                <Switch
                  checked={advancedAnalysisMode}
                  onCheckedChange={handleAdvancedModeToggle}
                />
              </div>

              {/* Experimental Analysis Toggle V2 */}
              <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                <span className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
                <span className="text-sm font-medium">Análisis Experimental</span>
                <Switch
                  checked={experimentalAnalysisMode}
                  onCheckedChange={handleExperimentalModeToggle}
                />
              </div>
              
              <Button 
                onClick={() => setShowMap(!showMap)}
                variant="outline" 
                className="border-primary-300 text-primary-600 hover:bg-primary-50"
              >
                {showMap ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showMap ? 'Ocultar' : 'Ver'} Mapa
              </Button>
              <Button variant="outline" className="border-primary-300 text-primary-600 hover:bg-primary-50">
                <Settings className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button className="bg-primary-600 hover:bg-primary-700 text-white">
                <Map className="w-4 h-4 mr-2" />
                Share Route
              </Button>
            </div>
          </div>

          {/* Experimental V2 Controls Bar */}
          {experimentalAnalysisMode && (
            <AdvancedControlsBarV2
              params={experimentalParams}
              setParams={setExperimentalParams}
              stats={advancedStats}
              onReset={resetExperimentalParams}
              onClose={() => setExperimentalAnalysisMode(false)}
              onRefineSegments={handleRefineSegments}
              isRefining={isRefining}
              refineProgress={refineProgress}
              hasRefinedOnce={hasRefinedOnce}
            />
          )}

          {/* Advanced Elevation Chart */}
          <div className="w-full">
            <ElevationChartD3
              elevationData={processedElevationData}
              onPointHover={setHoveredSegment}
              hoveredSegment={hoveredSegment}
              options={{
                height: 400,
                backgroundColor: 'transparent'
              }}
              advancedSegments={experimentalAnalysisMode ? (refinedSegments.length > 0 ? refinedSegments : experimentalPreviewSegments) : advancedSegments}
              macroBoundaries={experimentalAnalysisMode ? experimentalMacroBoundaries : macroBoundaries}
            />
          </div>

          {/* Segments Table */}
          <SegmentsTable 
            segments={segments}
            advancedSegments={experimentalAnalysisMode ? (refinedSegments.length > 0 ? refinedSegments : experimentalPreviewSegments) : advancedSegments}
            isAdvancedMode={advancedAnalysisMode || experimentalAnalysisMode}
            onSegmentHover={setHoveredSegment}
            hoveredSegment={hoveredSegment}
          />

          {/* Conditional Map */}
          {showMap && (
            <div className="w-full">
              <div className="bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 overflow-hidden">
                <div className="p-6 border-b border-primary-200 dark:border-mountain-700">
                  <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
                    Mapa Interactivo
                  </h3>
                </div>
                <div className="p-6">
                  <InteractiveMap routeData={route} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Controls Panel */}
      {advancedAnalysisMode && (
        <AdvancedControlsPanel
          params={advancedParams}
          setParams={setAdvancedParams}
          stats={advancedStats}
          onReset={resetAdvancedParams}
          onClose={() => setAdvancedAnalysisMode(false)}
        />
      )}
    </div>
  );
};

export default RouteDetail;
