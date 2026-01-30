"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Title } from "@radix-ui/react-toast";

const users = [
  {
    id: "1",
    name: "John Doe",
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "2",
    name: "Sarah Kim",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: "3",
    name: "Michael Smith",
    avatar: "https://i.pravatar.cc/150?img=3",
  },
];

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

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [isOn, setIsOn] = useState(false);
  const [date, setDate] = useState<Date>();
  const [priorityBtn, setPriorityBtn] = useState("Low");

  const toggleSwitch = () => {
    setIsOn(!isOn);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 !py-3 text-base font-normal">
          <PlusIcon className="w-5 h-5" />
          Create Task
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[650px] bg-white p-0">
        <DialogHeader className="py-[22px] px-6 border-b border-[#E5E7EB]">
          <DialogTitle className="text-base text-[#1A1F36]">
            Create Task from Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-5">
            <div className="text-sm p-3 rounded-[10px] text-[#1A1F36] bg-[#F3F2F0]">
              From meeting: Site Coordination Meeting
            </div>
            {/* Document Title */}
            <div>
              <Label htmlFor="title" className="text-sm text-[#1A1F36]">
                Task Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Confirm concrete supplier availability"
                className="mt-2"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="assignee" className="text-sm text-[#1A1F36]">
                Assignee *
              </Label>

              <Select>
                {/* Trigger */}
                <SelectTrigger id="assignee" className="mt-2">
                  <SelectValue
                    placeholder={
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback></AvatarFallback>
                        </Avatar>
                        <span>Select assignee</span>
                      </div>
                    }
                  />
                </SelectTrigger>

                {/* Dropdown */}
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linked Task */}
            <div className="flex flex-col">
              {/* 👇 Added your label here */}
              <Label htmlFor="date" className="text-sm text-[#1A1F36] mb-2">
                Due Date *
              </Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
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

            {/* priority */}
            <div className="flex flex-col">
              {/* 👇 Added your label here */}
              <Label htmlFor="date" className="text-sm text-[#1A1F36] mb-2">
                Due Date *
              </Label>
              <div className="flex items-center gap-3">
                {priorityBtns?.map(({ id, title }) => (
                  <button
                    key={id}
                    onClick={() => setPriorityBtn(title)}
                    className={`border py-3 px-4 rounded-[10px] text-left w-full ${
                      title == priorityBtn
                        ? "bg-[#E6EDFF] border-primary"
                        : "border-[#E5E7EB]"
                    }`}>
                    {title}
                  </button>
                ))}
                {/* <button className="border border-[#E5E7EB] py-3 px-4 rounded-[10px] text-left w-full">
                  Low
                </button>
                <button className="border border-primary py-3 px-4 rounded-[10px] text-left w-full bg-[#E6EDFF]">
                  Low
                </button>
                <button className="border border-[#E5E7EB] py-3 px-4 rounded-[10px] text-left w-full">
                  Low
                </button> */}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-end border-t pt-4 mt-4">
            <div className="flex gap-2 items-end">
              <Button variant="outline">Cancel</Button>
              <Button>Create Document</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
