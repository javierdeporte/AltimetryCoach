
import React from 'react';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useTranslation } from 'react-i18next';

const Billing = () => {
  const { t } = useTranslation();

  const plans = [
    {
      key: 'free',
      name: t('billing.free_plan_name'),
      price: '$0',
      period: t('billing.price_period'),
      current: true,
      features: t('billing.features.free', { returnObjects: true }) as string[],
    },
    {
      key: 'pro',
      name: t('billing.pro_plan_name'),
      price: '$9',
      period: t('billing.price_period'),
      current: false,
      features: t('billing.features.pro', { returnObjects: true }) as string[],
    }
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
            {t('billing.title')}
          </h1>
          <p className="text-mountain-600 dark:text-mountain-400">
            {t('billing.subtitle')}
          </p>
        </div>

        {/* Current Plan */}
        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader>
            <CardTitle className="text-mountain-800 dark:text-mountain-200">{t('billing.current_plan_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold text-mountain-800 dark:text-mountain-200">{t('billing.current_plan_name')}</h3>
                  <Badge variant="secondary">{t('billing.current_plan_badge')}</Badge>
                </div>
                <p className="text-mountain-600 dark:text-mountain-400">
                  {t('billing.current_plan_usage', { used: 3, total: 3 })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">$0</div>
                <div className="text-sm text-mountain-600 dark:text-mountain-400">{t('billing.price_period')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.key} 
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
                  {plan.current && <Badge>{t('billing.current_plan_badge')}</Badge>}
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
                  {Array.isArray(plan.features) && plan.features.map((feature, index) => (
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
                  {plan.current ? t('billing.current_plan_button') : t('billing.upgrade_button')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Billing History */}
        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader>
            <CardTitle className="text-mountain-800 dark:text-mountain-200">{t('billing.history_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-mountain-100 dark:bg-mountain-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-mountain-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
                {t('billing.history_empty_title')}
              </h3>
              <p className="text-mountain-600 dark:text-mountain-400">
                {t('billing.history_empty_desc')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
