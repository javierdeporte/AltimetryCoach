
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const SignUp = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t('signup_page.generic_error_title'),
        description: t('signup_page.error_passwords_no_match'),
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: t('signup_page.generic_error_title'),
        description: t('signup_page.error_password_too_short'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    
    if (error) {
      toast({
        title: t('signup_page.error_title'),
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: t('signup_page.success_title'),
        description: t('signup_page.success_description'),
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <AuthLayout
      title={t('signup_page.title')}
      subtitle={t('signup_page.subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('signup_page.fullName_label')}</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder={t('signup_page.fullName_placeholder')}
            value={formData.fullName}
            onChange={handleChange}
            required
            className="bg-white dark:bg-mountain-700 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">{t('signup_page.email_label')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t('login_page.email_placeholder')}
            value={formData.email}
            onChange={handleChange}
            required
            className="bg-white dark:bg-mountain-700 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">{t('signup_page.password_label')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            className="bg-white dark:bg-mountain-700 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('signup_page.confirmPassword_label')}</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="bg-white dark:bg-mountain-700 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-primary-600 hover:bg-primary-700 text-white" 
          disabled={loading}
        >
          {loading ? t('signup_page.loading_button') : t('signup_page.submit_button')}
        </Button>
        
        <div className="text-center text-sm text-mountain-600 dark:text-mountain-400">
          {t('signup_page.has_account')}{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 underline">
            {t('signup_page.login_link')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default SignUp;
