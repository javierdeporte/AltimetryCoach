import { ElevationPoint, AdvancedSegment, RegressionResult } from './types';

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
};

export interface AdvancedSegmentationV2Params {
  prominenciaMinima: number;     // Strategic parameter - minimum prominence for macro-segmentation
  distanciaMinima: number;       // Relevance parameter - minimum distance for segments
  diferenciaPendiente: number;   // Sensitivity parameter - minimum slope difference
}

export const DEFAULT_V2_PARAMS: AdvancedSegmentationV2Params = {
  prominenciaMinima: 40,         // meters (same as V1)
  distanciaMinima: 0.2,          // km (same as V1)
  diferenciaPendiente: 0.10      // 10% grade difference (same as V1)
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
  const slopePercent = slope * 100;
  
  if (slopePercent > 2) return 'asc';
  if (slopePercent < -2) return 'desc';
  return 'hor';
}

/**
 * Creates a segment object from a set of points and regression results
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
 * STAGE 1: Strategic Macro-Segmentation
 * Finds significant peaks and valleys based on prominence
 */
function findSignificantExtrema(
  points: ElevationPoint[],
  prominence: number
): number[] {
  if (points.length < 3) return [0, points.length > 1 ? points.length - 1 : 0];

  enum Trend { Up, Down };
  const extrema: number[] = [0];
  let trend: Trend;
  
  // Determine initial trend
  const initialCheckIndex = Math.min(10, points.length - 1);
  trend = points[initialCheckIndex].displayElevation > points[0].displayElevation ? Trend.Up : Trend.Down;

  let potentialExtremumIdx = 0;
  
  for (let i = 1; i < points.length; i++) {
    const currentPoint = points[i];
    const potentialExtremumPoint = points[potentialExtremumIdx];

    if (trend === Trend.Up) {
      if (currentPoint.displayElevation >= potentialExtremumPoint.displayElevation) {
        potentialExtremumIdx = i;
      } else {
        const drop = potentialExtremumPoint.displayElevation - currentPoint.displayElevation;
        if (drop >= prominence) {
          extrema.push(potentialExtremumIdx);
          trend = Trend.Down;
          potentialExtremumIdx = i;
        }
      }
    } else {
      if (currentPoint.displayElevation <= potentialExtremumPoint.displayElevation) {
        potentialExtremumIdx = i;
      } else {
        const climb = currentPoint.displayElevation - potentialExtremumPoint.displayElevation;
        if (climb >= prominence) {
          extrema.push(potentialExtremumIdx);
          trend = Trend.Up;
          potentialExtremumIdx = i;
        }
      }
    }
  }

  if (extrema[extrema.length - 1] !== points.length - 1) {
    extrema.push(points.length - 1);
  }

  return [...new Set(extrema)].sort((a, b) => a - b);
}

/**
 * Calculates gradient change over a future window
 */
function calculateGradientChange(
  points: ElevationPoint[],
  currentIndex: number,
  windowDistanceKm: number = 0.1
): number {
  if (currentIndex >= points.length - 1) return 0;
  
  const currentPoint = points[currentIndex];
  const targetDistance = currentPoint.displayDistance + windowDistanceKm;
  
  // Find point at target distance
  let futureIndex = currentIndex + 1;
  while (futureIndex < points.length && points[futureIndex].displayDistance < targetDistance) {
    futureIndex++;
  }
  
  if (futureIndex >= points.length) futureIndex = points.length - 1;
  if (futureIndex === currentIndex) return 0;
  
  const futurePoint = points[futureIndex];
  const elevationChange = futurePoint.displayElevation - currentPoint.displayElevation;
  const distanceChange = (futurePoint.displayDistance - currentPoint.displayDistance) * 1000; // to meters
  
  return distanceChange > 0 ? (elevationChange / distanceChange) * 100 : 0; // percentage
}

/**
 * STAGE 2A: Fast Preview Generation
 * Creates seed breakpoints using dual cut criteria within macro-segments
 */
