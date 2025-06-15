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
 * Phase 2: Generates micro-segments within a larger macro-segment based on distance.
 * These small segments will be later merged based on slope similarity.
 */
function generateMicroSegments(
  macroSegmentData: ElevationPoint[],
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationParams,
  globalIndexOffset: number
): AdvancedSegment[] {
  const segments: AdvancedSegment[] = [];
  if (macroSegmentData.length < 2) return [];

  let currentSegmentStartIndex = 0;
  for (let i = 1; i < macroSegmentData.length; i++) {
    const currentPoint = macroSegmentData[i];
    const startPoint = macroSegmentData[currentSegmentStartIndex];
    
    const segmentDistance = currentPoint.displayDistance - startPoint.displayDistance;

    // Split if distance threshold is met, or it's the last point
    const isLastPoint = i === macroSegmentData.length - 1;
    if (segmentDistance >= params.microMinDistance || isLastPoint) {
      const segmentPoints = macroSegmentData.slice(currentSegmentStartIndex, i + (isLastPoint ? 1 : 0));
      
      if (segmentPoints.length >= 2) { // Need at least 2 points for regression
        const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const regression = calculateLinearRegression(regressionPoints);
        segments.push(createSegment(
          segmentPoints,
          regression,
          globalIndexOffset + currentSegmentStartIndex,
          globalIndexOffset + i - (isLastPoint ? 0 : 1)
        ));
        currentSegmentStartIndex = i;
      }
    }
  }

  if (segments.length === 0 && macroSegmentData.length >= 2) {
      // The whole macro segment is smaller than microMinDistance, treat as one segment
      const regressionPoints = macroSegmentData.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      const regression = calculateLinearRegression(regressionPoints);
      segments.push(createSegment(macroSegmentData, regression, globalIndexOffset, globalIndexOffset + macroSegmentData.length - 1));
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

  console.log('Generated', finalSegments.length, 'hybrid segments based on slope similarity');
  return { segments: finalSegments, macroBoundaries: macroIndices };
}

/**
 * Default advanced segmentation parameters
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  minSegmentPoints: 10,
  microMinDistance: 0.1, // km
  macroProminence: 40, // meters
  slopeChangeThreshold: 0.08, // 8% grade difference
  enableExtremeHighlighting: true,
  extremeSlopeThreshold: 15, // 15%
};

/**
 * Detects points on the profile with a slope greater than the threshold.
 */
export function detectExtremeSlopePoints(
    elevationData: ElevationPoint[], 
    threshold: number
): ElevationPoint[] {
    if (elevationData.length < 2) return [];

    const extremePoints: ElevationPoint[] = [];

    for (let i = 1; i < elevationData.length; i++) {
        const p1 = elevationData[i - 1];
        const p2 = elevationData[i];

        const elevationDiff = p2.displayElevation - p1.displayElevation;
        const distanceDiff = (p2.displayDistance - p1.displayDistance) * 1000; // in meters

        if (distanceDiff > 0.1) { // Avoid noise from very close points
            const slopePercent = (elevationDiff / distanceDiff) * 100;
            if (Math.abs(slopePercent) >= threshold) {
                // Add the point that *ends* the steep segment
                extremePoints.push(p2);
            }
        }
    }
    return extremePoints;
}

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
