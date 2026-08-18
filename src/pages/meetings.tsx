import { DashboardLayout } from '@/components/DashboardLayout';
import React, { useEffect } from 'react';
import MeetingsList from '@/components/meetings/meetingList';
import { postData } from '@/lib/Api';
import { useNotificationStore } from '@/store/useNotificationStore';
import { ScheduleNewMeetingDialog } from '@/components/meetings/scheduleMeetingDialog';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermissions';
import { PageHeader } from '@/components/ui/page-header';

const Meetings = () => {
  const refreshNotifications = useNotificationStore((state) => state.refresh);
  const qc = useQueryClient();
  const { canScheduleMeeting } = usePermissions();

  const handleCreated = () => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (projectId) qc.invalidateQueries({ queryKey: [`meetings/?project_id=${projectId}`] });
  };

  useEffect(() => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) return;
    postData({
      url: "notifications/mark_type_read/",
      data: { type: "meeting_invited", project_id: parseInt(projectId) },
    }).then(() => {
      refreshNotifications();
      window.dispatchEvent(new Event("notifications-marked-read"));
    }).catch(() => {});
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Meetings"
          actions={canScheduleMeeting ? <ScheduleNewMeetingDialog onCreated={handleCreated} /> : undefined}
        />
        <MeetingsList />
      </div>
    </DashboardLayout>
  );
};

export default Meetings;
