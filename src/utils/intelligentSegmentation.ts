
interface ElevationPoint {
  distance: number;
  elevation: number;
  segmentIndex?: number;
}

interface SegmentationParams {
  gradeThreshold: number; // degrees
  minSustainedDistance: number; // meters
  smoothingWindow: number; // number of points
}

interface IntelligentSegment {
  startIndex: number;
  endIndex: number;
  type: 'asc' | 'desc' | 'hor';
  avgGrade: number;
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  color: string;
}

const SEGMENT_COLORS = {
  asc: '#22c55e',   // Green for ascent
  desc: '#3b82f6',  // Blue for descent  
  hor: '#6b7280'    // Gray for horizontal
};

/**
 * Applies smoothing to elevation data using a moving average window
 */
function smoothElevationData(data: ElevationPoint[], windowSize: number): ElevationPoint[] {
  if (windowSize <= 1) return data;
  
  const halfWindow = Math.floor(windowSize / 2);
  
  return data.map((point, index) => {
    const start = Math.max(0, index - halfWindow);
    const end = Math.min(data.length - 1, index + halfWindow);
    
    let sumElevation = 0;
    let count = 0;
    
    for (let i = start; i <= end; i++) {
      sumElevation += data[i].elevation;
      count++;
    }
    
    return {
      ...point,
      elevation: sumElevation / count
    };
  });
}

/**
 * Calculates grade (slope) between consecutive points
 */
function calculateGrades(data: ElevationPoint[]): number[] {
  const grades: number[] = [0]; // First point has no grade
  
  for (let i = 1; i < data.length; i++) {
    const elevationDiff = data[i].elevation - data[i - 1].elevation;
    const distanceDiff = (data[i].distance - data[i - 1].distance) * 1000; // Convert km to meters
    
    if (distanceDiff > 0) {
      const gradeRadians = Math.atan(elevationDiff / distanceDiff);
      const gradeDegrees = gradeRadians * (180 / Math.PI);
      grades.push(gradeDegrees);
    } else {
      grades.push(0);
    }
  }
  
  return grades;
}

/**
 * Determines segment type based on average grade
 */
function getSegmentType(avgGrade: number): 'asc' | 'desc' | 'hor' {
  if (avgGrade > 5) return 'asc';
  if (avgGrade < -5) return 'desc';
  return 'hor';
}

/**
 * Analyzes elevation data to create intelligent segments based on sustained grade changes
 */
export function analyzeIntelligentSegments(
  elevationData: ElevationPoint[], 
  params: SegmentationParams
): IntelligentSegment[] {
  if (!elevationData || elevationData.length < 2) {
    return [];
  }

  console.log('Starting intelligent segmentation with params:', params);
  console.log('Input data points:', elevationData.length);

  // Step 1: Apply smoothing
  const smoothedData = smoothElevationData(elevationData, params.smoothingWindow);
  
  // Step 2: Calculate grades
  const grades = calculateGrades(smoothedData);
  
  // Step 3: Detect sustained grade changes
  const segments: IntelligentSegment[] = [];
  let currentSegmentStart = 0;
  let currentGradeSum = 0;
  let currentGradeCount = 0;
  
  for (let i = 1; i < smoothedData.length; i++) {
    const currentGrade = grades[i];
    const distanceFromStart = (smoothedData[i].distance - smoothedData[currentSegmentStart].distance) * 1000; // meters
    
    currentGradeSum += currentGrade;
    currentGradeCount++;
    
    // Check if we should end the current segment
    const shouldEndSegment = 
      distanceFromStart >= params.minSustainedDistance && 
      (Math.abs(currentGrade - (currentGradeSum / currentGradeCount)) > params.gradeThreshold ||
       i === smoothedData.length - 1);
    
    if (shouldEndSegment || i === smoothedData.length - 1) {
      const avgGrade = currentGradeSum / currentGradeCount;
      const segmentType = getSegmentType(avgGrade);
      
      // Calculate elevation statistics for this segment
      const startElevation = smoothedData[currentSegmentStart].elevation;
      const endElevation = smoothedData[i].elevation;
      const elevationChange = endElevation - startElevation;
      
      const segment: IntelligentSegment = {
        startIndex: currentSegmentStart,
        endIndex: i,
        type: segmentType,
        avgGrade,
        distance: distanceFromStart / 1000, // Convert back to km
        elevationGain: elevationChange > 0 ? elevationChange : 0,
        elevationLoss: elevationChange < 0 ? Math.abs(elevationChange) : 0,
        color: SEGMENT_COLORS[segmentType]
      };
      
      segments.push(segment);
      
      // Start new segment
      currentSegmentStart = i;
      currentGradeSum = 0;
      currentGradeCount = 0;
    }
  }
  
  // Ensure we have at least one segment
  if (segments.length === 0) {
    const totalElevationChange = smoothedData[smoothedData.length - 1].elevation - smoothedData[0].elevation;
    const totalDistance = smoothedData[smoothedData.length - 1].distance - smoothedData[0].distance;
    const avgGradeRadians = Math.atan(totalElevationChange / (totalDistance * 1000));
    const avgGrade = avgGradeRadians * (180 / Math.PI);
    
    segments.push({
      startIndex: 0,
      endIndex: smoothedData.length - 1,
      type: getSegmentType(avgGrade),
      avgGrade,
      distance: totalDistance,
      elevationGain: totalElevationChange > 0 ? totalElevationChange : 0,
      elevationLoss: totalElevationChange < 0 ? Math.abs(totalElevationChange) : 0,
      color: SEGMENT_COLORS[getSegmentType(avgGrade)]
    });
  }
  
  console.log('Generated', segments.length, 'intelligent segments');
  console.log('Segments summary:', segments.map(s => ({ 
    type: s.type, 
    distance: s.distance.toFixed(1) + 'km',
    avgGrade: s.avgGrade.toFixed(1) + '°'
  })));
  
  return segments;
}

/**
 * Default segmentation parameters
 */
export const DEFAULT_SEGMENTATION_PARAMS: SegmentationParams = {
  gradeThreshold: 10, // degrees
  minSustainedDistance: 100, // meters  
  smoothingWindow: 5 // points
};

/**
 * Get segment type label in Spanish
 */
export function getSegmentTypeLabel(type: 'asc' | 'desc' | 'hor'): string {
  switch (type) {
    case 'asc': return 'Ascenso';
    case 'desc': return 'Descenso';
    case 'hor': return 'Horizontal';
  }
}

/**
 * Get segment color by type
 */
export function getSegmentColor(type: 'asc' | 'desc' | 'hor'): string {
  return SEGMENT_COLORS[type];
}
