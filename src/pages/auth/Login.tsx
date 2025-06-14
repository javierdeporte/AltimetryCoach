
import React from 'react';
import { AuthLayout } from '../../components/auth/auth-layout';
import { LoginForm } from '../../components/auth/login-form';

const Login = () => {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your AltimetryCoach account"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;
