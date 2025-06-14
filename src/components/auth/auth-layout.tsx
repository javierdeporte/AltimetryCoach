
import React from 'react';
import { Logo } from '../ui/logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-earth-50 to-primary-100 dark:from-mountain-900 dark:via-mountain-800 dark:to-primary-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/90 dark:bg-mountain-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-primary-200/50 dark:border-mountain-700/50">
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
