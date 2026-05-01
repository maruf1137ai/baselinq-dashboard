import { DashboardLayout } from '@/components/DashboardLayout';
import React from 'react';
import { Construction } from 'lucide-react';

const Programme = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-4">
        <h1 className="text-2xl font-normal tracking-tight text-foreground">Programme</h1>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
            <Construction className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-normal text-foreground mb-2">Under Construction</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            The Programme module is coming soon. Full Gantt chart scheduling and milestone tracking will be available here.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Programme;
