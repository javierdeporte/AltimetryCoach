
import React from 'react';

interface SegmentNameProps {
  index: number;
  type?: string | null;
  isAdvancedMode?: boolean;
}

export const getSegmentName = ({ index, type, isAdvancedMode }: SegmentNameProps) => {
  // Para análisis básico, siempre usar "Segmento #" 
  if (!isAdvancedMode) {
    return `Segmento ${index + 1}`;
  }
  
  // Para análisis avanzado, usar nomenclatura especializada
  if (type === 'asc') {
    return `Ascenso ${index + 1}`;
  } else if (type === 'desc') {
    return `Descenso ${index + 1}`;
  } else if (type === 'hor') {
    return `Plano ${index + 1}`;
  }
  
  // Fallback para análisis avanzado
  return `Segmento ${index + 1}`;
};
