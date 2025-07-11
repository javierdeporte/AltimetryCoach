
export const trailTheme = {
  colors: {
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    earth: {
      50: '#fef7ed',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    mountain: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    }
  },
  gradients: {
    hero: 'bg-gradient-to-br from-primary-500 via-earth-400 to-primary-600',
    card: 'bg-gradient-to-br from-white/80 to-primary-50/50',
    dark: 'bg-gradient-to-br from-mountain-900 via-mountain-800 to-primary-900',
  }
}

export const routes = {
  HOME: '/',
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  DASHBOARD: '/dashboard',
  UPLOAD: '/dashboard/upload',
  ROUTES: '/dashboard/routes',
  ROUTE_DETAIL: '/dashboard/routes/:id',
  PLANS: '/dashboard/plans',
  BILLING: '/dashboard/billing',
  SETTINGS: '/dashboard/settings',
}
