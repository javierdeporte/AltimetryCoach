
import { ElevationPoint, AdvancedSegment, RegressionResult } from './types';

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
};

export interface GradientSegmentationParams {
  prominenciaMinima: number;     // For macro-segmentation (meters)
  distanciaMinima: number;       // Minimum segment distance (km)
  cambioGradiente: number;       // Gradient change threshold (percentage)
}

export const DEFAULT_GRADIENT_PARAMS: GradientSegmentationParams = {
  prominenciaMinima: 30,         // meters
  distanciaMinima: 0.20,         // km  
  cambioGradiente: 3             // 3% gradient change
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
 * Calculate gradient between two points
 */
function calculateGradient(point1: ElevationPoint, point2: ElevationPoint): number {
  const elevationDiff = point2.displayElevation - point1.displayElevation;
  const distanceDiff = (point2.displayDistance - point1.displayDistance) * 1000; // Convert km to meters
  
  if (distanceDiff === 0) return 0;
  return (elevationDiff / distanceDiff) * 100; // Return as percentage
}

/**
 * ETAPA 2: Micro-Segmentación Táctica con Criterio de Gradiente Futuro
 */
function generateGradientBasedBreakpoints(
  macroSegmentData: ElevationPoint[],
  globalIndexOffset: number,
  params: GradientSegmentationParams
): number[] {
  const breakpoints: number[] = [];
  let currentStart = 0;
  
  // Future window size: approximately 100m ahead
  const FUTURE_WINDOW_DISTANCE = 0.1; // km

  while (currentStart < macroSegmentData.length - 1) {
    let currentEnd = currentStart + 1;
    let candidateSegmentGradient = 0;
    
    // Grow segment point by point
    while (currentEnd < macroSegmentData.length) {
      const candidatePoints = macroSegmentData.slice(currentStart, currentEnd + 1);
      
      if (candidatePoints.length >= 2) {
        // Calculate current candidate segment gradient
        const startPoint = candidatePoints[0];
        const endPoint = candidatePoints[candidatePoints.length - 1];
        candidateSegmentGradient = calculateGradient(startPoint, endPoint);
        
        // Look ahead for future gradient window
        let futureWindowEnd = currentEnd;
        let futureDistance = 0;
        
        // Find points within the future window (100m ahead)
        while (futureWindowEnd < macroSegmentData.length - 1 && futureDistance < FUTURE_WINDOW_DISTANCE) {
          futureWindowEnd++;
          futureDistance = macroSegmentData[futureWindowEnd].displayDistance - macroSegmentData[currentEnd].displayDistance;
        }
        
        if (futureWindowEnd > currentEnd) {
          // Calculate future window gradient
          const futureStartPoint = macroSegmentData[currentEnd];
          const futureEndPoint = macroSegmentData[futureWindowEnd];
          const futureGradient = calculateGradient(futureStartPoint, futureEndPoint);
          
          // Check if gradient change exceeds threshold
          const gradientChange = Math.abs(candidateSegmentGradient - futureGradient);
          
          if (gradientChange >= params.cambioGradiente) {
            // Check minimum distance requirement
            const segmentDistance = endPoint.displayDistance - startPoint.displayDistance;
            
            if (segmentDistance >= params.distanciaMinima) {
              // Confirm breakpoint
              breakpoints.push(globalIndexOffset + currentEnd);
              currentStart = currentEnd;
              break;
            }
          }
        }
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
 * Creates final segments from breakpoints
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
      const globalStartIndex = globalIndexOffset + localStartIndex;
      const globalEndIndex = globalIndexOffset + localEndIndex;
      segments.push(createSegment(segmentPoints, regression, globalStartIndex, globalEndIndex));
    }
  }
  
  return segments;
}

/**
 * Main Gradient-Based Segmentation Function
 */
export function segmentProfileGradient(
  elevationData: ElevationPoint[],
  params: GradientSegmentationParams
): { segments: AdvancedSegment[], macroBoundaries: number[] } {
  if (!elevationData || elevationData.length < 10) {
    return { segments: [], macroBoundaries: [] };
  }

  console.log('Starting Gradient-based segmentation with params:', params);
  
  // ETAPA 1: Macro-Segmentación Estratégica
  const macroBoundaries = findSignificantExtrema(elevationData, params.prominenciaMinima);
  console.log('Gradient Macro boundaries found:', macroBoundaries.length);
  
  // ETAPA 2: Micro-Segmentación con Criterio de Gradiente Futuro
  const finalSegments: AdvancedSegment[] = [];
  
  for (let i = 0; i < macroBoundaries.length - 1; i++) {
    const macroStart = macroBoundaries[i];
    const macroEnd = macroBoundaries[i + 1];
    
    if (macroEnd > macroStart) {
      const macroSegmentData = elevationData.slice(macroStart, macroEnd + 1);
      
      // Generate breakpoints using gradient criteria
      const gradientBreakpoints = generateGradientBasedBreakpoints(
        macroSegmentData, 
        macroStart, 
        params
      );
      
      // Convert global breakpoints to local indices
      const localBreakpoints = gradientBreakpoints.map(bp => bp - macroStart);
      
      // Create final segments for this macro
      const macroSegments = createFinalSegmentsForMacro(
        macroSegmentData, 
        localBreakpoints, 
        macroStart
      );
      
      finalSegments.push(...macroSegments);
    }
  }
  
  console.log(`Gradient segmentation generated ${finalSegments.length} segments`);
  
  return { segments: finalSegments, macroBoundaries };
}
