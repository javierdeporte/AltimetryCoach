import { ElevationPoint, AdvancedSegment, AdvancedSegmentationParams, RegressionResult, AdvancedSegmentationResult } from './types';

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
 * Determines segment type based on slope
 */
function getSegmentType(slope: number): 'asc' | 'desc' | 'hor' {
  // Convert slope to percentage for easier interpretation
  const slopePercent = slope * 100;
  
  if (slopePercent > 2) return 'asc';
  if (slopePercent < -2) return 'desc';
  return 'hor';
}

/**
 * Creates a segment object from a set of points and regression results.
 * The startIndex and endIndex are relative to the entire elevationData array.
 */
function createSegment(
  points: ElevationPoint[],
  regression: RegressionResult,
  startIndex: number,
  endIndex: number
): AdvancedSegment {
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const segmentType = getSegmentType(regression.slope);
  const elevationChange = endPoint.displayElevation - startPoint.displayElevation;

  return {
    startIndex,
    endIndex,
    startPoint,
    endPoint,
    slope: regression.slope,
    intercept: regression.intercept,
    rSquared: regression.rSquared,
    distance: endPoint.displayDistance - startPoint.displayDistance,
    elevationGain: elevationChange > 0 ? elevationChange : 0,
    elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
    type: segmentType,
    color: SEGMENT_COLORS[segmentType]
  };
}

/**
 * Phase 2: Generates micro-segments within a larger macro-segment using a growing window with R² quality control.
 */
function generateMicroSegments(
  macroSegmentData: ElevationPoint[],
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationParams,
  globalIndexOffset: number
): AdvancedSegment[] {
  const segments: AdvancedSegment[] = [];
  let currentSegmentStartIndex = 0;

  if (macroSegmentData.length < params.minSegmentPoints) {
    if (macroSegmentData.length >= 2) {
      const points = macroSegmentData.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      const regression = calculateLinearRegression(points);
      segments.push(createSegment(macroSegmentData, regression, globalIndexOffset, globalIndexOffset + macroSegmentData.length - 1));
    }
    return segments;
  }
  
  for (let i = 2; i < macroSegmentData.length; i++) {
    const windowPoints = macroSegmentData.slice(currentSegmentStartIndex, i + 1);
    const regressionPoints = windowPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));

    if (regressionPoints.length < 2) continue;

    const regression = calculateLinearRegression(regressionPoints);
    const isQualityPoor = regression.rSquared < params.rSquaredThreshold;

    if (isQualityPoor) {
      const finalSegmentPoints = macroSegmentData.slice(currentSegmentStartIndex, i);
      const finalSegmentDistance = finalSegmentPoints[finalSegmentPoints.length - 1].displayDistance - finalSegmentPoints[0].displayDistance;

      if (finalSegmentPoints.length >= params.minSegmentPoints && finalSegmentDistance >= params.microMinDistance) {
        const finalRegressionPoints = finalSegmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const finalRegression = calculateLinearRegression(finalRegressionPoints);
        
        segments.push(createSegment(
          finalSegmentPoints,
          finalRegression,
          globalIndexOffset + currentSegmentStartIndex,
          globalIndexOffset + i - 1
        ));
        
        currentSegmentStartIndex = i - 1;
      }
    }
  }

  // Handle the last segment of the macro-segment
  if (currentSegmentStartIndex < macroSegmentData.length - 1) {
    const lastSegmentPoints = macroSegmentData.slice(currentSegmentStartIndex);
    const lastSegmentDistance = lastSegmentPoints[lastSegmentPoints.length - 1].displayDistance - lastSegmentPoints[0].displayDistance;
    
    if (lastSegmentPoints.length >= params.minSegmentPoints && lastSegmentDistance >= params.microMinDistance) {
      const lastRegressionPoints = lastSegmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      const lastRegression = calculateLinearRegression(lastRegressionPoints);
      
      segments.push(createSegment(
        lastSegmentPoints,
        lastRegression,
        globalIndexOffset + currentSegmentStartIndex,
        globalIndexOffset + macroSegmentData.length - 1
      ));
    } else if (segments.length > 0) {
      // If the last remaining part is too small, merge it with the previous segment.
      const lastFinalSegment = segments[segments.length - 1];
      const combinedPoints = elevationData.slice(lastFinalSegment.startIndex, globalIndexOffset + macroSegmentData.length - 1 + 1);
      const combinedRegressionPoints = combinedPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      const combinedRegression = calculateLinearRegression(combinedRegressionPoints);
      segments[segments.length - 1] = createSegment(
        combinedPoints,
        combinedRegression,
        lastFinalSegment.startIndex,
        globalIndexOffset + macroSegmentData.length - 1
      );
    }
  }

  return segments;
}


/**
 * Phase 1: Finds significant peaks and valleys to define macro-segments based on trend reversals.
 * This version identifies peaks/valleys based on significant elevation changes from a trend.
 */
