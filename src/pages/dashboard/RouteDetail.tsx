
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { InteractiveMap } from '../../components/route/interactive-map';
import { ElevationChartD3 } from '../../components/route/elevation-chart-d3';
import { SegmentsTable } from '../../components/route/segments-table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { ArrowUp, ArrowDown, Map, Settings, ArrowLeft, Brain, Eye, EyeOff } from 'lucide-react';
import { useRouteData } from '../../hooks/useRouteData';
import { useNavigate } from 'react-router-dom';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate, getDateSourceLabel } from '../../utils/routeUtils';
import { segmentProfileAdvanced, DEFAULT_ADVANCED_SEGMENTATION_PARAMS } from '../../utils/advancedSegmentation';
import { segmentProfileAdvancedV2, DEFAULT_ADVANCED_SEGMENTATION_PARAMS_V2 } from '../../utils/advancedSegmentationV2';
import { AdvancedControlsPanel } from '../../components/route/advanced-controls-panel';
import { AdvancedControlsPanelV2 } from '../../components/route/AdvancedControlsPanelV2';

const RouteDetail = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  
  // Feature flag for V2 analysis
  const [useV2Analysis, setUseV2Analysis] = useState(true);
  
  // Advanced analysis state
  const [advancedAnalysisMode, setAdvancedAnalysisMode] = useState(false);
  const [advancedParams, setAdvancedParams] = useState(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);
  const [advancedParamsV2, setAdvancedParamsV2] = useState(DEFAULT_ADVANCED_SEGMENTATION_PARAMS_V2);
  const [showTacticalHighlights, setShowTacticalHighlights] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  
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

  // Calculate advanced segments based on selected version
  const { segments: advancedSegments, macroBoundaries, tacticalHighlights } = useMemo(() => {
    if (!advancedAnalysisMode || processedElevationData.length === 0) {
      return { segments: [], macroBoundaries: [], tacticalHighlights: [] };
    }
    
    if (useV2Analysis) {
      console.log('Calculating V2 advanced segments with params:', advancedParamsV2);
      return segmentProfileAdvancedV2(processedElevationData, advancedParamsV2);
    } else {
      console.log('Calculating V1 advanced segments with params:', advancedParams);
      const result = segmentProfileAdvanced(processedElevationData, advancedParams);
      return { ...result, tacticalHighlights: [] };
    }
  }, [advancedAnalysisMode, processedElevationData, useV2Analysis, advancedParams, advancedParamsV2]);

  // Calculate advanced segments statistics
  const advancedStats = useMemo(() => {
    if (!advancedSegments || advancedSegments.length === 0) return null;
    
    const totalAscent = advancedSegments
      .filter(s => s.type === 'asc')
      .reduce((sum, s) => sum + s.elevationGain, 0);
    
    const totalDescent = advancedSegments
      .filter(s => s.type === 'desc')
      .reduce((sum, s) => sum + s.elevationLoss, 0);
    
    const totalDistance = advancedSegments.reduce((sum, s) => sum + s.distance, 0);
    const avgSegmentDistance = totalDistance / advancedSegments.length;
    
    const avgRSquared = advancedSegments
      .reduce((sum, s) => sum + s.rSquared, 0) / advancedSegments.length;
    
    return {
      totalSegments: advancedSegments.length,
      ascentSegments: advancedSegments.filter(s => s.type === 'asc').length,
      descentSegments: advancedSegments.filter(s => s.type === 'desc').length,
      horizontalSegments: advancedSegments.filter(s => s.type === 'hor').length,
      totalAscent: Math.round(totalAscent),
      totalDescent: Math.round(totalDescent),
      avgSegmentDistance: isNaN(avgSegmentDistance) ? '0.0' : avgSegmentDistance.toFixed(1),
      avgRSquared: isNaN(avgRSquared) ? '0.000' : avgRSquared.toFixed(3),
      qualityRating: avgRSquared >= 0.95 ? 'Excelente' : avgRSquared >= 0.90 ? 'Bueno' : avgRSquared >= 0.85 ? 'Regular' : 'Bajo',
      tacticalHighlights: tacticalHighlights?.length || 0
    };
  }, [advancedSegments, tacticalHighlights]);

  const handleBackToRoutes = () => {
    navigate('/dashboard/routes');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const resetAdvancedParams = () => {
    if (useV2Analysis) {
      setAdvancedParamsV2(DEFAULT_ADVANCED_SEGMENTATION_PARAMS_V2);
    } else {
      setAdvancedParams(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);
    }
  };

  const handleAdvancedModeToggle = (enabled: boolean) => {
    setAdvancedAnalysisMode(enabled);
    if (enabled) {
      setPanelOpen(true);
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
  
  // Fixed max grade calculation
  const maxGrade = elevationData.length > 1 ? elevationData.reduce((maxGrad, point, index) => {
    if (index === 0) return 0;
    const elevationDiff = point.elevation - elevationData[index - 1].elevation;
    const distanceDiff = (point.distance - elevationData[index - 1].distance) * 1000; // Convert to meters
    if (distanceDiff > 0) {
      const grade = Math.abs((elevationDiff / distanceDiff) * 100);
      return Math.max(maxGrad, grade);
    }
    return maxGrad;
  }, 0) : 0;

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
                      {useV2Analysis ? 'Análisis V2 Activo' : 'Análisis Avanzado Activo'}
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 text-sm text-mountain-600 dark:text-mountain-400">
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
                      <div className="font-semibold text-rose-600">{maxGrade.toFixed(1)}%</div>
                      <div className="text-xs">Pend. Máx.</div>
                    </div>
                  </div>
                </div>
                
                {route.description && (
                  <p className="text-mountain-600 dark:text-mountain-400 mt-3">
                    {route.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Row 2: Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
              {/* Advanced Analysis Toggle */}
              <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-lg px-3 py-2">
                <Brain className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium">{useV2Analysis ? 'Análisis V2' : 'Análisis Avanzado'}</span>
                <Switch
                  checked={advancedAnalysisMode}
                  onCheckedChange={handleAdvancedModeToggle}
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
              advancedSegments={advancedSegments}
              macroBoundaries={macroBoundaries}
              tacticalHighlights={tacticalHighlights}
              showTacticalHighlights={showTacticalHighlights}
            />
          </div>

          {/* Segments Table */}
          <SegmentsTable 
            segments={segments}
            advancedSegments={advancedSegments}
            isAdvancedMode={advancedAnalysisMode}
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

      {/* Advanced Controls Panel as Sheet Overlay */}
      {advancedAnalysisMode && (
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 shadow-lg"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-96 p-0">
            {useV2Analysis ? (
              <AdvancedControlsPanelV2
                params={advancedParamsV2}
                setParams={setAdvancedParamsV2}
                stats={advancedStats}
                showTacticalHighlights={showTacticalHighlights}
                setShowTacticalHighlights={setShowTacticalHighlights}
                onReset={resetAdvancedParams}
                onClose={() => setPanelOpen(false)}
              />
            ) : (
              <AdvancedControlsPanel
                params={advancedParams}
                setParams={setAdvancedParams}
                stats={advancedStats}
                onReset={resetAdvancedParams}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default RouteDetail;
