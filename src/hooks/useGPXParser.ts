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
  dateSource: 'gps_metadata' | 'file' | 'manual';
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

// Función mejorada para extraer fecha de captura del GPX con detección de fuente
function extractGPXCaptureDate(xmlDoc: Document, originalFile: File): { date: Date | undefined, source: 'gps_metadata' | 'file' } {
  console.log('Analyzing GPX date sources...');
  
  // 1. Buscar en metadatos de tiempo del primer punto
  const firstTimeEl = xmlDoc.querySelector('trkpt time');
  if (firstTimeEl?.textContent) {
    const timeStr = firstTimeEl.textContent.trim();
    if (timeStr) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        console.log('Found GPS time in first track point:', timeStr);
        return { date, source: 'gps_metadata' };
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
        console.log('Found GPS time in track metadata:', timeStr);
        return { date, source: 'gps_metadata' };
      }
    }
  }

  // 3. Verificar si hay múltiples puntos con tiempo (indicativo de GPS real)
  const timeElements = xmlDoc.querySelectorAll('trkpt time');
  if (timeElements.length > 1) {
    // Si hay al menos 2 puntos con tiempo, probablemente es GPS real
    const times = Array.from(timeElements)
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .map(timeStr => new Date(timeStr!))
      .filter(date => !isNaN(date.getTime()));
    
    if (times.length >= 2) {
      // Verificar que las fechas son secuenciales y realistas
      const timeDiffs = times.slice(1).map((time, i) => time.getTime() - times[i].getTime());
      const avgDiff = timeDiffs.reduce((acc, diff) => acc + diff, 0) / timeDiffs.length;
      
      // Si el promedio de diferencia está entre 1 segundo y 1 hora, es probablemente GPS real
      if (avgDiff > 1000 && avgDiff < 3600000) {
        console.log('Found sequential GPS timestamps indicating real GPS data');
        return { date: times[0], source: 'gps_metadata' };
      }
    }
  }

  // 4. Buscar patrones de fecha en la descripción
  const descElement = xmlDoc.querySelector('trk desc, metadata desc');
  if (descElement?.textContent) {
    const desc = descElement.textContent;
    console.log('Checking description for date patterns:', desc);
    
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
          console.log('Found date pattern in description:', match[1]);
          return { date, source: 'gps_metadata' };
        }
      }
    }
  }

  // 5. Como último recurso, usar fecha de modificación del archivo
  console.log('No GPS metadata found, using file date as fallback');
  return { date: new Date(originalFile.lastModified), source: 'file' };
}

// Función para detectar automáticamente el tipo de ruta
function detectRouteType(xmlDoc: Document, dateSource: 'gps_metadata' | 'file', hasRealGPSData: boolean): string {
  const name = xmlDoc.querySelector('trk name')?.textContent?.toLowerCase() || '';
  const desc = xmlDoc.querySelector('trk desc, metadata desc')?.textContent?.toLowerCase() || '';
  
  // Palabras clave para diferentes tipos
  const raceKeywords = ['carrera', 'race', 'altimetría', 'altimetria', 'perfil', 'profile', 'competición', 'competition'];
  const planningKeywords = ['planificación', 'planificacion', 'planning', 'ruta', 'route', 'plan'];
  const trainingKeywords = ['entrenamiento', 'training', 'workout', 'run', 'corrida'];
  
  const text = `${name} ${desc}`;
  
  // Si no tiene datos GPS reales (dateSource = 'file'), probablemente es altimetría
  if (dateSource === 'file' && !hasRealGPSData) {
    // Verificar si parece altimetría de carrera
    if (raceKeywords.some(keyword => text.includes(keyword))) {
      return 'race_profile';
    }
    // Si no tiene palabras de carrera pero tampoco GPS real, podría ser planificación
    return 'route_planning';
  }
  
  // Si tiene datos GPS reales, analizar contenido
  if (raceKeywords.some(keyword => text.includes(keyword))) {
    return 'race_profile';
  }
  
  if (planningKeywords.some(keyword => text.includes(keyword)) && !trainingKeywords.some(keyword => text.includes(keyword))) {
    return 'route_planning';
  }
  
  // Por defecto, si tiene GPS real, es entrenamiento
  return hasRealGPSData ? 'training' : 'route_planning';
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

      // Extraer fecha de captura y determinar fuente
      const { date: captureDate, source: dateSource } = extractGPXCaptureDate(xmlDoc, file);

      // Verificar si hay datos GPS reales (múltiples puntos con tiempo)
      const timeElements = xmlDoc.querySelectorAll('trkpt time');
      const hasRealGPSData = timeElements.length > 1;

      // Detectar automáticamente el tipo de ruta
      const detectedRouteType = detectRouteType(xmlDoc, dateSource, hasRealGPSData);

      console.log('Route analysis:', {
        name: trackName,
        dateSource,
        hasRealGPSData,
        detectedRouteType,
        timeElementsCount: timeElements.length
      });

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
        captureDate,
        dateSource
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

      // Detectar automáticamente el tipo de ruta basado en análisis GPX
      const timeElements = originalFile.text ? (new DOMParser().parseFromString(await originalFile.text(), 'text/xml')).querySelectorAll('trkpt time') : [];
      const hasRealGPSData = timeElements.length > 1;
      
      const autoRouteType = gpxData.dateSource === 'gps_metadata' && hasRealGPSData ? 'training' : 'route_planning';

      console.log('Saving route with detected type:', autoRouteType);

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
          difficulty_level: difficulty,
          route_type: autoRouteType,
          date_source: gpxData.dateSource
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
