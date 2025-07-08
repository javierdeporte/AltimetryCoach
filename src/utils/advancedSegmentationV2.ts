
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
 * Finds significant peaks and valleys based on prominence for macro-segmentation
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
 * Creates segments from breakpoints
 */
function createSegmentsFromBreakpoints(points: ElevationPoint[], breakpoints: number[]): AdvancedSegment[] {
  const segments: AdvancedSegment[] = [];
  const allBreakpoints = [0, ...breakpoints, points.length - 1];
  
  for (let i = 0; i < allBreakpoints.length - 1; i++) {
    const startIndex = allBreakpoints[i];
    const endIndex = allBreakpoints[i + 1];
    
    const segmentPoints = points.slice(startIndex, endIndex + 1);
    const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
    
    if (regressionPoints.length >= 2) {
      const regression = calculateLinearRegression(regressionPoints);
      segments.push(createSegment(segmentPoints, regression, startIndex, endIndex));
    }
  }
  
  return segments;
}

// ESTA FUNCIÓN ES LA SEMILLA - LA VISTA PREVIA RÁPIDA
export function generatePreviewSegments(points: ElevationPoint[], params: AdvancedSegmentationV2Params): AdvancedSegment[] {
  console.log("Generando vista previa...");
  
  if (!points || points.length < 10) {
    return [];
  }

  // Primero realizar macro-segmentación
  const macroBoundaries = findSignificantExtrema(points, params.prominenciaMinima);
  const previewSegments: AdvancedSegment[] = [];

  // Para cada macro-segmento, generar semillas inteligentes
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const macroStart = macroBoundaries[i];
    const macroEnd = macroBoundaries[i + 1];
    const macroPoints = points.slice(macroStart, macroEnd + 1);

    // Lógica de "Crecimiento con Doble Criterio de Corte"
    let currentStart = 0;
    const seedBreakpoints: number[] = [];

    while (currentStart < macroPoints.length - 1) {
      let currentEnd = currentStart + 1;
      let bestRSquared = 0;
      
      // Crecer el candidato
      while (currentEnd < macroPoints.length) {
        const candidatePoints = macroPoints.slice(currentStart, currentEnd + 1);
        const regressionPoints = candidatePoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        
        if (regressionPoints.length >= 2) {
          const regression = calculateLinearRegression(regressionPoints);
          
          // Doble Criterio de Corte: R² < 0.98 O Cambio de Pendiente > 3%
          const rSquaredBreak = regression.rSquared < 0.98;
          
          // Calcular cambio de pendiente con ventana futura de 100m
          let slopeChangeBreak = false;
          if (currentEnd < macroPoints.length - 1) {
            const futureWindow = macroPoints.slice(currentEnd, Math.min(currentEnd + 10, macroPoints.length));
            if (futureWindow.length >= 2) {
              const futureRegressionPoints = futureWindow.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
              const futureRegression = calculateLinearRegression(futureRegressionPoints);
              const slopeDiff = Math.abs(regression.slope - futureRegression.slope);
              slopeChangeBreak = slopeDiff > 0.03;
            }
          }
          
          if (rSquaredBreak || slopeChangeBreak) {
            // Validar contra distancia mínima FIJA de 100m (0.1km)
            const segmentDistance = candidatePoints[candidatePoints.length - 1].displayDistance - candidatePoints[0].displayDistance;
            if (segmentDistance >= 0.1) {
              seedBreakpoints.push(macroStart + currentEnd - 1);
              currentStart = currentEnd - 1;
              break;
            }
          }
          
          bestRSquared = regression.rSquared;
        }
        
        currentEnd++;
      }
      
      // Si llegamos al final sin hacer break, terminar
      if (currentEnd >= macroPoints.length) {
        break;
      }
    }

    // Crear segmentos para este macro usando los breakpoints semilla
    const macroSegments = createSegmentsFromBreakpoints(macroPoints, seedBreakpoints.map(bp => bp - macroStart));
    
    // Ajustar los índices globales
    macroSegments.forEach(segment => {
      segment.startIndex += macroStart;
      segment.endIndex += macroStart;
    });
    
    previewSegments.push(...macroSegments);
  }

  return previewSegments;
}

