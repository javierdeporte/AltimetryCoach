import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { InteractiveMap } from "../../components/route/interactive-map";
import { ElevationChartD3 } from "../../components/route/elevation-chart-d3";
import { SegmentsTable } from "../../components/route/segments-table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import {
  ArrowUp,
  ArrowDown,
  Map,
  Settings,
  ArrowLeft,
  Brain,
  Eye,
  EyeOff,
  Sliders,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Zap,
  Share2,
  Save,
  FolderOpen,
  Pencil,
  PersonStanding,
} from "lucide-react";
import { useRouteData } from "../../hooks/useRouteData";
import { useNavigate } from "react-router-dom";
import { getDisplayDate, getDateSourceLabel } from "../../utils/routeUtils";
import { useRouteTypes } from "../../hooks/useRouteTypes";
import { useDifficultyLevels } from "../../hooks/useDifficultyLevels";
import { useTranslation } from "react-i18next";
import { segmentProfileAdvanced, DEFAULT_ADVANCED_SEGMENTATION_PARAMS } from "../../utils/advancedSegmentation";
import { segmentProfileV2, DEFAULT_V2_PARAMS, AdvancedSegmentationV2Params } from "../../utils/advancedSegmentationV2";
import { AdvancedControlsPanel } from "../../components/route/advanced-controls-panel";
import { AdvancedControlsBarV2 } from "../../components/route/AdvancedControlsBarV2";
import { GradientControlsBar } from "../../components/route/GradientControlsBar";
import {
  segmentProfileGradient,
  DEFAULT_GRADIENT_PARAMS,
  GradientSegmentationParams,
} from "../../utils/gradientSegmentation";
import { useShareRoute } from "../../hooks/useShareRoute";
import { ShareRouteDialog } from "../../components/route/share-route-dialog";
import { useAnalysisVersions, AnalysisVersion } from "../../hooks/useAnalysisVersions";
import { SaveVersionDialog } from "../../components/route/save-version-dialog";
import { VersionsList } from "../../components/route/versions-list";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";
import { EditRouteDialog } from "../../components/route/edit-route-dialog";

