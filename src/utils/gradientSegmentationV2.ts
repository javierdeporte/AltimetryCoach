
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
  calidadR2Minima: number;       // Minimum R² quality for segment validation
}

export const DEFAULT_GRADIENT_V2_PARAMS: GradientSegmentationV2Params = {
  prominenciaMinima: 30,         // meters
  distanciaMinima: 0.20,         // km (200 meters)
  cambioGradiente: 3,            // 3% gradient change
  calidadR2Minima: 0.85          // 85% R² minimum quality
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
 * Validates if a segment should be kept based on R² quality
 */
function validateSegmentQuality(
  elevationData: ElevationPoint[],
  startIndex: number,
  endIndex: number,
  minR2: number
): boolean {
  if (endIndex - startIndex < 5) return false; // Too short to validate
  
  const segment = createSegment(elevationData, startIndex, endIndex);
  return segment.rSquared >= minR2;
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
 * ETAPA 1: Detección Híbrida con Filtro de Calidad R²
 * Detecta puntos de corte por gradiente Y valida su calidad con R²
 */
export async function detectRawSegments(
  elevationData: ElevationPoint[],
  params: GradientSegmentationV2Params,
  onRawSegmentDetected?: OnRawSegmentDetectedCallback
): Promise<AdvancedSegment[]> {
  if (!elevationData || elevationData.length < 10) {
    return [];
  }

  console.log('🔍 ETAPA 1: Detección Híbrida (Gradiente + R²)...');
  console.log('📊 Parámetros:', {
    cambioGradiente: params.cambioGradiente,
    calidadR2Minima: params.calidadR2Minima,
    prominenciaMinima: params.prominenciaMinima
  });
  
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
    const cutPoints: number[] = [0]; // Always start with first point
    
    // PASO 1: Detectar puntos de corte por gradiente
    for (let i = 10; i < macroSegmentData.length - 10; i += 5) { // Salto de 5 puntos para eficiencia
      const windowSize = 10;
      const startIdx = Math.max(0, i - windowSize);
      const endIdx = Math.min(macroSegmentData.length - 1, i + windowSize);
      
      // Calcular gradiente antes y después
      const beforeGradient = calculateGradient(
        macroSegmentData[startIdx],
        macroSegmentData[i]
      );
      const afterGradient = calculateGradient(
        macroSegmentData[i],
        macroSegmentData[endIdx]
      );
      
      const gradientChange = Math.abs(beforeGradient - afterGradient);
      
      // Si hay cambio significativo de gradiente, considerar como punto de corte
      if (gradientChange >= params.cambioGradiente) {
        cutPoints.push(i);
      }
    }
    
    cutPoints.push(macroSegmentData.length - 1); // Always end with last point
    
    // PASO 2: Validar calidad R² y filtrar puntos de corte
    const validatedCutPoints: number[] = [0];
    
    for (let i = 1; i < cutPoints.length; i++) {
      const prevCut = validatedCutPoints[validatedCutPoints.length - 1];
      const currentCut = cutPoints[i];
      
      // Validar si el segmento desde el último punto válido hasta el actual tiene buena calidad
      const isValidSegment = validateSegmentQuality(
        macroSegmentData, 
        prevCut, 
        currentCut, 
        params.calidadR2Minima
      );
      
      if (isValidSegment || currentCut === cutPoints[cutPoints.length - 1]) {
        validatedCutPoints.push(currentCut);
        console.log(`✅ Punto de corte validado: ${currentCut} (R² >= ${params.calidadR2Minima})`);
      } else {
        console.log(`❌ Punto de corte rechazado: ${currentCut} (R² < ${params.calidadR2Minima})`);
      }
    }
    
    // PASO 3: Crear segmentos validados
    for (let i = 0; i < validatedCutPoints.length - 1; i++) {
      const segmentStart = validatedCutPoints[i];
      const segmentEnd = validatedCutPoints[i + 1];
      
      const segment = createSegment(elevationData, macroStart + segmentStart, macroStart + segmentEnd);
      rawSegments.push(segment);
      totalSegmentsFound++;
      
      console.log(`🎯 Segmento híbrido creado: ${totalSegmentsFound} (Distancia: ${segment.distance.toFixed(3)}km, R²: ${segment.rSquared.toFixed(3)})`);
      
      // Call animation callback with increased delay for better visualization
      if (onRawSegmentDetected) {
        await new Promise(resolve => {
          setTimeout(() => {
            onRawSegmentDetected(segment, totalSegmentsFound);
            resolve(undefined);
          }, 50); // Increased to 50ms for better animation
        });
      }
    }
  }
  
  console.log(`🎯 ETAPA 1 COMPLETADA: ${totalSegmentsFound} segmentos híbridos detectados`);
  console.log(`📊 R² promedio: ${(rawSegments.reduce((acc, s) => acc + s.rSquared, 0) / rawSegments.length).toFixed(3)}`);
  
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
    
    // Perform the best fusion if found and quality is acceptable
    if (bestFusionIndex >= 0 && bestFusionRSquared > 0.75) { // Slightly lower threshold for fusion
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
  
  console.log('🚀 Iniciando Análisis Híbrido (Gradiente + R²)...');
  
  // ETAPA 1: Detección Híbrida con Validación R²
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
  
  console.log('✨ Análisis Híbrido COMPLETADO');
  console.log(`📊 Segmentos finales: ${finalSegments.length}`);
  console.log(`📊 R² promedio final: ${(finalSegments.reduce((acc, s) => acc + s.rSquared, 0) / finalSegments.length).toFixed(3)}`);
  
  return {
    segments: finalSegments,
    frames,
    macroBoundaries
  };
}
