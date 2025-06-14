
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RouteData {
  id: string;
  name: string;
  description?: string;
  distance_km: number;
  elevation_gain_m: number;
  difficulty_level: string;
  created_at: string;
  gpx_data?: string;
}

interface Segment {
  id: string;
  segment_index: number;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  distance_km: number;
  elevation_gain_m: number;
  avg_grade_percent: number;
}

interface ElevationPoint {
  distance: number;
  elevation: number;
  segmentIndex?: number;
}

export const useRouteData = (routeId: string) => {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [elevationData, setElevationData] = useState<ElevationPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRouteData = async () => {
      try {
        setIsLoading(true);
        
        // Cargar datos de la ruta
        const { data: routeData, error: routeError } = await supabase
          .from('routes')
          .select('*')
          .eq('id', routeId)
          .single();

        if (routeError) {
          throw routeError;
        }

        setRoute(routeData);

        // Cargar segmentos
        const { data: segmentsData, error: segmentsError } = await supabase
          .from('segments')
          .select('*')
          .eq('route_id', routeId)
          .order('segment_index');

        if (segmentsError) {
          throw segmentsError;
        }

        setSegments(segmentsData);

        // Procesar datos GPX para obtener puntos de elevación
        if (routeData.gpx_data) {
          const elevationPoints = parseGPXForElevation(routeData.gpx_data, segmentsData);
          setElevationData(elevationPoints);
        }

      } catch (err) {
        console.error('Error loading route data:', err);
        setError(err instanceof Error ? err.message : 'Error loading route data');
      } finally {
        setIsLoading(false);
      }
    };

    if (routeId) {
      loadRouteData();
    }
  }, [routeId]);

  return { route, segments, elevationData, isLoading, error };
};

// Función auxiliar para parsear GPX y extraer puntos de elevación
function parseGPXForElevation(gpxData: string, segments: Segment[]): ElevationPoint[] {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
    const trackPoints = xmlDoc.querySelectorAll('trkpt');
    
    const points: ElevationPoint[] = [];
    let totalDistance = 0;

    trackPoints.forEach((point, index) => {
      const lat = parseFloat(point.getAttribute('lat') || '0');
      const lon = parseFloat(point.getAttribute('lon') || '0');
      const elevationEl = point.querySelector('ele');
      const elevation = elevationEl ? parseFloat(elevationEl.textContent || '0') : 0;

      // Calcular distancia acumulada
      if (index > 0) {
        const prevPoint = points[index - 1];
        // Obtener coordenadas del punto anterior desde el GPX
        const prevTrackPoint = trackPoints[index - 1];
        const prevLat = parseFloat(prevTrackPoint.getAttribute('lat') || '0');
        const prevLon = parseFloat(prevTrackPoint.getAttribute('lon') || '0');
        
        const distance = calculateDistance(prevLat, prevLon, lat, lon);
        totalDistance += distance;
      }

      // Determinar el índice del segmento basado en la distancia
      let segmentIndex = 0;
      for (let i = 0; i < segments.length; i++) {
        const segmentStartDistance = i === 0 ? 0 : segments.slice(0, i).reduce((acc, seg) => acc + seg.distance_km, 0);
        const segmentEndDistance = segmentStartDistance + segments[i].distance_km;
        
        if (totalDistance >= segmentStartDistance && totalDistance <= segmentEndDistance) {
          segmentIndex = i;
          break;
        }
      }

      points.push({
        distance: totalDistance,
        elevation,
        segmentIndex
      });
    });

    return points;
  } catch (error) {
    console.error('Error parsing GPX for elevation:', error);
    return [];
  }
}

// Función para calcular distancia entre dos puntos
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