// ESTA FUNCIÓN ES EL REFINAMIENTO - EL CÁLCULO PRECISO
export function refineSegments(
  previewSegments: AdvancedSegment[], 
  points: ElevationPoint[], 
  params: AdvancedSegmentationV2Params, 
  progressCallback: (progress: number) => void
): AdvancedSegment[] {
  console.log("Refinando segmentos...");
  
  if (!previewSegments || previewSegments.length === 0) {
    progressCallback(100);
    return previewSegments;
  }

  // Convertir segmentos de vista previa en una lista de puntos de corte
  let currentBreakpoints = previewSegments.map(seg => seg.endIndex);
  
  const MAX_ITERATIONS = 30;
  
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let wasChangeMade = false;

    // Pasada de Posicionamiento "Wiggle"
    const optimizedBreakpoints = [...currentBreakpoints];
    
    for (let j = 0; j < optimizedBreakpoints.length; j++) {
      const currentBreakpoint = optimizedBreakpoints[j];
      const prevBreakpoint = j > 0 ? optimizedBreakpoints[j - 1] : 0;
      const nextBreakpoint = j < optimizedBreakpoints.length - 1 ? optimizedBreakpoints[j + 1] : points.length - 1;
      
      let bestPosition = currentBreakpoint;
      let minError = Infinity;
      
      // Probar posiciones alrededor del breakpoint actual
      for (let offset = -5; offset <= 5; offset++) {
        const testPosition = currentBreakpoint + offset;
        
        if (testPosition <= prevBreakpoint || testPosition >= nextBreakpoint) continue;
        
        // Calcular error para segmentos adyacentes
        const segmentA = points.slice(prevBreakpoint, testPosition + 1);
        const segmentB = points.slice(testPosition, nextBreakpoint + 1);
        
        if (segmentA.length < 2 || segmentB.length < 2) continue;
        
        const regressionA = calculateLinearRegression(segmentA.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        const regressionB = calculateLinearRegression(segmentB.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
        
        const error = (1 - regressionA.rSquared) + (1 - regressionB.rSquared);
        
        if (error < minError) {
          minError = error;
          bestPosition = testPosition;
        }
      }
      
      if (bestPosition !== currentBreakpoint) {
        optimizedBreakpoints[j] = bestPosition;
        wasChangeMade = true;
      }
    }
    
    currentBreakpoints = optimizedBreakpoints;

    // Pasada de Validación y Eliminación
    const validatedBreakpoints: number[] = [];
    
    for (let j = 0; j < currentBreakpoints.length; j++) {
      const breakpoint = currentBreakpoints[j];
      const prevBreakpoint = j > 0 ? currentBreakpoints[j - 1] : 0;
      const nextBreakpoint = j < currentBreakpoints.length - 1 ? currentBreakpoints[j + 1] : points.length - 1;
      
      const segmentA = points.slice(prevBreakpoint, breakpoint + 1);
      const segmentB = points.slice(breakpoint, nextBreakpoint + 1);
      
      if (segmentA.length < 2 || segmentB.length < 2) continue;
      
      const regressionA = calculateLinearRegression(segmentA.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
      const regressionB = calculateLinearRegression(segmentB.map(p => ({ x: p.displayDistance, y: p.displayElevation })));
      
      // Validar distancia mínima
      const segmentDistance = segmentA[segmentA.length - 1].displayDistance - segmentA[0].displayDistance;
      const isDistanceValid = segmentDistance >= params.distanciaMinima;
      
      // Validar diferencia de pendiente
      const slopeDiff = Math.abs(regressionA.slope - regressionB.slope);
      const isSlopeChangeSignificant = slopeDiff >= params.diferenciaPendiente;
      
      if (isDistanceValid && isSlopeChangeSignificant) {
        validatedBreakpoints.push(breakpoint);
      } else {
        wasChangeMade = true;
      }
    }
    
    currentBreakpoints = validatedBreakpoints;
    
    progressCallback((i + 1) / MAX_ITERATIONS * 100);

    if (!wasChangeMade) {
      console.log(`Convergencia alcanzada después de ${i + 1} iteraciones`);
      break;
    }
  }

  // Reconstruir los segmentos finales a partir de los breakpoints optimizados
  const finalSegments = createSegmentsFromBreakpoints(points, currentBreakpoints);
  progressCallback(100);
  
  return finalSegments;
}

/**
 * Main V2 Segmentation Function
 */
export function segmentProfileV2(
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationV2Params
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  if (!elevationData || elevationData.length < 10) {
    return { segments: [], macroBoundaries: [] };
  }

  console.log('Starting V2 segmentation with params:', params);
  
  // Generate preview segments (fast)
  const previewSegments = generatePreviewSegments(elevationData, params);
  
  // For now, return preview segments as the main result
  // The refinement will be triggered separately by the UI button
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  
  return { segments: previewSegments, macroBoundaries };
}
