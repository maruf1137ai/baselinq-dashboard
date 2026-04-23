"use client";

import { useState } from "react";
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
import useFetch from "@/hooks/useFetch";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

const priorityBtns = [
  { id: 1, title: "Low" },
  { id: 2, title: "Medium" },
  { id: 3, title: "High" },
];

export function ScheduleNewMeetingDialog({ onCreated }: { onCreated?: () => void }) {
  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").id as number | undefined; } catch { return undefined; }
  })();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [priorityBtn, setPriorityBtn] = useState("Low");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>(currentUserId ? [currentUserId] : []);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const projectId = localStorage.getItem("selectedProjectId");
  const { data: teamData } = useFetch<{ teamMembers: any[] }>(
    projectId ? `projects/${projectId}/team-members/` : "",
    { enabled: !!projectId }
  );
  const teamMembers = teamData?.teamMembers || [];

  const { mutateAsync: postRequest, isPending } = usePost();

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Meeting title is required."); return; }
    if (!date) { toast.error("Please select a date."); return; }

    const projectId = localStorage.getItem("selectedProjectId");
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
    } catch {
      toast.error("Failed to schedule meeting.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 bg-primary text-white rounded-lg hover:bg-primary/90">
          <PlusIcon className="w-5 h-5" />
          Schedule Meeting
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[650px] bg-white p-0">
        <DialogHeader className="py-[22px] px-6 border-b border-border">
          <DialogTitle className="text-base text-foreground">
            Schedule New Meeting
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
              <Label className="text-sm text-foreground mb-2">Participants</Label>
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
                        {teamMembers
                          .filter((m) => selectedAttendees.includes(parseInt(m.userId)))
                          .map((member) => {
                            const isCreator = parseInt(member.userId) === currentUserId;
                            return (
                              <span
                                key={member._id}
                                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[12px] px-2 py-1 rounded-md"
                              >
                                {member.user?.name || member.user?.email}
                                {isCreator ? (
                                  <span className="text-[10px] text-primary/60 ml-0.5">You</span>
                                ) : (
                                  <X
                                    className="w-3 h-3 cursor-pointer hover:text-primary/70"
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
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white" align="start">
                  <Command>
                    <CommandInput placeholder="Search team members..." />
                    <CommandList>
                      <CommandEmpty>No team member found.</CommandEmpty>
                      <CommandGroup>
                        {teamMembers.map((member) => {
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
                                      <span className="text-[11px] text-muted-foreground">{email}</span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                    isSelected ? "border-primary bg-primary" : "border-border bg-white"
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
                {isPending ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

