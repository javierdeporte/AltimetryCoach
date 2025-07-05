
import React from 'react';
import { TableCell, TableRow } from '../ui/table';
import { getSegmentName } from './segment-name-generator';
import { getGradeColor, getQualityIndicator } from './segment-styling-utils';

interface DisplaySegment {
  id: string;
  segment_index: number;
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  avg_grade_percent: number;
  rSquared: number | null;
  type: string | null;
}

interface SegmentsTableRowProps {
  segment: DisplaySegment;
  isAdvancedMode: boolean;
  hoveredSegment?: number | null;
  onSegmentHover?: (segmentIndex: number | null) => void;
}

export const SegmentsTableRow: React.FC<SegmentsTableRowProps> = ({
  segment,
  isAdvancedMode,
  hoveredSegment,
  onSegmentHover
}) => {
  return (
    <TableRow 
      key={segment.id} 
      className={`border-primary-200 dark:border-mountain-700 cursor-pointer transition-colors ${
        hoveredSegment === segment.segment_index
          ? 'bg-primary-100 dark:bg-primary-900/20'
          : 'hover:bg-primary-50 dark:hover:bg-mountain-700'
      }`}
      onMouseEnter={() => onSegmentHover?.(segment.segment_index)}
      onMouseLeave={() => onSegmentHover?.(null)}
    >
      <TableCell className="font-medium text-mountain-800 dark:text-mountain-200">
        <div className="flex items-center gap-2">
          {getSegmentName({ index: segment.segment_index, type: segment.type, isAdvancedMode })}
          {isAdvancedMode && segment.type && (
            <div 
              className="w-3 h-3 rounded-full"
              style={{ 
                backgroundColor: segment.type === 'asc' ? '#22c55e' : 
                               segment.type === 'desc' ? '#ef4444' : '#6b7280' 
              }}
            />
          )}
        </div>
      </TableCell>
      <TableCell className="text-mountain-600 dark:text-mountain-400">
        {segment.distance_km.toFixed(1)} km
      </TableCell>
      <TableCell className="text-primary-600 dark:text-primary-400">
        +{Math.round(segment.elevation_gain_m)}m
      </TableCell>
      <TableCell className="text-blue-600 dark:text-blue-400">
        -{Math.round(segment.elevation_loss_m)}m
      </TableCell>
      <TableCell className={getGradeColor(segment.avg_grade_percent)}>
        {segment.avg_grade_percent > 0 ? '+' : ''}{segment.avg_grade_percent.toFixed(1)}%
      </TableCell>
      {isAdvancedMode && (
        <TableCell>
          {getQualityIndicator(segment.rSquared)}
        </TableCell>
      )}
    </TableRow>
  );
};
