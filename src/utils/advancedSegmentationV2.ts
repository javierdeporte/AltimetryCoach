
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
  prominenciaMinima: 40,         // meters
  distanciaMinima: 0.2,          // km
  diferenciaPendiente: 0.05      // 5% grade difference
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
 * ETAPA 1: Macro-Segmentación Estratégica
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
 * Sub-Paso A: Generación de Semillas Inteligentes
 * Creates initial breakpoint candidates using double-criterion detection
 */
function findInitialBreakpoints(points: ElevationPoint[]): number[] {
  const R_SQUARED_THRESHOLD = 0.98;
  const GRADIENT_CHANGE_THRESHOLD = 0.03; // 3%
  const HORIZON_WINDOW_KM = 0.1; // 100 meters
  const MIN_SEED_DISTANCE_KM = 0.1; // 100 meters minimum for seed validation
  
  const breakpoints: number[] = [];
  let currentStart = 0;

  while (currentStart < points.length - 1) {
    let currentEnd = currentStart + 1;
    
    // Grow segment until one of the double criteria is met
    while (currentEnd < points.length) {
      const segmentPoints = points.slice(currentStart, currentEnd + 1);
      const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      
      if (regressionPoints.length >= 2) {
        const regression = calculateLinearRegression(regressionPoints);
        
        // Criterion 1: R² threshold
        const linearityBreak = regression.rSquared < R_SQUARED_THRESHOLD;
        
        // Criterion 2: Future gradient change
        let gradientBreak = false;
        if (currentEnd < points.length - 1) {
          const currentPoint = points[currentEnd];
          const futurePoint = points.find(p => 
            p.displayDistance >= currentPoint.displayDistance + HORIZON_WINDOW_KM
          ) || points[points.length - 1];
          
          if (futurePoint && futurePoint !== currentPoint) {
            const currentSlope = regression.slope / 1000; // Convert to percentage
            const futureSlope = (futurePoint.displayElevation - currentPoint.displayElevation) / 
                               ((futurePoint.displayDistance - currentPoint.displayDistance) * 1000);
            
            gradientBreak = Math.abs(currentSlope - futureSlope) > GRADIENT_CHANGE_THRESHOLD;
          }
        }
        
        // If either criterion is met, validate distance and create breakpoint
        if (linearityBreak || gradientBreak) {
          const segmentDistance = points[currentEnd - 1].displayDistance - points[currentStart].displayDistance;
          
          if (segmentDistance >= MIN_SEED_DISTANCE_KM) {
            breakpoints.push(currentEnd - 1);
            currentStart = currentEnd - 1;
            break;
          }
        }
      }
      
      currentEnd++;
    }
    
    // If we reached the end without breaking, finish
    if (currentEnd >= points.length) {
      break;
    }
  }

  return breakpoints;
}

/**
 * Sub-Paso B: Refinamiento por Convergencia
 * Implements the convergence refinement algorithm
 */
