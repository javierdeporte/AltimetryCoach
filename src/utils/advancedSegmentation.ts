interface ElevationPoint {
  distance: number;
  elevation: number;
  displayDistance: number;
  displayElevation: number;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

interface AdvancedSegment {
  startIndex: number;
  endIndex: number;
  startPoint: ElevationPoint;
  endPoint: ElevationPoint;
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  avgGrade: number;
  type: 'asc' | 'desc' | 'hor';
  color: string;
}

interface AdvancedSegmentationParams {
  minProminence: number; // in meters
  minSegmentDistance: number; // in km
}

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
};

/**
 * Calculates linear regression for a set of points
 */
function calculateLinearRegression(points: Array<{x: number, y: number}>): RegressionResult {
  const n = points.length;
  
  if (n < 2) {
    return { 
      slope: 0, 
      intercept: points[0]?.y || 0, 
      rSquared: 1 
    };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const rNumerator = (n * sumXY - sumX * sumY);
  const rDenominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (rDenominator === 0) {
    return { slope, intercept, rSquared: 1 };
  }
  
  const r = rNumerator / rDenominator;
  const rSquared = r * r;

  return { slope, intercept, rSquared };
}

/**
 * Determines segment type based on average grade percentage
 */
function getSegmentType(avgGrade: number): 'asc' | 'desc' | 'hor' {
  if (avgGrade > 2) return 'asc';
  if (avgGrade < -2) return 'desc';
  return 'hor';
}

/**
 * Finds significant local extrema (peaks and valleys) in the elevation profile.
 * An extremum is considered significant if it has enough prominence and is far enough
 * from the last significant one.
 */
function findSignificantExtrema(
  elevationData: ElevationPoint[],
  params: { minProminence: number; minDistance: number }
): number[] {
  if (elevationData.length < 3) {
    const indices = [0, elevationData.length - 1];
    return [...new Set(indices)].filter(i => i < elevationData.length).sort((a, b) => a - b);
  }

  const localExtremaIndices: number[] = [];
  // Find all local maxima and minima
  for (let i = 1; i < elevationData.length - 1; i++) {
    const prev = elevationData[i - 1].displayElevation;
    const curr = elevationData[i].displayElevation;
    const next = elevationData[i + 1].displayElevation;
    if ((curr > prev && curr >= next) || (curr < prev && curr <= next)) {
      if (localExtremaIndices.length === 0 || elevationData[localExtremaIndices[localExtremaIndices.length - 1]].displayElevation !== curr) {
        localExtremaIndices.push(i);
      }
    }
  }

  if (localExtremaIndices.length === 0) {
    const indices = [0, elevationData.length - 1];
    return [...new Set(indices)].filter(i => i < elevationData.length).sort((a, b) => a - b);
  }

  const significantExtremaIndices: number[] = [0];
  let lastSignificantIndex = 0;

  for (const currentIndex of localExtremaIndices) {
    const lastSignificantPoint = elevationData[lastSignificantIndex];
    const currentPoint = elevationData[currentIndex];
    
    const elevationDiff = Math.abs(currentPoint.displayElevation - lastSignificantPoint.displayElevation);
    const distanceDiff = currentPoint.displayDistance - lastSignificantPoint.displayDistance;

    if (elevationDiff >= params.minProminence && distanceDiff >= params.minDistance) {
      significantExtremaIndices.push(currentIndex);
      lastSignificantIndex = currentIndex;
    }
  }

  // Ensure the last point of the route is always included as the end of the last segment.
  if (lastSignificantIndex !== elevationData.length - 1) {
    significantExtremaIndices.push(elevationData.length - 1);
  }

  // Remove duplicates and sort
  return [...new Set(significantExtremaIndices)].sort((a, b) => a - b);
}

/**
 * Advanced segmentation based on finding significant topological features (peaks/valleys).
 */
export function segmentProfileAdvanced(
  elevationData: ElevationPoint[], 
  params: AdvancedSegmentationParams
): AdvancedSegment[] {
  
  if (!elevationData || elevationData.length < 2) {
    return [];
  }

  console.log('Starting TOPOGRAPHICAL advanced segmentation with params:', params);

  const keyPointsIndices = findSignificantExtrema(elevationData, {
    minProminence: params.minProminence,
    minDistance: params.minSegmentDistance,
  });

  console.log('Found', keyPointsIndices.length, 'key points for macro-segments:', keyPointsIndices);
  
  const finalSegments: AdvancedSegment[] = [];

  for (let i = 0; i < keyPointsIndices.length - 1; i++) {
    const startIndex = keyPointsIndices[i];
    const endIndex = keyPointsIndices[i + 1];

    if (startIndex >= endIndex) continue;

    const startPoint = elevationData[startIndex];
    const endPoint = elevationData[endIndex];
    
    const distance = endPoint.displayDistance - startPoint.displayDistance;
    if (distance <= 0.01) continue; // Ignore very short/zero-distance segments

    const elevationChange = endPoint.displayElevation - startPoint.displayElevation;
    const avgGrade = (elevationChange / (distance * 1000)) * 100;
    const segmentType = getSegmentType(avgGrade);
    
    const segment: AdvancedSegment = {
      startIndex,
      endIndex,
      startPoint,
      endPoint,
      distance,
      elevationGain: elevationChange > 0 ? elevationChange : 0,
      elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
      avgGrade,
      type: segmentType,
      color: SEGMENT_COLORS[segmentType],
    };
    
    finalSegments.push(segment);
  }

  console.log('Generated', finalSegments.length, 'advanced segments');
  return finalSegments;
}

/**
 * Default advanced segmentation parameters based on topological features.
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  minProminence: 25, // meters
  minSegmentDistance: 0.5, // km
};

/**
 * Get segment type label in Spanish
 */
export function getAdvancedSegmentTypeLabel(type: 'asc' | 'desc' | 'hor'): string {
  switch (type) {
    case 'asc': return 'Ascenso';
    case 'desc': return 'Descenso';
    case 'hor': return 'Horizontal';
  }
}
