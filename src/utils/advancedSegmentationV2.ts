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
  prominenciaMinima: 30,         // meters
  distanciaMinima: 0.15,         // km
  diferenciaPendiente: 0.03      // 3% grade difference
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
 * ETAPA 2A: Generación de "Semillas Inteligentes"
 * Creates initial breakpoint candidates using controlled growth
 */
function generateSeedBreakpoints(
  macroSegmentData: ElevationPoint[],
  globalIndexOffset: number,
  distanciaMinima: number
): number[] {
  const R_SQUARED_THRESHOLD = 0.98; // Fixed internal threshold
  const breakpoints: number[] = [];
  let currentStart = 0;

  while (currentStart < macroSegmentData.length - 1) {
    let currentEnd = currentStart + 1;
    let bestRSquared = 0;
    
    // Grow segment while R² remains high
    while (currentEnd < macroSegmentData.length) {
      const segmentPoints = macroSegmentData.slice(currentStart, currentEnd + 1);
      const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      
      if (regressionPoints.length >= 2) {
        const regression = calculateLinearRegression(regressionPoints);
        
        if (regression.rSquared < R_SQUARED_THRESHOLD) {
          // R² dropped, evaluate distance
          const segmentDistance = macroSegmentData[currentEnd - 1].displayDistance - macroSegmentData[currentStart].displayDistance;
          
          if (segmentDistance >= distanciaMinima) {
            // Confirm this breakpoint
            breakpoints.push(globalIndexOffset + currentEnd - 1);
            currentStart = currentEnd - 1;
            break;
          }
        }
        
        bestRSquared = regression.rSquared;
      }
      
      currentEnd++;
    }
    
    // If we reached the end without breaking, finish
    if (currentEnd >= macroSegmentData.length) {
      break;
    }
  }

  return breakpoints;
}

/**
 * ETAPA 2B: Refinamiento por Convergencia
 * Refines breakpoints through iterative positioning and validation
 */
