
import { ElevationPoint, AdvancedSegment, RegressionResult } from './types';

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
};

export interface GradientSegmentationV2Params {
  prominenciaMinima: number;     // For macro-segmentation (meters)
  distanciaMinima: number;       // Minimum segment distance (km)
  cambioGradiente: number;       // Gradient change threshold (degrees)
  calidadR2Minima: number;       // R² quality threshold (0-100%)
}

export const DEFAULT_GRADIENT_V2_PARAMS: GradientSegmentationV2Params = {
  prominenciaMinima: 30,         // meters
  distanciaMinima: 0.20,         // km (200 meters)
  cambioGradiente: 5,            // 5 degrees gradient change
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
 * ETAPA 1: Detección Híbrida R²-Gradiente (CORREGIDA)
 * 1. Construye segmentos con R² de alta calidad (98%)
 * 2. Valida cambios de gradiente en ventana futura fija (~100m)
 * 3. NO aplica distancia mínima durante construcción (para no saltar cambios de pendiente)
 * 4. Genera puntos de corte basados en R² + gradiente
 */
export async function detectRawSegments(
  elevationData: ElevationPoint[],
  params: GradientSegmentationV2Params,
  onRawSegmentDetected?: OnRawSegmentDetectedCallback
): Promise<AdvancedSegment[]> {
  if (!elevationData || elevationData.length < 10) {
    return [];
  }

  console.log('🔍 ETAPA 1: Detección Híbrida R²-Gradiente (CORREGIDA)...');
  console.log(`📊 R² mínimo: ${params.calidadR2Minima}%`);
  console.log(`📐 Cambio gradiente: ${params.cambioGradiente}°`);
  console.log(`📏 Ventana futura fija: ~100m (no afectada por distancia mínima)`);
  
  // Macro-segmentation: Find significant extrema
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  console.log(`📍 Encontrados ${macroBoundaries.length} límites macro (prominencias)`);
  
  const rawSegments: AdvancedSegment[] = [];
  let totalSegmentsFound = 0;
  const r2Threshold = params.calidadR2Minima / 100; // Convert percentage to decimal
  const gradientThresholdDegrees = params.cambioGradiente;
  const FUTURE_WINDOW_DISTANCE = 0.10; // Fixed 100m window for gradient detection

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
        
        // PRIMARY CRITERION: Check R² quality
        if (currentSegment.rSquared < r2Threshold) {
          console.log(`📊 R² cayó a ${(currentSegment.rSquared * 100).toFixed(1)}% - Punto de corte por calidad`);
          bestEndpoint = currentEnd - 1; // Use previous endpoint with good R²
          foundCutPoint = true;
          break;
        }
        
        // SECONDARY CRITERION: Check gradient change with FIXED future window
        if (currentEnd + 5 < macroSegmentData.length) {
          // Find future window endpoint based on FIXED distance (~100m)
          let futureEndIndex = currentEnd + 5;
          const currentDistance = elevationData[macroStart + currentEnd].displayDistance;
          
          // Look for endpoint at ~100m ahead
          for (let i = currentEnd + 5; i < macroSegmentData.length; i++) {
            const futureDistance = elevationData[macroStart + i].displayDistance;
            if (futureDistance - currentDistance >= FUTURE_WINDOW_DISTANCE) {
              futureEndIndex = i;
              break;
            }
          }
          
          // Only proceed if we have enough points for future window
          if (futureEndIndex < macroSegmentData.length) {
            // Current segment slope
            const currentSlope = currentSegment.slope;
            const currentGradientDegrees = Math.abs(slopeToDegrees(currentSlope));
            
            // Future window segment slope
            const futureSegment = createSegment(
              elevationData, 
              macroStart + currentEnd, 
              macroStart + futureEndIndex
            );
            
            // Only consider future window if it has good R² quality
            if (futureSegment.rSquared >= 0.90) { // Lower threshold for future window to avoid noise
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
          }
        }
        
        currentEnd++;
        bestEndpoint = currentEnd;
      }
      
      // Create segment (WITHOUT distance validation in Phase 1)
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
          }, 20);
        });
      }
      
      currentStart = bestEndpoint;
    }
  }
  
  console.log(`🎯 ETAPA 1 COMPLETADA: ${totalSegmentsFound} segmentos de alta calidad detectados`);
  console.log(`⚠️ NOTA: Algunos segmentos pueden ser menores a distancia mínima - se resolverá en ETAPA 2`);
  return rawSegments;
}

/**
 * ETAPA 2: Fusión Inteligente basada en Distancia Mínima (MEJORADA)
 * Ahora la distancia mínima entra en juego y evalúa las distancias de los segmentos
 * para fusionar los adyacentes que generen menor pérdida de R²
 */
