
import React from 'react';
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
  User,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // For authenticated users, we don't render any layout here
  // The DashboardLayout will handle everything
  if (user) {
    return <>{children}</>;
  }

  // For non-authenticated users, render a simple top bar
  return (
    <div className="min-h-screen bg-primary-50 dark:bg-mountain-900">
      <header className="bg-white dark:bg-mountain-800 border-b border-primary-200 dark:border-mountain-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo size="sm" className="cursor-pointer" onClick={() => navigate('/')} />
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
};
