
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implement Supabase authentication
    console.log('Login attempt:', { email, password });
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white dark:bg-mountain-700"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-white dark:bg-mountain-700"
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-primary-600 hover:bg-primary-700 text-white" 
        disabled={isLoading}
      >
        {isLoading ? 'Signing In...' : 'Sign In'}
      </Button>
      
      <div className="text-center">
        <Button variant="link" className="text-primary-600 hover:text-primary-700">
          Forgot your password?
        </Button>
      </div>
      
      <div className="text-center text-sm text-mountain-600 dark:text-mountain-400">
        Don't have an account?{' '}
        <Button variant="link" className="text-primary-600 hover:text-primary-700 p-0">
          Sign up
        </Button>
      </div>
    </form>
  );
};
