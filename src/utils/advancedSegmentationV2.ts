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
 * ETAPA 2B: Refinamiento por Convergencia DENTRO de un macro-segmento
 * Refines breakpoints through iterative positioning and validation within macro boundaries
 */
function refineBreakpointsWithinMacroSegment(
  macroSegmentData: ElevationPoint[],
  initialLocalBreakpoints: number[],
  params: AdvancedSegmentationV2Params
): number[] {
  // Inicializar la lista de breakpoints a refinar (índices locales)
  let currentBreakpoints = [...initialLocalBreakpoints];
  
  // Limitar las iteraciones para seguridad
  const MAX_ITERATIONS = 30;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let wasChangeMadeInThisPass = false;

    // --- PASADA 1: POSICIONAMIENTO ÓPTIMO ("WIGGLE") ---
    const wiggledBreakpoints = currentBreakpoints.map((breakpoint, index) => {
      // Skip boundary breakpoints that can't be moved safely within the macro-segment
      if (breakpoint <= 1 || breakpoint >= macroSegmentData.length - 2) {
        return breakpoint;
      }
      
      const positions = [breakpoint - 1, breakpoint, breakpoint + 1];
      let bestPosition = breakpoint;
      let bestCombinedError = Infinity;
      
      for (const candidatePosition of positions) {
        if (candidatePosition <= 0 || candidatePosition >= macroSegmentData.length - 1) {
          continue;
        }
        
        // Get adjacent breakpoints within the macro-segment
        const prevBreakpoint = index > 0 ? currentBreakpoints[index - 1] : 0;
        const nextBreakpoint = index < currentBreakpoints.length - 1 ? currentBreakpoints[index + 1] : macroSegmentData.length - 1;
        
        // Calculate error for segment A (before the candidate position)
        const segmentAPoints = macroSegmentData.slice(prevBreakpoint, candidatePosition + 1);
        const segmentARegressionPoints = segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const segmentARegression = calculateLinearRegression(segmentARegressionPoints);
        
        // Calculate error for segment B (after the candidate position)
        const segmentBPoints = macroSegmentData.slice(candidatePosition, nextBreakpoint + 1);
        const segmentBRegressionPoints = segmentBPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const segmentBRegression = calculateLinearRegression(segmentBRegressionPoints);
        
        // Combined error (lower is better)
        const combinedError = (1 - segmentARegression.rSquared) + (1 - segmentBRegression.rSquared);
        
        if (combinedError < bestCombinedError) {
          bestCombinedError = combinedError;
          bestPosition = candidatePosition;
        }
      }
      
      // If any breakpoint changed position, mark the pass as having made changes
      if (bestPosition !== breakpoint) {
        wasChangeMadeInThisPass = true;
      }
      
      return bestPosition;
    });
    
    currentBreakpoints = wiggledBreakpoints;

    // --- PASADA 2: VALIDACIÓN Y ELIMINACIÓN ---
    const validatedBreakpoints: number[] = [];
    
    for (let j = 0; j < currentBreakpoints.length; j++) {
      const breakpointToValidate = currentBreakpoints[j];
      
      // Obtener los segmentos adyacentes dentro del macro-segmento
      const prevBreakpoint = j > 0 ? currentBreakpoints[j - 1] : 0;
      const nextBreakpoint = j < currentBreakpoints.length - 1 ? currentBreakpoints[j + 1] : macroSegmentData.length - 1;
      
      // Get segment A (before the breakpoint)
      const segmentAPoints = macroSegmentData.slice(prevBreakpoint, breakpointToValidate + 1);
      // Get segment B (after the breakpoint)  
      const segmentBPoints = macroSegmentData.slice(breakpointToValidate, nextBreakpoint + 1);
      
      if (segmentAPoints.length >= 2 && segmentBPoints.length >= 2) {
        // Calculate regression for both segments
        const segmentARegression = calculateLinearRegression(segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        const segmentBRegression = calculateLinearRegression(segmentBPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        
        // Aplicar los criterios del usuario
        const segmentADistance = macroSegmentData[breakpointToValidate].displayDistance - macroSegmentData[prevBreakpoint].displayDistance;
        const isDistanceValid = segmentADistance >= params.distanciaMinima;
        
        // Convert slopes from m/km to percentage for comparison with user parameter
        const segmentASlopePercent = (segmentARegression.slope / 1000) * 100; // m/km to %
        const segmentBSlopePercent = (segmentBRegression.slope / 1000) * 100; // m/km to %
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

    // --- CONDICIÓN DE SALIDA DEL BUCLE ---
    if (!wasChangeMadeInThisPass) {
      console.log(`V2 Macro-segment convergence achieved after ${i + 1} iterations`);
      break;
    }
  }

  return currentBreakpoints;
}

/**
 * ETAPA 2C: Reconstrucción y Renderizado Final DENTRO de un macro-segmento
 * Creates final segment objects from refined local breakpoints within a macro-segment
 */
function createFinalSegmentsForMacro(
  macroSegmentData: ElevationPoint[],
  localBreakpoints: number[],
  globalIndexOffset: number
): AdvancedSegment[] {
  const segments: AdvancedSegment[] = [];
  const allLocalBreakpoints = [0, ...localBreakpoints, macroSegmentData.length - 1];
  
  for (let i = 0; i < allLocalBreakpoints.length - 1; i++) {
    const localStartIndex = allLocalBreakpoints[i];
    const localEndIndex = allLocalBreakpoints[i + 1];
    
    const segmentPoints = macroSegmentData.slice(localStartIndex, localEndIndex + 1);
    const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
    
    if (regressionPoints.length >= 2) {
      const regression = calculateLinearRegression(regressionPoints);
      // Convert local indices to global indices
      const globalStartIndex = globalIndexOffset + localStartIndex;
      const globalEndIndex = globalIndexOffset + localEndIndex;
      segments.push(createSegment(segmentPoints, regression, globalStartIndex, globalEndIndex));
    }
  }
  
  return segments;
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
  const finalSegments: AdvancedSegment[] = [];
  
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const macroStart = macroBoundaries[i];
    const macroEnd = macroBoundaries[i + 1];
    
    if (macroEnd > macroStart) {
      const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
      
      // Sub-Paso A: Generación de "Semillas Inteligentes" DENTRO del macro-tramo
      const seedBreakpoints = generateSeedBreakpoints(macroSegmentData, macroStart, params.distanciaMinima);
      
      // Sub-Paso B: Refinamiento por Convergencia DENTRO del macro-tramo
      // Convertir breakpoints globales a índices locales para este macro-segmento
      const localBreakpoints = seedBreakpoints.map(bp => bp - macroStart);
      const refinedLocalBreakpoints = refineBreakpointsWithinMacroSegment(
        macroSegmentData, 
        localBreakpoints, 
        params
      );
      
      // Sub-Paso C: Reconstrucción DENTRO del macro-tramo
      const macroSegments = createFinalSegmentsForMacro(
        macroSegmentData, 
        refinedLocalBreakpoints, 
        macroStart
      );
      
      finalSegments.push(...macroSegments);
    }
  }
  
  console.log(`V2 Generated ${finalSegments.length} refined segments`);
  
  return { segments: finalSegments, macroBoundaries };
}