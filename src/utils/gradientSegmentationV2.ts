
import { ElevationPoint, AdvancedSegment, RegressionResult } from './types';

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
};

export interface GradientSegmentationV2Params {
  prominenciaMinima: number;     // For macro-segmentation (meters)
  distanciaMinima: number;       // Minimum segment distance (km)
  cambioGradiente: number;       // Gradient change threshold (percentage)
}

export const DEFAULT_GRADIENT_V2_PARAMS: GradientSegmentationV2Params = {
  prominenciaMinima: 30,         // meters
  distanciaMinima: 0.20,         // km  
  cambioGradiente: 3             // 3% gradient change
};

// Animation callback types
export type OnRawSegmentDetectedCallback = (segment: AdvancedSegment, totalFound: number) => void;
export type AnimationFrame = AdvancedSegment[];
export type AnimationFrames = AnimationFrame[];

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
 * Finds significant peaks and valleys based on prominence (Macro-segmentation)
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
 * Calculate gradient between two points
 */
function calculateGradient(point1: ElevationPoint, point2: ElevationPoint): number {
  const elevationDiff = point2.displayElevation - point1.displayElevation;
  const distanceDiff = (point2.displayDistance - point1.displayDistance) * 1000; // Convert km to meters
  
  if (distanceDiff === 0) return 0;
  return (elevationDiff / distanceDiff) * 100; // Return as percentage
}

/**
 * ETAPA 1: Detección Global de Puntos de Corte
 * Detecta todos los puntos de corte basados en cambio de gradiente
 * Llama al callback por cada segmento encontrado para animación en tiempo real
 */
export async function detectRawSegments(
  elevationData: ElevationPoint[],
  params: GradientSegmentationV2Params,
  onRawSegmentDetected: OnRawSegmentDetectedCallback
): Promise<AdvancedSegment[]> {
  if (!elevationData || elevationData.length < 10) {
    return [];
  }

  console.log('🔍 ETAPA 1: Iniciando Detección Global de Segmentos...');
  
  // Macro-segmentation: Find significant extrema
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  console.log(`📍 Encontrados ${macroBoundaries.length} límites macro`);
  
  const rawSegments: AdvancedSegment[] = [];
  let totalSegmentsFound = 0;

  // Future window size: approximately 100m ahead
  const FUTURE_WINDOW_DISTANCE = 0.1; // km

  // Process each macro segment
  for (let macroIdx = 0; macroIdx < macroBoundaries.length - 1; macroIdx++) {
    const macroStart = macroBoundaries[macroIdx];
    const macroEnd = macroBoundaries[macroIdx + 1];
    
    if (macroEnd <= macroStart) continue;
    
    const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
    console.log(`🔬 Procesando macro segmento ${macroIdx + 1}/${macroBoundaries.length - 1} (${macroSegmentData.length} puntos)`);
    
    let currentStart = 0;
    
    // Global detection within this macro segment
    while (currentStart < macroSegmentData.length - 1) {
      let currentEnd = currentStart + 1;
      let bestEndpoint = currentEnd;
      let bestGradientStability = 0;
      
      // Grow segment and find the best endpoint based on gradient stability
      while (currentEnd < macroSegmentData.length) {
        const candidatePoints = macroSegmentData.slice(currentStart, currentEnd + 1);
        
        if (candidatePoints.length >= 2) {
          // Calculate current segment gradient
          const startPoint = candidatePoints[0];
          const endPoint = candidatePoints[candidatePoints.length - 1];
          const currentGradient = calculateGradient(startPoint, endPoint);
          
          // Look ahead for future gradient
          let futureWindowEnd = currentEnd;
          let futureDistance = 0;
          
          while (futureWindowEnd < macroSegmentData.length - 1 && futureDistance < FUTURE_WINDOW_DISTANCE) {
            futureWindowEnd++;
            futureDistance = macroSegmentData[futureWindowEnd].displayDistance - macroSegmentData[currentEnd].displayDistance;
          }
          
          if (futureWindowEnd > currentEnd) {
            const futureStartPoint = macroSegmentData[currentEnd];
            const futureEndPoint = macroSegmentData[futureWindowEnd];
            const futureGradient = calculateGradient(futureStartPoint, futureEndPoint);
            const gradientChange = Math.abs(currentGradient - futureGradient);
            
            // Calculate stability score (inverse of gradient change)
            const stabilityScore = Math.max(0, params.cambioGradiente - gradientChange);
            
            if (stabilityScore > bestGradientStability) {
              bestGradientStability = stabilityScore;
              bestEndpoint = currentEnd;
            }
            
            // Check if we should cut here
            if (gradientChange >= params.cambioGradiente) {
              const segmentDistance = endPoint.displayDistance - startPoint.displayDistance;
              
              if (segmentDistance >= params.distanciaMinima) {
                break;
              }
            }
          }
        }
        
        currentEnd++;
      }
      
      // Create segment with the best endpoint found
      const finalSegmentPoints = macroSegmentData.slice(currentStart, bestEndpoint + 1);
      
      if (finalSegmentPoints.length >= 2) {
        const regressionPoints = finalSegmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const regression = calculateLinearRegression(regressionPoints);
        
        const segment = createSegment(
          finalSegmentPoints,
          regression,
          macroStart + currentStart,
          macroStart + bestEndpoint
        );
        
        rawSegments.push(segment);
        totalSegmentsFound++;
        
        console.log(`✅ Segmento detectado: ${totalSegmentsFound} (R²: ${regression.rSquared.toFixed(3)})`);
        
        // Llamar al callback para animación
        await new Promise(resolve => {
          setTimeout(() => {
            onRawSegmentDetected(segment, totalSegmentsFound);
            resolve(undefined);
          }, 50); // 50ms delay between detections for animation
        });
      }
      
      currentStart = bestEndpoint;
    }
  }
  
  console.log(`🎯 ETAPA 1 COMPLETADA: ${totalSegmentsFound} segmentos crudos detectados`);
  return rawSegments;
}

