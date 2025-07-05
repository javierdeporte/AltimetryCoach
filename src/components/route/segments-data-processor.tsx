
import React from 'react';
import { AdvancedSegment } from '@/utils/types';

interface Segment {
  id: string;
  segment_index: number;
  distance_km: number;
  elevation_gain_m: number;
  avg_grade_percent: number;
}

interface DisplaySegment {
  id: string;
  segment_index: number;
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  avg_grade_percent: number;
  rSquared: number | null;
  type: string | null;
}

// Calcular pérdida de elevación estimada para segmentos básicos
function calculateElevationLoss(segment: Segment) {
  if (segment.avg_grade_percent < 0) {
    return Math.abs((segment.avg_grade_percent / 100) * segment.distance_km * 1000);
  }
  return Math.round(segment.distance_km * 5);
}

export const useProcessedSegments = (
  isAdvancedMode: boolean,
  advancedSegments: AdvancedSegment[],
  segments: Segment[]
): DisplaySegment[] => {
  return React.useMemo(() => {
    if (isAdvancedMode && advancedSegments.length > 0) {
      return advancedSegments.map((advSeg, index) => {
        const distance = advSeg.distance;
        const elevationGain = advSeg.elevationGain;
        const elevationLoss = advSeg.elevationLoss;
        
        // Calculate grade correctly from elevation change and distance
        // slope from regression is in elevation/distance (km), convert to percentage
        // For coherent gradient calculation: (elevation_change_m / distance_m) * 100
        const elevationChange = advSeg.endPoint.displayElevation - advSeg.startPoint.displayElevation;
        const distanceInMeters = distance * 1000; // Convert km to meters
        const gradePercent = distanceInMeters > 0 ? (elevationChange / distanceInMeters) * 100 : 0;
        
        return {
          id: `advanced-${index}`,
          segment_index: index,
          distance_km: distance,
          elevation_gain_m: elevationGain,
          elevation_loss_m: elevationLoss,
          avg_grade_percent: gradePercent,
          rSquared: advSeg.rSquared,
          type: advSeg.type
        };
      });
    }
    
    return segments.map(seg => ({
      ...seg,
      elevation_loss_m: calculateElevationLoss(seg),
      rSquared: null,
      type: null
    }));
  }, [isAdvancedMode, advancedSegments, segments]);
};
