import { useMemo } from 'react';
import { ElevationPoint } from '@/utils/types';

interface RouteData {
  distance_km?: number;
  elevation_gain_m?: number;
  elevation_loss_m?: number;
  difficulty_level?: string;
}

export const useRouteCalculations = (route: RouteData | null, elevationData: ElevationPoint[]) => {
  return useMemo(() => {
    if (!route) {
      return {
        totalElevationLoss: 0,
        maxElevation: 0,
        minElevation: 0,
        estimatedTime: '0h 0m',
      };
    }

    // Calculate elevation loss
    const totalElevationLoss = route.elevation_loss_m || elevationData.reduce((acc, point, index) => {
      if (index === 0) return 0;
      const diff = point.elevation - elevationData[index - 1].elevation;
      return acc + (diff < 0 ? Math.abs(diff) : 0);
    }, 0);

    // Calculate max and min elevations
    const elevations = elevationData.map(p => p.elevation);
    const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 0;
    const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;

    // Calculate estimated time (5 km/h average pace)
    const distanceKm = route.distance_km || 0;
    const minutes = (distanceKm / 5) * 60;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    const estimatedTime = `${hours}h ${mins}m`;

    return {
      totalElevationLoss,
      maxElevation,
      minElevation,
      estimatedTime,
    };
  }, [route, elevationData]);
};
