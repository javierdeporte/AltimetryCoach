
import { ElevationPoint, AdvancedSegment, RegressionResult } from './types';

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
};

export interface GradientSegmentationV2Params {
  prominenciaMinima: number;     // For macro-segmentation (meters)
  distanciaMinima: number;       // Minimum segment distance (km)
  cambioGradiente: number;       // Gradient change threshold (degrees) - now more restrictive
  calidadR2Minima: number;       // R² quality threshold (0-100%)
}

export const DEFAULT_GRADIENT_V2_PARAMS: GradientSegmentationV2Params = {
  prominenciaMinima: 30,         // meters
  distanciaMinima: 0.20,         // km (200 meters)
  cambioGradiente: 5,            // 5 degrees gradient change (more restrictive)
  calidadR2Minima: 98            // 98% R² quality
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
 * Convert slope to degrees
 */
function slopeToDegrees(slope: number): number {
  return Math.atan(slope) * (180 / Math.PI);
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
 * ETAPA 1: Detección Híbrida R²-Gradiente
 * Utiliza R² como criterio principal y detecta cambios de gradiente significativos
 */
export async function detectRawSegments(
  elevationData: ElevationPoint[],
  params: GradientSegmentationV2Params,
  onRawSegmentDetected?: OnRawSegmentDetectedCallback
): Promise<AdvancedSegment[]> {
  if (!elevationData || elevationData.length < 10) {
    return [];
  }

  console.log('🔍 ETAPA 1: Detección Híbrida R²-Gradiente...');
  console.log(`📊 R² mínimo: ${params.calidadR2Minima}%`);
  console.log(`📐 Cambio gradiente: ${params.cambioGradiente}°`);
  
  // Macro-segmentation: Find significant extrema
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  console.log(`📍 Encontrados ${macroBoundaries.length} límites macro`);
  
  const rawSegments: AdvancedSegment[] = [];
  let totalSegmentsFound = 0;
  const r2Threshold = params.calidadR2Minima / 100; // Convert percentage to decimal
  const gradientThresholdDegrees = params.cambioGradiente;

  // Process each macro segment
  for (let macroIdx = 0; macroIdx < macroBoundaries.length - 1; macroIdx++) {
    const macroStart = macroBoundaries[macroIdx];
    const macroEnd = macroBoundaries[macroIdx + 1];
    
    if (macroEnd <= macroStart) continue;
    
    const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
    console.log(`🔬 Procesando macro segmento ${macroIdx + 1}/${macroBoundaries.length - 1}`);
    
    let currentStart = 0;
    
    // Hybrid R²-Gradient detection within this macro segment
    while (currentStart < macroSegmentData.length - 1) {
      let currentEnd = currentStart + 5; // Start with minimum points for regression
      let bestEndpoint = Math.min(currentEnd, macroSegmentData.length - 1);
      let foundCutPoint = false;
      
      // Grow segment while maintaining high R² and checking for gradient changes
      while (currentEnd < macroSegmentData.length - 1 && !foundCutPoint) {
        // Calculate R² for current segment
        const currentSegment = createSegment(elevationData, macroStart + currentStart, macroStart + currentEnd);
        
        // Check R² quality
        if (currentSegment.rSquared < r2Threshold) {
          console.log(`📊 R² cayó a ${(currentSegment.rSquared * 100).toFixed(1)}% - Punto de corte por calidad`);
          bestEndpoint = currentEnd - 1; // Use previous endpoint with good R²
          foundCutPoint = true;
          break;
        }
        
        // Check gradient change if we have enough future points
        if (currentEnd + 10 < macroSegmentData.length) {
          // Current segment slope
          const currentSlope = currentSegment.slope;
          const currentGradientDegrees = Math.abs(slopeToDegrees(currentSlope));
          
          // Look-ahead segment slope
          const futureSegment = createSegment(
            elevationData, 
            macroStart + currentEnd, 
            macroStart + Math.min(currentEnd + 10, macroSegmentData.length - 1)
          );
          const futureSlope = futureSegment.slope;
          const futureGradientDegrees = Math.abs(slopeToDegrees(futureSlope));
          
          // Calculate gradient change in degrees
          const gradientChangeDegrees = Math.abs(currentGradientDegrees - futureGradientDegrees);
          
          if (gradientChangeDegrees >= gradientThresholdDegrees) {
            console.log(`📐 Cambio de gradiente detectado: ${gradientChangeDegrees.toFixed(1)}° - Punto de corte`);
            bestEndpoint = currentEnd;
            foundCutPoint = true;
            break;
          }
        }
        
        currentEnd++;
        bestEndpoint = currentEnd;
      }
      
      // Create segment
      const segment = createSegment(elevationData, macroStart + currentStart, macroStart + bestEndpoint);
      rawSegments.push(segment);
      totalSegmentsFound++;
      
      console.log(`✅ Segmento detectado: ${totalSegmentsFound} (R²: ${(segment.rSquared * 100).toFixed(1)}%, Distancia: ${segment.distance.toFixed(3)}km)`);
      
      // Call animation callback with minimal delay
      if (onRawSegmentDetected) {
        await new Promise(resolve => {
          setTimeout(() => {
            onRawSegmentDetected(segment, totalSegmentsFound);
            resolve(undefined);
          }, 20); // Slightly faster animation
        });
      }
      
      currentStart = bestEndpoint;
    }
  }
  
  console.log(`🎯 ETAPA 1 COMPLETADA: ${totalSegmentsFound} segmentos de alta calidad detectados`);
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
  
  while (fusionsMade && iteration < 15) { // Reduced iterations for efficiency
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
    if (bestFusionIndex >= 0 && bestFusionRSquared > 0.8) { // Slightly lower threshold for fusion
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
  
  console.log('🚀 Iniciando Análisis Híbrido R²-Gradiente V2...');
  
  // ETAPA 1: Detección Híbrida R²-Gradiente
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
  
  console.log('✨ Análisis Híbrido R²-Gradiente V2 COMPLETADO');
  console.log(`📊 Segmentos finales: ${finalSegments.length}, R² promedio: ${(finalSegments.reduce((sum, s) => sum + s.rSquared, 0) / finalSegments.length * 100).toFixed(1)}%`);
  
  return {
    segments: finalSegments,
    frames,
    macroBoundaries
  };
}
