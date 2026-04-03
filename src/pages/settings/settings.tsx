import { DashboardLayout } from '@/components/DashboardLayout';
import React from 'react';
import { Sidebar } from '@/components/settings/sidebar';
import { Outlet } from 'react-router-dom';

const Settings = () => {
  return (
    <DashboardLayout padding="p-0" overflow="overflow-hidden">
      <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
        <div className="flex-shrink-0 border-r border-border bg-white h-full overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1 bg-muted overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
