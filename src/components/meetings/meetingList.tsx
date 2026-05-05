import { Calendar, Check, MapPin, Search, Users, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import React, { useState } from "react";
import { Input } from "../ui/input";
import { Link } from "react-router-dom";
import useFetch from "@/hooks/useFetch";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { formatMeetingDateTime } from "@/lib/dateUtils";
import { LifecycleBadge, ArtefactBadge } from "./MeetingStatusBadges";
import type { LifecycleStatus, ArtefactStatus } from "./MeetingStatusBadges";
import type { Notification } from "@/types/notification";
import { useMeetingRsvp, type RsvpStatus } from "@/hooks/useMeetingRsvp";
import { toast } from "sonner";

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
  my_rsvp: RsvpStatus | null;
}

type FilterKey = "all" | "upcoming" | "completed" | "no_show" | "cancelled" | "declined";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "upcoming",  label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "no_show",   label: "No Show" },
  { key: "cancelled", label: "Cancelled" },
  { key: "declined",  label: "Declined" },
];

export default function MeetingsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const projectId = localStorage.getItem("selectedProjectId");

  const { data, isLoading } = useFetch<any>(
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

  const upcoming   = meetings.filter((m) => (m.status === "scheduled" || m.status === "starting_soon" || m.status === "live") && m.my_rsvp !== "declined");
  const declined   = meetings.filter((m) => m.my_rsvp === "declined");
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
  const filteredDeclined  = filterMeetings(declined);
  const filteredCompleted = filterMeetings(completed);
  const filteredNoShows   = filterMeetings(noShows);
  const filteredCancelled = filterMeetings(cancelled);

  const counts: Record<FilterKey, number> = {
    all:       meetings.length,
    upcoming:  upcoming.length,
    completed: completed.length,
    no_show:   noShows.length,
    cancelled: cancelled.length,
    declined:  declined.length,
  };

  const show = (key: FilterKey) => activeFilter === "all" || activeFilter === key;

  const isEmpty =
    (!show("upcoming")  || filteredUpcoming.length === 0) &&
    (!show("completed") || filteredCompleted.length === 0) &&
    (!show("no_show")   || filteredNoShows.length === 0) &&
    (!show("cancelled") || filteredCancelled.length === 0) &&
    (!show("declined")  || filteredDeclined.length === 0);

  return (
    <div className="space-y-6">
      {/* Filters + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => {
          const count = counts[key];
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-white border-border text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[11px] tabular-nums ${isActive ? "text-primary/70" : "text-muted-foreground/60"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        </div>

        <div className="relative shrink-0 w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 bg-white border-border placeholder:text-muted-foreground rounded-xl text-sm"
          />
        </div>
      </div>

      {isLoading && <AwesomeLoader message="Loading Meetings" />}

      {!isLoading && (
        <>
          {show("upcoming") && filteredUpcoming.length > 0 && (
            <Section title="Upcoming">
              {filteredUpcoming.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={unreadMeetingIds.has(item.id)} />
              ))}
            </Section>
          )}

          {show("completed") && filteredCompleted.length > 0 && (
            <Section title="Completed">
              {filteredCompleted.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={unreadMeetingIds.has(item.id)} />
              ))}
            </Section>
          )}

          {show("no_show") && filteredNoShows.length > 0 && (
            <Section title="No Show">
              {filteredNoShows.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={unreadMeetingIds.has(item.id)} />
              ))}
            </Section>
          )}

          {show("cancelled") && filteredCancelled.length > 0 && (
            <Section title="Cancelled">
              {filteredCancelled.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={unreadMeetingIds.has(item.id)} />
              ))}
            </Section>
          )}

          {show("declined") && filteredDeclined.length > 0 && (
            <Section title="Declined">
              {filteredDeclined.map((item) => (
                <MeetingCard key={item.id} item={item} isUnread={false} />
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

function RsvpBadge({ rsvp }: { rsvp: RsvpStatus | null }) {
  if (rsvp === "declined") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-200 text-gray-500 shrink-0">
        <X className="h-3 w-3" /> Declined
      </span>
    );
  }
  return null;
}

function MeetingCard({ item, isUnread }: { item: Meeting; isUnread?: boolean }) {
  const totalAttendees = item.attendees.length + (item.extra_attendees || 0);
  const { mutate: rsvp, isPending: isRsvping } = useMeetingRsvp(item.id);
  const isUpcoming = item.status === "scheduled" || item.status === "starting_soon" || item.status === "live";
  const showRsvpButtons = isUpcoming && item.my_rsvp === "invited";

  const handleRsvp = (e: React.MouseEvent, rsvpStatus: "accepted" | "declined") => {
    e.preventDefault();
    rsvp(rsvpStatus, {
      onSuccess: () => toast.success(rsvpStatus === "accepted" ? "Meeting accepted" : "Meeting declined"),
      onError: () => toast.error("Failed to update RSVP"),
    });
  };

  return (
    <Link
      to={`/meetings/${item.id}`}
      className={`block rounded-lg border px-4 py-3 hover:bg-sidebar transition-colors ${
        isUnread ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      {/* Row: title + badges (left), date · location · attendees + rsvp (right) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {isUnread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
          <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
          {!showRsvpButtons && <LifecycleBadge status={item.status} />}
          {item.status === "completed" && (
            <ArtefactBadge artefactStatus={item.artefact_status} />
          )}
          {item.my_rsvp === "declined" && <RsvpBadge rsvp="declined" />}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">
              <Calendar className="h-3.5 w-3.5" /> {item.scheduled_utc ? formatMeetingDateTime(item.scheduled_utc) : item.date_time}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap max-w-[18rem] truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{item.location}</span>
            </span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="flex items-center gap-1.5 whitespace-nowrap cursor-help"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Users className="h-3.5 w-3.5" /> {totalAttendees} {totalAttendees === 1 ? "user" : "users"}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" align="end" className="max-w-[18rem]">
                  <div className="text-xs font-medium mb-1">Attendees</div>
                  <ul className="text-xs space-y-0.5">
                    {item.attendees.slice(0, 8).map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                  {(item.extra_attendees > 0 || item.attendees.length > 8) && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      +{item.extra_attendees + Math.max(0, item.attendees.length - 8)} more — open meeting for full list
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* RSVP buttons — shown instead of status badge when invited */}
          {showRsvpButtons && (
            <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
              <button
                disabled={isRsvping}
                onClick={(e) => handleRsvp(e, "accepted")}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> Accept
              </button>
              <button
                disabled={isRsvping}
                onClick={(e) => handleRsvp(e, "declined")}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <X className="h-3 w-3" /> Decline
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
