import { DashboardLayout } from '@/components/DashboardLayout';
import React from 'react';
import Window from '@/components/programme/window';

const Programme = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-normal tracking-tight text-foreground">Programme</h1>
        <Window />
      </div>
    </DashboardLayout>
  );
};

export default Programme;
