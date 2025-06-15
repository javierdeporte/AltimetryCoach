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
 * Phase 2 Refactored: Generates micro-segments based purely on the slope change threshold.
 * The minimum distance filter is applied in a later phase.
 */
function buildMicroSegments(
  macroSegmentData: ElevationPoint[],
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationParams,
  globalIndexOffset: number
): AdvancedSegment[] {
  if (macroSegmentData.length < 3) return [];

  const segments: AdvancedSegment[] = [];
  let startIndex = 0;

  for (let i = 2; i < macroSegmentData.length; i++) {
    const currentWindow = macroSegmentData.slice(startIndex, i);
    const lookaheadWindow = macroSegmentData.slice(i - 1, Math.min(i + 2, macroSegmentData.length));

    if (currentWindow.length < 2 || lookaheadWindow.length < 2) continue;

    const currentRegression = calculateLinearRegression(currentWindow.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
    const lookaheadRegression = calculateLinearRegression(lookaheadWindow.map(p => ({ x: p.displayDistance, y: p.displayElevation })));

    const slopeDiff = Math.abs(currentRegression.slope - lookaheadRegression.slope);
    
    // If slope changes significantly, we cut the segment, regardless of its length for now.
    if (slopeDiff > params.slopeChangeThreshold) {
      const segmentToFinalizePoints = macroSegmentData.slice(startIndex, i - 1);
      
      if (segmentToFinalizePoints.length >= 2) {
        const finalRegression = calculateLinearRegression(segmentToFinalizePoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        segments.push(createSegment(
          segmentToFinalizePoints,
          finalRegression,
          globalIndexOffset + startIndex,
          globalIndexOffset + i - 2 // end index
        ));
        startIndex = i - 1; // New segment starts where the change was detected
      }
    }
  }

  // Handle the last segment remaining in the loop.
  const lastSegmentPoints = macroSegmentData.slice(startIndex);
  if (lastSegmentPoints.length >= 2) {
    const finalRegression = calculateLinearRegression(lastSegmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
    segments.push(createSegment(
      lastSegmentPoints,
      finalRegression,
      globalIndexOffset + startIndex,
      globalIndexOffset + macroSegmentData.length - 1
    ));
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
 * Phase 3: Merges segments that are shorter than the minimum distance.
 * It iteratively finds the shortest segment and merges it with its most similar neighbor.
 */
function mergeShortSegments(
  segments: AdvancedSegment[],
  elevationData: ElevationPoint[],
  minDistance: number
): AdvancedSegment[] {
  if (segments.length < 2) return segments;

  let processedSegments = [...segments];
  let hasChanges = true;

  // We loop until no more short segments can be merged.
  while(hasChanges) {
    hasChanges = false;
    if (processedSegments.length < 2) break;

    let shortestSegmentIndex = -1;
    let shortestDistance = Infinity;

    // Find the shortest segment in the current list
    for (let i = 0; i < processedSegments.length; i++) {
      if (processedSegments[i].distance < shortestDistance) {
        shortestDistance = processedSegments[i].distance;
        shortestSegmentIndex = i;
      }
    }
    
    // If the shortest segment is below the minimum distance, we need to merge it.
    if (shortestDistance < minDistance) {
      hasChanges = true;
      const segmentToMerge = processedSegments[shortestSegmentIndex];

      // Decide which neighbor to merge with.
      let neighborIndex: number;
      if (shortestSegmentIndex === 0) {
        // First segment, merge with the one on the right
        neighborIndex = 1;
      } else if (shortestSegmentIndex === processedSegments.length - 1) {
        // Last segment, merge with the one on the left
        neighborIndex = shortestSegmentIndex - 1;
      } else {
        // Middle segment, merge with the neighbor that is most similar in slope
        const leftNeighbor = processedSegments[shortestSegmentIndex - 1];
        const rightNeighbor = processedSegments[shortestSegmentIndex + 1];
        const diffLeft = Math.abs(segmentToMerge.slope - leftNeighbor.slope);
        const diffRight = Math.abs(segmentToMerge.slope - rightNeighbor.slope);
        neighborIndex = diffLeft <= diffRight 
          ? shortestSegmentIndex - 1 
          : shortestSegmentIndex + 1;
      }

      const neighborSegment = processedSegments[neighborIndex];
      const startIndex = Math.min(segmentToMerge.startIndex, neighborSegment.startIndex);
      const endIndex = Math.max(segmentToMerge.endIndex, neighborSegment.endIndex);
      
      const combinedPointsData = elevationData.slice(startIndex, endIndex + 1);
      const regressionPoints = combinedPointsData.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      const newRegression = calculateLinearRegression(regressionPoints);
      
      const mergedSegment = createSegment(
          combinedPointsData,
          newRegression,
          startIndex,
          endIndex
      );

      // Replace the two segments (the short one and its neighbor) with the new merged one.
      const insertIndex = Math.min(shortestSegmentIndex, neighborIndex);
      processedSegments.splice(insertIndex, 2, mergedSegment);
    }
  }

  return processedSegments;
}


/**
 * Advanced hybrid segmentation using a three-phase approach.
 */
export function segmentProfileAdvanced(
  elevationData: ElevationPoint[], 
  params: AdvancedSegmentationParams
): AdvancedSegmentationResult {
  
  if (!elevationData || elevationData.length < 5) {
    return { segments: [], macroBoundaries: [] };
  }

  // Phase 1: Macro-segmentation
  const macroIndices = findSignificantExtrema(elevationData, params.macroProminence);
  
  let allMicroSegments: AdvancedSegment[] = [];

  // Phase 2: Micro-segmentation within each macro-segment
  for (let i = 0; i < macroIndices.length - 1; i++) {
    const macroStart = macroIndices[i];
    const macroEnd = macroIndices[i+1];
    
    if (macroEnd > macroStart) {
        const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
        const microSegments = buildMicroSegments(macroSegmentData, elevationData, params, macroStart);
        allMicroSegments.push(...microSegments);
    }
  }

  // Phase 3: Merge short segments to enforce minimum distance
  const finalSegments = mergeShortSegments(allMicroSegments, elevationData, params.microMinDistance);

  console.log('Generated', finalSegments.length, 'final segments after merging');
  return { segments: finalSegments, macroBoundaries: macroIndices };
}

/**
 * Default advanced segmentation parameters
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  microMinDistance: 0.5, // km
  macroProminence: 40, // meters
  slopeChangeThreshold: 0.08, // 8% grade difference
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
