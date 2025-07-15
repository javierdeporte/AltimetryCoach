import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { InteractiveMap } from '../../components/route/interactive-map';
import { ElevationChartD3 } from '../../components/route/elevation-chart-d3';
import { SegmentsTable } from '../../components/route/segments-table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Slider } from '../../components/ui/slider';
import { Switch } from '../../components/ui/switch';
import { ArrowUp, ArrowDown, Map, Settings, ArrowLeft, Brain, Eye, EyeOff, Sliders, RotateCcw, ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import { useRouteData } from '../../hooks/useRouteData';
import { useNavigate } from 'react-router-dom';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate, getDateSourceLabel } from '../../utils/routeUtils';
import { segmentProfileAdvanced, DEFAULT_ADVANCED_SEGMENTATION_PARAMS } from '../../utils/advancedSegmentation';
import { segmentProfileV2, DEFAULT_V2_PARAMS, AdvancedSegmentationV2Params } from '../../utils/advancedSegmentationV2';
import { segmentProfileGradient, DEFAULT_GRADIENT_PARAMS, GradientSegmentationParams } from '../../utils/gradientSegmentation';
import { AdvancedControlsPanel } from '../../components/route/advanced-controls-panel';
import { AdvancedControlsBarV2 } from '../../components/route/AdvancedControlsBarV2';
import { GradientControlsBar } from '../../components/route/GradientControlsBar';
import { segmentProfileGradientV2, DEFAULT_GRADIENT_V2_PARAMS, GradientSegmentationV2Params, OnRawSegmentDetectedCallback, AnimationFrames, simplifySegments } from '../../utils/gradientSegmentationV2';
import { AdvancedSegment } from '../../utils/types';

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
  const [experimentalParams, setExperimentalParams] = useState<AdvancedSegmentationV2Params>(DEFAULT_V2_PARAMS);
  
  // Gradient analysis state (V3) - REFACTORED
  const [gradientAnalysisMode, setGradientAnalysisMode] = useState(false);
  const [gradientParams, setGradientParams] = useState<GradientSegmentationV2Params>(DEFAULT_GRADIENT_V2_PARAMS);
  
  // New animation states for Gradient V2
  const [rawSegments, setRawSegments] = useState<AdvancedSegment[]>([]);
  const [animatedFrames, setAnimatedFrames] = useState<AnimationFrames>([]);
  const [finalSegments, setFinalSegments] = useState<AdvancedSegment[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'detection' | 'fusion' | 'complete'>('complete');
  const [detectedSegmentsCount, setDetectedSegmentsCount] = useState(0);
  
  // Debounce refs for intelligent slider handling
  const detectionDebounceRef = useRef<NodeJS.Timeout>();
  const fusionDebounceRef = useRef<NodeJS.Timeout>();
  
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

  // Calculate experimental V2 segments in real-time when V2 mode is active
  const { segments: experimentalSegments, macroBoundaries: experimentalMacroBoundaries } = useMemo(() => {
    if (!experimentalAnalysisMode || processedElevationData.length === 0) {
      return { segments: [], macroBoundaries: [] };
    }
    
    console.log('Calculating V2 experimental segments with params:', experimentalParams);
    return segmentProfileV2(processedElevationData, experimentalParams);
  }, [experimentalAnalysisMode, processedElevationData, experimentalParams]);

  // Animation callback for ETAPA 1 (Detection)
  const onRawSegmentDetected: OnRawSegmentDetectedCallback = useCallback((segment, totalFound) => {
    setDetectedSegmentsCount(totalFound);
    setRawSegments(prev => [...prev, segment]);
  }, []);

  // ETAPA 1: Full Calculation with Animation (Prominence or Gradient Change)
  const runFullCalculationWithAnimation = useCallback(async () => {
    if (!processedElevationData.length) return;

    console.log('🎬 Iniciando Cálculo Completo con Animación...');
    setIsAnimating(true);
    setAnimationPhase('detection');
    setRawSegments([]);
    setAnimatedFrames([]);
    setFinalSegments([]);
    setDetectedSegmentsCount(0);

    try {
      // ETAPA 1: Detección Global con animación
      const result = await segmentProfileGradientV2(
        processedElevationData,
        gradientParams,
        onRawSegmentDetected
      );

      console.log('✅ Detección completada, iniciando fusión...');
      setAnimationPhase('fusion');
      setAnimatedFrames(result.frames);

      // ETAPA 2: Animación de fusión
      if (result.frames.length > 1) {
        let frameIndex = 0;
        const animationInterval = setInterval(() => {
          if (frameIndex < result.frames.length) {
            setFinalSegments(result.frames[frameIndex]);
            frameIndex++;
          } else {
            clearInterval(animationInterval);
            setAnimationPhase('complete');
            setIsAnimating(false);
            console.log('🎯 Animación completada');
          }
        }, 75); // 75ms between frames
      } else {
        setFinalSegments(result.segments);
        setAnimationPhase('complete');
        setIsAnimating(false);
      }

    } catch (error) {
      console.error('Error en cálculo con animación:', error);
      setIsAnimating(false);
      setAnimationPhase('complete');
    }
  }, [processedElevationData, gradientParams, onRawSegmentDetected]);

  // ETAPA 2: Fast Fusion Calculation (Distance only)
  const runFastFusionCalculation = useCallback(() => {
    if (!rawSegments.length) return;

    console.log('⚡ Iniciando Cálculo de Fusión Rápido...');
    setIsAnimating(true);
    setAnimationPhase('fusion');

    try {
      const frames = simplifySegments(rawSegments, gradientParams.distanciaMinima);
      setAnimatedFrames(frames);

      if (frames.length > 1) {
        let frameIndex = 0;
        const animationInterval = setInterval(() => {
          if (frameIndex < frames.length) {
            setFinalSegments(frames[frameIndex]);
            frameIndex++;
          } else {
            clearInterval(animationInterval);
            setAnimationPhase('complete');
            setIsAnimating(false);
            console.log('⚡ Fusión rápida completada');
          }
        }, 75);
      } else {
        setFinalSegments(rawSegments);
        setAnimationPhase('complete');
        setIsAnimating(false);
      }

    } catch (error) {
      console.error('Error en fusión rápida:', error);
      setIsAnimating(false);
      setAnimationPhase('complete');
    }
  }, [rawSegments, gradientParams.distanciaMinima]);

  // Intelligent slider handling with debounce
  const handleGradientParamsChange = useCallback((newParams: GradientSegmentationV2Params) => {
    const paramsChanged = {
      prominence: newParams.prominenciaMinima !== gradientParams.prominenciaMinima,
      gradient: newParams.cambioGradiente !== gradientParams.cambioGradiente,
      distance: newParams.distanciaMinima !== gradientParams.distanciaMinima
    };

    setGradientParams(newParams);

    // Clear existing timeouts
    if (detectionDebounceRef.current) clearTimeout(detectionDebounceRef.current);
    if (fusionDebounceRef.current) clearTimeout(fusionDebounceRef.current);

    if (paramsChanged.prominence || paramsChanged.gradient) {
      // Full recalculation needed
      detectionDebounceRef.current = setTimeout(() => {
        runFullCalculationWithAnimation();
      }, 200);
    } else if (paramsChanged.distance) {
      // Only fusion recalculation needed
      fusionDebounceRef.current = setTimeout(() => {
        runFastFusionCalculation();
      }, 200);
    }
  }, [gradientParams, runFullCalculationWithAnimation, runFastFusionCalculation]);

  // Initial calculation when gradient mode is activated
  useEffect(() => {
    if (gradientAnalysisMode && processedElevationData.length > 0) {
      runFullCalculationWithAnimation();
    }
  }, [gradientAnalysisMode, processedElevationData.length, runFullCalculationWithAnimation]);

  // Get current segments for display (prioritize final segments when available)
  const currentSegments = gradientAnalysisMode ? 
    (finalSegments.length > 0 ? finalSegments : rawSegments) :
    experimentalAnalysisMode ? experimentalSegments : 
    advancedSegments;
  
  const currentMacroBoundaries = gradientAnalysisMode ? [] : // We'll implement this later if needed
                                experimentalAnalysisMode ? experimentalMacroBoundaries :
                                macroBoundaries;

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

  const resetExperimentalParams = () => {
    setExperimentalParams(DEFAULT_V2_PARAMS);
  };

  const resetGradientParams = () => {
    setGradientParams(DEFAULT_GRADIENT_PARAMS);
  };

  const handleAdvancedModeToggle = (enabled: boolean) => {
    setAdvancedAnalysisMode(enabled);
    if (enabled) {
      setExperimentalAnalysisMode(false);
      setGradientAnalysisMode(false);
    }
  };

  const handleExperimentalModeToggle = (enabled: boolean) => {
    setExperimentalAnalysisMode(enabled);
    if (enabled) {
      setAdvancedAnalysisMode(false);
      setGradientAnalysisMode(false);
    }
  };

  const handleGradientModeToggle = (enabled: boolean) => {
    setGradientAnalysisMode(enabled);
    if (enabled) {
      setAdvancedAnalysisMode(false);
      setExperimentalAnalysisMode(false);
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
                  {gradientAnalysisMode && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                      Análisis por Gradiente Activo
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

              {/* Gradient Analysis Toggle V3 */}
              <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Análisis por Gradiente</span>
                <Switch
                  checked={gradientAnalysisMode}
                  onCheckedChange={handleGradientModeToggle}
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
            />
          )}

          {/* Gradient V3 Controls Bar with new animation status */}
          {gradientAnalysisMode && (
            <div className="space-y-4">
              <GradientControlsBar
                params={gradientParams}
                setParams={handleGradientParamsChange}
                stats={advancedStats}
                onReset={() => {
                  setGradientParams(DEFAULT_GRADIENT_V2_PARAMS);
                  runFullCalculationWithAnimation();
                }}
                onClose={() => setGradientAnalysisMode(false)}
              />
              
              {/* Animation Status Indicator */}
              {isAnimating && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                    <div className="flex-1">
                      {animationPhase === 'detection' && (
                        <div>
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            🔍 Detectando segmentos... ({detectedSegmentsCount} encontrados)
                          </p>
                          <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2 mt-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(detectedSegmentsCount * 10, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {animationPhase === 'fusion' && (
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          🔧 Optimizando segmentos... (Fusión inteligente en progreso)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              advancedSegments={currentSegments}
              macroBoundaries={currentMacroBoundaries}
            />
          </div>

          {/* Segments Table */}
          <SegmentsTable 
            segments={segments}
            advancedSegments={currentSegments}
            isAdvancedMode={advancedAnalysisMode || experimentalAnalysisMode || gradientAnalysisMode}
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
