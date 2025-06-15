
import React from 'react';
import { Button } from '../ui/button';
import { ArrowUp, Map } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <div className="relative min-h-[calc(100vh-160px)] bg-gradient-to-br from-primary-50 via-earth-50 to-primary-100 dark:from-mountain-900 dark:via-mountain-800 dark:to-primary-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
          <pattern id="mountains" patternUnits="userSpaceOnUse" width="20" height="20">
            <path d="M0 20 L10 0 L20 20 Z" fill="currentColor" opacity="0.1"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#mountains)" />
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-20 pb-16">
        {/* Hero Content */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary-600 to-earth-600 bg-clip-text text-transparent">
                Eleva Tu
              </span>
              <br />
              <span className="text-mountain-800 dark:text-mountain-200">
                Carrera de Montaña
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-mountain-600 dark:text-mountain-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Analiza tus rutas GPX, visualiza perfiles de elevación y optimiza tus aventuras en la montaña con información profesional.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                size="lg" 
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                Comienza Tu Aventura
                <ArrowUp className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-primary-600 text-primary-700 hover:bg-primary-50 px-8 py-4 text-lg rounded-xl"
              >
                Ver Demostración
                <Map className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Features Preview Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 animate-slide-up">
            <div className="bg-white/80 dark:bg-mountain-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-primary-200/50 dark:border-mountain-700/50">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
                Análisis de Elevación
              </h3>
              <p className="text-mountain-600 dark:text-mountain-400 text-sm">
                Perfiles de elevación detallados con análisis de pendiente y desglose por segmentos.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-mountain-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-primary-200/50 dark:border-mountain-700/50">
              <div className="w-12 h-12 bg-earth-100 dark:bg-earth-900 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Map className="w-6 h-6 text-earth-600" />
              </div>
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
                Mapas Interactivos
              </h3>
              <p className="text-mountain-600 dark:text-mountain-400 text-sm">
                Explora tus rutas con visualización sincronizada de mapa y elevación.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-mountain-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-primary-200/50 dark:border-mountain-700/50">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
                Métricas de Rendimiento
              </h3>
              <p className="text-mountain-600 dark:text-mountain-400 text-sm">
                Obtén información sobre ritmo, esfuerzo y estrategias óptimas de nutrición.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
