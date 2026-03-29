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

const priorityBtns = [
  {
    id: 1,
    title: "Low",
  },
  {
    id: 2,
    title: "Medium",
  },
  {
    id: 3,
    title: "High",
  },
];

export function ScheduleNewMeetingDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [priorityBtn, setPriorityBtn] = useState("Low");
  const [meetingLink, setMeetingLink] = useState("");

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
            {/* Document Title */}
            <div>
              <Label htmlFor="title" className="text-sm text-foreground">
                Meeting Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Confirm concrete supplier availability"
                className="mt-2"
              />
            </div>

            {/* Meeting Link */}
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

            {/* Date & Time */}
            <div className="flex gap-4">
              {/* DATE FIELD */}
              <div className="flex flex-col w-1/2">
                <Label
                  htmlFor="due-date"
                  className="text-sm text-foreground mb-2">
                  Due Date *
                </Label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="due-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick date</span>}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* TIME FIELD */}
              <div className="w-1/2">
                <TimePicker time={time} setTime={setTime} />
              </div>
            </div>

            {/* priority */}
            <div className="flex flex-col">
              {/* 👇 Added your label here */}
              <Label htmlFor="date" className="text-sm text-foreground mb-2">
                Due Date *
              </Label>
              <div className="flex items-center gap-3">
                {priorityBtns?.map(({ id, title }) => (
                  <button
                    key={id}
                    onClick={() => setPriorityBtn(title)}
                    className={`border py-3 px-4 rounded-lg text-left w-full ${
                      title == priorityBtn
                        ? "bg-primary/10 border-primary"
                        : "border-border"
                    }`}>
                    {title}
                  </button>
                ))}
                {/* <button className="border border-border py-3 px-4 rounded-lg text-left w-full">
                  Low
                </button>
                <button className="border border-primary py-3 px-4 rounded-lg text-left w-full bg-primary/10">
                  Low
                </button>
                <button className="border border-border py-3 px-4 rounded-lg text-left w-full">
                  Low
                </button> */}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-end border-t pt-4 mt-4">
            <div className="flex gap-2 items-end">
              <Button variant="outline">Cancel</Button>
              <Button>Schedule Meeting</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
