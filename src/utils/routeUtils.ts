
// Utility functions for route handling
export const getRouteTypeLabel = (routeType?: string) => {
  switch (routeType) {
    case 'training':
      return 'Entrenamiento';
    case 'race_profile':
      return 'Altimetría de Carrera';
    case 'route_planning':
      return 'Planificación';
    case 'custom':
      return 'Personalizada';
    default:
      return 'Entrenamiento';
  }
};

export const getRouteTypeColor = (routeType?: string) => {
  switch (routeType) {
    case 'training':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'race_profile':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'route_planning':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'custom':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    default:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  }
};

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