function findSignificantExtrema(
  points: ElevationPoint[],
  prominence: number
): number[] {
  if (points.length < 3) return [0, points.length > 1 ? points.length - 1 : 0];

  enum Trend { Up, Down };
  const extrema: number[] = [0];
  let trend: Trend;
  
  // Determine initial trend based on the first few points.
  const initialCheckIndex = Math.min(10, points.length - 1);
  trend = points[initialCheckIndex].displayElevation > points[0].displayElevation ? Trend.Up : Trend.Down;

  let potentialExtremumIdx = 0;
  
  for (let i = 1; i < points.length; i++) {
    const currentPoint = points[i];
    const potentialExtremumPoint = points[potentialExtremumIdx];

    if (trend === Trend.Up) { // Looking for a peak
      if (currentPoint.displayElevation >= potentialExtremumPoint.displayElevation) {
        // Still climbing, this is our new candidate for the peak.
        potentialExtremumIdx = i;
      } else {
        // Trend is reversing. Check if the drop is significant enough to confirm the peak.
        const drop = potentialExtremumPoint.displayElevation - currentPoint.displayElevation;
        if (drop >= prominence) {
          extrema.push(potentialExtremumIdx);
          trend = Trend.Down; // Switch to looking for a valley.
          potentialExtremumIdx = i; // This point starts the new descending trend.
        }
      }
    } else { // Trend.Down, looking for a valley
      if (currentPoint.displayElevation <= potentialExtremumPoint.displayElevation) {
        // Still descending, this is our new candidate for the valley.
        potentialExtremumIdx = i;
      } else {
        // Trend is reversing. Check if the climb is significant enough to confirm the valley.
        const climb = currentPoint.displayElevation - potentialExtremumPoint.displayElevation;
        if (climb >= prominence) {
          extrema.push(potentialExtremumIdx);
          trend = Trend.Up; // Switch to looking for a peak.
          potentialExtremumIdx = i; // This point starts the new ascending trend.
        }
      }
    }
  }

  // Add the very last point of the route to complete the final segment.
  if (extrema[extrema.length - 1] !== points.length - 1) {
    extrema.push(points.length - 1);
  }

  // Final cleanup: remove duplicates and sort.
  return [...new Set(extrema)].sort((a, b) => a - b);
}


/**
 * Phase 3: Merges adjacent micro-segments if their slopes are similar.
 */
function mergeSimilarSegments(
  segments: AdvancedSegment[],
  elevationData: ElevationPoint[],
  slopeThreshold: number
): AdvancedSegment[] {
    if (segments.length < 2) return segments;

    const mergedSegments: AdvancedSegment[] = [];
    let currentSegment = segments[0];

    for (let i = 1; i < segments.length; i++) {
        const nextSegment = segments[i];
        const slopeDifference = Math.abs(currentSegment.slope - nextSegment.slope);

        // Merge if types are the same and slope difference is below threshold
        if (currentSegment.type === nextSegment.type && slopeDifference < slopeThreshold) {
            const combinedPointsData = elevationData.slice(currentSegment.startIndex, nextSegment.endIndex + 1);
            const regressionPoints = combinedPointsData.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
            const newRegression = calculateLinearRegression(regressionPoints);
            
            currentSegment = createSegment(
                combinedPointsData,
                newRegression,
                currentSegment.startIndex,
                nextSegment.endIndex
            );
        } else {
            mergedSegments.push(currentSegment);
            currentSegment = nextSegment;
        }
    }
    mergedSegments.push(currentSegment);
    return mergedSegments;
}


/**
 * Advanced hybrid segmentation using a three-phase approach.
 */
export function segmentProfileAdvanced(
  elevationData: ElevationPoint[], 
  params: AdvancedSegmentationParams
): AdvancedSegmentationResult {
  
  if (!elevationData || elevationData.length < params.minSegmentPoints) {
    return { segments: [], macroBoundaries: [] };
  }

  // Phase 1: Macro-segmentation
  const macroIndices = findSignificantExtrema(elevationData, params.macroProminence);
  
  let allMicroSegments: AdvancedSegment[] = [];

  // Phase 2: Micro-segmentation within each macro-segment
  for (let i = 0; i < macroIndices.length - 1; i++) {
    const macroStart = macroIndices[i];
    const macroEnd = macroIndices[i+1];
    
    // Ensure the slice is not empty or too small
    if (macroEnd > macroStart) {
        const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
        const microSegments = generateMicroSegments(macroSegmentData, elevationData, params, macroStart);
        allMicroSegments.push(...microSegments);
    }
  }

  // Phase 3: Merge similar adjacent micro-segments
  const finalSegments = mergeSimilarSegments(allMicroSegments, elevationData, params.slopeChangeThreshold);

  console.log('Generated', finalSegments.length, 'hybrid segments');
  return { segments: finalSegments, macroBoundaries: macroIndices };
}

/**
 * Default advanced segmentation parameters
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  rSquaredThreshold: 0.92,
  minSegmentPoints: 20,
  microMinDistance: 0.2, // km
  macroProminence: 40, // meters
  slopeChangeThreshold: 0.10, // 10% grade difference
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
