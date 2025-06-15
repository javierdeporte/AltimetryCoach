
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: t('login_page.error_title'),
        description: error.message,
        variant: "destructive"
      });
    } else {
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <AuthLayout
      title={t('login_page.title')}
      subtitle={t('login_page.subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('login_page.email_label')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('login_page.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white dark:bg-mountain-700 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">{t('login_page.password_label')}</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white dark:bg-mountain-700 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-primary-600 hover:bg-primary-700 text-white" 
          disabled={loading}
        >
          {loading ? t('login_page.loading_button') : t('login_page.submit_button')}
        </Button>
        
        <div className="text-center">
          <Button variant="link" className="text-primary-600 hover:text-primary-700">
            {t('login_page.forgot_password')}
          </Button>
        </div>
        
        <div className="text-center text-sm text-mountain-600 dark:text-mountain-400">
          {t('login_page.no_account')}{' '}
          <Link to="/signup" className="text-primary-600 hover:text-primary-700 underline">
            {t('login_page.create_account')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
