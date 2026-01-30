import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  FileText,
  PlusIcon,
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GenerateAiNotesDialog } from "@/components/meetings/generateAiNotesDialog";
import { CreateTaskDialog } from "@/components/meetings/createTaskDialog";

const participants = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@example.com",
    status: "Yes",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    status: "Yes",
  },
  {
    id: 3,
    name: "David Contractor",
    email: "david.c@example.com",
    status: "Yes",
  },
  {
    id: 4,
    name: "Lisa Evans",
    email: "lisa.e@example.com",
    status: "Maybe",
  },
  {
    id: 5,
    name: "Mike Stevens",
    email: "mike.s@example.com",
    status: "Yes",
  },
];

const checklist = [
  { id: 1, label: "Review structural calculations", completed: true },
  { id: 2, label: "Obtain client sign-off", completed: true },
  { id: 3, label: "Submit to regulatory authority", completed: false },
];

const trailData = [
  {
    id: 1,
    title: "Meeting created",
    name: "John Smith",
    date: "Feb 5, 2025 10:30 AM",
    status: "Yes",
  },
  {
    id: 2,
    title: "Meeting created",
    name: "Sarah Johnson",
    date: "Feb 5, 2025 10:30 AM",
    status: "Yes",
  },
  {
    id: 3,
    title: "Meeting created",
    name: "David Contractor",
    date: "Feb 5, 2025 10:30 AM",
    status: "Yes",
  },
];

const StatusBadge = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs rounded-full inline-block";
  if (status === "held") {
    return (
      <span
        className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]`}>
        {status}
      </span>
    );
  }
  return (
    <span
      className={`${baseClasses} bg-[#FFF7ED] text-[#F59E0B] border border-[#FED7AA]`}>
      {status}
    </span>
  );
};

export enum TaskStatus {
  InProgress = "In Progress",
  Pending = "Pending",
  Completed = "Completed",
}

export const linkedTasks = [
  {
    id: "TSK-101",
    title: "Check pour schedule",
    status: TaskStatus.InProgress,
    assignee: "David Contractor",
  },
  {
    id: "TSK-102",
    title: "Confirm safety checklist",
    status: TaskStatus.Pending,
    assignee: "Lisa Evans",
  },
  {
    id: "TSK-103",
    title: "Client sign-off",
    status: TaskStatus.Completed,
    assignee: "John Smith",
  },
];

const StatusBadges: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const baseClasses =
    "px-3 py-1 text-xs rounded-full inline-block border text-[13px]";

  switch (status) {
    case TaskStatus.Completed:
      return (
        <span
          className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border-[rgba(22,163,74,0.34)]`}>
          {status}
        </span>
      );

    case TaskStatus.InProgress:
      return (
        <span
          className={`${baseClasses} bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]`}>
          {status}
        </span>
      );

    case TaskStatus.Pending:
    default:
      return (
        <span
          className={`${baseClasses} bg-[#FFF7ED] text-[#F59E0B] border-[#FED7AA]`}>
          {status}
        </span>
      );
  }
};

export interface ChecklistItem {
  id: number;
  label: string;
  completed: boolean;
}

const ChecklistItem = ({ item, onCheck }) => {
  return (
    <label className="flex items-center space-x-4 cursor-pointer group p-3">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => onCheck(item.id)}
        className="sr-only peer"
      />

      {item.completed ? (
        <div className="w-5 h-5 rounded-[4px] bg-transparent flex items-center justify-center flex-shrink-0">
          <CircleCheck className="w-full h-full text-[#22C55E]" />
        </div>
      ) : (
        <div className="w-5 h-5 border-2 border-[#6B7280] rounded-full transition-colors flex-shrink-0"></div>
      )}

      <span
        className={`text-gray-700 text-base ${
          item.completed ? "line-through text-gray-500" : "text-slate-800"
        }`}>
        {item.label}
      </span>
    </label>
  );
};

