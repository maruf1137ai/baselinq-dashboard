import { DashboardLayout } from '@/components/DashboardLayout';
import { ProjectStatusCard } from '@/components/ProjectStatusCard';
import React from 'react';
import MeetingsList from '@/components/meetings/meetingList';
import CashIcon from '@/components/icons/CashIcon';
import Calander2 from '@/components/icons/Calander2';
import Shield from '@/components/icons/Shield';
import Asterisk from '@/components/icons/Asterisk';

const Meetings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <div>
  <h1 className="text-3xl mb-[18px]  tracking-tight text-foreground">Meetings</h1>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <ProjectStatusCard icon={<CashIcon />} title="Upcoming Meetings" value="2" />
          <ProjectStatusCard icon={<Calander2 />} title="AI Notes Generated" value="1" badgeText="Fev 10" badgeVariant="success" />
          <ProjectStatusCard icon={<Shield />} title="Tasks from Meetings " value="3" badgeText="2 Open" badgeVariant="success" />
          <ProjectStatusCard icon={<Asterisk />} title="Compliance Evidence" value="1" />
        </div>

        <MeetingsList />
      </div>
    </DashboardLayout>
  );
};

export default Meetings;
