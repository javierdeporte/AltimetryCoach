
import React from 'react';
import { useRoutes } from '@/hooks/useRoutes';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ArrowUp, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RouteSelectorProps {
  onRouteSelect: (routeId: string) => void;
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({ onRouteSelect }) => {
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-mountain-600 dark:text-mountain-400">Cargando rutas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="mx-auto h-12 w-12 text-mountain-400 mb-4" />
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
          No hay rutas disponibles
        </h3>
        <p className="text-mountain-600 dark:text-mountain-400 mb-4">
          Sube tu primer archivo GPX para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Tus Rutas ({routes.length})
        </h3>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <Card key={route.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-semibold line-clamp-1">
                  {route.name}
                </CardTitle>
                <Badge className={getDifficultyColor(route.difficulty_level)}>
                  {route.difficulty_level}
                </Badge>
              </div>
              {route.description && (
                <CardDescription className="line-clamp-2">
                  {route.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex gap-4 text-sm text-mountain-600 dark:text-mountain-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {route.distance_km?.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-4 h-4" />
                  +{route.elevation_gain_m}m
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-mountain-500 dark:text-mountain-400">
                <Calendar className="w-3 h-3" />
                {new Date(route.created_at).toLocaleDateString('es-ES')}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewRoute(route.id)}
                  className="flex-1"
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
