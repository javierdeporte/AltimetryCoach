import { useState, useEffect } from 'react';
import { ElevationPoint } from '@/utils/types';

interface PublicRouteData {
  route: any;
  elevationData: ElevationPoint[];
  analysisType: 'experimental' | 'advanced' | 'gradient' | 'none';
  analysisParams: any;
  isLoading: boolean;
  error: string | null;
}

export const usePublicRouteData = (
  shareSlug: string, 
  getSharedRoute: (slug: string) => Promise<any>
): PublicRouteData => {
  const [data, setData] = useState<PublicRouteData>({
    route: null,
    elevationData: [],
    analysisType: 'none',
    analysisParams: {},
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        
        const sharedRouteData = await getSharedRoute(shareSlug);
        
        if (!sharedRouteData || !sharedRouteData.routes) {
          throw new Error('Ruta compartida no encontrada');
        }

        const route = sharedRouteData.routes;
        
        // Parse GPX data for elevation profile
        const elevationData = parseGPXForElevation(route.gpx_data || '');

        setData({
          route,
          elevationData,
          analysisType: sharedRouteData.analysis_type,
          analysisParams: sharedRouteData.analysis_params || {},
          isLoading: false,
          error: null
        });
      } catch (err) {
        console.error('Error loading public route:', err);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Error cargando la ruta'
        }));
      }
    };

    if (shareSlug) {
      loadData();
    }
  }, [shareSlug, getSharedRoute]);

  return data;
};

// Parse GPX data to extract elevation points
function parseGPXForElevation(gpxData: string): ElevationPoint[] {
  if (!gpxData) return [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
    
    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    const elevationPoints: ElevationPoint[] = [];
    
    let cumulativeDistance = 0;
    let prevLat: number | null = null;
    let prevLon: number | null = null;

    for (let i = 0; i < trkpts.length; i++) {
      const trkpt = trkpts[i];
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lon = parseFloat(trkpt.getAttribute('lon') || '0');
      const eleNode = trkpt.getElementsByTagName('ele')[0];
      const elevation = eleNode ? parseFloat(eleNode.textContent || '0') : 0;

      if (prevLat !== null && prevLon !== null) {
        const distance = calculateDistance(prevLat, prevLon, lat, lon);
        cumulativeDistance += distance;
      }

      elevationPoints.push({
        distance: cumulativeDistance,
        elevation: elevation,
        displayDistance: cumulativeDistance,
        displayElevation: elevation
      });

      prevLat = lat;
      prevLon = lon;
    }

    return elevationPoints;
  } catch (error) {
    console.error('Error parsing GPX:', error);
    return [];
  }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
