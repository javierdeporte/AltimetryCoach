
interface SegmentNameGeneratorProps {
  index: number;
  type?: string | null;
  isAdvancedMode: boolean;
}

export const getSegmentName = ({ index, type, isAdvancedMode }: SegmentNameGeneratorProps): string => {
  if (isAdvancedMode && type) {
    const typeLabels = {
      'asc': 'Ascenso',
      'desc': 'Descenso',
      'hor': 'Plano'
    };
    return `${typeLabels[type as keyof typeof typeLabels]} ${index + 1}`;
  }
  
  const names = [
    'Inicio del sendero',
    'Ascenso principal',
    'Tramo intermedio',
    'Descenso técnico',
    'Tramo final',
    'Regreso'
  ];
  return names[index] || `Segmento ${index + 1}`;
};
