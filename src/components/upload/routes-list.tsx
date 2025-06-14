
import React from 'react';
import { useRoutes } from '@/hooks/useRoutes';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowUp, Calendar, MapPin, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RoutesList: React.FC = () => {
  const { routes, isLoading, error } = useRoutes();
  const navigate = useNavigate();

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Rutas Existentes
        </h3>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-sm text-mountain-600 dark:text-mountain-400">Cargando rutas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Rutas Existentes
        </h3>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-2 text-sm">{error}</p>
            <Button onClick={() => window.location.reload()} size="sm">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Rutas Existentes
        </h3>
        <div className="text-center py-8 border border-dashed border-mountain-300 dark:border-mountain-600 rounded-lg">
          <MapPin className="mx-auto h-8 w-8 text-mountain-400 mb-2" />
          <p className="text-mountain-600 dark:text-mountain-400 text-sm">
            No hay rutas disponibles. Sube tu primer archivo GPX arriba.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Rutas Existentes ({routes.length})
        </h3>
      </div>
      
      <div className="space-y-3">
        {routes.map((route) => (
          <div 
            key={route.id} 
            className="flex items-center justify-between p-4 border border-mountain-200 dark:border-mountain-700 rounded-lg hover:bg-mountain-50 dark:hover:bg-mountain-800/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-medium text-mountain-800 dark:text-mountain-200 truncate">
                  {route.name}
                </h4>
                <Badge className={`${getDifficultyColor(route.difficulty_level)} text-xs`}>
                  {route.difficulty_level}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-mountain-600 dark:text-mountain-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {route.distance_km?.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  +{route.elevation_gain_m}m
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(route.created_at).toLocaleDateString('es-ES')}
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
    </div>
  );
};
