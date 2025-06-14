
import React from 'react';
import { Button } from '../ui/button';
import { Logo } from '../ui/logo';
import { Map, Upload, Settings, ArrowUp } from 'lucide-react';

interface SidebarItem {
  icon: React.ComponentType<any>;
  label: string;
  href: string;
  active?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { icon: Map, label: 'Routes', href: '/dashboard/routes', active: true },
  { icon: Upload, label: 'Upload', href: '/dashboard/upload' },
  { icon: ArrowUp, label: 'Plans', href: '/dashboard/plans' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
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
                variant={item.active ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${item.active ? 'bg-primary-600 text-white' : 'text-mountain-600 dark:text-mountain-300'} ${isCollapsed ? 'px-2' : 'px-4'}`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
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
