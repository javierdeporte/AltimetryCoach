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

interface AccumulatedSlopeEvaluation {
  shouldCut: boolean;
  reason: string;
  slopeInconsistency: number; // Percentage of inconsistency
  segmentSlope: number; // Overall segment slope
  localSlope: number; // Recent local slope
  hasEarlyWarning: boolean; // Whether slope change triggered this evaluation
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
  slopeChangeThreshold: number; // percentage change that triggers early warning (not direct cut)
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
 * NEW: Helper function to get points within a distance window around a center point
 */
function getPointsInDistanceWindow(
  elevationData: ElevationPoint[],
  centerIndex: number,
  windowDistance: number
): { leftPoints: ElevationPoint[], rightPoints: ElevationPoint[], centerPoint: ElevationPoint } {
  const centerPoint = elevationData[centerIndex];
  const leftPoints: ElevationPoint[] = [];
  const rightPoints: ElevationPoint[] = [];
  
  // Get points to the left within windowDistance
  for (let i = centerIndex - 1; i >= 0; i--) {
    const distance = centerPoint.displayDistance - elevationData[i].displayDistance;
    if (distance <= windowDistance) {
      leftPoints.unshift(elevationData[i]); // Add to beginning to maintain order
    } else {
      break;
    }
  }
  
  // Get points to the right within windowDistance
  for (let i = centerIndex + 1; i < elevationData.length; i++) {
    const distance = elevationData[i].displayDistance - centerPoint.displayDistance;
    if (distance <= windowDistance) {
      rightPoints.push(elevationData[i]);
    } else {
      break;
    }
  }
  
  return { leftPoints, rightPoints, centerPoint };
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
 * NEW: Detects if there's a recent slope change that warrants deeper analysis
 */
function hasRecentSlopeWarning(
  elevationData: ElevationPoint[],
  currentIndex: number,
  threshold: number,
  windowSize: number = 10
): boolean {
  if (currentIndex < windowSize * 2) return false;
  
  // Look back a few points to see if there was a significant slope change
  const lookBackRange = Math.min(15, currentIndex - windowSize);
  
  for (let i = currentIndex - lookBackRange; i < currentIndex - 5; i++) {
    if (i < windowSize || i >= elevationData.length - windowSize) continue;
    
    const beforeSlope = calculateSlopeBetweenPoints(
      elevationData[Math.max(0, i - windowSize)], 
      elevationData[i]
    );
    
    const afterSlope = calculateSlopeBetweenPoints(
      elevationData[i], 
      elevationData[Math.min(elevationData.length - 1, i + windowSize)]
    );
    
    const slopeChange = Math.abs(afterSlope - beforeSlope);
    
    if (slopeChange >= threshold) {
      return true;
    }
  }
  
  return false;
}

/**
 * ENHANCED: Evaluates accumulated slope consistency with early warning context
 */
function evaluateAccumulatedSlope(
  elevationData: ElevationPoint[],
  segmentStartIndex: number,
  currentIndex: number,
  params: AdvancedSegmentationParams,
  hasEarlyWarning: boolean = false
): AccumulatedSlopeEvaluation {
  
  const segmentPoints = elevationData.slice(segmentStartIndex, currentIndex + 1);
  
  if (segmentPoints.length < 10) {
    return {
      shouldCut: false,
      reason: 'Segment too short',
      slopeInconsistency: 0,
      segmentSlope: 0,
      localSlope: 0,
      hasEarlyWarning
    };
  }
  
  // Calculate overall segment slope
  const segmentSlope = calculateSlopeBetweenPoints(
    segmentPoints[0], 
    segmentPoints[segmentPoints.length - 1]
  );
  
  // Calculate local slope for recent section (last 25% of segment)
  const localSectionStart = Math.floor(segmentPoints.length * 0.75);
  const localSlope = calculateSlopeBetweenPoints(
    segmentPoints[localSectionStart],
    segmentPoints[segmentPoints.length - 1]
  );
  
  // Calculate slope inconsistency
  const slopeInconsistency = Math.abs(localSlope - segmentSlope);
  
  // ENHANCED LOGIC: Slope change threshold is dynamic based on early warning
  let effectiveThreshold = params.slopeChangeThreshold;
  
  // If we have an early warning, be more sensitive to inconsistency
  if (hasEarlyWarning) {
    effectiveThreshold *= 0.7; // 30% more sensitive when warned
  }
  
  // But also require minimum segment distance for cuts
  const segmentDistance = elevationData[currentIndex].displayDistance - elevationData[segmentStartIndex].displayDistance;
  const meetsMinDistance = segmentDistance >= params.minSegmentDistance;
  
  // Determine if we should cut
  const shouldCut = slopeInconsistency >= effectiveThreshold && meetsMinDistance;
  
  const reason = shouldCut 
    ? `Inconsistencia pendiente: ${slopeInconsistency.toFixed(1)}% (umbral: ${effectiveThreshold.toFixed(1)}%${hasEarlyWarning ? ', alerta previa' : ''})`
    : hasEarlyWarning 
      ? `Alerta pendiente, pero consistente (${slopeInconsistency.toFixed(1)}% < ${effectiveThreshold.toFixed(1)}%)`
      : 'Pendiente consistente';
    
  return {
    shouldCut,
    reason,
    slopeInconsistency,
    segmentSlope,
    localSlope,
    hasEarlyWarning
  };
}

/**
 * Detects significant slope changes for early warning (not direct cutting)
 */
function detectSlopeChanges(
  elevationData: ElevationPoint[], 
  windowSize: number = 10,
  threshold: number,
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
 * ENHANCED: Detects inflection points using distance-based windows instead of point count
 */
function detectInflectionPoints(
  elevationData: ElevationPoint[], 
  sensitivity: number = 1.0,
  windowDistance: number = 0.15, // 150m window distance (instead of windowSize)
  minSustainedDistance: number = 0.3 // km - minimum distance for sustained inflection
): InflectionPoint[] {
  const inflectionPoints: InflectionPoint[] = [];
  
  if (elevationData.length < 10) return inflectionPoints;
  
  // Start from a reasonable index to ensure we have enough data
  const startIndex = Math.max(5, Math.floor(elevationData.length * 0.05));
  const endIndex = Math.min(elevationData.length - 5, Math.floor(elevationData.length * 0.95));
  
  for (let i = startIndex; i < endIndex; i++) {
    const { leftPoints, rightPoints, centerPoint } = getPointsInDistanceWindow(
      elevationData, 
      i, 
      windowDistance
    );
    
    // Ensure we have enough points for meaningful analysis
    if (leftPoints.length < 3 || rightPoints.length < 3) continue;
    
    // Calculate average elevations in windows
    const leftAvg = leftPoints.reduce((sum, p) => sum + p.displayElevation, 0) / leftPoints.length;
    const rightAvg = rightPoints.reduce((sum, p) => sum + p.displayElevation, 0) / rightPoints.length;
    const currentElev = centerPoint.displayElevation;
    
    let detectedType: 'peak' | 'valley' | 'direction_change' | null = null;
    let significance = 0;
    
    // Detect peaks (current point higher than both sides)
    if (currentElev > leftAvg + sensitivity && currentElev > rightAvg + sensitivity) {
      detectedType = 'peak';
      significance = Math.min(currentElev - leftAvg, currentElev - rightAvg);
    }
    
    // Detect valleys (current point lower than both sides)
    else if (currentElev < leftAvg - sensitivity && currentElev < rightAvg - sensitivity) {
      detectedType = 'valley';
      significance = Math.min(leftAvg - currentElev, rightAvg - currentElev);
    }
    
    // Detect direction changes using slope analysis
    else {
      // Calculate slopes using distance-based windows
      const leftSlope = leftPoints.length > 0 
        ? calculateSlopeBetweenPoints(leftPoints[0], centerPoint)
        : 0;
      const rightSlope = rightPoints.length > 0 
        ? calculateSlopeBetweenPoints(centerPoint, rightPoints[rightPoints.length - 1])
        : 0;
      
      // Significant direction change: opposite signs and both slopes are meaningful
      if (Math.sign(leftSlope) !== Math.sign(rightSlope) && 
          Math.abs(leftSlope) > sensitivity && Math.abs(rightSlope) > sensitivity) {
        detectedType = 'direction_change';
        significance = Math.abs(leftSlope) + Math.abs(rightSlope);
      }
    }
    
    if (detectedType) {
      // CRITICAL: Calculate sustained distance to validate the inflection
      let sustainedEndIndex = i;
      let maxLookAhead = Math.min(100, elevationData.length - i - 1); // Reasonable limit
      
      for (let j = 1; j <= maxLookAhead; j++) {
        const futureIndex = i + j;
        if (futureIndex >= elevationData.length) break;
        
        const sustainedDistance = elevationData[futureIndex].displayDistance - centerPoint.displayDistance;
        
        // Stop if we've reached the minimum sustained distance
        if (sustainedDistance >= minSustainedDistance) {
          sustainedEndIndex = futureIndex;
          break;
        }
        
        // Check if the pattern continues at this future point
        const { leftPoints: futureLeft, rightPoints: futureRight } = getPointsInDistanceWindow(
          elevationData, 
          futureIndex, 
          windowDistance
        );
        
        if (futureLeft.length < 2 || futureRight.length < 2) continue;
        
        const futureLeftAvg = futureLeft.reduce((sum, p) => sum + p.displayElevation, 0) / futureLeft.length;
        const futureRightAvg = futureRight.reduce((sum, p) => sum + p.displayElevation, 0) / futureRight.length;
        const futureElev = elevationData[futureIndex].displayElevation;
        
        // Check if the pattern continues
        let patternContinues = false;
        if (detectedType === 'peak' && futureElev > futureLeftAvg + sensitivity && futureElev > futureRightAvg + sensitivity) {
          patternContinues = true;
        } else if (detectedType === 'valley' && futureElev < futureLeftAvg - sensitivity && futureElev < futureRightAvg - sensitivity) {
          patternContinues = true;
        } else if (detectedType === 'direction_change') {
          const futureLeftSlope = futureLeft.length > 0 
            ? calculateSlopeBetweenPoints(futureLeft[0], elevationData[futureIndex])
            : 0;
          const futureRightSlope = futureRight.length > 0 
            ? calculateSlopeBetweenPoints(elevationData[futureIndex], futureRight[futureRight.length - 1])
            : 0;
          
          if (Math.sign(futureLeftSlope) !== Math.sign(futureRightSlope) && 
              Math.abs(futureLeftSlope) > sensitivity && Math.abs(futureRightSlope) > sensitivity) {
            patternContinues = true;
          }
        }
        
        if (!patternContinues) {
          // Pattern broke, check if we've sustained long enough
          const currentSustainedDistance = elevationData[futureIndex - 1].displayDistance - centerPoint.displayDistance;
          if (currentSustainedDistance >= minSustainedDistance) {
            sustainedEndIndex = futureIndex - 1;
          }
          break;
        }
        
        sustainedEndIndex = futureIndex;
      }
      
      const finalSustainedDistance = elevationData[sustainedEndIndex].displayDistance - centerPoint.displayDistance;
      
      // Only include inflections that are sustained for at least the minimum distance
      if (finalSustainedDistance >= minSustainedDistance) {
        inflectionPoints.push({
          index: i,
          type: detectedType,
          significance: significance,
          sustainedDistance: finalSustainedDistance
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
 * ENHANCED: Cut decision with slope change as early warning system
 * Priority Logic:
 * 1. Inflection points (highest priority for sports relevance)
 * 2. Accumulated slope consistency (enhanced by early warnings)
 * Note: R² removed as cutting criterion - only used for visualization
 */
function shouldCutSegment(
  currentIndex: number,
  segmentStartIndex: number,
  elevationData: ElevationPoint[],
  params: AdvancedSegmentationParams,
  slopeChanges: SlopeChange[],
  inflectionPoints: InflectionPoint[]
): { shouldCut: boolean; reason: string } {
  
  // Check for early warning from slope changes
  const hasEarlyWarning = hasRecentSlopeWarning(
    elevationData, 
    currentIndex, 
    params.slopeChangeThreshold
  );
  
  // PRIORITY 1: Check for sustained inflection points (highest priority)
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
  
  // PRIORITY 2: Check accumulated slope consistency (enhanced by early warnings)
  const segmentDistance = elevationData[currentIndex].displayDistance - elevationData[segmentStartIndex].displayDistance;
  if (segmentDistance >= params.minSegmentDistance) {
    const slopeEval = evaluateAccumulatedSlope(
      elevationData, 
      segmentStartIndex, 
      currentIndex, 
      params, 
      hasEarlyWarning
    );
    
    if (slopeEval.shouldCut) {
      return { 
        shouldCut: true, 
        reason: slopeEval.reason 
      };
    }
  }
  
  // No R² criterion - only sports-relevant criteria for cutting
  return { shouldCut: false, reason: 'Criteria not met' };
}

/**
 * Enhanced segmentation using slope changes as early warning system
 */
export function segmentProfileAdvanced(
  elevationData: ElevationPoint[], 
  params: AdvancedSegmentationParams
): AdvancedSegment[] {
  
  if (!elevationData || elevationData.length < 5) {
    console.log('Not enough data points for segmentation');
    return [];
  }

  console.log('Starting enhanced distance-based inflection segmentation with params:', params);
  console.log('Input data points:', elevationData.length);

  // Pre-calculate sustained inflection points using distance-based windows
  const inflectionPoints = params.detectInflectionPoints 
    ? detectInflectionPoints(
        elevationData, 
        params.inflectionSensitivity, 
        0.15, // 150m window distance for inflection detection
        params.minSegmentDistance // Minimum sustained distance for cuts
      ) 
    : [];
    
  // Calculate slope changes for early warning system (not direct cutting)
  const slopeChanges = detectSlopeChanges(
    elevationData, 
    10, 
    params.slopeChangeThreshold, 
    params.minSegmentDistance
  );
    
  console.log('Detected sustained inflection points (distance-based):', inflectionPoints.length);
  console.log('Detected slope changes for early warning:', slopeChanges.length);
  if (inflectionPoints.length > 0) {
    console.log('Inflection details:', inflectionPoints.map(ip => 
      `${ip.type} at ${ip.index} (${ip.sustainedDistance.toFixed(2)}km sustained)`
    ));
  }

  const finalSegments: AdvancedSegment[] = [];
  let currentSegmentStartIndex = 0;

  for (let i = 10; i < elevationData.length; i++) {
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

  console.log('Generated', finalSegments.length, 'enhanced segments with distance-based inflections');
  console.log('Average R²:', finalSegments.reduce((acc, s) => acc + s.rSquared, 0) / finalSegments.length);
  console.log('Cut reasons:', finalSegments.map(s => s.cutReason));
  
  return finalSegments;
}

/**
 * Updated default parameters optimized for sports-relevant segmentation
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  rSquaredThreshold: 0.85, // Only for visualization, not cutting
  minSegmentDistance: 0.3, // 300m - practical minimum for sports relevance
  slopeChangeThreshold: 6.0, // Lowered since R² won't catch edge cases anymore
  inflectionSensitivity: 2.5, // Balanced inflection detection
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
 * Export detection functions for debugging/visualization
 */
export { detectSlopeChanges, detectInflectionPoints };
