
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoutes } from '@/hooks/useRoutes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Map, ArrowUp, ArrowDown, Plus, Calendar, MapPin, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRouteTypeLabel, getRouteTypeColor, getDisplayDate } from '@/utils/routeUtils';

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { routes, isLoading, error } = useRoutes();

  // Calculate real stats from routes data
  const stats = React.useMemo(() => {
    if (!routes || routes.length === 0) {
      return {
        totalRoutes: 0,
        totalDistance: 0,
        totalElevation: 0,
        totalElevationLoss: 0,
        trainingRoutes: 0,
        raceProfiles: 0
      };
    }

    const trainingRoutes = routes.filter(route => (route.route_type || 'training') === 'training');
    const raceProfiles = routes.filter(route => route.route_type === 'race_profile');

    return {
      totalRoutes: routes.length,
      totalDistance: routes.reduce((acc, route) => acc + (route.distance_km || 0), 0),
      totalElevation: routes.reduce((acc, route) => acc + (route.elevation_gain_m || 0), 0),
      totalElevationLoss: routes.reduce((acc, route) => acc + (route.elevation_loss_m || 0), 0),
      trainingRoutes: trainingRoutes.length,
      raceProfiles: raceProfiles.length
    };
  }, [routes]);

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

  const handleViewRoute = (routeId: string) => {
    navigate(`/dashboard/routes/${routeId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-200 rounded-2xl h-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-earth-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">
          Bienvenido, {user?.email?.split('@')[0]}!
        </h2>
        <p className="text-primary-100 mb-6">
          ¿Listo para tu próxima aventura? Sube un archivo GPX para analizar tu ruta de trail running
        </p>
        <Button 
          className="bg-white text-primary-600 hover:bg-primary-50"
          onClick={() => navigate('/dashboard/upload')}
        >
          <Upload className="mr-2 h-4 w-4" />
          Subir nueva ruta
        </Button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
              Entrenamientos
            </CardTitle>
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">
              {stats.trainingRoutes}
            </div>
            <p className="text-xs text-mountain-500 dark:text-mountain-500">
              Actividades registradas
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
              Altimetrías
            </CardTitle>
            <Map className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">
              {stats.raceProfiles}
            </div>
            <p className="text-xs text-mountain-500 dark:text-mountain-500">
              Perfiles de carrera
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
              Distancia Total
            </CardTitle>
            <svg className="h-4 w-4 text-earth-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">
              {stats.totalDistance.toFixed(1)} km
            </div>
            <p className="text-xs text-mountain-500 dark:text-mountain-500">
              Distancia acumulada
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
              Desnivel Positivo
            </CardTitle>
            <ArrowUp className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">
              {stats.totalElevation}m
            </div>
            <p className="text-xs text-mountain-500 dark:text-mountain-500">
              Desnivel acumulado
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
              Desnivel Negativo
            </CardTitle>
            <ArrowDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">
              {stats.totalElevationLoss}m
            </div>
            <p className="text-xs text-mountain-500 dark:text-mountain-500">
              Descenso acumulado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Routes or Empty State */}
      <Card className="border-primary-200 dark:border-mountain-700">
        <CardHeader>
          <CardTitle className="text-mountain-800 dark:text-mountain-200">
            {routes && routes.length > 0 ? 'Rutas Recientes' : 'Tus Rutas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {routes && routes.length > 0 ? (
            <div className="space-y-3">
              {routes.slice(0, 3).map((route) => (
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
          ) : (
            <div className="text-center py-12">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
