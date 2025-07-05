
import React from 'react';
import { Table, TableBody } from '../ui/table';
import { AdvancedSegment } from '@/utils/types';
import { SegmentsTableHeader } from './segments-table-header';
import { SegmentsTableRow } from './segments-table-row';
import { SegmentsTableEmptyState } from './segments-table-empty-state';
import { SegmentsTableHeaderInfo } from './segments-table-header-info';
import { useProcessedSegments } from './segments-data-processor';

interface Segment {
  id: string;
  segment_index: number;
  distance_km: number;
  elevation_gain_m: number;
  avg_grade_percent: number;
}

interface SegmentsTableProps {
  segments: Segment[];
  advancedSegments?: AdvancedSegment[];
  isAdvancedMode?: boolean;
  onSegmentHover?: (segmentIndex: number | null) => void;
  hoveredSegment?: number | null;
}

export const SegmentsTable: React.FC<SegmentsTableProps> = ({ 
  segments,
  advancedSegments = [],
  isAdvancedMode = false,
  onSegmentHover, 
  hoveredSegment 
}) => {
  console.log('SegmentsTable - Advanced mode:', isAdvancedMode, 'Advanced segments:', advancedSegments.length);

  const displaySegments = useProcessedSegments(isAdvancedMode, advancedSegments, segments);

  return (
    <div className="bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 overflow-hidden">
      <SegmentsTableHeaderInfo
        isAdvancedMode={isAdvancedMode}
        displaySegmentsLength={displaySegments.length}
        advancedSegments={advancedSegments}
      />
      
      {displaySegments.length === 0 ? (
        <SegmentsTableEmptyState />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <SegmentsTableHeader isAdvancedMode={isAdvancedMode} />
            <TableBody>
              {displaySegments.map((segment) => (
                <SegmentsTableRow
                  key={segment.id}
                  segment={segment}
                  isAdvancedMode={isAdvancedMode}
                  hoveredSegment={hoveredSegment}
                  onSegmentHover={onSegmentHover}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
