
import React from 'react';

export const SegmentsTableEmptyState: React.FC = () => {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-mountain-700 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-primary-600 dark:text-mountain-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-mountain-600 dark:text-mountain-400">
        No hay segmentos disponibles para esta ruta
      </p>
      <p className="text-sm text-mountain-500 dark:text-mountain-500 mt-2">
        Los datos GPX se están procesando para generar los segmentos
      </p>
    </div>
  );
};
