import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { InteractiveMap } from '../../components/route/interactive-map';
import { ElevationChartD3 } from '../../components/route/elevation-chart-d3';
import { SegmentsTable } from '../../components/route/segments-table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Slider } from '../../components/ui/slider';
import { Switch } from '../../components/ui/switch';
import { ArrowUp, ArrowDown, Map, Settings, ArrowLeft, Brain, Eye, EyeOff, Sliders, RotateCcw, ChevronRight, ChevronLeft, TrendingUp } from 'lucide-react';
import { useRouteData } from '../../hooks/useRouteData';
import { useNavigate } from 'react-router-dom';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate, getDateSourceLabel } from '../../utils/routeUtils';
import { segmentProfileAdvanced, DEFAULT_ADVANCED_SEGMENTATION_PARAMS, detectSlopeChanges, detectInflectionPoints } from '../../utils/advancedSegmentation';

const RouteDetail = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  
  // Advanced analysis state
  const [advancedAnalysisMode, setAdvancedAnalysisMode] = useState(false);
  const [advancedParams, setAdvancedParams] = useState(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  
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

  // Calculate advanced segments in real-time when mode is active
  const advancedSegments = useMemo(() => {
    if (!advancedAnalysisMode || processedElevationData.length === 0) {
      return [];
    }
    
    console.log('Calculating enhanced segments with params:', advancedParams);
    return segmentProfileAdvanced(processedElevationData, advancedParams);
  }, [advancedAnalysisMode, processedElevationData, advancedParams]);

  // Calculate slope changes and inflection points for visualization
  const analysisData = useMemo(() => {
    if (!advancedAnalysisMode || processedElevationData.length === 0) {
      return { slopeChanges: [], inflectionPoints: [] };
    }
    
    const slopeChanges = detectSlopeChanges(processedElevationData, 10, advancedParams.slopeChangeThreshold);
    const inflectionPoints = advancedParams.detectInflectionPoints 
      ? detectInflectionPoints(processedElevationData, advancedParams.inflectionSensitivity)
      : [];
      
    return { slopeChanges, inflectionPoints };
  }, [advancedAnalysisMode, processedElevationData, advancedParams]);

  // Calculate enhanced statistics
  const advancedStats = useMemo(() => {
    if (advancedSegments.length === 0) {
      return { 
        avgRSquared: 0, 
        totalSegments: 0, 
        qualityScore: 0,
        slopeChanges: 0,
        inflectionPoints: 0,
        cutReasons: {}
      };
    }
    
    const avgRSquared = advancedSegments.reduce((acc, seg) => acc + seg.rSquared, 0) / advancedSegments.length;
    const qualityScore = Math.min(100, Math.round(avgRSquared * 100));
    
    // Count cut reasons
    const cutReasons = advancedSegments.reduce((acc, seg) => {
      const reason = seg.cutReason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      avgRSquared,
      totalSegments: advancedSegments.length,
      qualityScore,
      slopeChanges: analysisData.slopeChanges.length,
      inflectionPoints: analysisData.inflectionPoints.length,
      cutReasons
    };
  }, [advancedSegments, analysisData]);

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
      setShowAdvancedControls(true);
    } else {
      setShowAdvancedControls(false);
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
      <div className={`flex-1 transition-all duration-300 ${showAdvancedControls ? 'mr-80' : ''} overflow-y-auto`}>
        <div className="p-6 space-y-6">
          {/* Enhanced Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  onClick={handleBackToRoutes} 
                  variant="ghost" 
                  size="sm"
                  className="p-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200">
                  {route.name}
                </h1>
                {advancedAnalysisMode && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Análisis Multi-Criterio Activo
                  </Badge>
                )}
              </div>
              
              {/* Route type and date info */}
              <div className="flex items-center gap-3 mb-3">
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
              
              <div className="flex flex-wrap gap-6 text-sm text-mountain-600 dark:text-mountain-400">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {route.distance_km.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-4 h-4 text-primary-600" />
                  +{route.elevation_gain_m}m
                </span>
                {totalElevationLoss > 0 && (
                  <span className="flex items-center gap-1">
                    <ArrowDown className="w-4 h-4 text-blue-600" />
                    -{Math.round(totalElevationLoss)}m
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {totalTime}
                </span>
              </div>
              {route.description && (
                <p className="text-mountain-600 dark:text-mountain-400 mt-2">
                  {route.description}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              {/* Advanced Analysis Toggle */}
              <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-lg px-3 py-2">
                <Brain className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium">Análisis Multi-Criterio</span>
                <Switch
                  checked={advancedAnalysisMode}
                  onCheckedChange={handleAdvancedModeToggle}
                />
              </div>
              
              {/* Advanced Controls Toggle */}
              {advancedAnalysisMode && (
                <Button 
                  onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                  variant="outline" 
                  className="border-primary-300 text-primary-600 hover:bg-primary-50"
                >
                  <Sliders className="w-4 h-4 mr-2" />
                  Controles
                  {showAdvancedControls ? <ChevronRight className="w-4 h-4 ml-2" /> : <ChevronLeft className="w-4 h-4 ml-2" />}
                </Button>
              )}
              
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

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {Math.round(maxElevation)}m
              </div>
              <div className="text-sm text-mountain-600 dark:text-mountain-400">Max Elevation</div>
            </div>
            <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(minElevation)}m
              </div>
              <div className="text-sm text-mountain-600 dark:text-mountain-400">Min Elevation</div>
            </div>
            <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-earth-600 dark:text-earth-400">
                {avgGrade.toFixed(1)}%
              </div>
              <div className="text-sm text-mountain-600 dark:text-mountain-400">Avg Grade</div>
            </div>
            <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {maxGrade.toFixed(1)}%
              </div>
              <div className="text-sm text-mountain-600 dark:text-mountain-400">Max Grade</div>
            </div>
            <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(totalElevationLoss)}m
              </div>
              <div className="text-sm text-mountain-600 dark:text-mountain-400">Total Descent</div>
            </div>
          </div>

          {/* Advanced Elevation Chart */}
          <div className="w-full">
            <ElevationChartD3
              elevationData={processedElevationData}
              onPointHover={setHoveredSegment}
              hoveredSegment={hoveredSegment}
              options={{
                width: 1000,
                height: 400,
                backgroundColor: 'transparent'
              }}
              advancedSegments={advancedSegments}
            />
          </div>

          {/* Enhanced Segments Table */}
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

      {/* Enhanced Advanced Controls Sidebar */}
      {showAdvancedControls && advancedAnalysisMode && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-mountain-800 border-l border-primary-200 dark:border-mountain-700 shadow-lg z-50">
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
                Controles Multi-Criterio
              </h3>
              <Button 
                onClick={() => setShowAdvancedControls(false)}
                variant="ghost"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Enhanced Real-time Statistics */}
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-primary-800 dark:text-primary-200 mb-3">
                  Estadísticas de Análisis
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-mountain-600 dark:text-mountain-400">Segmentos:</span>
                    <div className="font-bold text-primary-600">{advancedStats.totalSegments}</div>
                  </div>
                  <div>
                    <span className="text-mountain-600 dark:text-mountain-400">R² Promedio:</span>
                    <div className="font-bold text-primary-600">{advancedStats.avgRSquared.toFixed(3)}</div>
                  </div>
                  <div>
                    <span className="text-mountain-600 dark:text-mountain-400">Cambios Pendiente:</span>
                    <div className="font-bold text-orange-600">{advancedStats.slopeChanges}</div>
                  </div>
                  <div>
                    <span className="text-mountain-600 dark:text-mountain-400">Puntos Inflexión:</span>
                    <div className="font-bold text-blue-600">{advancedStats.inflectionPoints}</div>
                  </div>
                </div>
                
                {/* Cut Reasons Summary */}
                {Object.keys(advancedStats.cutReasons).length > 0 && (
                  <div className="mt-4">
                    <span className="text-xs font-medium text-mountain-600 dark:text-mountain-400">Razones de Corte:</span>
                    <div className="mt-2 space-y-1">
                      {Object.entries(advancedStats.cutReasons).map(([reason, count]) => (
                        <div key={reason} className="text-xs flex justify-between">
                          <span className="text-mountain-600 dark:text-mountain-400">{reason}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <span className="text-mountain-600 dark:text-mountain-400">Relevancia Deportiva:</span>
                  <div className="font-bold text-lg text-primary-600">{advancedStats.qualityScore}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${advancedStats.qualityScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Enhanced Parameter Controls */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300 block mb-1">
                    R² Threshold: {advancedParams.rSquaredThreshold.toFixed(3)}
                  </label>
                  <p className="text-xs text-mountain-500 mb-3">
                    Calidad mínima de ajuste lineal
                  </p>
                  <Slider
                    value={[advancedParams.rSquaredThreshold]}
                    onValueChange={(value) => setAdvancedParams(prev => ({
                      ...prev,
                      rSquaredThreshold: value[0]
                    }))}
                    min={0.7}
                    max={0.99}
                    step={0.01}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300 block mb-1">
                    Sensibilidad a Cambios: {advancedParams.slopeChangeThreshold.toFixed(1)}%
                  </label>
                  <p className="text-xs text-mountain-500 mb-3">
                    Cambio de pendiente que dispara un corte
                  </p>
                  <Slider
                    value={[advancedParams.slopeChangeThreshold]}
                    onValueChange={(value) => setAdvancedParams(prev => ({
                      ...prev,
                      slopeChangeThreshold: value[0]
                    }))}
                    min={1.0}
                    max={15.0}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300 block mb-1">
                    Sensibilidad Inflexión: {advancedParams.inflectionSensitivity.toFixed(1)}m
                  </label>
                  <p className="text-xs text-mountain-500 mb-3">
                    Diferencia de elevación para detectar picos/valles
                  </p>
                  <Slider
                    value={[advancedParams.inflectionSensitivity]}
                    onValueChange={(value) => setAdvancedParams(prev => ({
                      ...prev,
                      inflectionSensitivity: value[0]
                    }))}
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300 block mb-1">
                    Puntos Mínimos: {advancedParams.minSegmentPoints}
                  </label>
                  <p className="text-xs text-mountain-500 mb-3">
                    Número mínimo de puntos por segmento
                  </p>
                  <Slider
                    value={[advancedParams.minSegmentPoints]}
                    onValueChange={(value) => setAdvancedParams(prev => ({
                      ...prev,
                      minSegmentPoints: value[0]
                    }))}
                    min={10}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-mountain-700 dark:text-mountain-300 block mb-1">
                    Distancia Mínima: {advancedParams.minSegmentDistance.toFixed(1)} km
                  </label>
                  <p className="text-xs text-mountain-500 mb-3">
                    Longitud mínima deportivamente relevante
                  </p>
                  <Slider
                    value={[advancedParams.minSegmentDistance]}
                    onValueChange={(value) => setAdvancedParams(prev => ({
                      ...prev,
                      minSegmentDistance: value[0]
                    }))}
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Inflection Points Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-mountain-700 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-mountain-700 dark:text-mountain-300">
                      Detectar Puntos de Inflexión
                    </span>
                    <p className="text-xs text-mountain-500">
                      Identifica picos, valles y cambios de dirección
                    </p>
                  </div>
                  <Switch
                    checked={advancedParams.detectInflectionPoints}
                    onCheckedChange={(checked) => setAdvancedParams(prev => ({
                      ...prev,
                      detectInflectionPoints: checked
                    }))}
                  />
                </div>
              </div>

              {/* Reset Button */}
              <Button 
                onClick={resetAdvancedParams}
                variant="outline" 
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Defaults
              </Button>

              {/* Enhanced Interpretation Guide */}
              <div className="bg-gray-50 dark:bg-mountain-700 rounded-lg p-4">
                <h5 className="font-medium text-mountain-700 dark:text-mountain-300 mb-2">
                  Guía de Criterios
                </h5>
                <div className="text-xs text-mountain-600 dark:text-mountain-400 space-y-1">
                  <div>• <strong>R² &gt; 0.95:</strong> Excelente ajuste lineal</div>
                  <div>• <strong>Cambio &gt; 5%:</strong> Pendiente significativa</div>
                  <div>• <strong>Distancia &gt; 0.3km:</strong> Relevante para carrera</div>
                  <div>• <strong>Inflexión:</strong> Picos/valles detectados</div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-mountain-600">
                  <span className="text-xs font-medium text-mountain-700 dark:text-mountain-300">
                    Prioridad de Corte:
                  </span>
                  <div className="text-xs text-mountain-600 dark:text-mountain-400 mt-1">
                    1. Distancia mínima<br/>
                    2. Cambio de pendiente<br/>
                    3. Puntos de inflexión<br/>
                    4. Calidad R²
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteDetail;
