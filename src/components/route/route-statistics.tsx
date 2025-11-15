import React from 'react';
import { Mountain, TrendingUp, TrendingDown, Clock, Gauge } from 'lucide-react';

interface RouteStatisticsProps {
  distance?: number;
  elevationGain?: number;
  elevationLoss: number;
  estimatedTime: string;
  maxElevation: number;
  minElevation: number;
  difficulty?: string;
  variant?: 'compact' | 'normal';
}

export const RouteStatistics: React.FC<RouteStatisticsProps> = ({
  distance,
  elevationGain,
  elevationLoss,
  estimatedTime,
  maxElevation,
  minElevation,
  difficulty,
  variant = 'compact',
}) => {
  const iconSize = variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = variant === 'compact' ? 'text-xs' : 'text-sm';

  const stats = [
    {
      icon: Mountain,
      label: 'Distancia',
      value: `${distance?.toFixed(2) || '0'} km`,
      show: true,
    },
    {
      icon: TrendingUp,
      label: 'Desnivel+',
      value: `${Math.round(elevationGain || 0)} m`,
      show: true,
    },
    {
      icon: TrendingDown,
      label: 'Desnivel-',
      value: `${Math.round(elevationLoss)} m`,
      show: true,
    },
    {
      icon: Clock,
      label: 'Tiempo est.',
      value: estimatedTime,
      show: true,
    },
    {
      icon: Mountain,
      label: 'Altitud máx',
      value: `${Math.round(maxElevation)} m`,
      show: true,
    },
    {
      icon: Mountain,
      label: 'Altitud mín',
      value: `${Math.round(minElevation)} m`,
      show: true,
    },
    {
      icon: Gauge,
      label: 'Dificultad',
      value: difficulty || 'Media',
      show: !!difficulty,
    },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-3 ${textSize} text-muted-foreground`}>
      {stats.filter(stat => stat.show).map((stat, index) => (
        <div key={index} className="flex items-center gap-1">
          <stat.icon className={iconSize} />
          <span className="font-medium">{stat.value}</span>
        </div>
      ))}
    </div>
  );
};
