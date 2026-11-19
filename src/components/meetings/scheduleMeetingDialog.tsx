"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, LinkIcon, PlusIcon, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TimePicker } from "../commons/TimePicker";
import { usePost } from "@/hooks/usePost";
import { usePatch } from "@/hooks/usePatch";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";
import useFetch from "@/hooks/useFetch";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

const priorityBtns = [
  { id: 1, title: "Low" },
  { id: 2, title: "Medium" },
  { id: 3, title: "High" },
];

/** The fields of an existing meeting the edit form needs (from `meetings/{id}/`). */
export interface EditableMeeting {
  id: number;
  project: number;
  title: string;
  meeting_link?: string | null;
  date: string; // yyyy-MM-dd
  time: string; // "h:mm AM/PM"
  priority?: string;
  attendees: number[];
}

/** "2026-12-01" → that day at local midnight (`new Date("2026-12-01")` would be UTC). */
function parseLocalDate(value: string): Date | undefined {
  const [y, m, d] = (value || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
}

type Props = {
  /** Create mode: called after a meeting is scheduled. */
  onCreated?: () => void;
  /** Edit mode: the meeting to change. Only its organiser is offered this. */
  meeting?: EditableMeeting;
  /** Edit mode is opened by the caller, so it controls `open`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Edit mode: called after the changes are saved. */
  onSaved?: () => void;
};

export function ScheduleNewMeetingDialog({ onCreated, meeting, open: openProp, onOpenChange, onSaved }: Props) {
  const isEdit = !!meeting;
  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").id as number | undefined; } catch { return undefined; }
  })();

  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [priorityBtn, setPriorityBtn] = useState("Low");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>(currentUserId ? [currentUserId] : []);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Edit mode: start from the meeting as it is now, every time the form opens.
  useEffect(() => {
    if (!open || !meeting) return;
    setTitle(meeting.title);
    setDate(parseLocalDate(meeting.date));
    setTime(meeting.time || "");
    setPriorityBtn(meeting.priority || "Low");
    setMeetingLink(meeting.meeting_link || "");
    setSelectedAttendees(meeting.attendees);
  }, [open, meeting]);

  const selectedProjectId = useSelectedProjectId();
  const projectId = isEdit ? String(meeting.project) : selectedProjectId;
  const { data: teamData } = useFetch<{ teamMembers: any[] }>(
    projectId ? `projects/${projectId}/team-members/` : "",
    { enabled: !!projectId }
  );
  // field name matches backend, to be renamed in PR #2
  const users = teamData?.teamMembers || [];

  const { mutateAsync: postRequest, isPending: isPosting } = usePost();
  const { mutateAsync: patchRequest, isPending: isPatching } = usePatch();
  const isPending = isPosting || isPatching;

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Meeting title is required."); return; }
    if (!date) { toast.error("Please select a date."); return; }
    // Without this the meeting was saved with no time and shown at 12:00 AM.
    if (!time) { toast.error("Please select a time."); return; }

    if (isEdit) {
      const link = meetingLink.trim();
      const linkChanged = link !== (meeting.meeting_link || "");
      try {
        await patchRequest({
          url: `meetings/${meeting.id}/`,
          data: {
            title: title.trim(),
            meeting_link: link || null,
            date: format(date, "yyyy-MM-dd"),
            time,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            priority: priorityBtn,
            attendees: selectedAttendees,
            // Location follows the link only when the link itself changed,
            // the same rule as scheduling; otherwise it is left as it is.
            ...(linkChanged ? { location: link ? "Virtual — Video Call" : "" } : {}),
          },
        });
        toast.success("Meeting updated.");
        setOpen(false);
        onSaved?.();
      } catch (err) {
        toast.error(apiErrorMessage(err, "Failed to update meeting."));
      }
      return;
    }

    if (!projectId) { toast.error("No project selected."); return; }

    try {
      await postRequest({
        url: "meetings/",
        data: {
          project: parseInt(projectId),
          title: title.trim(),
          meeting_link: meetingLink.trim() || null,
          date: format(date, "yyyy-MM-dd"),
          time,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          priority: priorityBtn,
          status: "scheduled",
          location: meetingLink.trim() ? "Virtual — Video Call" : "",
          attendees: selectedAttendees,
        },
      });
      toast.success("Meeting scheduled.");
      setOpen(false);
      setTitle("");
      setDate(undefined);
      setTime("");
      setPriorityBtn("Low");
      setMeetingLink("");
      setSelectedAttendees(currentUserId ? [currentUserId] : []);
      onCreated?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to schedule meeting."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button className="h-8 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusIcon className="mr-1.5" />
            Schedule Meeting
          </Button>
        </DialogTrigger>
      )}

      <DialogContent size="lg" className="p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>
            {isEdit ? "Edit Meeting" : "Schedule New Meeting"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-5">
            <div>
              <Label htmlFor="title" className="text-sm text-foreground">
                Meeting Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Confirm concrete supplier availability"
                className="mt-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="meeting-link" className="text-sm text-foreground">
                Meeting Link
              </Label>
              <div className="relative mt-2">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="meeting-link"
                  placeholder="e.g., https://meet.google.com/abc-defg-hij"
                  className="pl-9"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col w-1/2">
                <Label htmlFor="due-date" className="text-sm text-foreground mb-2">
                  Date *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="due-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="w-1/2">
                <TimePicker time={time} setTime={setTime} />
              </div>
            </div>

            <div className="flex flex-col">
              <Label className="text-sm text-foreground mb-2">Priority</Label>
              <div className="flex items-center gap-3">
                {priorityBtns.map(({ id, title: t }) => (
                  <button
                    key={id}
                    onClick={() => setPriorityBtn(t)}
                    className={`border py-3 px-4 rounded-lg text-left w-full ${t === priorityBtn ? "bg-primary/10 border-primary" : "border-border"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <Label className="text-sm text-foreground mb-2">Attendees</Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className="w-full justify-between font-normal min-h-[44px] h-auto p-2"
                  >
                    {selectedAttendees.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {users
                          .filter((m) => selectedAttendees.includes(parseInt(m.userId)))
                          .map((member) => {
                            const isCreator = parseInt(member.userId) === currentUserId;
                            return (
                              <span
                                key={member._id}
                                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md"
                              >
                                {member.user?.name || member.user?.email}
                                {isCreator ? (
                                  <span className="text-xs text-primary/60 ml-0.5">You</span>
                                ) : (
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-primary/70"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAttendees((prev) =>
                                        prev.filter((id) => id !== parseInt(member.userId))
                                      );
                                    }}
                                  />
                                )}
                              </span>
                            );
                          })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Select participants...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users match this search</CommandEmpty>
                      <CommandGroup>
                        {users.map((member) => {
                          const u = member.user;
                          const name = u?.name || u?.email || "User";
                          const email = u?.email;
                          const isSelected = selectedAttendees.includes(parseInt(member.userId));
                          const isCreator = parseInt(member.userId) === currentUserId;
                          return (
                            <CommandItem
                              key={member._id}
                              onSelect={() => {
                                if (isCreator) return;
                                setSelectedAttendees((prev) =>
                                  isSelected
                                    ? prev.filter((id) => id !== parseInt(member.userId))
                                    : [...prev, parseInt(member.userId)]
                                );
                              }}
                              className={isCreator ? "cursor-default opacity-70" : "cursor-pointer"}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium uppercase">
                                    {name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{name}</span>
                                    {email && name !== email && (
                                      <span className="text-xs text-muted-foreground">{email}</span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                    isSelected ? "border-primary bg-primary" : "border-border bg-card"
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
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
          </div>

          <div className="flex items-end justify-end border-t pt-4 mt-4">
            <div className="flex gap-2 items-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isEdit
                  ? (isPending ? "Saving..." : "Save changes")
                  : (isPending ? "Scheduling..." : "Schedule Meeting")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

