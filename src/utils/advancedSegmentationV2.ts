
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
 * Calculates regression error for a set of points
 */
function calculateRegressionError(points: ElevationPoint[]): number {
  if (points.length < 2) return 0;
  
  const regressionPoints = points.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
  const regression = calculateLinearRegression(regressionPoints);
  
  // Calculate sum of squared errors
  let sumSquaredErrors = 0;
  for (const point of points) {
    const predictedY = regression.slope * point.displayDistance + regression.intercept;
    const error = point.displayElevation - predictedY;
    sumSquaredErrors += error * error;
  }
  
  return sumSquaredErrors;
}

/**
 * Gets points for a segment between two indices
 */
function getPointsForSegment(points: ElevationPoint[], startIndex: number, endIndex: number): ElevationPoint[] {
  return points.slice(startIndex, endIndex + 1);
}

/**
 * Creates a segment object from points
 */
function createSegmentFromPoints(points: ElevationPoint[]): { points: ElevationPoint[], distance: number, slope: number } {
  if (points.length < 2) {
    return { points, distance: 0, slope: 0 };
  }
  
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const distance = endPoint.displayDistance - startPoint.displayDistance;
  
  const regressionPoints = points.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
  const regression = calculateLinearRegression(regressionPoints);
  
  return { points, distance, slope: regression.slope };
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
 * Generación de Semillas Inteligentes DENTRO de un macro-segmento
 * Implementa el Doble Criterio de Corte correctamente
 */
function findInitialBreakpointsInMacroSegment(macroSegmentPoints: ElevationPoint[]): number[] {
  const R_SQUARED_THRESHOLD = 0.98;
  const GRADIENT_CHANGE_THRESHOLD = 0.03; // 3%
  const HORIZON_WINDOW_KM = 0.1; // 100 meters
  const MIN_SEED_DISTANCE_KM = 0.1; // 100 metros mínimo para validación de semilla (FIJO)
  
  const localBreakpoints: number[] = [];
  let currentStart = 0;

  while (currentStart < macroSegmentPoints.length - 1) {
    let currentEnd = currentStart + 1;
    
    // Crecer el segmento hasta que se cumpla uno de los dobles criterios
    while (currentEnd < macroSegmentPoints.length) {
      const segmentPoints = macroSegmentPoints.slice(currentStart, currentEnd + 1);
      const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      
      if (regressionPoints.length >= 2) {
        const regression = calculateLinearRegression(regressionPoints);
        
        // Criterio 1: Umbral de R²
        const linearityBreak = regression.rSquared < R_SQUARED_THRESHOLD;
        
        // Criterio 2: Cambio de gradiente futuro
        let gradientBreak = false;
        if (currentEnd < macroSegmentPoints.length - 1) {
          const currentPoint = macroSegmentPoints[currentEnd];
          const futurePoint = macroSegmentPoints.find(p => 
            p.displayDistance >= currentPoint.displayDistance + HORIZON_WINDOW_KM
          ) || macroSegmentPoints[macroSegmentPoints.length - 1];
          
          if (futurePoint && futurePoint !== currentPoint) {
            const currentSlope = regression.slope / 1000; // Convertir a porcentaje
            const futureSlope = (futurePoint.displayElevation - currentPoint.displayElevation) / 
                               ((futurePoint.displayDistance - currentPoint.displayDistance) * 1000);
            
            gradientBreak = Math.abs(currentSlope - futureSlope) > GRADIENT_CHANGE_THRESHOLD;
          }
        }
        
        // Si se cumple cualquiera de los criterios, validar distancia y crear breakpoint
        if (linearityBreak || gradientBreak) {
          const segmentDistance = macroSegmentPoints[currentEnd - 1].displayDistance - macroSegmentPoints[currentStart].displayDistance;
          
          if (segmentDistance >= MIN_SEED_DISTANCE_KM) {
            localBreakpoints.push(currentEnd - 1);
            currentStart = currentEnd - 1;
            break;
          }
        }
      }
      
      currentEnd++;
    }
    
    // Si llegamos al final sin romper, terminar
    if (currentEnd >= macroSegmentPoints.length) {
      break;
    }
  }

  return localBreakpoints;
}

/**
 * Función auxiliar para el 'Wiggle' - encuentra la posición óptima para un breakpoint
 */
const findOptimalPosition = (breakpoint: { position: number, min_bound: number, max_bound: number }, points: ElevationPoint[]) => {
  let optimalPosition = breakpoint.position;
  let minError = Infinity;

  // Probar un rango de -5 a +5 puntos alrededor de la posición actual
  for (let offset = -5; offset <= 5; offset++) {
    const testPosition = breakpoint.position + offset;
    
    // Validar que la posición está dentro de los límites
    if (testPosition <= breakpoint.min_bound || testPosition >= breakpoint.max_bound) continue;
    
    const segmentA = getPointsForSegment(points, breakpoint.min_bound, testPosition);
    const segmentB = getPointsForSegment(points, testPosition, breakpoint.max_bound);
    
    // Evitar segmentos vacíos
    if (segmentA.length < 2 || segmentB.length < 2) continue;
    
    const error = calculateRegressionError(segmentA) + calculateRegressionError(segmentB);
    
    if (error < minError) {
      minError = error;
      optimalPosition = testPosition;
    }
  }
  return optimalPosition;
};

/**
 * REEMPLAZADA: Generación de Semillas Inteligentes
 * Ejecuta macro-segmentación y luego genera semillas dentro de cada macro-segmento
 */
export function generatePreviewSegments(
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationV2Params
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  if (!elevationData || elevationData.length < 10) {
    return { segments: [], macroBoundaries: [] };
  }

  console.log('Starting intelligent seed generation...');

  // Paso 1: Calcular Macro-Segmentos
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  console.log('Macro boundaries found:', macroBoundaries);

  // Paso 2: Iterar sobre cada Macro-Segmento y generar semillas
  const allSeedBreakpoints: number[] = [];
  
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const macroStartGlobalIndex = macroBoundaries[i];
    const macroEndGlobalIndex = macroBoundaries[i + 1];
    
    console.log(`Processing macro-segment ${i + 1}/${macroBoundaries.length - 1}: indices ${macroStartGlobalIndex} to ${macroEndGlobalIndex}`);
    
    if (macroEndGlobalIndex > macroStartGlobalIndex) {
      // Extraer los puntos que pertenecen a este macro-segmento específico
      const macroSegmentData = elevationData.slice(macroStartGlobalIndex, macroEndGlobalIndex + 1);
      
      // Paso 3: Ejecutar generación de semillas dentro de este macro-segmento
      const localSeedBreakpoints = findInitialBreakpointsInMacroSegment(macroSegmentData);
      console.log(`Found ${localSeedBreakpoints.length} seed breakpoints in macro-segment ${i + 1}`);
      
      // Convertir índices locales a índices globales
      const globalSeedBreakpoints = localSeedBreakpoints.map(localIndex => 
        macroStartGlobalIndex + localIndex
      );
      
      allSeedBreakpoints.push(...globalSeedBreakpoints);
    }
  }

  // Paso 4: Consolidar y crear segmentos de vista previa
  console.log(`Total seed breakpoints across all macro-segments: ${allSeedBreakpoints.length}`);
  
  // Crear segmentos finales de las semillas
  const segments: AdvancedSegment[] = [];
  const finalBreakpoints = [0, ...allSeedBreakpoints, elevationData.length - 1];
  
  for (let i = 0; i < finalBreakpoints.length - 1; i++) {
    const startIndex = finalBreakpoints[i];
    const endIndex = finalBreakpoints[i + 1];
    
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
 * REEMPLAZADA: Bucle de Refinamiento por Convergencia
 * Implementa el algoritmo iterativo correcto con Wiggle y Validación
 */
export const refineSegments = (
  initialBreakpoints: number[], 
  points: ElevationPoint[], 
  userParams: { MinDistance: number, SlopeDifferenceThreshold: number }, 
  progressCallback?: (progress: number) => void
): number[] => {
  let currentBreakpoints = [...initialBreakpoints];
  const MAX_ITERATIONS = 30;

  console.log('Starting convergence refinement with', currentBreakpoints.length, 'initial breakpoints');

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let wasChangeMadeInThisPass = false;

    // --- Pasada 1: Posicionamiento Óptimo ("Wiggle") ---
    const movedBreakpoints = currentBreakpoints.map((position, index) => {
      const minBound = index === 0 ? 0 : currentBreakpoints[index - 1];
      const maxBound = index === currentBreakpoints.length - 1 ? points.length - 1 : currentBreakpoints[index + 1];
      const newPosition = findOptimalPosition({ position, min_bound: minBound, max_bound: maxBound }, points);
      
      if (newPosition !== position) {
        wasChangeMadeInThisPass = true;
      }
      return newPosition;
    });
    currentBreakpoints = movedBreakpoints;
    
    // --- Pasada 2: Validación y Eliminación ---
    const validatedBreakpoints = [];
    for (let j = 0; j < currentBreakpoints.length; j++) {
      const breakpointPosition = currentBreakpoints[j];
      const startPointIndex = j === 0 ? 0 : currentBreakpoints[j - 1];
      const endPointIndex = breakpointPosition;
      
      const segmentA = createSegmentFromPoints(points.slice(startPointIndex, endPointIndex + 1));

      // Para la validación de pendiente, necesitamos el siguiente segmento
      const nextStartPointIndex = breakpointPosition;
      const nextEndPointIndex = j === currentBreakpoints.length - 1 ? points.length - 1 : currentBreakpoints[j + 1];
      const segmentB = createSegmentFromPoints(points.slice(nextStartPointIndex, nextEndPointIndex + 1));
      
      if (segmentA.points.length < 2 || segmentB.points.length < 2) continue;

      const isDistanceValid = segmentA.distance >= userParams.MinDistance;
      const slopeDiff = Math.abs(segmentA.slope - segmentB.slope);
      const isSlopeChangeSignificant = slopeDiff >= userParams.SlopeDifferenceThreshold;

      if (isDistanceValid && isSlopeChangeSignificant) {
        validatedBreakpoints.push(breakpointPosition);
      } else {
        wasChangeMadeInThisPass = true;
      }
    }
    
    currentBreakpoints = validatedBreakpoints;
    
    if (progressCallback) {
      progressCallback((i + 1) / MAX_ITERATIONS * 100);
    }

    if (!wasChangeMadeInThisPass) {
      console.log(`Convergence achieved after ${i + 1} iterations`);
      break;
    }
  }

  if (progressCallback) {
    progressCallback(100);
  }

  console.log(`Final refined breakpoints: ${currentBreakpoints.length}`);
  return currentBreakpoints;
};

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
 * Main refinement function - executes the heavy calculation once with hierarchical processing
 * PASO 1: Calcula Macro-Segmentos
 * PASO 2: Itera sobre cada Macro-Segmento y ejecuta Micro-Segmentación
 * PASO 3: Consolida los resultados
 */
export function executeRefinement(
  elevationData: ElevationPoint[],
  macroBoundaries: number[],
  params: AdvancedSegmentationV2Params
): number[] {
  console.log('Executing hierarchical refinement calculation...');
  
  const allOptimalBreakpoints: number[] = [];
  
  // PASO 2: Iterar sobre cada Macro-Segmento y procesar individualmente
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const macroStartGlobalIndex = macroBoundaries[i];
    const macroEndGlobalIndex = macroBoundaries[i + 1];
    
    console.log(`Processing macro-segment ${i + 1}/${macroBoundaries.length - 1}: indices ${macroStartGlobalIndex} to ${macroEndGlobalIndex}`);
    
    if (macroEndGlobalIndex > macroStartGlobalIndex) {
      // Extract the points that belong to this specific macro-segment
      const macroSegmentData = elevationData.slice(macroStartGlobalIndex, macroEndGlobalIndex + 1);
      
      // PASO 3: Ejecutar Micro-Segmentación dentro de este macro-segmento
      // Sub-Paso A: Generación de Semillas Inteligentes (usando índices locales)
      const localSeedBreakpoints = findInitialBreakpointsInMacroSegment(macroSegmentData);
      console.log(`Found ${localSeedBreakpoints.length} seed breakpoints in macro-segment ${i + 1}`);
      
      if (localSeedBreakpoints.length > 0) {
        // Sub-Paso B: Refinamiento por Convergencia (usando índices locales)
        const localOptimalBreakpoints = refineBreakpointsInMacroSegment(
          macroSegmentData, 
          localSeedBreakpoints, 
          params
        );
        
        console.log(`Refined to ${localOptimalBreakpoints.length} optimal breakpoints in macro-segment ${i + 1}`);
        
        // Convert local indices back to global indices
        const globalOptimalBreakpoints = localOptimalBreakpoints.map(localIndex => 
          macroStartGlobalIndex + localIndex
        );
        
        allOptimalBreakpoints.push(...globalOptimalBreakpoints);
      }
    }
  }
  
  // PASO 4: Consolidar los resultados
  console.log(`Total optimal breakpoints across all macro-segments: ${allOptimalBreakpoints.length}`);
  return allOptimalBreakpoints.sort((a, b) => a - b);
}

