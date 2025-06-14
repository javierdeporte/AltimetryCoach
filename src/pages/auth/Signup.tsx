
import React from 'react';
import { AuthLayout } from '../../components/auth/auth-layout';
import { SignupForm } from '../../components/auth/signup-form';

const Signup = () => {
  return (
    <AuthLayout
      title="Join AltimetryCoach"
      subtitle="Create your account and start optimizing your trail runs"
    >
      <SignupForm />
    </AuthLayout>
  );
};

export default Signup;
