
import React, { useState } from 'react';
import { useRoutes } from '@/hooks/useRoutes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Calendar, MapPin, Eye, Filter, Plus, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDisplayDate } from '@/utils/routeUtils';
import { useRouteTypes } from '@/hooks/useRouteTypes';
import { useDifficultyLevels } from '@/hooks/useDifficultyLevels';

const RoutesList = () => {
  const { routes, isLoading, error } = useRoutes();
  const navigate = useNavigate();
  const { getLabelByKey: getRouteTypeLabel, getColorByKey: getRouteTypeColor } = useRouteTypes();
  const { getLabelByKey: getDifficultyLabel } = useDifficultyLevels();
  const [selectedRouteType, setSelectedRouteType] = useState<string>('all');

  const handleViewRoute = (routeId: string) => {
    navigate(`/dashboard/routes/${routeId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Filter routes by type
  const filteredRoutes = routes.filter(route => {
    if (selectedRouteType === 'all') return true;
    return (route.route_type || 'training') === selectedRouteType;
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse bg-gray-200 rounded-lg h-48"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
            Mis Rutas
          </h1>
          <p className="text-mountain-600 dark:text-mountain-400">
            Gestiona y analiza todas tus rutas de trail running
          </p>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/upload')}
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Ruta
        </Button>
      </div>

      {routes.length === 0 ? (
        <Card className="border-primary-200 dark:border-mountain-700">
          <CardContent className="text-center py-12">
            <Map className="mx-auto h-12 w-12 text-mountain-400 mb-4" />
            <h3 className="text-lg font-medium text-mountain-800 dark:text-mountain-200 mb-2">
              No tienes rutas aún
            </h3>
            <p className="text-mountain-600 dark:text-mountain-400 mb-6 max-w-md mx-auto">
              Comienza subiendo tu primer archivo GPX para analizar la ruta y crear planes de carrera personalizados.
            </p>
            <Button 
              onClick={() => navigate('/dashboard/upload')}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Subir primera ruta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card className="border-primary-200 dark:border-mountain-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-mountain-800 dark:text-mountain-200">
                  Rutas ({filteredRoutes.length})
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-mountain-600" />
                  <select
                    value={selectedRouteType}
                    onChange={(e) => setSelectedRouteType(e.target.value)}
                    className="text-sm border border-mountain-300 dark:border-mountain-600 rounded-md px-3 py-1 bg-white dark:bg-mountain-800 text-mountain-800 dark:text-mountain-200"
                  >
                    <option value="all">Todas las rutas</option>
                    <option value="training">Entrenamientos</option>
                    <option value="race_profile">Altimetrías de Carrera</option>
                    <option value="route_planning">Planificación</option>
                    <option value="custom">Personalizadas</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredRoutes.map((route) => (
                  <div 
                    key={route.id} 
                    className="flex items-center justify-between p-4 border border-mountain-200 dark:border-mountain-700 rounded-lg hover:bg-mountain-50 dark:hover:bg-mountain-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="font-medium text-mountain-800 dark:text-mountain-200 truncate">
                          {route.name}
                        </h4>
                        <Badge className={`${getRouteTypeColor(route.route_type)} text-xs`}>
                          {getRouteTypeLabel(route.route_type)}
                        </Badge>
                        <Badge className={`${getDifficultyColor(route.difficulty_level)} text-xs`}>
                          {route.difficulty_level}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-mountain-600 dark:text-mountain-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {route.distance_km?.toFixed(1)} km
                        </span>
                        <span className="flex items-center gap-1">
                          <ArrowUp className="w-3 h-3 text-primary-600" />
                          +{route.elevation_gain_m}m
                        </span>
                        {route.elevation_loss_m && (
                          <span className="flex items-center gap-1">
                            <ArrowDown className="w-3 h-3 text-blue-600" />
                            -{route.elevation_loss_m}m
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {getDisplayDate(route)}
                        </span>
                      </div>
                      
                      {route.description && (
                        <p className="text-xs text-mountain-500 dark:text-mountain-400 mt-1 truncate">
                          {route.description}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRoute(route.id)}
                      className="ml-4 flex-shrink-0"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RoutesList;
