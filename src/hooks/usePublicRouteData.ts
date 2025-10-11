import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ElevationPoint } from '@/utils/types';

interface PublicRouteData {
  route: any;
  elevationData: ElevationPoint[];
  analysisType: 'experimental' | 'advanced' | 'gradient' | 'none';
  analysisParams: any;
  isLoading: boolean;
  error: string | null;
}

export const usePublicRouteData = (shareSlug: string): PublicRouteData => {
  const [data, setData] = useState<PublicRouteData>({
    route: null,
    elevationData: [],
    analysisType: 'none',
    analysisParams: {},
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (!shareSlug) {
        console.log('[usePublicRouteData] No shareSlug provided');
        return;
      }

      console.log('[usePublicRouteData] Loading route with slug:', shareSlug);
      
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Fetch shared route using RPC to bypass routes RLS safely
        const { data: payload, error } = await supabase
          .rpc('get_shared_route', { p_share_slug: shareSlug });

        if (!mounted) return;

        if (error) {
          console.error('[usePublicRouteData] RPC error:', error);
          throw error;
        }

        if (!payload) {
          console.error('[usePublicRouteData] No data returned');
          throw new Error('Ruta compartida no encontrada');
        }

        console.log('[usePublicRouteData] Data received:', payload);

        // Type assertion for RPC return value
        const payloadData = payload as any;

        if (!payloadData.routes) {
          console.error('[usePublicRouteData] No routes in payload');
          throw new Error('Ruta compartida no encontrada');
        }

        const route = payloadData.routes;
        
        // Parse GPX data for elevation profile
        const elevationData = parseGPXForElevation(route.gpx_data || '');
        console.log('[usePublicRouteData] Parsed elevation points:', elevationData.length);

        // Increment view count via RPC (best-effort, non-blocking)
        try {
          await supabase.rpc('increment_share_view', { p_share_slug: shareSlug });
        } catch (viewErr) {
          console.warn('[usePublicRouteData] Failed to increment view:', viewErr);
        }

        if (!mounted) return;

        setData({
          route,
          elevationData,
          analysisType: payloadData.analysis_type,
          analysisParams: payloadData.analysis_params || {},
          isLoading: false,
          error: null
        });

        console.log('[usePublicRouteData] Data loaded successfully');
      } catch (err) {
        console.error('[usePublicRouteData] Error loading route:', err);
        
        if (!mounted) return;
        
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Error cargando la ruta'
        }));
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [shareSlug]);

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
