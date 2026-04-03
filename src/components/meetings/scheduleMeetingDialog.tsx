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
import { CalendarIcon, LinkIcon, PlusIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TimePicker } from "../commons/TimePicker";
import { usePost } from "@/hooks/usePost";
import { toast } from "sonner";

const priorityBtns = [
  { id: 1, title: "Low" },
  { id: 2, title: "Medium" },
  { id: 3, title: "High" },
];

export function ScheduleNewMeetingDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [priorityBtn, setPriorityBtn] = useState("Low");
  const [meetingLink, setMeetingLink] = useState("");

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
          priority: priorityBtn,
          status: "scheduled",
          location: meetingLink.trim() ? "Virtual — Video Call" : "",
        },
      });
      toast.success("Meeting scheduled.");
      setOpen(false);
      setTitle("");
      setDate(undefined);
      setTime("");
      setPriorityBtn("Low");
      setMeetingLink("");
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
                    className={`border py-3 px-4 rounded-lg text-left w-full ${
                      t === priorityBtn ? "bg-primary/10 border-primary" : "border-border"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
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