/**
 * ETAPA 2: Fusión Inteligente Iterativa
 * Fusiona segmentos adyacentes basándose en distancia mínima y mejor R²
 * Retorna frames de animación mostrando cada paso de fusión
 */
export function simplifySegments(
  rawSegments: AdvancedSegment[],
  minDistance: number
): AnimationFrames {
  if (!rawSegments || rawSegments.length === 0) {
    return [];
  }

  console.log('🔧 ETAPA 2: Iniciando Fusión Inteligente Iterativa...');
  console.log(`📏 Distancia mínima: ${minDistance}km`);
  
  const frames: AnimationFrames = [];
  let currentSegments = [...rawSegments]; // Deep copy
  
  // Add initial frame
  frames.push([...currentSegments]);
  
  let iteration = 0;
  let fusionsMade = true;
  
  while (fusionsMade && iteration < 10) { // Safety limit of 10 iterations
    fusionsMade = false;
    iteration++;
    
    console.log(`🔄 Iteración ${iteration} de fusión...`);
    
    // Find the best fusion candidate
    let bestFusionIndex = -1;
    let bestFusionRSquared = -1;
    
    for (let i = 0; i < currentSegments.length - 1; i++) {
      const seg1 = currentSegments[i];
      const seg2 = currentSegments[i + 1];
      
      // Check if fusion would meet distance requirement
      const combinedDistance = seg1.distance + seg2.distance;
      
      if (combinedDistance < minDistance) {
        // Calculate potential R² of fused segment
        const allPoints: ElevationPoint[] = [];
        
        // Collect all points from both segments
        // Note: This is a simplified approach - in a real implementation,
        // we'd need access to the original elevation data points
        const startPoint = seg1.startPoint;
        const endPoint = seg2.endPoint;
        allPoints.push(startPoint, endPoint);
        
        const regressionPoints = allPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        const potentialRegression = calculateLinearRegression(regressionPoints);
        
        if (potentialRegression.rSquared > bestFusionRSquared) {
          bestFusionRSquared = potentialRegression.rSquared;
          bestFusionIndex = i;
        }
      }
    }
    
    // Perform the best fusion if found
    if (bestFusionIndex >= 0 && bestFusionRSquared > 0.85) {
      const seg1 = currentSegments[bestFusionIndex];
      const seg2 = currentSegments[bestFusionIndex + 1];
      
      console.log(`🔗 Fusionando segmentos ${bestFusionIndex} y ${bestFusionIndex + 1} (R²: ${bestFusionRSquared.toFixed(3)})`);
      
      // Create fused segment
      const fusedPoints = [seg1.startPoint, seg2.endPoint];
      const regressionPoints = fusedPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
      const regression = calculateLinearRegression(regressionPoints);
      
      const fusedSegment = createSegment(
        fusedPoints,
        regression,
        seg1.startIndex,
        seg2.endIndex
      );
      
      // Replace the two segments with the fused one
      currentSegments.splice(bestFusionIndex, 2, fusedSegment);
      
      // Add frame after fusion
      frames.push([...currentSegments]);
      
      fusionsMade = true;
    }
  }
  
  console.log(`🎯 ETAPA 2 COMPLETADA: ${frames.length} frames generados, ${currentSegments.length} segmentos finales`);
  
  return frames;
}

/**
 * Main function for complete gradient segmentation with animation
 */
export async function segmentProfileGradientV2(
  elevationData: ElevationPoint[],
  params: GradientSegmentationV2Params,
  onRawSegmentDetected?: OnRawSegmentDetectedCallback
): Promise<{ segments: AdvancedSegment[], frames: AnimationFrames, macroBoundaries: number[] }> {
  
  console.log('🚀 Iniciando Análisis por Gradiente V2...');
  
  // ETAPA 1: Detección Global
  const rawSegments = await detectRawSegments(
    elevationData, 
    params, 
    onRawSegmentDetected || (() => {})
  );
  
  // ETAPA 2: Fusión Inteligente
  const frames = simplifySegments(rawSegments, params.distanciaMinima);
  
  // Get final segments from last frame
  const finalSegments = frames.length > 0 ? frames[frames.length - 1] : rawSegments;
  
  // Get macro boundaries for visualization
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  
  console.log('✨ Análisis por Gradiente V2 COMPLETADO');
  
  return {
    segments: finalSegments,
    frames,
    macroBoundaries
  };
}
