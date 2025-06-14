
import React from 'react';
import { HeroSection } from '../components/landing/hero-section';
import { ThemeProvider } from '../components/theme-provider';

const Index = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <HeroSection />
      </div>
    </ThemeProvider>
  );
};

export default Index;
