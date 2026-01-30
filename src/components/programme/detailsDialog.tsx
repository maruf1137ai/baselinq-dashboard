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
import { CalendarIcon, PlusIcon, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Title } from "@radix-ui/react-toast";
import { Badge } from "../ui/badge";

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

export function ViewDetailsDialog() {
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
        <Button className="bg-transparent border border-border_color hover:bg-primary text-[#1A1A1A] hover:text-white transition-all">
          View Full Details
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[650px] bg-white p-0">
        <DialogHeader className="py-[22px] px-6 border-b border-[#E5E7EB]">
          <DialogTitle className="text-base text-[#1A1F36]">
            M1 – Site Establishment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="item p-4 rounded-[10px] bg-[#FAFAFA]">
                <div className="text-sm text-[#717784] mb-2">Status</div>
                <Badge
                  variant="outline"
                  className={`text-sm text-[#00C97A] bg-[rgba(233,247,236,0.42)] border border-[rgba(22,163,74,0.34)]`}>
                  Completed
                </Badge>
              </div>
              <div className="item p-4 rounded-[10px] bg-[#FAFAFA]">
                <div className="text-sm text-[#717784] mb-2">Risk Score</div>
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-[#00C97A]" />
                  <span className="text-xl text-[#1A1A1A]">1</span>
                </div>
              </div>
            </div>

            <div className="item border border-border_color rounded-[14px] mt-4">
              <div className="p-6 flex gap-3">
                <div className="w-full">
                  <div className="title flex items-center gap-4 justify-between w-full">
                    <div className="flex items-center gap-4 text-base">
                      Timeline
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5 mt-5">
                    <div className="item">
                      <div className="text-sm text-[#717784] mb-1">Planned</div>
                      <div className="text-base text-[#1A1A1A]">
                        Oct 15, 2024
                      </div>
                    </div>
                    <div className="item">
                      <div className="text-sm text-[#717784] mb-1">
                        Forecast
                      </div>
                      <div className="text-base text-[#1A1A1A]">
                        Oct 15, 2024
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="item border border-border_color rounded-[14px] mt-4">
              <div className="p-6 flex gap-3">
                <div className="w-full">
                  <div className="progress">
                    <div className="flex justify-between items-center">
                      <div className="text-[#717784] text-sm">Progress</div>
                      <div className="text-[#1A1A1A] text-sm">100%</div>
                    </div>
                    <div className="bar bg-gray-100 h-2 w-full rounded-full mt-2">
                      <div className="w-[100%] bg-[#8081F6] h-full rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-end border-t pt-4 mt-4">
            <div className="flex gap-2  w-full ">
              <Button className="w-full">Edit Milestone</Button>
              <button className="generate-ai-btn w-full flex items-center gap-2 text-white text-base py-2 px-4 relative overflow-hidden border-b-2 border-black">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6.62455 10.3333C6.56503 10.1026 6.44477 9.89206 6.27629 9.72358C6.10781 9.5551 5.89726 9.43485 5.66655 9.37533L1.57655 8.32066C1.50677 8.30085 1.44535 8.25883 1.40162 8.20096C1.35789 8.14309 1.33423 8.07253 1.33423 7.99999C1.33423 7.92746 1.35789 7.8569 1.40162 7.79903C1.44535 7.74116 1.50677 7.69913 1.57655 7.67933L5.66655 6.62399C5.89718 6.56453 6.10767 6.44438 6.27615 6.27602C6.44462 6.10766 6.56492 5.89725 6.62455 5.66666L7.67921 1.57666C7.69882 1.50661 7.7408 1.44489 7.79876 1.40092C7.85672 1.35696 7.92747 1.33316 8.00021 1.33316C8.07296 1.33316 8.14371 1.35696 8.20166 1.40092C8.25962 1.44489 8.30161 1.50661 8.32121 1.57666L9.37521 5.66666C9.43473 5.89737 9.55499 6.10792 9.72347 6.27641C9.89195 6.44489 10.1025 6.56514 10.3332 6.62466L14.4232 7.67866C14.4935 7.69806 14.5556 7.74 14.5998 7.79804C14.644 7.85609 14.6679 7.92703 14.6679 7.99999C14.6679 8.07295 14.644 8.1439 14.5998 8.20194C14.5556 8.25999 14.4935 8.30193 14.4232 8.32133L10.3332 9.37533C10.1025 9.43485 9.89195 9.5551 9.72347 9.72358C9.55499 9.89206 9.43473 10.1026 9.37521 10.3333L8.32055 14.4233C8.30094 14.4934 8.25896 14.5551 8.201 14.5991C8.14304 14.643 8.07229 14.6668 7.99955 14.6668C7.9268 14.6668 7.85605 14.643 7.79809 14.5991C7.74013 14.5551 7.69815 14.4934 7.67855 14.4233L6.62455 10.3333Z"
                    stroke="white"
                    stroke-width="1.33333"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M13.3333 2V4.66667"
                    stroke="white"
                    stroke-width="1.33333"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M14.6667 3.33333H12"
                    stroke="white"
                    stroke-width="1.33333"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M2.66675 11.3333V12.6667"
                    stroke="white"
                    stroke-width="1.33333"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M3.33333 12H2"
                    stroke="white"
                    stroke-width="1.33333"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Generate AI Notes
                <div className="w-full h-6 layer absolute -bottom-2 left-0"></div>
              </button>
              <Button variant="outline">Cancel</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
