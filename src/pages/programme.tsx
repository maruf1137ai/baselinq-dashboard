import { DashboardLayout } from '@/components/DashboardLayout';
import { ProjectStatusCard } from '@/components/ProjectStatusCard';
import React from 'react';
import Window from '@/components/programme/window';
import CashIcon from '@/components/icons/CashIcon';
import Calander2 from '@/components/icons/Calander2';
import Shield from '@/components/icons/Shield';
import Asterisk from '@/components/icons/Asterisk';

const Programme = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <div>
           <h1 className="text-3xl mb-[18px]  tracking-tight text-foreground">Programme</h1>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <ProjectStatusCard icon={<CashIcon />} title="Progress" value="58%" />
          <ProjectStatusCard icon={<Calander2 />} title="Next Milestone" value="M3 " badgeText="2025-02-15" badgeVariant="success" />
          <ProjectStatusCard icon={<Shield />} title="Predicted Delay" value="+12d" badgeText="2 Open" badgeVariant="success" />
          <ProjectStatusCard icon={<Asterisk />} title="Budget Health" value="72%" />
        </div>

        <Window />
      </div>
    </DashboardLayout>
  );
};

export default Programme;
