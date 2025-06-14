
import React from 'react';
import { Button } from '../ui/button';
import { ThemeToggle } from '../ui/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface TopBarProps {
  userName?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ userName = "John Doe" }) => {
  return (
    <header className="bg-white dark:bg-mountain-800 border-b border-primary-200 dark:border-mountain-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">
            Dashboard
          </h1>
          <p className="text-sm text-mountain-600 dark:text-mountain-400">
            Welcome back, {userName.split(' ')[0]}!
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src="/placeholder.svg" alt={userName} />
              <AvatarFallback className="bg-primary-100 text-primary-600">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-mountain-800 dark:text-mountain-200">
                {userName}
              </p>
              <p className="text-xs text-mountain-600 dark:text-mountain-400">
                Free Plan
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
