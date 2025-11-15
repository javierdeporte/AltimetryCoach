import { useMemo } from 'react';
import { segmentProfileV2 } from '@/utils/advancedSegmentationV2';
import { segmentProfileAdvanced } from '@/utils/advancedSegmentation';
import { segmentProfileGradient } from '@/utils/gradientSegmentation';
import { ElevationPoint, AdvancedSegment } from '@/utils/types';

interface SegmentAnalysisResult {
  segments: AdvancedSegment[];
  macroBoundaries: number[];
}

export const useSegmentAnalysis = (
  elevationData: ElevationPoint[],
  analysisType: string,
  analysisParams: any
): SegmentAnalysisResult => {
  return useMemo(() => {
    if (!elevationData?.length) {
      return { segments: [], macroBoundaries: [] };
    }

    try {
      switch (analysisType) {
        case 'experimental': {
          const result = segmentProfileV2(elevationData, analysisParams);
          return {
            segments: result.segments || [],
            macroBoundaries: result.macroBoundaries || [],
          };
        }
        case 'advanced': {
          const result = segmentProfileAdvanced(elevationData, analysisParams);
          return {
            segments: result.segments || [],
            macroBoundaries: result.macroBoundaries || [],
          };
        }
        case 'gradient': {
          const result = segmentProfileGradient(elevationData, analysisParams);
          return {
            segments: result.segments || [],
            macroBoundaries: result.macroBoundaries || [],
          };
        }
        default:
          return { segments: [], macroBoundaries: [] };
      }
    } catch (error) {
      console.error('Error in segment analysis:', error);
      return { segments: [], macroBoundaries: [] };
    }
  }, [elevationData, analysisType, analysisParams]);
};
