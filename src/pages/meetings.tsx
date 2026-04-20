import { DashboardLayout } from '@/components/DashboardLayout';
import React, { useEffect } from 'react';
import MeetingsList from '@/components/meetings/meetingList';
import { postData } from '@/lib/Api';

const Meetings = () => {
  useEffect(() => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) return;
    postData({
      url: "notifications/mark_type_read/",
      data: { type: "meeting_invited", project_id: parseInt(projectId) },
    }).catch(() => {});
  }, []);

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
