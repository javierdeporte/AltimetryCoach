
import React from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

export default Dashboard;
