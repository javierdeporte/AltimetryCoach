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

interface SlopeChange {
  index: number;
  previousSlope: number;
  currentSlope: number;
  changePercent: number;
  sustainedDistance: number; // Distance over which this change is sustained
}

interface InflectionPoint {
  index: number;
  type: 'peak' | 'valley' | 'direction_change';
  significance: number;
  sustainedDistance: number; // Distance over which this inflection persists
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
  cutReason?: string;
}

interface AdvancedSegmentationParams {
  rSquaredThreshold: number;
  minSegmentDistance: number; // in km - minimum distance for a change to be considered sustained
  slopeChangeThreshold: number; // percentage change that triggers a cut
  inflectionSensitivity: number; // multiplier for inflection point detection
  detectInflectionPoints: boolean; // toggle for inflection point detection
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
 * Detects significant slope changes that are sustained over minimum distance
 */
function detectSlopeChanges(
  elevationData: ElevationPoint[], 
  windowSize: number = 10,
  threshold: number, // Now uses the actual threshold parameter instead of hardcoded 3
  minSustainedDistance: number = 0.2 // km
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
    
    // Use the actual threshold parameter instead of hardcoded value
    if (slopeChange >= threshold) {
      // Calculate how long this change is sustained
      let sustainedEndIndex = afterEnd;
      for (let j = afterEnd + 1; j < elevationData.length - windowSize; j++) {
        const futureSlope = calculateSlopeBetweenPoints(
          elevationData[j], 
          elevationData[Math.min(elevationData.length - 1, j + windowSize)]
        );
        
        // If slope changes significantly again, stop measuring sustenance
        if (Math.abs(futureSlope - afterSlope) >= threshold) {
          break;
        }
        sustainedEndIndex = j;
      }
      
      const sustainedDistance = elevationData[sustainedEndIndex].displayDistance - elevationData[afterStart].displayDistance;
      
      // Only include changes that are sustained for at least the minimum distance
      if (sustainedDistance >= minSustainedDistance) {
        slopeChanges.push({
          index: i,
          previousSlope: beforeSlope,
          currentSlope: afterSlope,
          changePercent: slopeChange,
          sustainedDistance: sustainedDistance
        });
      }
    }
  }
  
  return slopeChanges;
}

/**
 * Detects inflection points that are sustained over minimum distance
 */
