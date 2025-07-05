
import { ElevationPoint, AdvancedSegment, AdvancedSegmentationParams } from './types';

export interface AdvancedSegmentationParamsV2 {
  macroProminence: number;
  slopeChangeThreshold: number;
  microMinDistance: number;
  minSegmentPoints: number;
  highlightSlopeThreshold: number;
}

export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS_V2: AdvancedSegmentationParamsV2 = {
  macroProminence: 50,
  slopeChangeThreshold: 3.0, // Changed to percentage for better UX
  microMinDistance: 0.3,
  minSegmentPoints: 15,
  highlightSlopeThreshold: 12.0 // Threshold for tactical highlighting
};

export function segmentProfileAdvancedV2(
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationParamsV2
): {
  segments: AdvancedSegment[];
  macroBoundaries: number[];
  tacticalHighlights: { startIndex: number; endIndex: number; maxSlope: number }[];
} {
  if (elevationData.length < 3) {
    return { segments: [], macroBoundaries: [], tacticalHighlights: [] };
  }

  console.log('Starting V2 Advanced Segmentation with params:', params);

  // Step 1: Calculate slopes between consecutive points
  const slopes: number[] = [];
  for (let i = 1; i < elevationData.length; i++) {
    const elevationDiff = elevationData[i].elevation - elevationData[i - 1].elevation;
    const distanceDiff = (elevationData[i].distance - elevationData[i - 1].distance) * 1000; // to meters
    const slope = distanceDiff > 0 ? (elevationDiff / distanceDiff) * 100 : 0;
    slopes.push(slope);
  }

  // Step 2: Find macro-boundaries using prominence
  const macroBoundaries = findMacroBoundariesV2(elevationData, params.macroProminence);
  console.log('V2 Macro boundaries found:', macroBoundaries);

  // Step 3: Micro-segmentation within each macro-segment
  const allSegments: AdvancedSegment[] = [];
  
  for (let macroIndex = 0; macroIndex < macroBoundaries.length - 1; macroIndex++) {
    const macroStart = macroBoundaries[macroIndex];
    const macroEnd = macroBoundaries[macroIndex + 1];
    
    const microSegments = findMicroSegmentsV2(
      elevationData,
      slopes,
      macroStart,
      macroEnd,
      params
    );
    
    allSegments.push(...microSegments);
  }

  // Step 4: Find tactical highlights (steep sections)
  const tacticalHighlights = findTacticalHighlights(elevationData, slopes, params.highlightSlopeThreshold);

  console.log('V2 Segmentation complete:', {
    totalSegments: allSegments.length,
    macroBoundaries: macroBoundaries.length,
    tacticalHighlights: tacticalHighlights.length
  });

  return {
    segments: allSegments,
    macroBoundaries,
    tacticalHighlights
  };
}

function findMacroBoundariesV2(elevationData: ElevationPoint[], prominence: number): number[] {
  const boundaries = [0]; // Always start with first point
  
  // Find significant peaks and valleys
  for (let i = 2; i < elevationData.length - 2; i++) {
    const current = elevationData[i].elevation;
    const prev = elevationData[i - 1].elevation;
    const next = elevationData[i + 1].elevation;
    
    // Check if it's a local peak or valley
    const isPeak = current > prev && current > next;
    const isValley = current < prev && current < next;
    
    if (isPeak || isValley) {
      // Check prominence
      let leftMin = current;
      let rightMin = current;
      
      // Look backwards for minimum
      for (let j = i - 1; j >= 0; j--) {
        leftMin = Math.min(leftMin, elevationData[j].elevation);
      }
      
      // Look forwards for minimum
      for (let j = i + 1; j < elevationData.length; j++) {
        rightMin = Math.min(rightMin, elevationData[j].elevation);
      }
      
      const actualProminence = Math.abs(current - Math.max(leftMin, rightMin));
      
      if (actualProminence >= prominence) {
        boundaries.push(i);
      }
    }
  }
  
  boundaries.push(elevationData.length - 1); // Always end with last point
  return [...new Set(boundaries)].sort((a, b) => a - b);
}

