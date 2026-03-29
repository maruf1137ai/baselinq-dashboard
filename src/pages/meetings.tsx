import { DashboardLayout } from '@/components/DashboardLayout';
import React from 'react';
import MeetingsList from '@/components/meetings/meetingList';

const Meetings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-normal tracking-tight text-foreground">Meetings</h1>
        <MeetingsList />
      </div>
    </DashboardLayout>
  );
};

export default Meetings;
