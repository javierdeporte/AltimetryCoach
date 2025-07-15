
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
  distanciaMinima: 0.20,         // km (200 meters)
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
 * Creates a segment object from elevation data points
 */
function createSegment(
  elevationData: ElevationPoint[],
  startIndex: number,
  endIndex: number
): AdvancedSegment {
  const segmentPoints = elevationData.slice(startIndex, endIndex + 1);
  const regressionPoints = segmentPoints.map(p => ({ x: p.displayDistance, y: p.displayElevation }));
  const regression = calculateLinearRegression(regressionPoints);
  
  const startPoint = segmentPoints[0];
  const endPoint = segmentPoints[segmentPoints.length - 1];
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
 * Calculate gradient between two points
 */
function calculateGradient(point1: ElevationPoint, point2: ElevationPoint): number {
  const elevationDiff = point2.displayElevation - point1.displayElevation;
  const distanceDiff = (point2.displayDistance - point1.displayDistance) * 1000; // Convert km to meters
  
  if (distanceDiff === 0) return 0;
  return (elevationDiff / distanceDiff) * 100; // Return as percentage
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
 * ETAPA 1: Detección Global de Puntos de Corte
 * Detecta TODOS los puntos de corte basados en cambio de gradiente
 * Los segmentos resultantes pueden ser menores a la distancia mínima
 */
export async function detectRawSegments(
  elevationData: ElevationPoint[],
  params: GradientSegmentationV2Params,
  onRawSegmentDetected?: OnRawSegmentDetectedCallback
): Promise<AdvancedSegment[]> {
  if (!elevationData || elevationData.length < 10) {
    return [];
  }

  console.log('🔍 ETAPA 1: Detección Global de Puntos de Corte...');
  
  // Macro-segmentation: Find significant extrema
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  console.log(`📍 Encontrados ${macroBoundaries.length} límites macro`);
  
  const rawSegments: AdvancedSegment[] = [];
  let totalSegmentsFound = 0;

  // Process each macro segment
  for (let macroIdx = 0; macroIdx < macroBoundaries.length - 1; macroIdx++) {
    const macroStart = macroBoundaries[macroIdx];
    const macroEnd = macroBoundaries[macroIdx + 1];
    
    if (macroEnd <= macroStart) continue;
    
    const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
    console.log(`🔬 Procesando macro segmento ${macroIdx + 1}/${macroBoundaries.length - 1}`);
    
    let currentStart = 0;
    
    // Detect cut points within this macro segment
    while (currentStart < macroSegmentData.length - 1) {
      let currentEnd = currentStart + 1;
      let bestEndpoint = currentEnd;
      
      // Grow segment until we find a significant gradient change
      while (currentEnd < macroSegmentData.length - 1) {
        // Calculate current segment gradient
        const currentSegmentStart = macroSegmentData[currentStart];
        const currentSegmentEnd = macroSegmentData[currentEnd];
        const currentGradient = calculateGradient(currentSegmentStart, currentSegmentEnd);
        
        // Look ahead for next segment gradient
        const nextSegmentStart = macroSegmentData[currentEnd];
        const nextSegmentEnd = macroSegmentData[Math.min(currentEnd + 5, macroSegmentData.length - 1)];
        const nextGradient = calculateGradient(nextSegmentStart, nextSegmentEnd);
        
        const gradientChange = Math.abs(currentGradient - nextGradient);
        
        // Check if we should cut here based on gradient change
        if (gradientChange >= params.cambioGradiente) {
          bestEndpoint = currentEnd;
          break;
        }
        
        currentEnd++;
        bestEndpoint = currentEnd;
      }
      
      // Create segment (regardless of distance - this is raw detection)
      const segment = createSegment(elevationData, macroStart + currentStart, macroStart + bestEndpoint);
      rawSegments.push(segment);
      totalSegmentsFound++;
      
      console.log(`✅ Punto de corte detectado: ${totalSegmentsFound} (Distancia: ${segment.distance.toFixed(3)}km)`);
      
      // Call animation callback with minimal delay
      if (onRawSegmentDetected) {
        await new Promise(resolve => {
          setTimeout(() => {
            onRawSegmentDetected(segment, totalSegmentsFound);
            resolve(undefined);
          }, 10); // Reduced to 10ms for faster animation
        });
      }
      
      currentStart = bestEndpoint;
    }
  }
  
  console.log(`🎯 ETAPA 1 COMPLETADA: ${totalSegmentsFound} puntos de corte detectados`);
  return rawSegments;
}

/**
 * ETAPA 2: Fusión Inteligente basada en Distancia Mínima
 * Fusiona segmentos adyacentes que sean menores a la distancia mínima
 * Prioriza fusiones que mantengan mejor R²
 */
export function simplifySegments(
  rawSegments: AdvancedSegment[],
  elevationData: ElevationPoint[],
  minDistanceKm: number
): AnimationFrames {
  if (!rawSegments || rawSegments.length === 0) {
    return [];
  }

  console.log('🔧 ETAPA 2: Fusión Inteligente por Distancia Mínima...');
  console.log(`📏 Distancia mínima: ${minDistanceKm}km (${minDistanceKm * 1000}m)`);
  
  const frames: AnimationFrames = [];
  let currentSegments = [...rawSegments];
  
  // Add initial frame
  frames.push([...currentSegments]);
  
  let iteration = 0;
  let fusionsMade = true;
  
  while (fusionsMade && iteration < 20) {
    fusionsMade = false;
    iteration++;
    
    console.log(`🔄 Iteración ${iteration} de fusión...`);
    
    // Find segments that are shorter than minimum distance
    let bestFusionIndex = -1;
    let bestFusionRSquared = -1;
    
    for (let i = 0; i < currentSegments.length; i++) {
      const segment = currentSegments[i];
      
      // Check if this segment is shorter than minimum distance
      if (segment.distance < minDistanceKm) {
        console.log(`📐 Segmento ${i} es corto: ${segment.distance.toFixed(3)}km < ${minDistanceKm}km`);
        
        // Try to fuse with previous segment
        if (i > 0) {
          const prevSegment = currentSegments[i - 1];
          const fusedSegment = createSegment(elevationData, prevSegment.startIndex, segment.endIndex);
          
          if (fusedSegment.rSquared > bestFusionRSquared) {
            bestFusionRSquared = fusedSegment.rSquared;
            bestFusionIndex = i - 1; // Fuse with previous
          }
        }
        
        // Try to fuse with next segment
        if (i < currentSegments.length - 1) {
          const nextSegment = currentSegments[i + 1];
          const fusedSegment = createSegment(elevationData, segment.startIndex, nextSegment.endIndex);
          
          if (fusedSegment.rSquared > bestFusionRSquared) {
            bestFusionRSquared = fusedSegment.rSquared;
            bestFusionIndex = i; // Fuse with next
          }
        }
      }
    }
    
    // Perform the best fusion if found
    if (bestFusionIndex >= 0 && bestFusionRSquared > 0.7) {
      const seg1 = currentSegments[bestFusionIndex];
      const seg2 = currentSegments[bestFusionIndex + 1];
      
      console.log(`🔗 Fusionando segmentos ${bestFusionIndex} y ${bestFusionIndex + 1} (R²: ${bestFusionRSquared.toFixed(3)})`);
      
      // Create fused segment
      const fusedSegment = createSegment(elevationData, seg1.startIndex, seg2.endIndex);
      
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
  
  // ETAPA 1: Detección Global de Puntos de Corte
  const rawSegments = await detectRawSegments(
    elevationData, 
    params, 
    onRawSegmentDetected
  );
  
  // ETAPA 2: Fusión Inteligente por Distancia
  const frames = simplifySegments(rawSegments, elevationData, params.distanciaMinima);
  
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
