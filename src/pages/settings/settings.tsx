import { DashboardLayout } from '@/components/DashboardLayout';
import React from 'react';
import { Sidebar } from '@/components/settings/sidebar';
import { Outlet } from 'react-router-dom';

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="h-full flex w-full">
        <div className="border-border bg-white flex-shrink-0">
          <Sidebar />
        </div>
        <div className="chatWindow flex-1 bg-muted overflow-hidden">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