/**
 * Sub-Paso B: Refinamiento por Convergencia (WITHIN A MACRO-SEGMENT)
 * Implements the convergence refinement algorithm within a single macro-segment
 */
function refineBreakpointsInMacroSegment(
  macroSegmentPoints: ElevationPoint[],
  initialLocalBreakpoints: number[],
  params: AdvancedSegmentationV2Params
): number[] {
  let currentBreakpoints = [...initialLocalBreakpoints];
  const MAX_ITERATIONS = 30;

  console.log('Starting convergence refinement within macro-segment with', currentBreakpoints.length, 'initial breakpoints');

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let wasChangeMadeInThisPass = false;

    // Pasada de Posicionamiento ("Wiggle")
    const wiggledBreakpoints = currentBreakpoints.map((localBreakpoint, index) => {
      // Skip boundary breakpoints that can't be moved safely
      if (localBreakpoint <= 1 || localBreakpoint >= macroSegmentPoints.length - 2) {
        return localBreakpoint;
      }
      
      const positions = [localBreakpoint - 1, localBreakpoint, localBreakpoint + 1];
      let bestPosition = localBreakpoint;
      let bestCombinedError = Infinity;
      
      for (const candidatePosition of positions) {
        if (candidatePosition <= 0 || candidatePosition >= macroSegmentPoints.length - 1) {
          continue;
        }
        
        // Get adjacent breakpoints (local indices within this macro-segment)
        const prevBreakpoint = index > 0 ? currentBreakpoints[index - 1] : 0;
        const nextBreakpoint = index < currentBreakpoints.length - 1 ? currentBreakpoints[index + 1] : macroSegmentPoints.length - 1;
        
        // Calculate error for segment A (before the candidate position)
        const segmentAPoints = macroSegmentPoints.slice(prevBreakpoint, candidatePosition + 1);
        const segmentARegressionPoints = segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const segmentARegression = calculateLinearRegression(segmentARegressionPoints);
        
        // Calculate error for segment B (after the candidate position)
        const segmentBPoints = macroSegmentPoints.slice(candidatePosition, nextBreakpoint + 1);
        const segmentBRegressionPoints = segmentBPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const segmentBRegression = calculateLinearRegression(segmentBRegressionPoints);
        
        // Combined error (lower is better)
        const combinedError = (1 - segmentARegression.rSquared) + (1 - segmentBRegression.rSquared);
        
        if (combinedError < bestCombinedError) {
          bestCombinedError = combinedError;
          bestPosition = candidatePosition;
        }
      }
      
      if (bestPosition !== localBreakpoint) {
        wasChangeMadeInThisPass = true;
      }
      
      return bestPosition;
    });
    
    currentBreakpoints = wiggledBreakpoints;

    // Pasada de Validación y Eliminación
    const validatedBreakpoints: number[] = [];
    
    for (let j = 0; j < currentBreakpoints.length; j++) {
      const breakpointToValidate = currentBreakpoints[j];
      
      // Get adjacent breakpoints (local indices within this macro-segment)
      const prevBreakpoint = j > 0 ? currentBreakpoints[j - 1] : 0;
      const nextBreakpoint = j < currentBreakpoints.length - 1 ? currentBreakpoints[j + 1] : macroSegmentPoints.length - 1;
      
      // Get segment A (before the breakpoint)
      const segmentAPoints = macroSegmentPoints.slice(prevBreakpoint, breakpointToValidate + 1);
      // Get segment B (after the breakpoint)  
      const segmentBPoints = macroSegmentPoints.slice(breakpointToValidate, nextBreakpoint + 1);
      
      if (segmentAPoints.length >= 2 && segmentBPoints.length >= 2) {
        // Calculate regression for both segments
        const segmentARegression = calculateLinearRegression(segmentAPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        const segmentBRegression = calculateLinearRegression(segmentBPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        
        // Apply user criteria
        const segmentADistance = macroSegmentPoints[breakpointToValidate].displayDistance - macroSegmentPoints[prevBreakpoint].displayDistance;
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
      console.log(`Convergence achieved after ${iteration + 1} iterations within macro-segment`);
      break;
    }
  }

  return currentBreakpoints;
}

/**
 * Creates final segment objects from breakpoints within a macro-segment
 */
function createSegmentsFromBreakpoints(
  macroSegmentPoints: ElevationPoint[],
  localBreakpoints: number[],
  globalStartIndex: number
): AdvancedSegment[] {
  const segments: AdvancedSegment[] = [];
  const allLocalBreakpoints = [0, ...localBreakpoints, macroSegmentPoints.length - 1];
  
  for (let i = 0; i < allLocalBreakpoints.length - 1; i++) {
    const localStartIndex = allLocalBreakpoints[i];
    const localEndIndex = allLocalBreakpoints[i + 1];
    
    const segmentPoints = macroSegmentPoints.slice(localStartIndex, localEndIndex + 1);
    const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
    
    if (regressionPoints.length >= 2) {
      const regression = calculateLinearRegression(regressionPoints);
      // Convert local indices to global indices
      const globalStartIndexForSegment = globalStartIndex + localStartIndex;
      const globalEndIndexForSegment = globalStartIndex + localEndIndex;
      segments.push(createSegment(segmentPoints, regression, globalStartIndexForSegment, globalEndIndexForSegment));
    }
  }
  
  return segments;
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
  
  // Create final segments from filtered breakpoints
  const segments: AdvancedSegment[] = [];
  const finalBreakpoints = [0, ...filteredBreakpoints, elevationData.length - 1];
  
  for (let i = 0; i < finalBreakpoints.length - 1; i++) {
    const startIndex = finalBreakpoints[i];
    const endIndex = finalBreakpoints[i + 1];
    
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
 * Legacy function - kept for backward compatibility but redirects to new architecture
 */
export function segmentProfileV2(
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationV2Params
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  // This function is now just a wrapper that calls the macro-segmentation
  return getMacroSegments(elevationData, params.prominenciaMinima);
}
