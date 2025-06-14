
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Map, 
  Upload, 
  Target, 
  Settings, 
  Menu, 
  X, 
  User,
  LogOut
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { icon: Map, label: 'Routes', path: '/dashboard', disabled: false },
    { icon: Upload, label: 'Upload', path: '/dashboard/upload', disabled: false },
    { icon: Target, label: 'Plans', path: '/dashboard/plans', disabled: true }, // TODO: Implement plans
    { icon: Settings, label: 'Settings', path: '/dashboard/settings', disabled: true }, // TODO: Implement settings
  ];

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-mountain-900">
      {/* Top Bar */}
      <header className="bg-white dark:bg-mountain-800 border-b border-primary-200 dark:border-mountain-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Logo size="sm" className="cursor-pointer" onClick={() => navigate('/')} />
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {user && (
          <aside className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 transition-transform duration-200 ease-in-out
            fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-mountain-800 
            border-r border-primary-200 dark:border-mountain-700 pt-16 md:pt-0
          `}>
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => !item.disabled && navigate(item.path)}
                  disabled={item.disabled}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.disabled && <span className="text-xs text-muted-foreground ml-auto">Próximamente</span>}
                </Button>
              ))}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
