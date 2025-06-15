
import React from 'react';
import { Logo } from '../ui/logo';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-earth-50 to-primary-100 dark:from-mountain-900 dark:via-mountain-800 dark:to-primary-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/90 dark:bg-mountain-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-primary-200/50 dark:border-mountain-700/50">
          {/* Back to landing link */}
          <div className="mb-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 text-mountain-600 hover:text-mountain-800">
                <ArrowLeft className="h-4 w-4" />
                {t('auth_layout.back_to_home')}
              </Button>
            </Link>
          </div>
          
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-4" />
            <h1 className="text-2xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
              {title}
            </h1>
            <p className="text-mountain-600 dark:text-mountain-400">
              {subtitle}
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