function refineBreakpoints(
  elevationData: ElevationPoint[],
  initialBreakpoints: number[],
  params: AdvancedSegmentationV2Params
): number[] {
  const MAX_ITERATIONS = 30;
  let currentBreakpoints = [...initialBreakpoints];
  let iteration = 0;
  
  while (iteration < MAX_ITERATIONS) {
    let hasChanged = false;
    
    // PASADA DE POSICIONAMIENTO ("Wiggle")
    const wiggledBreakpoints = currentBreakpoints.map(breakpoint => {
      if (breakpoint <= 1 || breakpoint >= elevationData.length - 2) return breakpoint;
      
      const positions = [breakpoint - 1, breakpoint, breakpoint + 1];
      let bestPosition = breakpoint;
      let bestError = Infinity;
      
      for (const pos of positions) {
        if (pos <= 0 || pos >= elevationData.length - 1) continue;
        
        // Calculate combined error for both adjacent segments
        const leftStart = currentBreakpoints.findIndex(bp => bp < pos);
        const rightEnd = currentBreakpoints.findIndex(bp => bp > pos);
        
        const leftStartIdx = leftStart >= 0 ? currentBreakpoints[leftStart] : 0;
        const rightEndIdx = rightEnd >= 0 ? currentBreakpoints[rightEnd] : elevationData.length - 1;
        
        // Calculate error for left segment
        const leftPoints = elevationData.slice(leftStartIdx, pos + 1);
        const leftRegressionPoints = leftPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const leftRegression = calculateLinearRegression(leftRegressionPoints);
        
        // Calculate error for right segment
        const rightPoints = elevationData.slice(pos, rightEndIdx + 1);
        const rightRegressionPoints = rightPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const rightRegression = calculateLinearRegression(rightRegressionPoints);
        
        const combinedError = (1 - leftRegression.rSquared) + (1 - rightRegression.rSquared);
        
        if (combinedError < bestError) {
          bestError = combinedError;
          bestPosition = pos;
        }
      }
      
      if (bestPosition !== breakpoint) {
        hasChanged = true;
      }
      
      return bestPosition;
    });
    
    currentBreakpoints = wiggledBreakpoints;
    
    // PASADA DE VALIDACIÓN Y ELIMINACIÓN
    const validatedBreakpoints: number[] = [];
    
    for (let i = 0; i < currentBreakpoints.length; i++) {
      const breakpoint = currentBreakpoints[i];
      const prevBreakpoint = i > 0 ? currentBreakpoints[i - 1] : 0;
      const nextBreakpoint = i < currentBreakpoints.length - 1 ? currentBreakpoints[i + 1] : elevationData.length - 1;
      
      // Condición 1: Distancia mínima del segmento precedente
      const precedingSegmentDistance = elevationData[breakpoint].displayDistance - elevationData[prevBreakpoint].displayDistance;
      const condition1 = precedingSegmentDistance >= params.distanciaMinima;
      
      // Condición 2: Diferencia de pendiente entre segmentos adyacentes
      const precedingPoints = elevationData.slice(prevBreakpoint, breakpoint + 1);
      const followingPoints = elevationData.slice(breakpoint, nextBreakpoint + 1);
      
      if (precedingPoints.length >= 2 && followingPoints.length >= 2) {
        const precedingRegression = calculateLinearRegression(precedingPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        const followingRegression = calculateLinearRegression(followingPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        
        const slopeDifference = Math.abs(precedingRegression.slope - followingRegression.slope);
        const condition2 = slopeDifference >= params.diferenciaPendiente;
        
        if (condition1 && condition2) {
          validatedBreakpoints.push(breakpoint);
        } else {
          hasChanged = true; // A breakpoint was removed
        }
      }
    }
    
    currentBreakpoints = validatedBreakpoints;
    
    if (!hasChanged) {
      console.log(`V2 Convergence achieved after ${iteration + 1} iterations`);
      break;
    }
    
    iteration++;
  }
  
  return currentBreakpoints;
}

/**
 * ETAPA 2C: Reconstrucción y Renderizado Final
 * Creates final segment objects from refined breakpoints
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
 * Main V2 Segmentation Function: "Refinamiento por Convergencia" Algorithm
 */
export function segmentProfileV2(
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationV2Params
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  if (!elevationData || elevationData.length < 10) {
    return { segments: [], macroBoundaries: [] };
  }

  console.log('Starting V2 segmentation with params:', params);
  
  // ETAPA 1: Macro-Segmentación Estratégica
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  console.log('V2 Macro boundaries found:', macroBoundaries.length);
  
  // Create macro-segments with immediate linear regression rendering
  const macroSegments: AdvancedSegment[] = [];
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const startIndex = macroBoundaries[i];
    const endIndex = macroBoundaries[i + 1];
    const segmentPoints = elevationData.slice(startIndex, endIndex + 1);
    const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
    
    if (regressionPoints.length >= 2) {
      const regression = calculateLinearRegression(regressionPoints);
      macroSegments.push(createSegment(segmentPoints, regression, startIndex, endIndex));
    }
  }
  
  // ETAPA 2: Micro-Segmentación dentro de cada macro-tramo
  let allBreakpoints: number[] = [];
  
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const macroStart = macroBoundaries[i];
    const macroEnd = macroBoundaries[i + 1];
    
    if (macroEnd > macroStart) {
      const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
      
      // Sub-Paso A: Generación de "Semillas Inteligentes"
      const seedBreakpoints = generateSeedBreakpoints(macroSegmentData, macroStart, params.distanciaMinima);
      allBreakpoints.push(...seedBreakpoints);
    }
  }
  
  // Sub-Paso B: Refinamiento por Convergencia
  const refinedBreakpoints = refineBreakpoints(elevationData, allBreakpoints, params);
  
  // Sub-Paso C: Reconstrucción y Renderizado Final
  const finalSegments = createFinalSegments(elevationData, refinedBreakpoints);
  
  console.log(`V2 Generated ${finalSegments.length} refined segments`);
  
  return { segments: finalSegments, macroBoundaries };
}