
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
        setError(null);
        
        console.log('Loading route data for ID:', routeId);
        
        // Cargar datos de la ruta
        const { data: routeData, error: routeError } = await supabase
          .from('routes')
          .select('*')
          .eq('id', routeId)
          .single();

        if (routeError) {
          console.error('Route error:', routeError);
          throw routeError;
        }

        console.log('Route data loaded:', routeData);
        setRoute(routeData);

        // Cargar segmentos
        const { data: segmentsData, error: segmentsError } = await supabase
          .from('segments')
          .select('*')
          .eq('route_id', routeId)
          .order('segment_index');

        if (segmentsError) {
          console.error('Segments error:', segmentsError);
          throw segmentsError;
        }

        console.log('Segments data loaded:', segmentsData);
        setSegments(segmentsData || []);

        // Procesar datos GPX para obtener puntos de elevación
        if (routeData.gpx_data) {
          console.log('Processing GPX data...');
          const elevationPoints = parseGPXForElevation(routeData.gpx_data, segmentsData || []);
          console.log('Elevation points parsed:', elevationPoints.length);
          setElevationData(elevationPoints);
        } else {
          console.log('No GPX data found');
          setElevationData([]);
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
    console.log('Parsing GPX data, length:', gpxData.length);
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
    
    // Verificar si hay errores en el parsing
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('GPX parsing error:', parseError.textContent);
      return [];
    }
    
    const trackPoints = xmlDoc.querySelectorAll('trkpt');
    console.log('Track points found:', trackPoints.length);
    
    if (trackPoints.length === 0) {
      console.warn('No track points found in GPX');
      return [];
    }
    
    const points: ElevationPoint[] = [];
    let totalDistance = 0;
    let previousLat: number | null = null;
    let previousLon: number | null = null;

    trackPoints.forEach((point, index) => {
      const lat = parseFloat(point.getAttribute('lat') || '0');
      const lon = parseFloat(point.getAttribute('lon') || '0');
      const elevationEl = point.querySelector('ele');
      const elevation = elevationEl ? parseFloat(elevationEl.textContent || '0') : 0;

      // Calcular distancia acumulada
      if (index > 0 && previousLat !== null && previousLon !== null) {
        const distance = calculateDistance(previousLat, previousLon, lat, lon);
        totalDistance += distance;
      }

      // Determinar el índice del segmento basado en la distancia
      let segmentIndex = 0;
      if (segments.length > 0) {
        let accumulatedDistance = 0;
        for (let i = 0; i < segments.length; i++) {
          const segmentEndDistance = accumulatedDistance + segments[i].distance_km;
          if (totalDistance <= segmentEndDistance) {
            segmentIndex = i;
            break;
          }
          accumulatedDistance = segmentEndDistance;
        }
      }

      points.push({
        distance: totalDistance,
        elevation,
        segmentIndex
      });

      previousLat = lat;
      previousLon = lon;
    });

    console.log('Elevation points processed:', points.length);
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
