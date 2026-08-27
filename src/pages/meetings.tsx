import { DashboardLayout } from '@/components/DashboardLayout';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
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

  // Clears the whole "meetings" surface, not the single meeting_invited type
  // it used to name. A rescheduled meeting (meeting_updated) and a ready
  // transcript (meeting_transcript_ready) were counted by the bell but
  // cleared by nothing, so they sat unread however many times this page was
  // opened. `surface` resolves server-side against the same table the
  // Meetings badge is counted from, so the two can no longer disagree.
  useEffect(() => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) return;
    postData({
      url: "notifications/mark_type_read/",
      data: { surface: "meetings", project_id: parseInt(projectId) },
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
          reference={
            <Link
              to="/help/meetings"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Who can schedule, update, and act on meetings, notes, and transcripts"
            >
              <HelpCircle className="h-4 w-4" />
              Meetings reference
            </Link>
          }
          actions={
            <div className="flex items-center gap-3">
              {canScheduleMeeting && <ScheduleNewMeetingDialog onCreated={handleCreated} />}
            </div>
          }
        />
        <MeetingsList />
      </div>
    </DashboardLayout>
  );
};

export default Meetings;
