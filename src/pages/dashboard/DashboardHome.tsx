
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoutes } from '@/hooks/useRoutes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Map, ArrowUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
        totalElevation: 0
      };
    }

    return {
      totalRoutes: routes.length,
      totalDistance: routes.reduce((acc, route) => acc + (route.distance_km || 0), 0),
      totalElevation: routes.reduce((acc, route) => acc + (route.elevation_gain_m || 0), 0)
    };
  }, [routes]);

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
              Total Rutas
            </CardTitle>
            <Map className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">
              {stats.totalRoutes}
            </div>
            <p className="text-xs text-mountain-500 dark:text-mountain-500">
              Plan gratuito: límite de 3 rutas
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
              Desnivel Total
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
            <div className="space-y-4">
              {routes.slice(0, 3).map((route) => (
                <div key={route.id} className="flex items-center justify-between p-4 bg-primary-50 dark:bg-mountain-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-mountain-800 dark:text-mountain-200">{route.name}</h4>
                    <div className="flex gap-4 text-sm text-mountain-600 dark:text-mountain-400">
                      <span>{route.distance_km?.toFixed(1) || '0'} km</span>
                      <span>+{route.elevation_gain_m || 0}m</span>
                      <span>{route.difficulty_level || 'No definido'}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-primary-300 text-primary-600 hover:bg-primary-50"
                    onClick={() => navigate(`/dashboard/routes/${route.id}`)}
                  >
                    Ver Detalles
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
