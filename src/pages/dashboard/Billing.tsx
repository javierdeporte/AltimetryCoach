
import React from 'react';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

const Billing = () => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      current: true,
      features: [
        'Up to 3 routes',
        'Basic elevation analysis',
        'Route visualization',
        'Community support'
      ]
    },
    {
      name: 'Pro Athlete',
      price: '$9',
      period: '/month',
      current: false,
      features: [
        'Unlimited routes',
        'Advanced analytics',
        'Export to PDF/CSV',
        'Nutrition planning',
        'Offline mode',
        'Priority support'
      ]
    }
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
            Billing & Plans
          </h1>
          <p className="text-mountain-600 dark:text-mountain-400">
            Manage your subscription and upgrade to unlock advanced features
          </p>
        </div>

        {/* Current Plan */}
        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader>
            <CardTitle className="text-mountain-800 dark:text-mountain-200">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold text-mountain-800 dark:text-mountain-200">Free Plan</h3>
                  <Badge variant="secondary">Current</Badge>
                </div>
                <p className="text-mountain-600 dark:text-mountain-400">
                  3 routes used out of 3 available
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">$0</div>
                <div className="text-sm text-mountain-600 dark:text-mountain-400">/month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`border-2 transition-all ${
                plan.current 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-primary-200 dark:border-mountain-700 hover:border-primary-300'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-mountain-800 dark:text-mountain-200">
                    {plan.name}
                  </CardTitle>
                  {plan.current && <Badge>Current</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-mountain-800 dark:text-mountain-200">
                    {plan.price}
                  </span>
                  <span className="text-mountain-600 dark:text-mountain-400">
                    {plan.period}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-mountain-600 dark:text-mountain-400">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.current 
                      ? 'bg-mountain-600 hover:bg-mountain-700' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  } text-white`}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : 'Upgrade Now'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Billing History */}
        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader>
            <CardTitle className="text-mountain-800 dark:text-mountain-200">Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-mountain-100 dark:bg-mountain-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-mountain-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
                No billing history
              </h3>
              <p className="text-mountain-600 dark:text-mountain-400">
                You're currently on the free plan. Upgrade to Pro to see billing history.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
