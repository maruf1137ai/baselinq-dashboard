import { DashboardLayout } from '@/components/DashboardLayout';
import React from 'react';
import Window from '@/components/programme/window';
import { PageHeader } from '@/components/ui/page-header';

const Programme = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Programme" />
        <Window />
      </div>
    </DashboardLayout>
  );
};

export default Programme;
