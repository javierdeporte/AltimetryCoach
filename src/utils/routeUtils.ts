
// Utility functions for route handling
// Note: Route type labels and colors are now loaded from database
// Use useRouteTypes() hook instead of these functions

export const getDateSourceIcon = (dateSource?: string) => {
  switch (dateSource) {
    case 'gps_metadata':
      return '📍'; // Real GPS data
    case 'manual':
      return '✏️'; // Manually entered
    case 'file':
    default:
      return '📄'; // File date
  }
};

export const getDateSourceLabel = (dateSource?: string) => {
  switch (dateSource) {
    case 'gps_metadata':
      return 'Fecha GPS real';
    case 'manual':
      return 'Fecha manual';
    case 'file':
    default:
      return 'Fecha de archivo';
  }
};

export const getDisplayDate = (route: any) => {
  if (route.gpx_capture_date) {
    const icon = getDateSourceIcon(route.date_source);
    const date = new Date(route.gpx_capture_date).toLocaleDateString('es-ES');
    return `${icon} ${date}`;
  }
  return `📄 ${new Date(route.created_at).toLocaleDateString('es-ES')}`;
};

export const formatEstimatedTime = (distanceKm: number): string => {
  const minutes = (distanceKm / 5) * 60;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

export const calculateElevationLoss = (elevationData: any[]): number => {
  return elevationData.reduce((acc, point, index) => {
    if (index === 0) return 0;
    const diff = point.elevation - elevationData[index - 1].elevation;
    return acc + (diff < 0 ? Math.abs(diff) : 0);
  }, 0);
};
