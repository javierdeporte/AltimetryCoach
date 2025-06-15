export interface ElevationPoint {
  distance: number;
  elevation: number;
  displayDistance: number;
  displayElevation: number;
  segmentIndex?: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export interface AdvancedSegment {
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

export interface AdvancedSegmentationResult {
  segments: AdvancedSegment[];
  macroBoundaries: number[];
}

export interface AdvancedSegmentationParams {
  rSquaredThreshold: number;
  minSegmentPoints: number;
  microMinDistance: number; // in km
  macroProminence: number; // in meters
  slopeChangeThreshold: number; // as a slope value (e.g., 0.1 for 10%)
}
