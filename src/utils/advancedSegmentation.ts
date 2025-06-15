import { ElevationPoint, AdvancedSegment, AdvancedSegmentationParams, AdvancedSegmentationResult } from './types';

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
};

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
 * Calculates the slope between two elevation points.
 * @returns {number} Slope value (e.g., 0.1 for 10%).
 */
function calculateSlope(p1: ElevationPoint, p2: ElevationPoint): number {
  const distanceDiff = p2.displayDistance - p1.displayDistance;
  if (distanceDiff === 0) return 0;
  return (p2.displayElevation - p1.displayElevation) / (distanceDiff * 1000);
}

/**
 * Creates a segment object from a set of points.
 * No longer uses linear regression.
 */
function createSegment(
  points: ElevationPoint[],
  startIndex: number,
  endIndex: number
): AdvancedSegment {
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  
  const slope = calculateSlope(startPoint, endPoint);
  const segmentType = getSegmentType(slope);
  const elevationChange = endPoint.displayElevation - startPoint.displayElevation;

  return {
    startIndex,
    endIndex,
    startPoint,
    endPoint,
    slope: slope,
    distance: endPoint.displayDistance - startPoint.displayDistance,
    elevationGain: elevationChange > 0 ? elevationChange : 0,
    elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
    type: segmentType,
    color: SEGMENT_COLORS[segmentType]
  };
}

/**
 * Phase 1: Finds significant peaks and valleys to define macro-segments.
 * (This function remains unchanged)
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
 * Phase 2 (New): Generates very small, "raw" segments that will be merged later.
 * This captures the profile's fine details before simplification.
 */
function generateRawSegments(
  macroSegmentData: ElevationPoint[],
  globalIndexOffset: number
): AdvancedSegment[] {
  const segments: AdvancedSegment[] = [];
  if (macroSegmentData.length < 2) return [];

  // Create segments from every 2 points to get maximum detail initially
  for (let i = 0; i < macroSegmentData.length - 1; i++) {
    const segmentPoints = macroSegmentData.slice(i, i + 2);
    segments.push(createSegment(
      segmentPoints,
      globalIndexOffset + i,
      globalIndexOffset + i + 1
    ));
  }
  return segments;
}

/**
 * Phase 3: Merges adjacent segments if their slopes are similar.
 * This version does not use linear regression.
 */
function mergeSimilarSegments(
  segments: AdvancedSegment[],
  slopeThreshold: number,
  elevationData: ElevationPoint[]
): AdvancedSegment[] {
    if (segments.length < 2) return segments;

    const mergedSegments: AdvancedSegment[] = [];
    let currentSegment = segments[0];

    for (let i = 1; i < segments.length; i++) {
        const nextSegment = segments[i];
        const slopeDifference = Math.abs(currentSegment.slope - nextSegment.slope);

        // Merge if types are same and slope difference is below threshold
        if (currentSegment.type === nextSegment.type && slopeDifference < slopeThreshold) {
            const combinedPointsData = elevationData.slice(currentSegment.startIndex, nextSegment.endIndex + 1);
            currentSegment = createSegment(
                combinedPointsData,
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
 * Phase 4: Consolidates segments that are shorter than the minimum distance.
 */
function consolidateShortSegments(
  segments: AdvancedSegment[],
  minDistance: number,
  elevationData: ElevationPoint[]
): AdvancedSegment[] {
  if (segments.length < 2) return segments;

  const consolidated = [...segments];

  let i = 0;
  while (i < consolidated.length) {
    if (consolidated[i].distance < minDistance) {
      // Find which neighbor to merge with (the shorter one, or left if equal)
      const leftNeighbor = i > 0 ? consolidated[i - 1] : null;
      const rightNeighbor = i < consolidated.length - 1 ? consolidated[i + 1] : null;

      let mergeWithIndex = -1;

      if (leftNeighbor && rightNeighbor) {
        mergeWithIndex = leftNeighbor.distance <= rightNeighbor.distance ? i - 1 : i;
      } else if (leftNeighbor) {
        mergeWithIndex = i - 1;
      } else if (rightNeighbor) {
        mergeWithIndex = i;
      }
      
      if (mergeWithIndex !== -1) {
        const toMergeA = consolidated[mergeWithIndex];
        const toMergeB = consolidated[mergeWithIndex + 1];
        
        const combinedPoints = elevationData.slice(toMergeA.startIndex, toMergeB.endIndex + 1);
        const newSegment = createSegment(combinedPoints, toMergeA.startIndex, toMergeB.endIndex);
        
        consolidated.splice(mergeWithIndex, 2, newSegment);
        
        // Restart scan from the beginning as lengths have changed
        i = 0; 
        continue;
      }
    }
    i++;
  }

  return consolidated;
}

/**
 * Advanced simplified segmentation using a multi-phase approach without R².
 */
export function segmentProfileAdvanced(
  elevationData: ElevationPoint[], 
  params: AdvancedSegmentationParams
): AdvancedSegmentationResult {
  
  if (!elevationData || elevationData.length < 10) {
    return { segments: [], macroBoundaries: [] };
  }

  // Phase 1: Macro-segmentation (find major peaks and valleys)
  const macroIndices = findSignificantExtrema(elevationData, params.macroProminence);
  
  let allRawSegments: AdvancedSegment[] = [];

  // Phase 2: Generate raw, high-detail segments within each macro-segment
  for (let i = 0; i < macroIndices.length - 1; i++) {
    const macroStart = macroIndices[i];
    const macroEnd = macroIndices[i+1];
    
    if (macroEnd > macroStart) {
        const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
        const rawSegments = generateRawSegments(macroSegmentData, macroStart);
        allRawSegments.push(...rawSegments);
    }
  }
  
  // Phase 3: Merge adjacent segments with similar slopes
  const mergedSegments = mergeSimilarSegments(allRawSegments, params.slopeChangeThreshold, elevationData);
  
  // Phase 4: Consolidate segments that are too short
  const finalSegments = consolidateShortSegments(mergedSegments, params.minDistance, elevationData);


  console.log('Generated', finalSegments.length, 'simplified segments.');
  return { segments: finalSegments, macroBoundaries: macroIndices };
}

/**
 * Default simplified segmentation parameters
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  minDistance: 0.5, // km
  macroProminence: 40, // meters
  slopeChangeThreshold: 0.05, // 5% grade difference
  enableExtremeHighlighting: true,
  extremeSlopeThreshold: 15, // 15%
  highlightStyle: 'dots',
};

/**
 * Detects points on the profile with a slope greater than the threshold.
 * (This function remains unchanged)
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
 * (This function remains unchanged)
 */
export function getAdvancedSegmentTypeLabel(type: 'asc' | 'desc' | 'hor'): string {
  switch (type) {
    case 'asc': return 'Ascenso';
    case 'desc': return 'Descenso';
    case 'hor': return 'Horizontal';
  }
}
