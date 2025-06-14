
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface Segment {
  id: string;
  name: string;
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  avgGrade: number;
  maxGrade: number;
}

const mockSegments: Segment[] = [
  {
    id: '1',
    name: 'Forest Approach',
    distance: 3.2,
    elevationGain: 150,
    elevationLoss: 30,
    avgGrade: 4.2,
    maxGrade: 8.5
  },
  {
    id: '2',
    name: 'Steep Ascent',
    distance: 2.8,
    elevationGain: 280,
    elevationLoss: 10,
    avgGrade: 9.8,
    maxGrade: 15.2
  },
  {
    id: '3',
    name: 'Ridge Walk',
    distance: 4.1,
    elevationGain: 80,
    elevationLoss: 120,
    avgGrade: -1.2,
    maxGrade: 6.3
  },
  {
    id: '4',
    name: 'Technical Descent',
    distance: 3.5,
    elevationGain: 20,
    elevationLoss: 240,
    avgGrade: -6.8,
    maxGrade: 12.1
  },
  {
    id: '5',
    name: 'Final Push',
    distance: 2.4,
    elevationGain: 190,
    elevationLoss: 15,
    avgGrade: 7.1,
    maxGrade: 13.8
  }
];

export const SegmentsTable: React.FC = () => {
  const getGradeColor = (grade: number) => {
    if (grade > 8) return 'text-red-600 dark:text-red-400';
    if (grade > 4) return 'text-earth-600 dark:text-earth-400';
    if (grade > 0) return 'text-primary-600 dark:text-primary-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <div className="bg-white dark:bg-mountain-800 rounded-xl border border-primary-200 dark:border-mountain-700 overflow-hidden">
      <div className="p-6 border-b border-primary-200 dark:border-mountain-700">
        <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200">
          Route Segments Analysis
        </h3>
        <p className="text-sm text-mountain-600 dark:text-mountain-400 mt-1">
          Detailed breakdown of elevation changes and gradients
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-primary-200 dark:border-mountain-700">
              <TableHead className="text-mountain-700 dark:text-mountain-300">Segment</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Distance</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Gain</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Loss</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Avg Grade</TableHead>
              <TableHead className="text-mountain-700 dark:text-mountain-300">Max Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockSegments.map((segment) => (
              <TableRow 
                key={segment.id} 
                className="border-primary-200 dark:border-mountain-700 hover:bg-primary-50 dark:hover:bg-mountain-700 cursor-pointer"
              >
                <TableCell className="font-medium text-mountain-800 dark:text-mountain-200">
                  {segment.name}
                </TableCell>
                <TableCell className="text-mountain-600 dark:text-mountain-400">
                  {segment.distance.toFixed(1)} km
                </TableCell>
                <TableCell className="text-primary-600 dark:text-primary-400">
                  +{segment.elevationGain}m
                </TableCell>
                <TableCell className="text-blue-600 dark:text-blue-400">
                  -{segment.elevationLoss}m
                </TableCell>
                <TableCell className={getGradeColor(segment.avgGrade)}>
                  {segment.avgGrade > 0 ? '+' : ''}{segment.avgGrade.toFixed(1)}%
                </TableCell>
                <TableCell className={getGradeColor(segment.maxGrade)}>
                  {segment.maxGrade.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
