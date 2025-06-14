
import React from 'react';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { InteractiveMap } from '../../components/route/interactive-map';
import { ElevationChart } from '../../components/route/elevation-chart';
import { SegmentsTable } from '../../components/route/segments-table';
import { Button } from '../../components/ui/button';
import { ArrowUp, Map, Settings } from 'lucide-react';

const RouteDetail = () => {
  const routeInfo = {
    name: 'Mountain Trail Loop',
    distance: 16.2,
    totalTime: '2h 45m',
    elevationGain: 520,
    elevationLoss: 520,
    avgPace: '10:12/km',
    maxElevation: 1620,
    minElevation: 1100
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
              {routeInfo.name}
            </h1>
            <div className="flex flex-wrap gap-6 text-sm text-mountain-600 dark:text-mountain-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {routeInfo.distance} km
              </span>
              <span className="flex items-center gap-1">
                <ArrowUp className="w-4 h-4" />
                +{routeInfo.elevationGain}m
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {routeInfo.totalTime}
              </span>
              <span>Pace: {routeInfo.avgPace}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="border-primary-300 text-primary-600 hover:bg-primary-50">
              <Settings className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button className="bg-primary-600 hover:bg-primary-700 text-white">
              <Map className="w-4 h-4 mr-2" />
              Share Route
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {routeInfo.maxElevation}m
            </div>
            <div className="text-sm text-mountain-600 dark:text-mountain-400">Max Elevation</div>
          </div>
          <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {routeInfo.minElevation}m
            </div>
            <div className="text-sm text-mountain-600 dark:text-mountain-400">Min Elevation</div>
          </div>
          <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-earth-600 dark:text-earth-400">
              8.2%
            </div>
            <div className="text-sm text-mountain-600 dark:text-mountain-400">Avg Grade</div>
          </div>
          <div className="bg-white dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              15.2%
            </div>
            <div className="text-sm text-mountain-600 dark:text-mountain-400">Max Grade</div>
          </div>
        </div>

        {/* Map and Chart */}
        <div className="grid lg:grid-cols-2 gap-6">
          <InteractiveMap routeData={{}} />
          <ElevationChart elevationData={[]} />
        </div>

        {/* Segments Table */}
        <SegmentsTable />
      </div>
    </DashboardLayout>
  );
};

export default RouteDetail;
