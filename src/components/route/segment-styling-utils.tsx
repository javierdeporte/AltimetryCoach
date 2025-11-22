
export const getGradeColor = (grade: number, isMaxInDirection: boolean = false): string => {
  if (grade > 0) {
    // Ascenso - verde
    return isMaxInDirection 
      ? 'text-green-600 dark:text-green-400 font-bold' 
      : 'text-green-600 dark:text-green-400';
  } else if (grade < 0) {
    // Descenso - azul
    return isMaxInDirection 
      ? 'text-blue-600 dark:text-blue-400 font-bold' 
      : 'text-blue-600 dark:text-blue-400';
  }
  // Plano
  return 'text-muted-foreground';
};

export const getQualityIndicator = (rSquared: number | null) => {
  if (rSquared === null) return null;
  
  const quality = rSquared * 100;
  let colorClass = 'text-red-500';
  let label = 'Baja';
  
  if (quality >= 95) {
    colorClass = 'text-green-600';
    label = 'Excelente';
  } else if (quality >= 90) {
    colorClass = 'text-primary-600';
    label = 'Muy Buena';
  } else if (quality >= 85) {
    colorClass = 'text-yellow-600';
    label = 'Buena';
  } else if (quality >= 80) {
    colorClass = 'text-orange-600';
    label = 'Regular';
  }
  
  return (
    <span className={`text-xs ${colorClass} font-medium`} title={`R² = ${rSquared.toFixed(3)}`}>
      {label}
    </span>
  );
};
