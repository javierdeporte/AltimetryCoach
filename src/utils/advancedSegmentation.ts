
interface ElevationPoint {
  distance: number;
  elevation: number;
  displayDistance: number;
  displayElevation: number;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

interface AdvancedSegment {
  startIndex: number;
  endIndex: number;
  startPoint: ElevationPoint;
  endPoint: ElevationPoint;
  slope: number;
  intercept: number;
  rSquared: number;
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  type: 'asc' | 'desc' | 'hor';
  color: string;
  cutReason?: string; // New field to track why the segment was cut
}

interface AdvancedSegmentationParams {
  rSquaredThreshold: number;
  minSegmentPoints: number;
  minSegmentDistance: number; // in km
  slopeChangeThreshold: number; // percentage change that triggers a cut
  inflectionSensitivity: number; // multiplier for inflection point detection
  detectInflectionPoints: boolean; // toggle for inflection point detection
}

interface SlopeChange {
  index: number;
  previousSlope: number;
  currentSlope: number;
  changePercent: number;
}

interface InflectionPoint {
  index: number;
  type: 'peak' | 'valley' | 'direction_change';
  significance: number;
}

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
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
 * Calculates slope between two points as percentage grade
 */
function calculateSlopeBetweenPoints(point1: ElevationPoint, point2: ElevationPoint): number {
  const elevationDiff = point2.displayElevation - point1.displayElevation;
  const distanceDiff = (point2.displayDistance - point1.displayDistance) * 1000; // Convert to meters
  
  if (distanceDiff === 0) return 0;
  return (elevationDiff / distanceDiff) * 100; // Return as percentage
}

/**
 * Detects significant slope changes in the elevation data
 */
function detectSlopeChanges(
  elevationData: ElevationPoint[], 
  windowSize: number = 10,
  threshold: number = 3
): SlopeChange[] {
  const slopeChanges: SlopeChange[] = [];
  
  if (elevationData.length < windowSize * 2) return slopeChanges;
  
  for (let i = windowSize; i < elevationData.length - windowSize; i++) {
    // Calculate slope before current point
    const beforeStart = Math.max(0, i - windowSize);
    const beforeEnd = i;
    const beforeSlope = calculateSlopeBetweenPoints(
      elevationData[beforeStart], 
      elevationData[beforeEnd]
    );
    
    // Calculate slope after current point
    const afterStart = i;
    const afterEnd = Math.min(elevationData.length - 1, i + windowSize);
    const afterSlope = calculateSlopeBetweenPoints(
      elevationData[afterStart], 
      elevationData[afterEnd]
    );
    
    // Calculate change in slope
    const slopeChange = Math.abs(afterSlope - beforeSlope);
    
    if (slopeChange >= threshold) {
      slopeChanges.push({
        index: i,
        previousSlope: beforeSlope,
        currentSlope: afterSlope,
        changePercent: slopeChange
      });
    }
  }
  
  return slopeChanges;
}

/**
 * Detects inflection points (peaks, valleys, direction changes)
 */
function detectInflectionPoints(
  elevationData: ElevationPoint[], 
  sensitivity: number = 1.0,
  windowSize: number = 5
): InflectionPoint[] {
  const inflectionPoints: InflectionPoint[] = [];
  
  if (elevationData.length < windowSize * 2 + 1) return inflectionPoints;
  
  for (let i = windowSize; i < elevationData.length - windowSize; i++) {
    const leftWindow = elevationData.slice(i - windowSize, i);
    const rightWindow = elevationData.slice(i + 1, i + windowSize + 1);
    const currentPoint = elevationData[i];
    
    // Calculate average elevations in windows
    const leftAvg = leftWindow.reduce((sum, p) => sum + p.displayElevation, 0) / leftWindow.length;
    const rightAvg = rightWindow.reduce((sum, p) => sum + p.displayElevation, 0) / rightWindow.length;
    const currentElev = currentPoint.displayElevation;
    
    // Detect peaks (current point higher than both sides)
    if (currentElev > leftAvg + sensitivity && currentElev > rightAvg + sensitivity) {
      const significance = Math.min(currentElev - leftAvg, currentElev - rightAvg);
      inflectionPoints.push({
        index: i,
        type: 'peak',
        significance: significance
      });
    }
    
    // Detect valleys (current point lower than both sides)
    if (currentElev < leftAvg - sensitivity && currentElev < rightAvg - sensitivity) {
      const significance = Math.min(leftAvg - currentElev, rightAvg - currentElev);
      inflectionPoints.push({
        index: i,
        type: 'valley',
        significance: significance
      });
    }
    
    // Detect direction changes
    const leftSlope = calculateSlopeBetweenPoints(leftWindow[0], currentPoint);
    const rightSlope = calculateSlopeBetweenPoints(currentPoint, rightWindow[rightWindow.length - 1]);
    
    if (Math.sign(leftSlope) !== Math.sign(rightSlope) && 
        Math.abs(leftSlope) > sensitivity && Math.abs(rightSlope) > sensitivity) {
      inflectionPoints.push({
        index: i,
        type: 'direction_change',
        significance: Math.abs(leftSlope) + Math.abs(rightSlope)
      });
    }
  }
  
  return inflectionPoints;
}

/**
 * Determines segment type based on slope
 */
function getSegmentType(slope: number): 'asc' | 'desc' | 'hor' {
  // Convert slope to percentage for easier interpretation
  const slopePercent = slope * 100;
  
  if (slopePercent > 2) return 'asc';
  if (slopePercent < -2) return 'desc';
  return 'hor';
}

/**
 * Determines why a segment should be cut based on multiple criteria
 */
function shouldCutSegment(
  currentIndex: number,
  segmentStartIndex: number,
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationParams,
  slopeChanges: SlopeChange[],
  inflectionPoints: InflectionPoint[]
): { shouldCut: boolean; reason: string } {
  const segmentLength = currentIndex - segmentStartIndex + 1;
  const segmentDistance = elevationData[currentIndex].displayDistance - elevationData[segmentStartIndex].displayDistance;
  
  // Always respect minimum distance and points requirements for sports relevance
  if (segmentLength < params.minSegmentPoints || segmentDistance < params.minSegmentDistance) {
    return { shouldCut: false, reason: 'Insufficient distance/points' };
  }
  
  // Check for significant slope changes
  const recentSlopeChange = slopeChanges.find(sc => 
    sc.index >= segmentStartIndex && 
    sc.index <= currentIndex && 
    sc.changePercent >= params.slopeChangeThreshold
  );
  
  if (recentSlopeChange) {
    return { shouldCut: true, reason: `Cambio de pendiente (${recentSlopeChange.changePercent.toFixed(1)}%)` };
  }
  
  // Check for inflection points if enabled
  if (params.detectInflectionPoints) {
    const recentInflection = inflectionPoints.find(ip => 
      ip.index >= segmentStartIndex && 
      ip.index <= currentIndex &&
      ip.significance >= params.inflectionSensitivity
    );
    
    if (recentInflection) {
      const typeLabels = {
        'peak': 'Pico detectado',
        'valley': 'Valle detectado',
        'direction_change': 'Cambio de dirección'
      };
      return { shouldCut: true, reason: typeLabels[recentInflection.type] };
    }
  }
  
  // Check R-squared quality as fallback
  const segmentPoints = elevationData.slice(segmentStartIndex, currentIndex + 1);
  const regressionPoints = segmentPoints
    .filter(p => p.displayElevation !== null && p.displayElevation !== undefined)
    .map(p => ({ x: p.displayDistance, y: p.displayElevation }));
    
  if (regressionPoints.length >= 2) {
    const regression = calculateLinearRegression(regressionPoints);
    if (regression.rSquared < params.rSquaredThreshold) {
      return { shouldCut: true, reason: `Calidad baja (R²=${regression.rSquared.toFixed(3)})` };
    }
  }
  
  return { shouldCut: false, reason: 'Criteria not met' };
}

/**
 * Enhanced segmentation using multiple criteria for sports relevance
 */
export function segmentProfileAdvanced(
  elevationData: ElevationPoint[], 
  params: AdvancedSegmentationParams
): AdvancedSegment[] {
  
  if (!elevationData || elevationData.length < params.minSegmentPoints) {
    console.log('Not enough data points for segmentation');
    return [];
  }

  console.log('Starting enhanced multi-criteria segmentation with params:', params);
  console.log('Input data points:', elevationData.length);

  // Pre-calculate slope changes and inflection points
  const slopeChanges = detectSlopeChanges(elevationData, 10, params.slopeChangeThreshold);
  const inflectionPoints = params.detectInflectionPoints 
    ? detectInflectionPoints(elevationData, params.inflectionSensitivity) 
    : [];
    
  console.log('Detected slope changes:', slopeChanges.length);
  console.log('Detected inflection points:', inflectionPoints.length);

  const finalSegments: AdvancedSegment[] = [];
  let currentSegmentStartIndex = 0;

  for (let i = params.minSegmentPoints; i < elevationData.length; i++) {
    const cutDecision = shouldCutSegment(
      i, 
      currentSegmentStartIndex, 
      elevationData, 
      params, 
      slopeChanges, 
      inflectionPoints
    );

    if (cutDecision.shouldCut) {
      // Finalize current segment
      const segmentPoints = elevationData.slice(currentSegmentStartIndex, i);
      const regressionPoints = segmentPoints
        .filter(p => p.displayElevation !== null && p.displayElevation !== undefined)
        .map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        
      if (regressionPoints.length >= params.minSegmentPoints) {
        const regression = calculateLinearRegression(regressionPoints);
        const segmentType = getSegmentType(regression.slope);
        
        // Calculate elevation statistics
        const startElevation = segmentPoints[0].displayElevation;
        const endElevation = segmentPoints[segmentPoints.length - 1].displayElevation;
        const elevationChange = endElevation - startElevation;
        
        const segment: AdvancedSegment = {
          startIndex: currentSegmentStartIndex,
          endIndex: i - 1,
          startPoint: elevationData[currentSegmentStartIndex],
          endPoint: elevationData[i - 1],
          slope: regression.slope,
          intercept: regression.intercept,
          rSquared: regression.rSquared,
          distance: elevationData[i - 1].displayDistance - elevationData[currentSegmentStartIndex].displayDistance,
          elevationGain: elevationChange > 0 ? elevationChange : 0,
          elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
          type: segmentType,
          color: SEGMENT_COLORS[segmentType],
          cutReason: cutDecision.reason
        };
        
        finalSegments.push(segment);
      }
      
      // Start new segment
      currentSegmentStartIndex = i;
    }
  }

  // Handle the last segment
  if (currentSegmentStartIndex < elevationData.length - 1) {
    const lastSegmentPoints = elevationData.slice(currentSegmentStartIndex);
    const lastRegressionPoints = lastSegmentPoints
      .filter(p => p.displayElevation !== null && p.displayElevation !== undefined)
      .map(p => ({ x: p.displayDistance, y: p.displayElevation }));

    if (lastRegressionPoints.length >= params.minSegmentPoints) {
      const lastRegression = calculateLinearRegression(lastRegressionPoints);
      const segmentType = getSegmentType(lastRegression.slope);
      
      const startElevation = lastSegmentPoints[0].displayElevation;
      const endElevation = lastSegmentPoints[lastSegmentPoints.length - 1].displayElevation;
      const elevationChange = endElevation - startElevation;
      
      const segment: AdvancedSegment = {
        startIndex: currentSegmentStartIndex,
        endIndex: elevationData.length - 1,
        startPoint: elevationData[currentSegmentStartIndex],
        endPoint: elevationData[elevationData.length - 1],
        slope: lastRegression.slope,
        intercept: lastRegression.intercept,
        rSquared: lastRegression.rSquared,
        distance: elevationData[elevationData.length - 1].displayDistance - elevationData[currentSegmentStartIndex].displayDistance,
        elevationGain: elevationChange > 0 ? elevationChange : 0,
        elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
        type: segmentType,
        color: SEGMENT_COLORS[segmentType],
        cutReason: 'Final segment'
      };
      
      finalSegments.push(segment);
    }
  }

  console.log('Generated', finalSegments.length, 'enhanced segments');
  console.log('Average R²:', finalSegments.reduce((acc, s) => acc + s.rSquared, 0) / finalSegments.length);
  console.log('Cut reasons:', finalSegments.map(s => s.cutReason));
  
  return finalSegments;
}

/**
 * Enhanced default parameters with new criteria
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  rSquaredThreshold: 0.92,
  minSegmentPoints: 20,
  minSegmentDistance: 0.3, // km - sports relevance filter
  slopeChangeThreshold: 4.0, // percentage change that triggers a cut
  inflectionSensitivity: 2.0, // meters of elevation difference
  detectInflectionPoints: true // enable inflection point detection
};

/**
 * Get segment type label in Spanish
 */
export function getAdvancedSegmentTypeLabel(type: 'asc' | 'desc' | 'hor'): string {
  switch (type) {
    case 'asc': return 'Ascenso';
    case 'desc': return 'Descenso';
    case 'hor': return 'Horizontal';
  }
}

/**
 * Export slope change detection for debugging/visualization
 */
export { detectSlopeChanges, detectInflectionPoints };
