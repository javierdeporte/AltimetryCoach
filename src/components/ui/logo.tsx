
import React from 'react';
import { Map } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showText = true, 
  className = '',
  onClick
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <div 
      className={`flex items-center gap-2 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-primary-500 to-earth-500 rounded-lg flex items-center justify-center`}>
        <Map className="h-1/2 w-1/2 text-white" />
      </div>
      {showText && (
        <span className={`font-bold bg-gradient-to-r from-primary-600 to-earth-600 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
          AltimetryCoach
        </span>
      )}
    </div>
  );
};
