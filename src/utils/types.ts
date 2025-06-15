export interface ElevationPoint {
  distance: number;
  elevation: number;
  displayDistance: number;
  displayElevation: number;
  segmentIndex?: number;
}

export interface AdvancedSegment {
  startIndex: number;
  endIndex: number;
  startPoint: ElevationPoint;
  endPoint: ElevationPoint;
  slope: number;
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
  minDistance: number; // in km
  macroProminence: number; // in meters
  slopeChangeThreshold: number; // as a slope value (e.g., 0.1 for 10%)
  
  // Parámetros para el resaltado de pendientes extremas
  enableExtremeHighlighting: boolean;
  extremeSlopeThreshold: number; // en porcentaje (e.g., 15 for 15%)
  highlightStyle: 'dots' | 'background';
}
