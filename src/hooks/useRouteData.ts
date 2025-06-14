
import { useState, useEffect, useCallback } from 'react';
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

  const loadRouteData = useCallback(async () => {
    if (!routeId) {
      setIsLoading(false);
      return;
    }

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
        throw new Error(`Error loading route: ${routeError.message}`);
      }

      if (!routeData) {
        throw new Error('Route not found');
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
        // No lanzar error aquí, solo loggear y continuar con array vacío
        setSegments([]);
      } else {
        console.log('Segments data loaded:', segmentsData?.length || 0, 'segments');
        setSegments(segmentsData || []);
      }

      // Procesar datos GPX para obtener puntos de elevación
      if (routeData.gpx_data) {
        console.log('Processing GPX data, length:', routeData.gpx_data.length);
        try {
          const elevationPoints = parseGPXForElevation(routeData.gpx_data, segmentsData || []);
          console.log('Elevation points parsed successfully:', elevationPoints.length);
          setElevationData(elevationPoints);
        } catch (gpxError) {
          console.error('GPX parsing error:', gpxError);
          // En caso de error de GPX, usar datos vacíos pero no fallar toda la carga
          setElevationData([]);
        }
      } else {
        console.log('No GPX data found');
        setElevationData([]);
      }

    } catch (err) {
      console.error('Error loading route data:', err);
      setError(err instanceof Error ? err.message : 'Error loading route data');
      // Resetear todos los estados en caso de error
      setRoute(null);
      setSegments([]);
      setElevationData([]);
    } finally {
      setIsLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadRouteData();
  }, [loadRouteData]);

  return { route, segments, elevationData, isLoading, error };
};

// Función auxiliar para parsear GPX y extraer puntos de elevación
function parseGPXForElevation(gpxData: string, segments: Segment[]): ElevationPoint[] {
  if (!gpxData || typeof gpxData !== 'string') {
    console.warn('Invalid GPX data provided');
    return [];
  }

  try {
    console.log('Starting GPX parsing...');
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
    
    // Verificar si hay errores en el parsing
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parsing error:', parseError.textContent);
      throw new Error('Invalid GPX XML format');
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

    // Limitar el procesamiento para evitar bucles infinitos
    const maxPoints = Math.min(trackPoints.length, 1000);
    console.log('Processing', maxPoints, 'points...');

    for (let index = 0; index < maxPoints; index++) {
      const point = trackPoints[index];
      const latStr = point.getAttribute('lat');
      const lonStr = point.getAttribute('lon');
      
      if (!latStr || !lonStr) {
        console.warn(`Missing coordinates at point ${index}`);
        continue;
      }

      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      
      if (isNaN(lat) || isNaN(lon)) {
        console.warn(`Invalid coordinates at point ${index}: lat=${latStr}, lon=${lonStr}`);
        continue;
      }

      const elevationEl = point.querySelector('ele');
      const elevation = elevationEl ? parseFloat(elevationEl.textContent || '0') : 0;

      // Calcular distancia acumulada
      if (index > 0 && previousLat !== null && previousLon !== null) {
        const distance = calculateDistance(previousLat, previousLon, lat, lon);
        if (!isNaN(distance) && distance > 0) {
          totalDistance += distance;
        }
      }

      // Determinar el índice del segmento basado en la distancia
      let segmentIndex = 0;
      if (segments.length > 0) {
        let accumulatedDistance = 0;
        for (let i = 0; i < segments.length; i++) {
          const segmentEndDistance = accumulatedDistance + (segments[i].distance_km || 0);
          if (totalDistance <= segmentEndDistance) {
            segmentIndex = i;
            break;
          }
          accumulatedDistance = segmentEndDistance;
        }
      }

      points.push({
        distance: totalDistance,
        elevation: isNaN(elevation) ? 0 : elevation,
        segmentIndex
      });

      previousLat = lat;
      previousLon = lon;
    }

    console.log('Successfully processed', points.length, 'elevation points');
    return points;
  } catch (error) {
    console.error('Error parsing GPX for elevation:', error);
    return [];
  }
}

// Función para calcular distancia entre dos puntos
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  try {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return isNaN(distance) ? 0 : distance;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return 0;
  }
}
