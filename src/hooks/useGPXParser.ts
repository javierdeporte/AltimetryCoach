
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GPXPoint {
  lat: number;
  lon: number;
  elevation: number;
  time?: Date;
  distance?: number;
}

interface GPXData {
  points: GPXPoint[];
  totalDistance: number;
  totalElevationGain: number;
  totalElevationLoss: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  name: string;
  description?: string;
  captureDate?: Date;
}

// Función para calcular la distancia entre dos puntos
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

// Función para determinar dificultad con nuevos criterios
function calculateDifficulty(elevationGain: number): string {
  if (elevationGain < 500) return 'easy';
  if (elevationGain >= 500 && elevationGain <= 900) return 'medium';
  return 'hard';
}

// Función para extraer fecha de captura del GPX
function extractGPXCaptureDate(xmlDoc: Document, originalFile: File): Date | undefined {
  // 1. Buscar en metadatos de tiempo del primer punto
  const firstTimeEl = xmlDoc.querySelector('trkpt time');
  if (firstTimeEl?.textContent) {
    const timeStr = firstTimeEl.textContent.trim();
    if (timeStr) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // 2. Buscar en metadatos del track completo
  const trackTimeEl = xmlDoc.querySelector('trk time, metadata time');
  if (trackTimeEl?.textContent) {
    const timeStr = trackTimeEl.textContent.trim();
    if (timeStr) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // 3. Buscar patrones de fecha en la descripción
  const descElement = xmlDoc.querySelector('trk desc, metadata desc');
  if (descElement?.textContent) {
    const desc = descElement.textContent;
    // Buscar patrones comunes de fecha
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/,  // YYYY-MM-DD
      /(\d{2}\/\d{2}\/\d{4})/, // DD/MM/YYYY o MM/DD/YYYY
      /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i // DD Mon YYYY
    ];
    
    for (const pattern of datePatterns) {
      const match = desc.match(pattern);
      if (match) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }

  // 4. Usar fecha de modificación del archivo como fallback
  return new Date(originalFile.lastModified);
}

export const useGPXParser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseGPX = useCallback(async (file: File): Promise<GPXData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      
      // Verificar si hay errores en el parsing
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid GPX file format');
      }

      // Extraer nombre y descripción del track
      const trackName = xmlDoc.querySelector('trk name')?.textContent || file.name.replace('.gpx', '');
      const trackDesc = xmlDoc.querySelector('trk desc')?.textContent || '';

      // Extraer fecha de captura
      const captureDate = extractGPXCaptureDate(xmlDoc, file);

      // Extraer puntos del track
      const trackPoints = xmlDoc.querySelectorAll('trkpt');
      if (trackPoints.length === 0) {
        throw new Error('No track points found in GPX file');
      }

      const points: GPXPoint[] = [];
      let totalDistance = 0;
      let elevationGain = 0;
      let elevationLoss = 0;
      let minLat = Infinity, maxLat = -Infinity;
      let minLon = Infinity, maxLon = -Infinity;
      let lastElevation: number | null = null;

      trackPoints.forEach((point, index) => {
        const lat = parseFloat(point.getAttribute('lat') || '0');
        const lon = parseFloat(point.getAttribute('lon') || '0');
        const elevationEl = point.querySelector('ele');
        const elevation = elevationEl ? parseFloat(elevationEl.textContent || '0') : 0;
        const timeEl = point.querySelector('time');
        const time = timeEl ? new Date(timeEl.textContent || '') : undefined;

        // Calcular distancia acumulada
        if (index > 0) {
          const prevPoint = points[index - 1];
          const distance = calculateDistance(prevPoint.lat, prevPoint.lon, lat, lon);
          totalDistance += distance;
        }

        // Calcular ganancia/pérdida de elevación
        if (lastElevation !== null) {
          const elevDiff = elevation - lastElevation;
          if (elevDiff > 0) {
            elevationGain += elevDiff;
          } else {
            elevationLoss += Math.abs(elevDiff);
          }
        }
        lastElevation = elevation;

        // Actualizar bounds
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);

        points.push({
          lat,
          lon,
          elevation,
          time,
          distance: totalDistance
        });
      });

      const gpxData: GPXData = {
        points,
        totalDistance,
        totalElevationGain: elevationGain,
        totalElevationLoss: elevationLoss,
        bounds: {
          north: maxLat,
          south: minLat,
          east: maxLon,
          west: minLon
        },
        name: trackName,
        description: trackDesc,
        captureDate
      };

      setIsLoading(false);
      return gpxData;
    } catch (err) {
      console.error('GPX parsing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse GPX file');
      setIsLoading(false);
      return null;
    }
  }, []);

  const saveRouteToDatabase = useCallback(async (gpxData: GPXData, originalFile: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calcular dificultad con nuevos criterios
      const difficulty = calculateDifficulty(gpxData.totalElevationGain);

      // Guardar la ruta en la base de datos con los nuevos campos
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert({
          user_id: user.id,
          name: gpxData.name,
          description: gpxData.description,
          distance_km: gpxData.totalDistance,
          elevation_gain_m: Math.round(gpxData.totalElevationGain),
          elevation_loss_m: Math.round(gpxData.totalElevationLoss),
          gpx_capture_date: gpxData.captureDate?.toISOString(),
          gpx_data: await originalFile.text(),
          difficulty_level: difficulty
        })
        .select()
        .single();

      if (routeError) {
        throw routeError;
      }

      // Crear segmentos cada 1km aproximadamente
      const segments = [];
      const segmentDistance = 1; // 1km por segmento
      let currentDistance = 0;
      let segmentStart = 0;

      for (let i = 1; i < gpxData.points.length; i++) {
        if (gpxData.points[i].distance! - currentDistance >= segmentDistance || i === gpxData.points.length - 1) {
          const startPoint = gpxData.points[segmentStart];
          const endPoint = gpxData.points[i];
          const segmentElevGain = Math.max(0, endPoint.elevation - startPoint.elevation);
          const segmentDistance = endPoint.distance! - (gpxData.points[segmentStart].distance || 0);
          const avgGrade = segmentDistance > 0 ? ((endPoint.elevation - startPoint.elevation) / (segmentDistance * 1000)) * 100 : 0;

          segments.push({
            route_id: route.id,
            segment_index: segments.length,
            start_lat: startPoint.lat,
            start_lng: startPoint.lon,
            end_lat: endPoint.lat,
            end_lng: endPoint.lon,
            distance_km: segmentDistance,
            elevation_gain_m: Math.round(segmentElevGain),
            avg_grade_percent: Math.round(avgGrade * 100) / 100
          });

          currentDistance = endPoint.distance!;
          segmentStart = i;
        }
      }

      // Guardar segmentos
      if (segments.length > 0) {
        const { error: segmentsError } = await supabase
          .from('segments')
          .insert(segments);

        if (segmentsError) {
          console.error('Error saving segments:', segmentsError);
        }
      }

      return route;
    } catch (err) {
      console.error('Database save error:', err);
      throw err;
    }
  }, []);

  return { parseGPX, saveRouteToDatabase, isLoading, error };
};
