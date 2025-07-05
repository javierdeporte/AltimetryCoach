
export const getGradeColor = (grade: number): string => {
  const absGrade = Math.abs(grade);
  if (absGrade > 8) return 'text-red-600 dark:text-red-400';
  if (absGrade > 4) return 'text-earth-600 dark:text-earth-400';
  if (absGrade > 0) return 'text-primary-600 dark:text-primary-400';
  return 'text-blue-600 dark:text-blue-400';
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