function detectInflectionPoints(
  elevationData: ElevationPoint[], 
  sensitivity: number = 1.0,
  windowSize: number = 5,
  minSustainedDistance: number = 0.2 // km
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
    
    let detectedType: 'peak' | 'valley' | 'direction_change' | null = null;
    let significance = 0;
    
    // Detect peaks (current point higher than both sides)
    if (currentElev > leftAvg + sensitivity && currentElev > rightAvg + sensitivity) {
      detectedType = 'peak';
      significance = Math.min(currentElev - leftAvg, currentElev - rightAvg);
    }
    
    // Detect valleys (current point lower than both sides)
    if (currentElev < leftAvg - sensitivity && currentElev < rightAvg - sensitivity) {
      detectedType = 'valley';
      significance = Math.min(leftAvg - currentElev, rightAvg - currentElev);
    }
    
    // Detect direction changes
    if (!detectedType) {
      const leftSlope = calculateSlopeBetweenPoints(leftWindow[0], currentPoint);
      const rightSlope = calculateSlopeBetweenPoints(currentPoint, rightWindow[rightWindow.length - 1]);
      
      if (Math.sign(leftSlope) !== Math.sign(rightSlope) && 
          Math.abs(leftSlope) > sensitivity && Math.abs(rightSlope) > sensitivity) {
        detectedType = 'direction_change';
        significance = Math.abs(leftSlope) + Math.abs(rightSlope);
      }
    }
    
    if (detectedType) {
      // Calculate sustained distance for this inflection
      let sustainedEndIndex = i + windowSize;
      for (let j = i + windowSize + 1; j < elevationData.length - windowSize; j++) {
        const futureWindow = elevationData.slice(j, j + windowSize);
        const futureAvg = futureWindow.reduce((sum, p) => sum + p.displayElevation, 0) / futureWindow.length;
        
        // Check if the pattern continues
        let patternContinues = false;
        if (detectedType === 'peak' && futureAvg < currentElev - sensitivity) {
          patternContinues = true;
        } else if (detectedType === 'valley' && futureAvg > currentElev + sensitivity) {
          patternContinues = true;
        } else if (detectedType === 'direction_change') {
          const futureSlope = calculateSlopeBetweenPoints(currentPoint, elevationData[j]);
          if (Math.sign(futureSlope) === Math.sign(calculateSlopeBetweenPoints(currentPoint, rightWindow[rightWindow.length - 1]))) {
            patternContinues = true;
          }
        }
        
        if (!patternContinues) break;
        sustainedEndIndex = j;
      }
      
      const sustainedDistance = elevationData[sustainedEndIndex].displayDistance - currentPoint.displayDistance;
      
      // Only include inflections that are sustained for at least the minimum distance
      if (sustainedDistance >= minSustainedDistance) {
        inflectionPoints.push({
          index: i,
          type: detectedType,
          significance: significance,
          sustainedDistance: sustainedDistance
        });
      }
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
 * Simplified cut decision based on sustained changes
 */
function shouldCutSegment(
  currentIndex: number,
  segmentStartIndex: number,
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationParams,
  slopeChanges: SlopeChange[],
  inflectionPoints: InflectionPoint[]
): { shouldCut: boolean; reason: string } {
  
  // Check for sustained slope changes (already filtered by minimum distance)
  const recentSlopeChange = slopeChanges.find(sc => 
    sc.index >= segmentStartIndex && 
    sc.index <= currentIndex && 
    sc.changePercent >= params.slopeChangeThreshold
  );
  
  if (recentSlopeChange) {
    return { 
      shouldCut: true, 
      reason: `Cambio sostenido ${recentSlopeChange.sustainedDistance.toFixed(1)}km (${recentSlopeChange.changePercent.toFixed(1)}%)` 
    };
  }
  
  // Check for sustained inflection points if enabled (already filtered by minimum distance)
  if (params.detectInflectionPoints) {
    const recentInflection = inflectionPoints.find(ip => 
      ip.index >= segmentStartIndex && 
      ip.index <= currentIndex &&
      ip.significance >= params.inflectionSensitivity
    );
    
    if (recentInflection) {
      const typeLabels = {
        'peak': 'Pico sostenido',
        'valley': 'Valle sostenido',
        'direction_change': 'Cambio dirección sostenido'
      };
      return { 
        shouldCut: true, 
        reason: `${typeLabels[recentInflection.type]} ${recentInflection.sustainedDistance.toFixed(1)}km` 
      };
    }
  }
  
  // Check R-squared quality as fallback (only after minimum practical segment length)
  const segmentDistance = elevationData[currentIndex].displayDistance - elevationData[segmentStartIndex].displayDistance;
  if (segmentDistance >= 0.1) { // 100m minimum for R² check
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
  }
  
  return { shouldCut: false, reason: 'Criteria not met' };
}

/**
 * Enhanced segmentation using sustained changes for sports relevance
 */
export function segmentProfileAdvanced(
  elevationData: ElevationPoint[], 
  params: AdvancedSegmentationParams
): AdvancedSegment[] {
  
  if (!elevationData || elevationData.length < 5) {
    console.log('Not enough data points for segmentation');
    return [];
  }

  console.log('Starting enhanced sustained-change segmentation with params:', params);
  console.log('Input data points:', elevationData.length);

  // Pre-calculate sustained slope changes and inflection points using actual parameters
  const slopeChanges = detectSlopeChanges(
    elevationData, 
    10, 
    params.slopeChangeThreshold, // Now using the actual UI parameter
    params.minSegmentDistance
  );
  const inflectionPoints = params.detectInflectionPoints 
    ? detectInflectionPoints(
        elevationData, 
        params.inflectionSensitivity, 
        5, 
        params.minSegmentDistance
      ) 
    : [];
    
  console.log('Detected sustained slope changes:', slopeChanges.length);
  console.log('Detected sustained inflection points:', inflectionPoints.length);

  const finalSegments: AdvancedSegment[] = [];
  let currentSegmentStartIndex = 0;

  for (let i = 5; i < elevationData.length; i++) {
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
        
      if (regressionPoints.length >= 2) {
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

    if (lastRegressionPoints.length >= 2) {
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

  console.log('Generated', finalSegments.length, 'enhanced segments with sustained changes');
  console.log('Average R²:', finalSegments.reduce((acc, s) => acc + s.rSquared, 0) / finalSegments.length);
  console.log('Cut reasons:', finalSegments.map(s => s.cutReason));
  
  return finalSegments;
}

/**
 * Updated default parameters with 200m minimum distance for sustained changes
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  rSquaredThreshold: 0.92,
  minSegmentDistance: 0.2, // 200m - minimum distance for sustained changes (sports relevance)
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
 * Export sustained change detection for debugging/visualization
 */
export { detectSlopeChanges, detectInflectionPoints };
