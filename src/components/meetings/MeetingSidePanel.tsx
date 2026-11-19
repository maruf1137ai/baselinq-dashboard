import { useState } from "react";
import { ChevronsUpDown, Pencil, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import useFetch from "@/hooks/useFetch";
import { usePatch } from "@/hooks/usePatch";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatMeetingDateTime } from "@/lib/dateUtils";
import { LifecycleBadge, type LifecycleStatus } from "./MeetingStatusBadges";
import type { RsvpStatus } from "@/hooks/useMeetingRsvp";

export interface AttendeeResponse {
  user_id: number;
  name: string;
  email: string;
  rsvp_status: RsvpStatus;
  responded_at: string | null;
  /** Why they declined; empty unless rsvp_status is "declined". */
  decline_reason?: string;
  is_organiser: boolean;
}

export interface SidePanelMeeting {
  id: number;
  project: number;
  status: LifecycleStatus;
  scheduled_utc?: string;
  date_display: string;
  time: string;
  location: string;
  meeting_link?: string | null;
  priority?: string;
  created_by_name?: string | null;
  is_organiser?: boolean;
  attendees: number[];
  attendee_responses?: AttendeeResponse[];
}

/** A row of `projects/{id}/team-members/` (field names are the backend's). */
interface ProjectUserRow {
  _id?: string | number;
  userId: string | number;
  user?: { name?: string | null; email?: string | null };
}

/** Statuses in which the organiser may still change the meeting's details.
 *  Mirrors the server: details are editable while the stored status is
 *  `scheduled`, which displays as one of these three. */
const EDITABLE_STATUSES: LifecycleStatus[] = ["scheduled", "starting_soon", "awaiting_outcome"];

function canEditMeeting(meeting: Pick<SidePanelMeeting, "is_organiser" | "status">): boolean {
  return !!meeting.is_organiser && EDITABLE_STATUSES.includes(meeting.status);
}

const RSVP_BADGE: Record<RsvpStatus, { label: string; variant: "success" | "neutral" | "danger" }> = {
  accepted: { label: "Accepted", variant: "success" },
  invited: { label: "Pending", variant: "neutral" },
  declined: { label: "Declined", variant: "danger" },
};

function PanelCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-0 bg-card shadow-none border border-border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 min-h-[40px]">
        <h3 className="text-xs font-medium text-foreground">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </Card>
  );
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";
}

/**
 * The right-hand column of a meeting: what the meeting is, and who is invited
 * with each person's answer. The organiser can edit the details and add or
 * remove attendees here; everyone else sees it read-only.
 */
export function MeetingSidePanel({
  meeting,
  onEdit,
  onChanged,
}: {
  meeting: SidePanelMeeting;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const editable = canEditMeeting(meeting);
  const responses = meeting.attendee_responses ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const { mutateAsync: patchRequest, isPending } = usePatch();

  const { data: teamData } = useFetch<{ teamMembers: ProjectUserRow[] }>(
    editable ? `projects/${meeting.project}/team-members/` : "",
    { enabled: editable },
  );
  // field name matches backend, to be renamed in PR #2
  const candidates = (teamData?.teamMembers ?? []).filter(
    (m) => !meeting.attendees.includes(Number(m.userId)),
  );

  const saveAttendees = async (ids: number[], done: string) => {
    try {
      await patchRequest({ url: `meetings/${meeting.id}/`, data: { attendees: ids } });
      toast.success(done);
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update attendees."));
    }
  };

  const dateTime = meeting.scheduled_utc
    ? formatMeetingDateTime(meeting.scheduled_utc)
    : meeting.date_display + (meeting.time ? ` • ${meeting.time}` : "");

  return (
    <div className="space-y-4">
      <PanelCard
        title="Meeting details"
        action={editable && (
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
      >
        <dl className="grid grid-cols-[96px_1fr] gap-y-2.5 text-sm">
          <dt className="text-muted-foreground">Status</dt>
          <dd><LifecycleBadge status={meeting.status} /></dd>

          <dt className="text-muted-foreground">Date &amp; time</dt>
          <dd className="text-foreground tabular-nums">{dateTime || "—"}</dd>

          <dt className="text-muted-foreground">Location</dt>
          <dd className="text-foreground break-words">{meeting.location || "—"}</dd>

          <dt className="text-muted-foreground">Link</dt>
          <dd className="min-w-0">
            {meeting.meeting_link ? (
              <a
                href={meeting.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {meeting.meeting_link}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>

          <dt className="text-muted-foreground">Priority</dt>
          <dd className="text-foreground">{meeting.priority || "—"}</dd>

          <dt className="text-muted-foreground">Organiser</dt>
          <dd className="text-foreground">{meeting.created_by_name || "—"}</dd>
        </dl>
      </PanelCard>

      <PanelCard title={`Attendees (${responses.length})`}>
        <ul className="space-y-2.5">
          {responses.map((a) => {
            const badge = RSVP_BADGE[a.rsvp_status] ?? RSVP_BADGE.invited;
            return (
              <li key={a.user_id} className="flex items-center gap-2.5" data-testid={`attendee-${a.user_id}`}>
                <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-medium">
                  {initials(a.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-foreground truncate">{a.name}</span>
                    {a.is_organiser && <span className="text-[11px] text-muted-foreground shrink-0">Organiser</span>}
                  </div>
                  {a.email && a.email !== a.name && (
                    <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                  )}
                  {a.rsvp_status === "declined" && a.decline_reason && (
                    <p className="mt-1 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1 break-words">
                      <span className="font-medium">Reason:</span> {a.decline_reason}
                    </p>
                  )}
                </div>
                <Badge variant={badge.variant} className="shrink-0 text-[11px] px-2 py-0">{badge.label}</Badge>
                {editable && !a.is_organiser && (
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    disabled={isPending}
                    onClick={() => saveAttendees(
                      meeting.attendees.filter((id) => id !== a.user_id),
                      `${a.name} removed.`,
                    )}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {editable && (
          <div className="mt-3 pt-3 border-t border-border">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-label="Add attendee"
                  aria-expanded={pickerOpen}
                  disabled={isPending}
                  className="w-full justify-between font-normal h-9 text-sm"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <UserPlus className="h-4 w-4" /> Add attendee
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No other users on this project</CommandEmpty>
                    <CommandGroup>
                      {candidates.map((m) => {
                        const name = m.user?.name || m.user?.email || "User";
                        const id = Number(m.userId);
                        return (
                          <CommandItem
                            key={m._id ?? m.userId}
                            value={`${name} ${m.user?.email ?? ""}`}
                            onSelect={() => {
                              setPickerOpen(false);
                              saveAttendees([...meeting.attendees, id], `${name} invited.`);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm">{name}</span>
                              {m.user?.email && m.user.email !== name && (
                                <span className="text-xs text-muted-foreground">{m.user.email}</span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