export function generatePreviewSegments(
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationV2Params
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  if (!elevationData || elevationData.length < 10) {
    return { segments: [], macroBoundaries: [] };
  }

  // Step 1: Macro-segmentation
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  const finalSegments: AdvancedSegment[] = [];
  
  // Step 2: Generate seeds within each macro-segment
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const macroStart = macroBoundaries[i];
    const macroEnd = macroBoundaries[i + 1];
    
    if (macroEnd > macroStart) {
      const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
      const seedBreakpoints = generateSeedBreakpointsWithDualCriteria(macroSegmentData, macroStart);
      
      // Create segments from seeds
      const allLocalBreakpoints = [0, ...seedBreakpoints.map(bp => bp - macroStart), macroSegmentData.length - 1];
      
      for (let j = 0; j < allLocalBreakpoints.length - 1; j++) {
        const localStartIndex = allLocalBreakpoints[j];
        const localEndIndex = allLocalBreakpoints[j + 1];
        
        const segmentPoints = macroSegmentData.slice(localStartIndex, localEndIndex + 1);
        const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        
        if (regressionPoints.length >= 2) {
          const regression = calculateLinearRegression(regressionPoints);
          const globalStartIndex = macroStart + localStartIndex;
          const globalEndIndex = macroStart + localEndIndex;
          finalSegments.push(createSegment(segmentPoints, regression, globalStartIndex, globalEndIndex));
        }
      }
    }
  }
  
  return { segments: finalSegments, macroBoundaries };
}

/**
 * Generates seed breakpoints using dual cut criteria
 */
function generateSeedBreakpointsWithDualCriteria(
  macroSegmentData: ElevationPoint[],
  globalIndexOffset: number
): number[] {
  const R_SQUARED_THRESHOLD = 0.98;
  const GRADIENT_CHANGE_THRESHOLD = 3.0; // 3% gradient change
  const FIXED_MIN_DISTANCE = 0.2; // 200 meters in km
  
  const breakpoints: number[] = [];
  let currentStart = 0;

  while (currentStart < macroSegmentData.length - 1) {
    let currentEnd = currentStart + 1;
    
    // Grow segment while both criteria are satisfied
    while (currentEnd < macroSegmentData.length) {
      const segmentPoints = macroSegmentData.slice(currentStart, currentEnd + 1);
      const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      
      if (regressionPoints.length >= 2) {
        const regression = calculateLinearRegression(regressionPoints);
        const gradientChange = Math.abs(calculateGradientChange(macroSegmentData, currentEnd, 0.1));
        
        // Check dual criteria: R² < threshold OR gradient change > threshold
        if (regression.rSquared < R_SQUARED_THRESHOLD || gradientChange > GRADIENT_CHANGE_THRESHOLD) {
          // Validate distance with FIXED minimum (not user parameter)
          const segmentDistance = macroSegmentData[currentEnd - 1].displayDistance - macroSegmentData[currentStart].displayDistance;
          
          if (segmentDistance >= FIXED_MIN_DISTANCE) {
            breakpoints.push(globalIndexOffset + currentEnd - 1);
            currentStart = currentEnd - 1;
            break;
          }
        }
      }
      
      currentEnd++;
    }
    
    if (currentEnd >= macroSegmentData.length) {
      break;
    }
  }

  return breakpoints;
}

/**
 * STAGE 2B: Precision Refinement with Progress Callback
 * Refines breakpoints through iterative convergence
 */
