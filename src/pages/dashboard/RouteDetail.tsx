import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { InteractiveMap } from '../../components/route/interactive-map';
import { ElevationChart } from '../../components/route/elevation-chart';
import { SegmentsTable } from '../../components/route/segments-table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowUp, ArrowDown, Map, Settings, ArrowLeft } from 'lucide-react';
import { useRouteData } from '../../hooks/useRouteData';
import { useNavigate } from 'react-router-dom';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate, getDateSourceLabel } from '../../utils/routeUtils';

const RouteDetail = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  
  console.log('RouteDetail mounted with routeId:', routeId);
  console.log('RouteId type:', typeof routeId, 'value:', routeId);
  
  // Verificar que tenemos un routeId válido antes de proceder
  if (!routeId) {
    console.error('No routeId found in URL parameters');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            No se pudo encontrar el ID de la ruta en la URL
          </p>
          <Button onClick={() => navigate('/dashboard/upload')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Rutas
          </Button>
        </div>
      </div>
    );
  }
  
  const { route, segments, elevationData, isLoading, error } = useRouteData(routeId);

  const handleBackToRoutes = () => {
    navigate('/dashboard/upload');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const formatGPXCaptureDate = (route: any) => {
    if (route.gpx_capture_date) {
      return `GPX: ${formatDate(route.gpx_capture_date)}`;
    }
    return `Subida: ${formatDate(route.created_at)}`;
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

  // Calcular estadísticas adicionales
  const totalElevationLoss = route.elevation_loss_m || elevationData.reduce((acc, point, index) => {
    if (index === 0) return 0;
    const diff = point.elevation - elevationData[index - 1].elevation;
    return acc + (diff < 0 ? Math.abs(diff) : 0);
  }, 0);

  const maxElevation = elevationData.length > 0 ? Math.max(...elevationData.map(p => p.elevation)) : 0;
  const minElevation = elevationData.length > 0 ? Math.min(...elevationData.map(p => p.elevation)) : 0;
  
  // Calcular gradientes para estadísticas
  const grades = elevationData.map((point, index) => {
    if (index === 0) return 0;
    const elevationDiff = point.elevation - elevationData[index - 1].elevation;
    const distanceDiff = (point.distance - elevationData[index - 1].distance) * 1000; // convertir a metros
    return distanceDiff > 0 ? (elevationDiff / distanceDiff) * 100 : 0;
  });

  const avgGrade = grades.length > 0 ? grades.reduce((acc, grade) => acc + grade, 0) / grades.length : 0;
  const maxGrade = grades.length > 0 ? Math.max(...grades.map(g => Math.abs(g))) : 0;

  // Calcular tiempo estimado (asumiendo velocidad promedio)
  const estimatedTime = (route.distance_km / 5) * 60; // 5 km/h promedio en montaña
  const hours = Math.floor(estimatedTime / 60);
  const minutes = Math.round(estimatedTime % 60);
  const totalTime = `${hours}h ${minutes}m`;

  return (
    <div className="space-y-6">
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

      {/* Stats Grid */}
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

      {/* Map and Chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        <InteractiveMap routeData={route} />
        <ElevationChart 
          elevationData={elevationData}
          onPointHover={setHoveredSegment}
          hoveredSegment={hoveredSegment}
        />
      </div>

      {/* Segments Table */}
      <SegmentsTable 
        segments={segments}
        onSegmentHover={setHoveredSegment}
        hoveredSegment={hoveredSegment}
      />
    </div>
  );
};

export default RouteDetail;
