
import React from 'react';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Map, Upload, ArrowUp } from 'lucide-react';

const Dashboard = () => {
  const recentRoutes = [
    { id: 1, name: 'Mountain Trail Loop', distance: '16.2 km', elevation: '+520m', date: '2 days ago' },
    { id: 2, name: 'Forest Path Adventure', distance: '12.8 km', elevation: '+380m', date: '1 week ago' },
    { id: 3, name: 'Sunrise Peak Challenge', distance: '8.4 km', elevation: '+680m', date: '2 weeks ago' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary-500 to-earth-500 rounded-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Ready for your next adventure?</h2>
          <p className="text-primary-100 mb-6">Upload a new GPX file to analyze your trail running performance</p>
          <Button className="bg-white text-primary-600 hover:bg-primary-50">
            <Upload className="mr-2 h-4 w-4" />
            Upload New Route
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-primary-200 dark:border-mountain-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
                Total Routes
              </CardTitle>
              <Map className="h-4 w-4 text-primary-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">3</div>
              <p className="text-xs text-mountain-500 dark:text-mountain-500">
                Free plan limit reached
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary-200 dark:border-mountain-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
                Total Distance
              </CardTitle>
              <svg className="h-4 w-4 text-earth-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">37.4 km</div>
              <p className="text-xs text-mountain-500 dark:text-mountain-500">
                This month
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary-200 dark:border-mountain-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-mountain-600 dark:text-mountain-400">
                Total Elevation
              </CardTitle>
              <ArrowUp className="h-4 w-4 text-primary-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-mountain-800 dark:text-mountain-200">1,580m</div>
              <p className="text-xs text-mountain-500 dark:text-mountain-500">
                Elevation gain
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Routes */}
        <Card className="border-primary-200 dark:border-mountain-700">
          <CardHeader>
            <CardTitle className="text-mountain-800 dark:text-mountain-200">Recent Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRoutes.map((route) => (
                <div key={route.id} className="flex items-center justify-between p-4 bg-primary-50 dark:bg-mountain-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-mountain-800 dark:text-mountain-200">{route.name}</h4>
                    <div className="flex gap-4 text-sm text-mountain-600 dark:text-mountain-400">
                      <span>{route.distance}</span>
                      <span>{route.elevation}</span>
                      <span>{route.date}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-primary-300 text-primary-600 hover:bg-primary-50">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