export function refineSegments(
  initialBreakpoints: number[],
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationV2Params,
  progressCallback?: (progress: number) => void
): number[] {
  let currentBreakpoints = [...initialBreakpoints];
  const MAX_ITERATIONS = 30;
  let totalProcessed = 0;
  const estimatedTotal = currentBreakpoints.length * MAX_ITERATIONS; // Rough estimate

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let wasChangeMadeInThisPass = false;

    // PASS 1: Positioning ("Wiggle")
    const wiggledBreakpoints = currentBreakpoints.map((breakpoint, index) => {
      if (breakpoint <= 1 || breakpoint >= elevationData.length - 2) {
        return breakpoint;
      }
      
      const positions = [breakpoint - 1, breakpoint, breakpoint + 1];
      let bestPosition = breakpoint;
      let bestCombinedError = Infinity;
      
      for (const candidatePosition of positions) {
        if (candidatePosition <= 0 || candidatePosition >= elevationData.length - 1) {
          continue;
        }
        
        // Get adjacent breakpoints
        const prevBreakpoint = index > 0 ? currentBreakpoints[index - 1] : 0;
        const nextBreakpoint = index < currentBreakpoints.length - 1 ? currentBreakpoints[index + 1] : elevationData.length - 1;
        
        // Calculate error for segment A
        const segmentAPoints = elevationData.slice(prevBreakpoint, candidatePosition + 1);
        const segmentARegressionPoints = segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const segmentARegression = calculateLinearRegression(segmentARegressionPoints);
        
        // Calculate error for segment B
        const segmentBPoints = elevationData.slice(candidatePosition, nextBreakpoint + 1);
        const segmentBRegressionPoints = segmentBPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const segmentBRegression = calculateLinearRegression(segmentBRegressionPoints);
        
        // Combined error (lower is better)
        const combinedError = (1 - segmentARegression.rSquared) + (1 - segmentBRegression.rSquared);
        
        if (combinedError < bestCombinedError) {
          bestCombinedError = combinedError;
          bestPosition = candidatePosition;
        }
      }
      
      if (bestPosition !== breakpoint) {
        wasChangeMadeInThisPass = true;
      }
      
      return bestPosition;
    });
    
    currentBreakpoints = wiggledBreakpoints;

    // PASS 2: Validation and Elimination
    const validatedBreakpoints: number[] = [];
    
    for (let j = 0; j < currentBreakpoints.length; j++) {
      const breakpointToValidate = currentBreakpoints[j];
      
      // Get adjacent breakpoints
      const prevBreakpoint = j > 0 ? currentBreakpoints[j - 1] : 0;
      const nextBreakpoint = j < currentBreakpoints.length - 1 ? currentBreakpoints[j + 1] : elevationData.length - 1;
      
      // Get segment A (before the breakpoint)
      const segmentAPoints = elevationData.slice(prevBreakpoint, breakpointToValidate + 1);
      // Get segment B (after the breakpoint)  
      const segmentBPoints = elevationData.slice(breakpointToValidate, nextBreakpoint + 1);
      
      if (segmentAPoints.length >= 2 && segmentBPoints.length >= 2) {
        // Calculate regression for both segments
        const segmentARegression = calculateLinearRegression(segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        const segmentBRegression = calculateLinearRegression(segmentBPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        
        // Apply user criteria
        const segmentADistance = elevationData[breakpointToValidate].displayDistance - elevationData[prevBreakpoint].displayDistance;
        const isDistanceValid = segmentADistance >= params.distanciaMinima;
        
        // Convert slopes to percentage for comparison
        const segmentASlopePercent = (segmentARegression.slope / 1000) * 100;
        const segmentBSlopePercent = (segmentBRegression.slope / 1000) * 100;
        const slopeDifference = Math.abs(segmentASlopePercent - segmentBSlopePercent);
        const isSlopeChangeSignificant = slopeDifference >= (params.diferenciaPendiente * 100);

        if (isDistanceValid && isSlopeChangeSignificant) {
          validatedBreakpoints.push(breakpointToValidate);
        } else {
          wasChangeMadeInThisPass = true;
        }
      }
      
      // Update progress
      totalProcessed++;
      if (progressCallback) {
        const progress = Math.min(100, (totalProcessed / estimatedTotal) * 100);
        progressCallback(progress);
      }
    }
    
    currentBreakpoints = validatedBreakpoints;

    // Exit condition
    if (!wasChangeMadeInThisPass) {
      console.log(`V2 Convergence achieved after ${iteration + 1} iterations`);
      break;
    }
  }

  // Ensure progress reaches 100%
  if (progressCallback) {
    progressCallback(100);
  }

  return currentBreakpoints;
}

/**
 * Creates final segment objects from breakpoints
 */
function createFinalSegments(
  elevationData: ElevationPoint[],
  breakpoints: number[]
): AdvancedSegment[] {
  const segments: AdvancedSegment[] = [];
  const allBreakpoints = [0, ...breakpoints, elevationData.length - 1];
  
  for (let i = 0; i < allBreakpoints.length - 1; i++) {
    const startIndex = allBreakpoints[i];
    const endIndex = allBreakpoints[i + 1];
    
    const segmentPoints = elevationData.slice(startIndex, endIndex + 1);
    const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
    
    if (regressionPoints.length >= 2) {
      const regression = calculateLinearRegression(regressionPoints);
      segments.push(createSegment(segmentPoints, regression, startIndex, endIndex));
    }
  }
  
  return segments;
}

/**
 * Main V2 Segmentation Function (Legacy compatibility)
 */
export function segmentProfileV2(
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationV2Params
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  // For backward compatibility, just return preview segments
  return generatePreviewSegments(elevationData, params);
}