function calculateOptimalBreakpoints(
  points: ElevationPoint[], 
  initialBreakpoints: number[],
  params: AdvancedSegmentationV2Params
): number[] {
  let currentBreakpoints = [...initialBreakpoints];
  const MAX_ITERATIONS = 30;

  console.log('Starting convergence refinement with', currentBreakpoints.length, 'initial breakpoints');

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let wasChangeMadeInThisPass = false;

    // Pasada de Posicionamiento ("Wiggle")
    const wiggledBreakpoints = currentBreakpoints.map((breakpoint, index) => {
      // Skip boundary breakpoints that can't be moved safely
      if (breakpoint <= 1 || breakpoint >= points.length - 2) {
        return breakpoint;
      }
      
      const positions = [breakpoint - 1, breakpoint, breakpoint + 1];
      let bestPosition = breakpoint;
      let bestCombinedError = Infinity;
      
      for (const candidatePosition of positions) {
        if (candidatePosition <= 0 || candidatePosition >= points.length - 1) {
          continue;
        }
        
        // Get adjacent breakpoints
        const prevBreakpoint = index > 0 ? currentBreakpoints[index - 1] : 0;
        const nextBreakpoint = index < currentBreakpoints.length - 1 ? currentBreakpoints[index + 1] : points.length - 1;
        
        // Calculate error for segment A (before the candidate position)
        const segmentAPoints = points.slice(prevBreakpoint, candidatePosition + 1);
        const segmentARegressionPoints = segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const segmentARegression = calculateLinearRegression(segmentARegressionPoints);
        
        // Calculate error for segment B (after the candidate position)
        const segmentBPoints = points.slice(candidatePosition, nextBreakpoint + 1);
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

    // Pasada de Validación y Eliminación
    const validatedBreakpoints: number[] = [];
    
    for (let j = 0; j < currentBreakpoints.length; j++) {
      const breakpointToValidate = currentBreakpoints[j];
      
      // Get adjacent breakpoints
      const prevBreakpoint = j > 0 ? currentBreakpoints[j - 1] : 0;
      const nextBreakpoint = j < currentBreakpoints.length - 1 ? currentBreakpoints[j + 1] : points.length - 1;
      
      // Get segment A (before the breakpoint)
      const segmentAPoints = points.slice(prevBreakpoint, breakpointToValidate + 1);
      // Get segment B (after the breakpoint)  
      const segmentBPoints = points.slice(breakpointToValidate, nextBreakpoint + 1);
      
      if (segmentAPoints.length >= 2 && segmentBPoints.length >= 2) {
        // Calculate regression for both segments
        const segmentARegression = calculateLinearRegression(segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        const segmentBRegression = calculateLinearRegression(segmentBPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        
        // Apply user criteria
        const segmentADistance = points[breakpointToValidate].displayDistance - points[prevBreakpoint].displayDistance;
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
    }
    
    currentBreakpoints = validatedBreakpoints;

    // Check for convergence
    if (!wasChangeMadeInThisPass) {
      console.log(`Convergence achieved after ${iteration + 1} iterations`);
      break;
    }
  }

  console.log('Final breakpoints:', currentBreakpoints.length);
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
 * Main macro-segmentation function - shows immediate linear regression for each macro-segment
 */
export function getMacroSegments(
  elevationData: ElevationPoint[],
  prominenciaMinima: number
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  if (!elevationData || elevationData.length < 10) {
    return { segments: [], macroBoundaries: [] };
  }

  // Get macro boundaries
  const macroBoundaries = findSignificantExtrema(elevationData, prominenciaMinima);
  
  // Create macro-segments with immediate linear regression
  const segments: AdvancedSegment[] = [];
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const startIndex = macroBoundaries[i];
    const endIndex = macroBoundaries[i + 1];
    const segmentPoints = elevationData.slice(startIndex, endIndex + 1);
    const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
    
    if (regressionPoints.length >= 2) {
      const regression = calculateLinearRegression(regressionPoints);
      segments.push(createSegment(segmentPoints, regression, startIndex, endIndex));
    }
  }
  
  return { segments, macroBoundaries };
}

/**
 * Main refinement function - executes the heavy calculation once
 */
export function executeRefinement(
  elevationData: ElevationPoint[],
  macroBoundaries: number[],
  params: AdvancedSegmentationV2Params
): number[] {
  console.log('Executing refinement calculation...');
  
  const allOptimalBreakpoints: number[] = [];
  
  // Process each macro-segment independently
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const macroStart = macroBoundaries[i];
    const macroEnd = macroBoundaries[i + 1];
    
    if (macroEnd > macroStart) {
      const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
      
      // Sub-Paso A: Generación de Semillas Inteligentes
      const seedBreakpoints = findInitialBreakpoints(macroSegmentData);
      
      // Convert to global indices
      const globalSeedBreakpoints = seedBreakpoints.map(bp => bp + macroStart);
      
      // Sub-Paso B: Refinamiento por Convergencia
      const optimalBreakpoints = calculateOptimalBreakpoints(
        elevationData, 
        globalSeedBreakpoints, 
        params
      );
      
      allOptimalBreakpoints.push(...optimalBreakpoints);
    }
  }
  
  return allOptimalBreakpoints.sort((a, b) => a - b);
}

/**
 * Apply visual filters to existing optimal breakpoints
 */
export function applyVisualFilters(
  elevationData: ElevationPoint[],
  optimalBreakpoints: number[],
  params: AdvancedSegmentationV2Params
): AdvancedSegment[] {
  // Filter breakpoints based on current slider values
  const filteredBreakpoints: number[] = [];
  const allBreakpoints = [0, ...optimalBreakpoints, elevationData.length - 1];
  
  for (let i = 1; i < allBreakpoints.length - 1; i++) {
    const breakpoint = allBreakpoints[i];
    const prevBreakpoint = allBreakpoints[i - 1];
    const nextBreakpoint = allBreakpoints[i + 1];
    
    // Check distance criterion
    const segmentDistance = elevationData[breakpoint].displayDistance - elevationData[prevBreakpoint].displayDistance;
    const isDistanceValid = segmentDistance >= params.distanciaMinima;
    
    // Check slope difference criterion
    const segmentAPoints = elevationData.slice(prevBreakpoint, breakpoint + 1);
    const segmentBPoints = elevationData.slice(breakpoint, nextBreakpoint + 1);
    
    if (segmentAPoints.length >= 2 && segmentBPoints.length >= 2) {
      const segmentARegression = calculateLinearRegression(segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
      const segmentBRegression = calculateLinearRegression(segmentBPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
      
      const segmentASlopePercent = (segmentARegression.slope / 1000) * 100;
      const segmentBSlopePercent = (segmentBRegression.slope / 1000) * 100;
      const slopeDifference = Math.abs(segmentASlopePercent - segmentBSlopePercent);
      const isSlopeChangeSignificant = slopeDifference >= (params.diferenciaPendiente * 100);
      
      if (isDistanceValid && isSlopeChangeSignificant) {
        filteredBreakpoints.push(breakpoint);
      }
    }
  }
  
  return createFinalSegments(elevationData, filteredBreakpoints);
}

/**
 * Legacy function - kept for backward compatibility but redirects to new architecture
 */
export function segmentProfileV2(
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationV2Params
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  // This function is now just a wrapper that calls the macro-segmentation
  return getMacroSegments(elevationData, params.prominenciaMinima);
}
