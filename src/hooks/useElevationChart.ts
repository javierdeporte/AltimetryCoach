
import { useMemo } from 'react';

interface ElevationPoint {
  distance: number;
  elevation: number;
  grade: number;
}

export const useElevationChart = (elevationData: number[], distanceData: number[]) => {
  const chartData = useMemo(() => {
    if (!elevationData.length || !distanceData.length) return [];

    const points: ElevationPoint[] = [];
    
    for (let i = 0; i < elevationData.length; i++) {
      const elevation = elevationData[i];
      const distance = distanceData[i];
      
      // Calculate grade (percentage)
      let grade = 0;
      if (i > 0) {
        const elevationDiff = elevation - elevationData[i - 1];
        const distanceDiff = distance - distanceData[i - 1];
        if (distanceDiff > 0) {
          grade = (elevationDiff / (distanceDiff * 1000)) * 100; // Convert to percentage
        }
      }
      
      points.push({ distance, elevation, grade });
    }
    
    return points;
  }, [elevationData, distanceData]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;

    const elevations = chartData.map(p => p.elevation);
    const totalGain = chartData.reduce((acc, point, index) => {
      if (index === 0) return 0;
      const diff = point.elevation - chartData[index - 1].elevation;
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    const totalLoss = chartData.reduce((acc, point, index) => {
      if (index === 0) return 0;
      const diff = point.elevation - chartData[index - 1].elevation;
      return acc + (diff < 0 ? Math.abs(diff) : 0);
    }, 0);

    return {
      maxElevation: Math.max(...elevations),
      minElevation: Math.min(...elevations),
      totalGain,
      totalLoss,
      maxGrade: Math.max(...chartData.map(p => Math.abs(p.grade))),
    };
  }, [chartData]);

  return { chartData, stats };
};