const RouteDetail = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getLabelByKey: getRouteTypeLabel, getColorByKey: getRouteTypeColor } = useRouteTypes();
  const { getLabelByKey: getDifficultyLabel } = useDifficultyLevels();
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Advanced analysis state (V1)
  const [advancedAnalysisMode, setAdvancedAnalysisMode] = useState(false);
  const [advancedParams, setAdvancedParams] = useState(DEFAULT_ADVANCED_SEGMENTATION_PARAMS);

  // Experimental analysis state (V2)
  const [experimentalAnalysisMode, setExperimentalAnalysisMode] = useState(false);
  const [experimentalParams, setExperimentalParams] = useState<AdvancedSegmentationV2Params>(DEFAULT_V2_PARAMS);

  // Gradient analysis state
  const [gradientAnalysisMode, setGradientAnalysisMode] = useState(false);
  const [gradientParams, setGradientParams] = useState<GradientSegmentationParams>(DEFAULT_GRADIENT_PARAMS);

  // Show grade percentages on chart
  const [showGradeLabels, setShowGradeLabels] = useState(false);
  const [showSegmentDistance, setShowSegmentDistance] = useState(false);

  // Share state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const { shareRoute, isSharing } = useShareRoute();

  // Versions state
  const [showSaveVersionDialog, setShowSaveVersionDialog] = useState(false);
  const [showVersionsPanel, setShowVersionsPanel] = useState(false);
  const [versionsRefreshTrigger, setVersionsRefreshTrigger] = useState(0);
  const { saveVersion, isLoading: isSavingVersion } = useAnalysisVersions();

  // Edit route state
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Saving state for smooth transition
  const [isSaving, setIsSaving] = useState(false);

  console.log("RouteDetail mounted with routeId:", routeId);

  // Verificar que tenemos un routeId válido antes de proceder
  if (!routeId) {
    console.error("No routeId found in URL parameters");
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">No se pudo encontrar el ID de la ruta en la URL</p>
          <Button onClick={() => navigate("/dashboard/routes")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Rutas
          </Button>
        </div>
      </div>
    );
  }

  const { route, segments, elevationData, isLoading, error, loadRouteData } = useRouteData(routeId);

  // Transform elevation data to the format expected by D3 chart and advanced segmentation
  const processedElevationData = React.useMemo(() => {
    return elevationData.map((point) => ({
      ...point,
      displayDistance: point.distance,
      displayElevation: point.elevation,
    }));
  }, [elevationData]);

  // Calculate advanced segments in real-time when V1 mode is active
  const { segments: advancedSegments, macroBoundaries } = useMemo(() => {
    if (!advancedAnalysisMode || processedElevationData.length === 0) {
      return { segments: [], macroBoundaries: [] };
    }

    console.log("Calculating V1 advanced segments with params:", advancedParams);
    return segmentProfileAdvanced(processedElevationData, advancedParams);
  }, [advancedAnalysisMode, processedElevationData, advancedParams]);

  // Calculate experimental V2 segments in real-time when V2 mode is active
  const { segments: experimentalSegments, macroBoundaries: experimentalMacroBoundaries } = useMemo(() => {
    if (!experimentalAnalysisMode || processedElevationData.length === 0) {
      return { segments: [], macroBoundaries: [] };
    }

    console.log("Calculating V2 experimental segments with params:", experimentalParams);
    return segmentProfileV2(processedElevationData, experimentalParams);
  }, [experimentalAnalysisMode, processedElevationData, experimentalParams]);

  // Calculate Gradient-based segments when Gradient mode is active
  const { segments: gradientSegments, macroBoundaries: gradientMacroBoundaries } = useMemo(() => {
    if (!gradientAnalysisMode || processedElevationData.length === 0) {
      return { segments: [], macroBoundaries: [] };
    }
    console.log("Calculating Gradient-based segments with params:", gradientParams);
    return segmentProfileGradient(processedElevationData, gradientParams);
  }, [gradientAnalysisMode, processedElevationData, gradientParams]);

  // Calculate advanced segments statistics (works for all modes)
  const currentSegments = gradientAnalysisMode
    ? gradientSegments
    : experimentalAnalysisMode
      ? experimentalSegments
      : advancedSegments;
  const currentMacroBoundaries = gradientAnalysisMode
    ? gradientMacroBoundaries
    : experimentalAnalysisMode
      ? experimentalMacroBoundaries
      : macroBoundaries;

  const advancedStats = useMemo(() => {
    if (!currentSegments || currentSegments.length === 0) return null;

    const totalAscent = currentSegments.filter((s) => s.type === "asc").reduce((sum, s) => sum + s.elevationGain, 0);

    const totalDescent = currentSegments.filter((s) => s.type === "desc").reduce((sum, s) => sum + s.elevationLoss, 0);

    const totalDistance = currentSegments.reduce((sum, s) => sum + s.distance, 0);
    const avgSegmentDistance = totalDistance / currentSegments.length;

    const avgRSquared = currentSegments.reduce((sum, s) => sum + s.rSquared, 0) / currentSegments.length;

    return {
      totalSegments: currentSegments.length,
      ascentSegments: currentSegments.filter((s) => s.type === "asc").length,
      descentSegments: currentSegments.filter((s) => s.type === "desc").length,
      horizontalSegments: currentSegments.filter((s) => s.type === "hor").length,
      totalAscent: Math.round(totalAscent),
      totalDescent: Math.round(totalDescent),
      avgSegmentDistance: isNaN(avgSegmentDistance) ? "0.0" : avgSegmentDistance.toFixed(1),
      avgRSquared: isNaN(avgRSquared) ? "0.000" : avgRSquared.toFixed(3),
      qualityRating:
        avgRSquared >= 0.95 ? "Excelente" : avgRSquared >= 0.9 ? "Bueno" : avgRSquared >= 0.85 ? "Regular" : "Bajo",
    };
  }, [currentSegments]);

  const handleBackToRoutes = () => {
    navigate("/dashboard/routes");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES");
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

  const handleSaveStart = () => {
    // Show saving indicator immediately when user clicks save
    setIsSaving(true);
  };

  const handleRouteUpdated = async () => {
    // Refetch route data after update without reloading the page
    await loadRouteData();

    // Keep indicator visible for smooth transition
    setTimeout(() => {
      setIsSaving(false);
    }, 800);
  };

  const handleShareRoute = async () => {
    if (!routeId) return;

    const analysisType = experimentalAnalysisMode
      ? "experimental"
      : advancedAnalysisMode
        ? "advanced"
        : gradientAnalysisMode
          ? "gradient"
          : "none";

    const params = experimentalAnalysisMode
      ? experimentalParams
      : advancedAnalysisMode
        ? advancedParams
        : gradientAnalysisMode
          ? gradientParams
          : {};

    const shareSlug = await shareRoute({
      routeId,
      analysisType,
      analysisParams: params,
      showGradeLabels,
    });

    if (shareSlug) {
      const url = `/share/${shareSlug}`;
      setShareUrl(url);
      setShowShareDialog(true);
    }
  };

  const handleSaveVersion = async (versionName: string) => {
    if (!routeId) return;

    const analysisType = experimentalAnalysisMode
      ? "experimental"
      : advancedAnalysisMode
        ? "advanced"
        : gradientAnalysisMode
          ? "gradient"
          : "none";

    const params = experimentalAnalysisMode
      ? experimentalParams
      : advancedAnalysisMode
        ? advancedParams
        : gradientAnalysisMode
          ? gradientParams
          : {};

    const versionId = await saveVersion({
      routeId,
      versionName,
      analysisType,
      analysisParams: params,
      showGradeLabels,
      segmentsSnapshot: currentSegments,
    });

    if (versionId) {
      setShowSaveVersionDialog(false);
      setVersionsRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleLoadVersion = (version: AnalysisVersion) => {
    // Load the version's analysis parameters
    switch (version.analysis_type) {
      case "experimental":
        setExperimentalAnalysisMode(true);
        setAdvancedAnalysisMode(false);
        setGradientAnalysisMode(false);
        setExperimentalParams(version.analysis_params);
        break;
      case "advanced":
        setAdvancedAnalysisMode(true);
        setExperimentalAnalysisMode(false);
        setGradientAnalysisMode(false);
        setAdvancedParams(version.analysis_params);
        break;
      case "gradient":
        setGradientAnalysisMode(true);
        setAdvancedAnalysisMode(false);
        setExperimentalAnalysisMode(false);
        setGradientParams(version.analysis_params);
        break;
      default:
        setAdvancedAnalysisMode(false);
        setExperimentalAnalysisMode(false);
        setGradientAnalysisMode(false);
    }
    setShowGradeLabels(version.show_grade_labels);
  };

  const handleShareVersion = async (version: AnalysisVersion) => {
    if (!routeId) return;

    const shareSlug = await shareRoute({
      routeId,
      analysisType: version.analysis_type,
      analysisParams: version.analysis_params,
      showGradeLabels: version.show_grade_labels,
      versionId: version.id,
    });

    if (shareSlug) {
      const url = `/share/${shareSlug}`;
      setShareUrl(url);
      setShowShareDialog(true);
    }
  };

  if (isLoading && !isSaving) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-mountain-800 rounded-lg shadow-xl p-6 flex flex-col items-center gap-4 animate-scale-in">
          <svg
            width="80"
            height="60"
            viewBox="0 0 80 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            {/* Línea base de referencia */}
            <line
              x1="5"
              y1="50"
              x2="75"
              y2="50"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.3"
            />
            {/* Perfil de elevación animado */}
            <path
              d="M 5 50 L 15 45 L 25 35 L 35 25 L 45 20 L 55 30 L 65 40 L 75 45"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="animate-draw-elevation"
            />
          </svg>
          <p className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">{t("route_detail.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || t("route_detail.not_found")}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleBackToRoutes} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("route_detail.back_to_routes")}
            </Button>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  const totalElevationLoss =
    route.elevation_loss_m ||
    elevationData.reduce((acc, point, index) => {
      if (index === 0) return 0;
      const diff = point.elevation - elevationData[index - 1].elevation;
      return acc + (diff < 0 ? Math.abs(diff) : 0);
    }, 0);

  const maxElevation = elevationData.length > 0 ? Math.max(...elevationData.map((p) => p.elevation)) : 0;
  const minElevation = elevationData.length > 0 ? Math.min(...elevationData.map((p) => p.elevation)) : 0;

  const grades = elevationData.map((point, index) => {
    if (index === 0) return 0;
    const elevationDiff = point.elevation - elevationData[index - 1].elevation;
    const distanceDiff = (point.distance - elevationData[index - 1].distance) * 1000;
    return distanceDiff > 0 ? (elevationDiff / distanceDiff) * 100 : 0;
  });

  const avgGrade = grades.length > 0 ? grades.reduce((acc, grade) => acc + grade, 0) / grades.length : 0;

  const estimatedTime = (route.distance_km / 5) * 60;
  const hours = Math.floor(estimatedTime / 60);
  const minutes = Math.round(estimatedTime % 60);
  const totalTime = `${hours}h ${minutes}m`;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-mountain-900">
      {/* Saving Indicator Overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-mountain-800 rounded-lg shadow-xl p-6 flex flex-col items-center gap-4 animate-scale-in">
            <svg
              width="80"
              height="60"
              viewBox="0 0 80 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary"
            >
              {/* Línea base de referencia */}
              <line
                x1="5"
                y1="50"
                x2="75"
                y2="50"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                opacity="0.3"
              />
              {/* Perfil de elevación animado */}
              <path
                d="M 5 50 L 15 45 L 25 35 L 35 25 L 45 20 L 55 30 L 65 40 L 75 45"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="animate-draw-elevation"
              />
            </svg>
            <p className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
              {t("route_detail.saving") || "Guardando..."}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3 max-w-full">
          {/* Enhanced Header - Row 1: Route Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-4">
              <Button onClick={handleBackToRoutes} variant="ghost" size="sm" className="p-1 mt-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200">{route.name}</h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditDialog(true)}
                      className="shrink-0"
                      title={t("route_detail.edit_route")}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                      onClick={() => setShowVersionsPanel(!showVersionsPanel)}
                      title="Ver versiones guardadas"
                    >
                      <FolderOpen className="w-3 h-3 mr-1" />
                      Versiones
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                      onClick={() => setShowSaveVersionDialog(true)}
                      title="Guardar configuración actual"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Guardar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary-300 text-primary-600 hover:bg-primary-50 text-xs px-2 py-1"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Export Data
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary-600 hover:bg-primary-700 text-white text-xs px-2 py-1"
                      onClick={handleShareRoute}
                      disabled={isSharing}
                    >
                      <Share2 className="w-3 h-3 mr-1" />
                      {isSharing ? "Generando..." : "Compartir Ruta"}
                    </Button>
                  </div>
                </div>

                {/* Route type, date info and statistics in same row */}
                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <Badge className={`${getRouteTypeColor(route.route_type)} text-sm`}>
                    {getRouteTypeLabel(route.route_type)}
                  </Badge>
                  <span
                    className="text-sm text-mountain-600 dark:text-mountain-400"
                    title={getDateSourceLabel(route.date_source)}
                  >
                    {getDisplayDate(route)}
                  </span>
                  <span className="text-sm text-mountain-600 dark:text-mountain-400">
                    Dificultad: {route.difficulty_level}
                  </span>

                  {/* Statistics moved here - compact version */}
                  <div className="flex flex-wrap gap-3 text-xs text-mountain-600 dark:text-mountain-400">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <span className="font-medium text-primary-600">{route.distance_km.toFixed(1)} km</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-green-600" />
                      <span className="font-medium text-green-600">+{route.elevation_gain_m}m</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-blue-600" />
                      <span className="font-medium text-blue-600">-{Math.round(totalElevationLoss)}m</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium text-purple-600">{totalTime}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                      <span className="font-medium text-orange-600">{Math.round(maxElevation)}m</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                      <span className="font-medium text-teal-600">{Math.round(minElevation)}m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Versions Panel - Collapsible */}
            {showVersionsPanel && routeId && (
              <div className="bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 p-6">
                <h3 className="text-lg font-semibold mb-4">Versiones Guardadas</h3>
                <VersionsList
                  routeId={routeId}
                  onLoadVersion={handleLoadVersion}
                  onShareVersion={handleShareVersion}
                  refreshTrigger={versionsRefreshTrigger}
                />
              </div>
            )}

            {/* Row 2: Botones de acción más pequeños */}
            <div className="flex items-center gap-2 justify-between lg:justify-end overflow-x-auto whitespace-nowrap">
              {/* Advanced Analysis Toggle V1 */}
              <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-lg px-2 py-1">
                <Brain className="w-3 h-3 text-primary-600" />
                <span className="text-xs font-medium">Análisis Avanzado</span>
                <Switch checked={advancedAnalysisMode} onCheckedChange={handleAdvancedModeToggle} />
              </div>

              {/* Experimental Analysis Toggle V2 */}
              <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-blue-200 dark:border-blue-700 rounded-lg px-2 py-1">
                <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
                <span className="text-xs font-medium">Análisis Experimental</span>
                <Switch checked={experimentalAnalysisMode} onCheckedChange={handleExperimentalModeToggle} />
              </div>

              {/* Gradient Analysis Toggle */}
              <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-yellow-200 dark:border-yellow-700 rounded-lg px-2 py-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-medium">Análisis por Gradiente</span>
                <Switch checked={gradientAnalysisMode} onCheckedChange={handleGradientModeToggle} />
              </div>

              {/* Show Grade Labels Toggle */}
              {(advancedAnalysisMode || experimentalAnalysisMode || gradientAnalysisMode) && (
                <>
                  <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-purple-200 dark:border-purple-700 rounded-lg px-2 py-1">
                    <span className="text-xs font-medium">% Inclinación</span>
                    <Switch checked={showGradeLabels} onCheckedChange={setShowGradeLabels} />
                  </div>

                  {showGradeLabels && (
                    <div className="flex items-center gap-2 bg-white dark:bg-mountain-800 border border-blue-200 dark:border-blue-700 rounded-lg px-2 py-1">
                      <span className="text-xs font-medium">Distancia</span>
                      <Switch checked={showSegmentDistance} onCheckedChange={setShowSegmentDistance} />
                    </div>
                  )}
                </>
              )}

              <Button
                onClick={() => setShowMap(!showMap)}
                variant="outline"
                size="sm"
                className="border-primary-300 text-primary-600 hover:bg-primary-50 text-xs px-2 py-1"
              >
                {showMap ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {showMap ? "Ocultar" : "Ver"} Mapa
              </Button>
            </div>
          </div>

          {/* Gradient Controls Bar */}
          {gradientAnalysisMode && (
            <GradientControlsBar
              params={gradientParams}
              setParams={setGradientParams}
              stats={advancedStats}
              onReset={resetGradientParams}
              onClose={() => setGradientAnalysisMode(false)}
            />
          )}

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

          {/* Advanced Elevation Chart con altura reducida 20% */}
          <div className="w-full">
            <ElevationChartD3
              elevationData={processedElevationData}
              onPointHover={setHoveredSegment}
              hoveredSegment={hoveredSegment}
              options={{
                height: 230, // Reducido de 400 a 320 (20% menos)
                backgroundColor: "transparent",
              }}
              advancedSegments={currentSegments}
              macroBoundaries={currentMacroBoundaries}
              showGradeLabels={showGradeLabels}
              showSegmentDistance={showSegmentDistance}
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
                  <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">Mapa Interactivo</h3>
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

      {/* Share Route Dialog */}
      <ShareRouteDialog isOpen={showShareDialog} onClose={() => setShowShareDialog(false)} shareUrl={shareUrl} />

      {/* Save Version Dialog */}
      <SaveVersionDialog
        open={showSaveVersionDialog}
        onOpenChange={setShowSaveVersionDialog}
        onSave={handleSaveVersion}
        isLoading={isSavingVersion}
      />

      {/* Edit Route Dialog */}
      <EditRouteDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        route={route}
        onRouteUpdated={handleRouteUpdated}
        onSaveStart={handleSaveStart}
      />
    </div>
  );
};

export default RouteDetail;