const MeetingDetails = () => {
  const [checklistData, setChecklistData] = useState(checklist);

  const handleCheck = (id) => {
    setChecklistData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white text-[#6B7280]">
        <Link
          to={"/meetings"}
          className="flex items-center gap-2 text-base hover:text-primary transition-all">
          <ArrowLeft className="h-4 w-4" />
          Back to Meetings
        </Link>

        <div className="meeting-card p-6 border border-[#E5E7EB] rounded-[14px]">
          <div className="header flex justify-between items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-base text-[#1A1F36]">
                Site Coordination Meeting
              </h2>
              <StatusBadge status="Held" />
            </div>

            <div className="flex items-center gap-3">
              <GenerateAiNotesDialog />
              {/* <Button className="bg-primary text-primary-foreground hover:bg-primary/90 !py-3 text-base font-normal">
                <PlusIcon className="w-5 h-5" />
                Create Task
              </Button> */}
              <CreateTaskDialog />
              <Button
                variant="outline"
                className=" !py-3 text-base font-normal">
                <FileText className="w-5 h-5" />
                Mark as Evidence
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="item text-left">
              <div className="label text-sm mb-1">Date</div>
              <div className="value text-base text-[#1A1F36]">
                Monday, February 10 2025
              </div>
            </div>
            <div className="item text-left">
              <div className="label text-sm mb-1">Time</div>
              <div className="value text-base text-[#1A1F36]">
                11 AM – 12 PM
              </div>
            </div>
            <div className="item text-left">
              <div className="label text-sm mb-1">Location</div>
              <div className="value text-base text-[#1A1F36]">
                Block A Conference Room
              </div>
            </div>
            <div className="item text-left">
              <div className="label text-sm mb-1">Attendees</div>
              <div className="value text-base text-[#1A1F36]">5 total</div>
            </div>
          </div>
          <div className="border-t border-gray-200 my-6"></div>

          <div className="agenda text-left">
            <div className="label text-sm mb-2">Agenda</div>
            <div className="py-4 px-5 bg-[#F3F2F0] text-[#1A1F36] rounded-[4px] border-l-4 border-black">
              Review foundation progress, discuss concrete pour schedule,
              address weather-related delays
            </div>
          </div>
          <div className="border-t border-gray-200 my-6"></div>

          <div className="participants text-left">
            <div className="label text-sm mb-4">Participants</div>
            <div className="items flex flex-col gap-3">
              {participants.map((person) => (
                <div key={person.id} className="item flex items-center gap-3">
                  {/* Avatar Placeholder */}
                  <div className="h-8 w-8 rounded-full bg-[#3A6FF7] -ml-2 border-2 border-white flex items-center justify-center">
                    {/* {person.name.charAt(0)} */}
                  </div>

                  <div className="details">
                    <div className="name text-base text-[#1A1F36]">
                      {person.name}
                    </div>

                    <p className="text-sm">{person.email}</p>

                    {/* Optional attendance status */}
                    {/* <span className="text-xs text-gray-500">{person.status}</span> */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="summary py-4 px-6 border border-[#E5E7EB] rounded-[14px]">
          <div className="title flex items-center gap-2 text-base text-[#1A1F36]">
            <ChevronDown className="h-4 w-4" />
            Summary
          </div>
          <p className="text-base text-left mt-5">
            Team discussed the foundation progress for Block A. Key decision
            made to schedule concrete pour for February 15, 2025. Weather
            monitoring protocols established to mitigate potential delays.
          </p>
        </div>

        <div className="decisions py-4 px-6 border border-[#E5E7EB] rounded-[14px] text-left">
          <div className="title flex items-center gap-2 text-base text-[#1A1F36] mb-4">
            <ChevronDown className="h-4 w-4" />
            Key Decisions (2)
          </div>
          <div className="bg-[#F3F2F0] rounded-[10px] p-4 mb-4">
            <div className="text-base text-[#1A1F36] mb-2">
              Concrete pour for Block A foundation scheduled for Feb 15, 2025
            </div>
            <div className="text-sm">
              Owner: David Contractor • Due: Feb 15, 2025
            </div>
          </div>
          <div className="bg-[#F3F2F0] rounded-[10px] p-4">
            <div className="text-base text-[#1A1F36] mb-2">
              Implement enhanced weather monitoring system
            </div>
            <div className="text-sm">Owner: Lisa Evans • Due: Feb 12, 2025</div>
          </div>
        </div>

        <div className="risk py-4 px-6 border border-[#E5E7EB] rounded-[14px] text-left">
          <div className="title flex items-center gap-2 text-base text-[#1A1F36] mb-4">
            <ChevronDown className="h-4 w-4" />
            Risks & Issues (1)
          </div>
          <div className="py-4 px-5 bg-[#F3F2F0] text-[#1A1F36] rounded-[4px] border-l-4 border-black">
            <div className="text-base text-[#1A1F36] mb-2">
              Weather delays may impact concrete pour schedule
            </div>
            <div className="text-sm">
              <span className="text-[#1A1F36]">Mitigation:</span> Set up
              alternative date (Feb 17) and monitor 3-day forecast daily.
              Contractor team on standby.
            </div>
          </div>
        </div>

        <div className="risk py-4 px-6 border border-[#E5E7EB] rounded-[14px] text-left">
          <div className="title flex items-center gap-2 text-base text-[#1A1F36] mb-4">
            <ChevronDown className="h-4 w-4" />
            Next Steps
          </div>
          {checklistData.map((item) => (
            <ChecklistItem key={item.id} item={item} onCheck={handleCheck} />
          ))}
        </div>

        <div className="risk py-4 px-6 border border-[#E5E7EB] rounded-[14px] text-left">
          <div className="title flex items-center gap-2 text-base text-[#1A1F36] mb-6">
            <ChevronDown className="h-4 w-4" />
            Linked Tasks (3)
          </div>
          <div className="items flex flex-col gap-10">
            {linkedTasks.map((task) => (
              <div className="item flex justify-between" key={task?.id}>
                <div className="flex items-center gap-3">
                  <div className="text-base text-[#8081F6]">{task?.id}</div>
                  <div className="text-base text-[#1A1F36]">{task?.title}</div>
                  <StatusBadges status={task?.status} />
                </div>
                <div className="text-sm">{task.assignee}</div>
              </div>
            ))}
          </div>
          <button className="flex items-center gap-2 text-sm text-primary transition-all mt-9">
            View All Tasks →{/* <ArrowLeft className="h-4 w-4" /> */}
          </button>
        </div>

        <div className="risk py-4 px-6 border border-[#E5E7EB] rounded-[14px] text-left">
          <div className="title flex items-center gap-2 text-base text-[#1A1F36] mb-6">
            <ChevronDown className="h-4 w-4" />
            Compliance Evidence (1)
          </div>
          <div className="participants text-left pl-2">
            <div className="items flex flex-col gap-3">
              <div className="item flex items-center gap-3">
                <FileText className="h-4 w-4" />
                <div className="details">
                  <div className="name text-base text-[#1A1F36]">
                    Foundation Safety Inspection Report
                  </div>
                  <p className="text-sm">Safety Documentation</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="risk py-4 px-6 border border-[#E5E7EB] rounded-[14px] text-left">
          <div className="title flex items-center gap-2 text-base text-[#1A1F36] mb-6">
            <ChevronDown className="h-4 w-4" />
            Audit Trail
          </div>
          <div className="items flex flex-col gap-3">
            {trailData.map((person) => (
              <div key={person.id} className="item flex items-center gap-3">
                {/* Avatar Placeholder */}
                <div className="h-8 w-8 rounded-full bg-[#3A6FF7] -ml-2 border-2 border-white flex items-center justify-center">
                  {/* {person.name.charAt(0)} */}
                </div>

                <div className="details">
                  <div className="name text-base text-[#1A1F36]">
                    {person.title}
                  </div>

                  <p className="text-sm">{`${person.name} . ${person.date}`}</p>

                  {/* Optional attendance status */}
                  {/* <span className="text-xs text-gray-500">{person.status}</span> */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MeetingDetails;
