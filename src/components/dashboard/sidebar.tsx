
import React from 'react';
import { Button } from '../ui/button';
import { Logo } from '../ui/logo';
import { Home, Upload, Settings, ArrowUp, List } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarItem {
  icon: React.ComponentType<any>;
  label: string;
  href: string;
  disabled?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: List, label: 'Mis Rutas', href: '/dashboard/routes' },
  { icon: Upload, label: 'Subir', href: '/dashboard/upload' },
  { icon: ArrowUp, label: 'Planes', href: '/dashboard/plans', disabled: true },
  { icon: Settings, label: 'Configuración', href: '/dashboard/settings', disabled: true },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (href === '/dashboard/routes') {
      return location.pathname === '/dashboard/routes' || location.pathname.startsWith('/dashboard/routes/');
    }
    return location.pathname === href;
  };

  const handleNavigation = (href: string, disabled?: boolean) => {
    console.log('Navigating to:', href, 'disabled:', disabled);
    if (!disabled) {
      navigate(href);
    }
  };

  return (
    <div className={`bg-white dark:bg-mountain-800 border-r border-primary-200 dark:border-mountain-700 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-primary-200 dark:border-mountain-700">
        <div className="flex items-center justify-between">
          <Logo size="md" showText={!isCollapsed} />
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-2"
          >
            <svg className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              <Button
                variant={isActive(item.href) ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  isActive(item.href) 
                    ? 'bg-primary-600 text-white' 
                    : 'text-mountain-600 dark:text-mountain-300'
                } ${isCollapsed ? 'px-2' : 'px-4'} ${
                  item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={() => handleNavigation(item.href, item.disabled)}
                disabled={item.disabled}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="flex items-center justify-between w-full">
                    {item.label}
                    {item.disabled && (
                      <span className="text-xs text-muted-foreground">Próximamente</span>
                    )}
                  </span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-primary-200 dark:border-mountain-700">
        <Button
          variant="outline"
          className={`w-full justify-start gap-3 border-earth-300 text-earth-600 hover:bg-earth-50 ${isCollapsed ? 'px-2' : 'px-4'}`}
          onClick={() => navigate('/dashboard/billing')}
        >
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          {!isCollapsed && <span>Upgrade to Pro</span>}
        </Button>
      </div>
    </div>
  );
};
