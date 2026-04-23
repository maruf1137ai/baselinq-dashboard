import { Calendar, MapPin, Search } from "lucide-react";
import React, { useState } from "react";
import { Input } from "../ui/input";
import { Link } from "react-router-dom";
import { ScheduleNewMeetingDialog } from "./scheduleMeetingDialog";
import useFetch from "@/hooks/useFetch";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { formatMeetingDateTime } from "@/lib/dateUtils";
import { LifecycleBadge, ArtefactBadge } from "./MeetingStatusBadges";
import type { LifecycleStatus, ArtefactStatus } from "./MeetingStatusBadges";
import type { Notification } from "@/types/notification";

interface Meeting {
  id: number;
  title: string;
  status: LifecycleStatus;
  artefact_status: ArtefactStatus;
  date: string;
  time: string;
  date_time: string;
  scheduled_utc?: string;
  location: string;
  meeting_link?: string;
  attendees: string[];
  extra_attendees: number;
  ai_notes: boolean;
}

export default function MeetingsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const projectId = localStorage.getItem("selectedProjectId");

  const { data, isLoading, refetch } = useFetch<any>(
    projectId ? `meetings/?project_id=${projectId}` : null,
    {
      refetchInterval: (query: any) => {
        const list: any[] = Array.isArray(query?.state?.data) ? query.state.data : (query?.state?.data?.results ?? []);
        const hasActive = list.some((m: any) => m.status === "starting_soon" || m.status === "live");
        return hasActive ? 10000 : false;
      },
    }
  );

  const { data: unreadNotifs } = useFetch<Notification[]>(
    projectId ? `notifications/?unread_only=true&project_id=${projectId}` : null
  );
  const unreadMeetingIds = new Set(
    (Array.isArray(unreadNotifs) ? unreadNotifs : [])
      .filter((n) => n.type === "meeting_invited" || n.type === "meeting_updated")
      .map((n) => n.data?.meeting_id)
      .filter(Boolean)
  );

  const meetings: Meeting[] = Array.isArray(data) ? data : (data?.results ?? []);

  const upcoming   = meetings.filter((m) => m.status === "scheduled" || m.status === "starting_soon" || m.status === "live");
  const completed  = meetings.filter((m) => m.status === "completed");
  const noShows    = meetings.filter((m) => m.status === "no_show");
  const cancelled  = meetings.filter((m) => m.status === "cancelled");

  const filterMeetings = (list: Meeting[]) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (m) => m.title.toLowerCase().includes(q) || m.location.toLowerCase().includes(q)
    );
  };

  const filteredUpcoming  = filterMeetings(upcoming);
  const filteredCompleted = filterMeetings(completed);
  const filteredNoShows   = filterMeetings(noShows);
  const filteredCancelled = filterMeetings(cancelled);
  const isEmpty = filteredUpcoming.length === 0 && filteredCompleted.length === 0 && filteredNoShows.length === 0 && filteredCancelled.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 bg-white border-border placeholder:text-muted-foreground rounded-lg text-sm"
          />
        </div>
        <ScheduleNewMeetingDialog onCreated={refetch} />
      </div>

      {isLoading && <AwesomeLoader message="Loading Meetings" />}

      {!isLoading && (
        <>
          {filteredUpcoming.length > 0 && (
            <Section title="Upcoming">
              {filteredUpcoming.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={unreadMeetingIds.has(item.id)} />
              ))}
            </Section>
          )}

          {filteredCompleted.length > 0 && (
            <Section title="Completed">
              {filteredCompleted.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={unreadMeetingIds.has(item.id)} />
              ))}
            </Section>
          )}

          {filteredNoShows.length > 0 && (
            <Section title="No Show">
              {filteredNoShows.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={unreadMeetingIds.has(item.id)} />
              ))}
            </Section>
          )}

          {filteredCancelled.length > 0 && (
            <Section title="Cancelled">
              {filteredCancelled.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={unreadMeetingIds.has(item.id)} />
              ))}
            </Section>
          )}

          {isEmpty && (
            <div className="text-center py-20 text-sm text-muted-foreground">
              No meetings found
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MeetingCard({ item, isUnread }: { item: Meeting; isUnread?: boolean }) {
  return (
    <Link
      to={`/meetings/${item.id}`}
      className={`block rounded-lg border px-4 py-3 hover:bg-sidebar transition-colors ${isUnread ? "border-primary/40 bg-primary/5" : "border-border"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isUnread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
          <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
          <LifecycleBadge status={item.status} />
          {item.status === "completed" && (
            <ArtefactBadge artefactStatus={item.artefact_status} />
          )}
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <div className="flex -space-x-1.5">
            {item.attendees.slice(0, 3).map((name, i) => (
              <div key={i} className="h-6 w-6 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center">
                <span className="text-[10px] text-primary font-medium">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {item.extra_attendees > 0 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-white flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">+{item.extra_attendees}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1 shrink-0">
          <Calendar className="h-3.5 w-3.5" /> {item.scheduled_utc ? formatMeetingDateTime(item.scheduled_utc) : item.date_time}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <MapPin className="h-3.5 w-3.5" /> {item.location}
        </span>
      </div>
    </Link>
  );
}
