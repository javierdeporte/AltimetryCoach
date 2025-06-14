
import React, { useEffect, useRef } from 'react';

// TODO: Install mapbox-gl when ready to implement
// import mapboxgl from 'mapbox-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';

interface InteractiveMapProps {
  routeData: any; // TODO: Define proper GPX data type
  onPointClick?: (point: any) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ routeData, onPointClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // TODO: Initialize Mapbox GL JS
    console.log('Map container ready for Mapbox initialization');
    
    // Placeholder for now
    // mapboxgl.accessToken = 'your-mapbox-token';
    // map.current = new mapboxgl.Map({...});

    return () => {
      // Cleanup
      console.log('Map cleanup');
    };
  }, []);

  return (
    <div className="h-96 bg-primary-50 dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 overflow-hidden">
      <div 
        ref={mapContainer} 
        className="w-full h-full relative"
      >
        {/* Placeholder content */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-100 to-earth-100 dark:from-mountain-800 dark:to-mountain-700">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-200 dark:bg-mountain-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600 dark:text-mountain-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-mountain-700 dark:text-mountain-300 mb-2">
              Interactive Route Map
            </h3>
            <p className="text-sm text-mountain-600 dark:text-mountain-400">
              Mapbox GL integration will display your route here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