function findMicroSegmentsV2(
  elevationData: ElevationPoint[],
  slopes: number[],
  startIndex: number,
  endIndex: number,
  params: AdvancedSegmentationParamsV2
): AdvancedSegment[] {
  const segments: AdvancedSegment[] = [];
  let currentStart = startIndex;
  
  for (let i = startIndex + 1; i < endIndex; i++) {
    const shouldSplit = shouldSplitAtPointV2(slopes, currentStart, i, params);
    
    if (shouldSplit || i === endIndex - 1) {
      const actualEnd = i === endIndex - 1 ? endIndex : i;
      
      // Validate segment meets minimum requirements
      if (actualEnd - currentStart >= params.minSegmentPoints) {
        const distance = elevationData[actualEnd].distance - elevationData[currentStart].distance;
        
        if (distance >= params.microMinDistance) {
          const segment = createSegmentV2(elevationData, currentStart, actualEnd);
          segments.push(segment);
          currentStart = actualEnd;
        }
      }
    }
  }
  
  // Ensure we have at least one segment
  if (segments.length === 0) {
    const segment = createSegmentV2(elevationData, startIndex, endIndex);
    segments.push(segment);
  }
  
  return segments;
}

function shouldSplitAtPointV2(
  slopes: number[],
  startIndex: number,
  currentIndex: number,
  params: AdvancedSegmentationParamsV2
): boolean {
  if (currentIndex - startIndex < 3) return false;
  
  // Calculate average slope of current segment
  const segmentSlopes = slopes.slice(startIndex, currentIndex);
  const avgSlope = segmentSlopes.reduce((sum, slope) => sum + slope, 0) / segmentSlopes.length;
  
  // Calculate slope at current point
  const currentSlope = slopes[currentIndex - 1];
  
  // Check if slope change exceeds threshold
  const slopeChange = Math.abs(currentSlope - avgSlope);
  
  return slopeChange > params.slopeChangeThreshold;
}

function createSegmentV2(
  elevationData: ElevationPoint[],
  startIndex: number,
  endIndex: number
): AdvancedSegment {
  const startPoint = elevationData[startIndex];
  const endPoint = elevationData[endIndex];
  
  const distance = endPoint.distance - startPoint.distance;
  const elevationChange = endPoint.elevation - startPoint.elevation;
  
  // Calculate linear regression for informational R²
  const xValues = [];
  const yValues = [];
  
  for (let i = startIndex; i <= endIndex; i++) {
    xValues.push(elevationData[i].distance);
    yValues.push(elevationData[i].elevation);
  }
  
  const { slope, intercept, rSquared } = calculateLinearRegression(xValues, yValues);
  
  // Determine segment type based on elevation change
  let type: 'asc' | 'desc' | 'hor' = 'hor';
  const grade = distance > 0 ? (elevationChange / (distance * 1000)) * 100 : 0;
  
  if (Math.abs(grade) > 1) {
    type = grade > 0 ? 'asc' : 'desc';
  }
  
  const color = type === 'asc' ? '#10b981' : type === 'desc' ? '#3b82f6' : '#6b7280';
  
  return {
    startIndex,
    endIndex,
    startPoint: { ...startPoint, displayDistance: startPoint.distance, displayElevation: startPoint.elevation },
    endPoint: { ...endPoint, displayDistance: endPoint.distance, displayElevation: endPoint.elevation },
    distance,
    elevationGain: elevationChange > 0 ? elevationChange : 0,
    elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
    slope,
    intercept,
    rSquared,
    type,
    color
  };
}

function findTacticalHighlights(
  elevationData: ElevationPoint[],
  slopes: number[],
  threshold: number
): { startIndex: number; endIndex: number; maxSlope: number }[] {
  const highlights: { startIndex: number; endIndex: number; maxSlope: number }[] = [];
  let currentStart = -1;
  let maxSlope = 0;
  
  for (let i = 0; i < slopes.length; i++) {
    const absSlope = Math.abs(slopes[i]);
    
    if (absSlope > threshold) {
      if (currentStart === -1) {
        currentStart = i;
        maxSlope = absSlope;
      } else {
        maxSlope = Math.max(maxSlope, absSlope);
      }
    } else {
      if (currentStart !== -1) {
        highlights.push({
          startIndex: currentStart,
          endIndex: i,
          maxSlope
        });
        currentStart = -1;
        maxSlope = 0;
      }
    }
  }
  
  // Handle case where highlight continues to the end
  if (currentStart !== -1) {
    highlights.push({
      startIndex: currentStart,
      endIndex: slopes.length,
      maxSlope
    });
  }
  
  return highlights;
}

function calculateLinearRegression(xValues: number[], yValues: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = xValues.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return { slope, intercept, rSquared: Math.max(0, Math.min(1, rSquared)) };
}
