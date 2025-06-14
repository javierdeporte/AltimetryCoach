
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Map, ArrowUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mock data - TODO: Replace with real data from Supabase
  const stats = {
    totalRoutes: 0,
    totalDistance: 0,
    totalElevation: 0
  };

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
              {stats.totalDistance} km
            </div>
            <p className="text-xs text-mountain-500 dark:text-mountain-500">
              Este mes
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

      {/* Empty State */}
      <Card className="border-primary-200 dark:border-mountain-700">
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
