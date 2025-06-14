
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
      console.log('No routeId provided');
      setIsLoading(false);
      setError('ID de ruta no válido');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading route data for ID:', routeId);
      
      // Cargar datos de la ruta con mejor manejo de errores
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('*')
        .eq('id', routeId)
        .maybeSingle();

      if (routeError) {
        console.error('Route error:', routeError);
        throw new Error(`Error al cargar la ruta: ${routeError.message}`);
      }

      if (!routeData) {
        console.error('Route not found for ID:', routeId);
        throw new Error('Ruta no encontrada en la base de datos');
      }

      console.log('Route data loaded successfully:', routeData.name);
      setRoute(routeData);

      // Cargar segmentos con mejor manejo de errores
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('segments')
        .select('*')
        .eq('route_id', routeId)
        .order('segment_index');

      if (segmentsError) {
        console.error('Segments error:', segmentsError);
        setSegments([]);
      } else {
        console.log('Segments loaded:', segmentsData?.length || 0, 'segments');
        setSegments(segmentsData || []);
      }

      // Procesar datos GPX sin limitación de puntos
      if (routeData.gpx_data) {
        console.log('Processing GPX data...');
        try {
          const elevationPoints = parseGPXForElevation(routeData.gpx_data, segmentsData || []);
          console.log('Elevation points processed:', elevationPoints.length);
          setElevationData(elevationPoints);
        } catch (gpxError) {
          console.error('GPX parsing error:', gpxError);
          setElevationData([]);
        }
      } else {
        console.log('No GPX data found for this route');
        setElevationData([]);
      }

    } catch (err) {
      console.error('Error loading route data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar la ruta';
      setError(errorMessage);
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

// Función auxiliar para parsear GPX y extraer puntos de elevación SIN LIMITACIÓN
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
      throw new Error('Formato GPX XML inválido');
    }
    
    const trackPoints = xmlDoc.querySelectorAll('trkpt');
    console.log('Total track points found:', trackPoints.length);
    
    if (trackPoints.length === 0) {
      console.warn('No track points found in GPX');
      return [];
    }
    
    const points: ElevationPoint[] = [];
    let totalDistance = 0;
    let previousLat: number | null = null;
    let previousLon: number | null = null;

    // PROCESAMOS TODOS LOS PUNTOS SIN LIMITACIÓN
    console.log('Processing ALL', trackPoints.length, 'points...');

    for (let index = 0; index < trackPoints.length; index++) {
      try {
        const point = trackPoints[index];
        const latStr = point.getAttribute('lat');
        const lonStr = point.getAttribute('lon');
        
        if (!latStr || !lonStr) {
          continue;
        }

        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        
        if (isNaN(lat) || isNaN(lon)) {
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

        // Log de progreso cada 1000 puntos
        if (index % 1000 === 0 && index > 0) {
          console.log(`Processed ${index} points...`);
        }
      } catch (pointError) {
        console.warn(`Error processing point ${index}:`, pointError);
        continue;
      }
    }

    console.log('Successfully processed ALL', points.length, 'elevation points');
    return points;
  } catch (error) {
    console.error('Error parsing GPX for elevation:', error);
    throw error;
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
