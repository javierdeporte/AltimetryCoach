
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
}

interface AdvancedSegmentationParams {
  rSquaredThreshold: number;
  minSegmentPoints: number;
  minSegmentDistance: number; // in km
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
 * Advanced segmentation using growing window algorithm with R² quality control
 */
export function segmentProfileAdvanced(
  elevationData: ElevationPoint[], 
  params: AdvancedSegmentationParams
): AdvancedSegment[] {
  
  if (!elevationData || elevationData.length < params.minSegmentPoints) {
    console.log('Not enough data points for segmentation');
    return [];
  }

  console.log('Starting advanced segmentation with params:', params);
  console.log('Input data points:', elevationData.length);

  const finalSegments: AdvancedSegment[] = [];
  let currentSegmentStartIndex = 0;

  for (let i = 2; i < elevationData.length; i++) {
    const segmentPoints = elevationData.slice(currentSegmentStartIndex, i + 1);
    
    const regressionPoints = segmentPoints
      .filter(p => p.displayElevation !== null && p.displayElevation !== undefined)
      .map(p => ({ x: p.displayDistance, y: p.displayElevation }));

    if (regressionPoints.length < 2) continue;

    const regression = calculateLinearRegression(regressionPoints);
    const isQualityPoor = regression.rSquared < params.rSquaredThreshold;

    // A segment cut is considered if the regression quality drops.
    if (isQualityPoor) {
      // The segment to finalize is the one *before* the current point `i`.
      const finalSegmentPoints = elevationData.slice(currentSegmentStartIndex, i);
      const finalSegmentDistance = elevationData[i - 1].displayDistance - elevationData[currentSegmentStartIndex].displayDistance;

      // Per user feedback, we prioritize distance to define a meaningful segment.
      if (finalSegmentDistance >= params.minSegmentDistance) {
        
        const finalRegressionPoints = finalSegmentPoints
          .filter(p => p.displayElevation !== null && p.displayElevation !== undefined)
          .map(p => ({ x: p.displayDistance, y: p.displayElevation }));
        
        // A final quality gate ensures the segment has enough points for a reliable calculation.
        if (finalRegressionPoints.length >= params.minSegmentPoints) {
          const finalRegression = calculateLinearRegression(finalRegressionPoints);
          const segmentType = getSegmentType(finalRegression.slope);
          
          const startElevation = finalSegmentPoints[0].displayElevation;
          const endElevation = finalSegmentPoints[finalSegmentPoints.length - 1].displayElevation;
          const elevationChange = endElevation - startElevation;
          
          const segment: AdvancedSegment = {
            startIndex: currentSegmentStartIndex,
            endIndex: i - 1,
            startPoint: elevationData[currentSegmentStartIndex],
            endPoint: elevationData[i - 1],
            slope: finalRegression.slope,
            intercept: finalRegression.intercept,
            rSquared: finalRegression.rSquared,
            distance: finalSegmentDistance,
            elevationGain: elevationChange > 0 ? elevationChange : 0,
            elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
            type: segmentType,
            color: SEGMENT_COLORS[segmentType]
          };
          
          finalSegments.push(segment);
          
          // Start the new segment from the point that broke the old trend.
          // This creates an overlap, ensuring continuous segmentation.
          currentSegmentStartIndex = i - 1;
        }
        // If not enough points, we don't cut and let the window grow.
      }
      // If not enough distance, we don't cut and let the window grow.
    }
  }

  // Handle the last segment
  if (currentSegmentStartIndex < elevationData.length - 1) {
    const lastSegmentPoints = elevationData.slice(currentSegmentStartIndex);
    const lastSegmentDistance = lastSegmentPoints[lastSegmentPoints.length - 1].displayDistance - lastSegmentPoints[0].displayDistance;

    // The last segment must also meet the minimum criteria to be considered valid.
    if (lastSegmentPoints.length >= params.minSegmentPoints && lastSegmentDistance >= params.minSegmentDistance) {
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
          color: SEGMENT_COLORS[segmentType]
        };
        
        finalSegments.push(segment);
      }
    }
  }

  console.log('Generated', finalSegments.length, 'advanced segments');
  if (finalSegments.length > 0) {
    const avgR = finalSegments.reduce((acc, s) => acc + s.rSquared, 0) / finalSegments.length;
    if (!isNaN(avgR)) {
      console.log('Average R²:', avgR);
    }
  }
  
  return finalSegments;
}

/**
 * Default advanced segmentation parameters
 */
export const DEFAULT_ADVANCED_SEGMENTATION_PARAMS: AdvancedSegmentationParams = {
  rSquaredThreshold: 0.92,
  minSegmentPoints: 20,
  minSegmentDistance: 0.3 // km
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