export function simplifySegments(
  rawSegments: AdvancedSegment[],
  elevationData: ElevationPoint[],
  minDistanceKm: number
): AnimationFrames {
  if (!rawSegments || rawSegments.length === 0) {
    return [];
  }

  console.log('🔧 ETAPA 2: Fusión Inteligente por Distancia Mínima (MEJORADA)...');
  console.log(`📏 Distancia mínima: ${minDistanceKm}km (${minDistanceKm * 1000}m)`);
  
  const frames: AnimationFrames = [];
  let currentSegments = [...rawSegments];
  
  // Add initial frame
  frames.push([...currentSegments]);
  
  let iteration = 0;
  let fusionsMade = true;
  
  while (fusionsMade && iteration < 25) { // Increased iteration limit
    fusionsMade = false;
    iteration++;
    
    console.log(`🔄 Iteración ${iteration} de fusión...`);
    
    // Find ALL segments that are shorter than minimum distance
    const shortSegments = currentSegments
      .map((segment, index) => ({ segment, index, distance: segment.distance }))
      .filter(item => item.distance < minDistanceKm)
      .sort((a, b) => a.distance - b.distance); // Start with shortest segments
    
    if (shortSegments.length === 0) {
      console.log(`✅ No hay más segmentos cortos - fusión completada`);
      break;
    }
    
    console.log(`📐 Encontrados ${shortSegments.length} segmentos cortos para fusionar`);
    
    // Process each short segment
    for (const { index: segmentIndex } of shortSegments) {
      // Re-check index validity after previous fusions
      if (segmentIndex >= currentSegments.length) continue;
      
      const segment = currentSegments[segmentIndex];
      if (!segment || segment.distance >= minDistanceKm) continue;
      
      let bestFusionOption = null;
      let bestR2 = -1;
      
      // Try fusion with previous segment
      if (segmentIndex > 0) {
        const prevSegment = currentSegments[segmentIndex - 1];
        const fusedSegment = createSegment(elevationData, prevSegment.startIndex, segment.endIndex);
        
        // Prioritize fusion that maintains better overall R²
        const avgR2 = (prevSegment.rSquared + segment.rSquared) / 2;
        const r2Loss = avgR2 - fusedSegment.rSquared;
        const r2Score = fusedSegment.rSquared - (r2Loss * 0.1); // Penalize R² loss slightly
        
        if (r2Score > bestR2) {
          bestR2 = r2Score;
          bestFusionOption = {
            type: 'previous',
            fusedSegment,
            removeIndices: [segmentIndex - 1, segmentIndex],
            insertIndex: segmentIndex - 1,
            r2Loss
          };
        }
      }
      
      // Try fusion with next segment
      if (segmentIndex < currentSegments.length - 1) {
        const nextSegment = currentSegments[segmentIndex + 1];
        const fusedSegment = createSegment(elevationData, segment.startIndex, nextSegment.endIndex);
        
        // Prioritize fusion that maintains better overall R²
        const avgR2 = (segment.rSquared + nextSegment.rSquared) / 2;
        const r2Loss = avgR2 - fusedSegment.rSquared;
        const r2Score = fusedSegment.rSquared - (r2Loss * 0.1); // Penalize R² loss slightly
        
        if (r2Score > bestR2) {
          bestR2 = r2Score;
          bestFusionOption = {
            type: 'next',
            fusedSegment,
            removeIndices: [segmentIndex, segmentIndex + 1],
            insertIndex: segmentIndex,
            r2Loss
          };
        }
      }
      
      // Perform fusion if we found a reasonable option
      if (bestFusionOption && bestFusionOption.fusedSegment.rSquared > 0.75) { // More lenient R² threshold for fusion
        console.log(`🔗 Fusionando segmento ${segmentIndex} con ${bestFusionOption.type} (R²: ${bestFusionOption.fusedSegment.rSquared.toFixed(3)}, Nueva distancia: ${bestFusionOption.fusedSegment.distance.toFixed(3)}km, Pérdida R²: ${bestFusionOption.r2Loss.toFixed(3)})`);
        
        // Remove the two segments and insert the fused one
        currentSegments.splice(bestFusionOption.removeIndices[0], 2, bestFusionOption.fusedSegment);
        
        fusionsMade = true;
        break; // Start over with new segment list
      }
    }
    
    // Add frame after fusion iteration
    if (fusionsMade) {
      frames.push([...currentSegments]);
    }
  }
  
  // Final verification: log any remaining short segments
  const finalShortSegments = currentSegments.filter(seg => seg.distance < minDistanceKm);
  if (finalShortSegments.length > 0) {
    console.log(`⚠️ ADVERTENCIA: ${finalShortSegments.length} segmentos aún por debajo de distancia mínima después de ${iteration} iteraciones`);
    finalShortSegments.forEach((seg, i) => {
      console.log(`   - Segmento ${i + 1}: ${seg.distance.toFixed(3)}km (R²: ${seg.rSquared.toFixed(3)})`);
    });
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
  
  console.log('🚀 Iniciando Análisis Híbrido R²-Gradiente V2 (CORREGIDO)...');
  
  // ETAPA 1: Detección Híbrida R²-Gradiente (sin validación de distancia)
  const rawSegments = await detectRawSegments(
    elevationData, 
    params, 
    onRawSegmentDetected
  );
  
  // ETAPA 2: Fusión Inteligente por Distancia (aquí entra la distancia mínima)
  const frames = simplifySegments(rawSegments, elevationData, params.distanciaMinima);
  
  // Get final segments from last frame
  const finalSegments = frames.length > 0 ? frames[frames.length - 1] : rawSegments;
  
  // Get macro boundaries for visualization (FIXED: now returning them properly)
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  
  console.log('✨ Análisis Híbrido R²-Gradiente V2 COMPLETADO (CORREGIDO)');
  console.log(`📊 Segmentos finales: ${finalSegments.length}, R² promedio: ${(finalSegments.reduce((sum, s) => sum + s.rSquared, 0) / finalSegments.length * 100).toFixed(1)}%`);
  console.log(`📍 Prominencias detectadas: ${macroBoundaries.length} puntos macro`);
  
  return {
    segments: finalSegments,
    frames,
    macroBoundaries // FIXED: Now properly returned for visualization
  };
}
