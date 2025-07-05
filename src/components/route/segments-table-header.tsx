
import React from 'react';
import { TableHead, TableHeader, TableRow } from '../ui/table';

interface SegmentsTableHeaderProps {
  isAdvancedMode: boolean;
}

export const SegmentsTableHeader: React.FC<SegmentsTableHeaderProps> = ({ isAdvancedMode }) => {
  return (
    <TableHeader>
      <TableRow className="border-primary-200 dark:border-mountain-700">
        <TableHead className="text-mountain-700 dark:text-mountain-300">Segmento</TableHead>
        <TableHead className="text-mountain-700 dark:text-mountain-300">Distancia</TableHead>
        <TableHead className="text-mountain-700 dark:text-mountain-300">Ganancia</TableHead>
        <TableHead className="text-mountain-700 dark:text-mountain-300">Pérdida</TableHead>
        <TableHead className="text-mountain-700 dark:text-mountain-300">Gradiente Promedio</TableHead>
        {isAdvancedMode && (
          <TableHead className="text-mountain-700 dark:text-mountain-300">Calidad</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};
