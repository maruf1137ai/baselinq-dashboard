"use client";

import { CircleCheck, ExternalLink, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useState, useMemo } from "react";
// import type { Task, ChecklistItem as ChecklistItemType } from './types';
// import { CalendarIcon, CheckIcon } from './components/Icons';
import { CheckIcon, CalendarIcon } from "lucide-react";

export interface ChecklistItem {
  id: number;
  label: string;
  completed: boolean;
}

export interface Task {
  title: string;
  assignee: {
    name: string;
    initials: string;
  };
  dueDate: string;
  summary: string;
  linkedCompliance: {
    label: string;
    color: "blue" | "orange" | "gray";
  }[];
  checklist: ChecklistItem[];
}

const initialTaskData: Task = {
  title: "Foundation Structural Review - Block A",
  assignee: {
    name: "David Zhang",
    initials: "DZ",
  },
  dueDate: "Oct 25, 2025",
  summary:
    "Complete structural review of foundation design for Block A, including load calculations, soil bearing capacity assessment, and compliance with SANS 10160 standards. Submit findings to regulatory authority for approval.",
  linkedCompliance: [
    { label: "SANS 10160", color: "blue" },
    { label: "RFI-013", color: "orange" },
    { label: "Gate-2", color: "gray" },
  ],
  checklist: [
    { id: 1, label: "Review structural calculations", completed: true },
    { id: 2, label: "Obtain client sign-off", completed: true },
    { id: 3, label: "Submit to regulatory authority", completed: false },
  ],
};

const TABS = ["Overview", "Comments", "Attachments", "Audit Trail"];

const complianceTagColors = {
  blue: "bg-[#E8F1FF] text-[#3A6FF7]",
  orange: "bg-[#FFF3E6] text-[#D97706]",
  gray: "bg-[#F3F4F6] text-[#6B7280]",
};

// Helper component defined outside the main component to prevent re-creation on every render.
const ChecklistItem: React.FC<{
  item: ChecklistItemType;
  onCheck: (id: number) => void;
}> = ({ item, onCheck }) => {
  return (
    <label className="flex items-center space-x-4 cursor-pointer group">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => onCheck(item.id)}
        className="sr-only peer"
      />
      {item.completed ? (
        <div className="w-5 h-5 rounded-[4px] bg-[#3A6FF7] flex items-center justify-center flex-shrink-0">
          <CircleCheck className="w-2.5 h-2.5 text-white" />
        </div>
      ) : (
        <div className="w-5 h-5 border-2 border-gray-300 rounded-sm peer-focus:ring-2 peer-focus:ring-blue-300 group-hover:border-blue-500 transition-colors flex-shrink-0"></div>
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

export default function RightSideDrawer() {
  const [task, setTask] = useState<Task>(initialTaskData);
  const [activeTab, setActiveTab] = useState("Overview");

  const handleChecklistChange = (id: number) => {
    setTask((prevTask) => ({
      ...prevTask,
      checklist: prevTask.checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const { completedCount, totalCount, progressPercentage, isAllComplete } =
    useMemo(() => {
      const total = task.checklist.length;
      const completed = task.checklist.filter((item) => item.completed).length;
      return {
        completedCount: completed,
        totalCount: total,
        progressPercentage: total > 0 ? (completed / total) * 100 : 0,
        isAllComplete: total > 0 && completed === total,
      };
    }, [task.checklist]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <ExternalLink className="h-4 w-4" />
          View Task
        </Button>
      </DialogTrigger>

      <DialogContent className="fixed right-0 top-0 !left-auto !translate-x-0 !translate-y-0 h-screen w-[500px] rounded-none border-0 bg-white text-[#1A1F36] shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
        {/* Drawer header */}
        {/* <DialogHeader className="flex flex-row items-center justify-between border-b border-gray-800 pb-3">
          <DialogTitle className="text-lg font-semibold">
            Drawer Title
          </DialogTitle>
        </DialogHeader> */}

        {/* Blank content area */}
        <div className="">
          <div className="w-full overflow-auto">
            <div className="p-0">
              <h1 className="text-[18px] text-[#1A1F36]">{task.title}</h1>

              <div className="flex flex-col sm:flex-row justify-between mt-4 space-y-4 sm:space-y-0">
                <div>
                  <p className="text-xs [#6B7280]">Assignee</p>
                  <div className="flex items-center space-x-3 mt-2">
                    <div className="w-6 h-6 rounded-full bg-[#E8F1FF] flex items-center justify-center">
                      <span className="text-[#3A6FF7] text-xs">
                        {task.assignee.initials}
                      </span>
                    </div>
                    <span className="text-[#1A1F36] text-sm">
                      {task.assignee.name}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs [#6B7280]">Due Date</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <CalendarIcon className="w-4 h-4 text-red_dark" />
                    <span className="text-sm text-red_dark">
                      {task.dueDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-b border-gray-200 mt-6">
              <div className="flex items-center flex-wrap py-[3px]">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2.5 px-5 text-sm transition-colors rounded-[5px] ${
                      activeTab === tab
                        ? "bg-primary text-white rounded-t-lg"
                        : "text-[#1A1A1A] hover:text-primary"
                    }`}
                    style={
                      activeTab === tab ? { transform: "translateY(1px)" } : {}
                    }>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-8">
              {activeTab === "Overview" && (
                <div className="">
                  <section>
                    <h2 className="text-sm text-[#1A1F36]">Task Summary</h2>
                    <p className="mt-3.5 text-[#6B7280]">{task.summary}</p>
                  </section>

                  <section className="mt-7">
                    <h2 className="text-sm text-[#1A1F36]">
                      Linked Compliance
                    </h2>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {task.linkedCompliance.map((item) => (
                        <span
                          key={item.label}
                          className={`px-4 py-1.5 text-xs font-medium rounded-[8px] ${
                            complianceTagColors[item.color]
                          }`}>
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="mt-6 mb-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-sm text-[#1A1F36]">Progress</h2>
                      <span className="text-sm text-[#1A1F36]">
                        {completedCount}/{totalCount} completed
                      </span>
                    </div>
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#3A6FF7] h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      {task.checklist.map((item) => (
                        <ChecklistItem
                          key={item.id}
                          item={item}
                          onCheck={handleChecklistChange}
                        />
                      ))}
                    </div>
                  </section>

                  <button
                    disabled={!isAllComplete}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white text-base font-semibold rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors">
                    <CircleCheck className="w-5 h-5" />
                    Mark Complete
                  </button>
                </div>
              )}
              {activeTab === "Comments" && (
                <div className="flex flex-col gap-5">
                  <div className="comment flex gap-3">
                    <div className="profile h-8 min-w-8 rounded-full">
                      <img
                        src="/images/profile-img-2.png"
                        alt=""
                        className="h-full w-full rounded-full"
                      />
                    </div>
                    <div>
                      <div className="name flex items-center gap-2 text-[#1A1F36] text-sm">
                        David Zhang
                        <span className="text-[#9CA3AF] text-xs">
                          2 hours ago
                        </span>
                      </div>
                      <div className="desc mt-1.5 text-[#6B7280] text-sm">
                        Structural calculations have been reviewed and approved.
                        Moving to next phase.
                      </div>
                    </div>
                  </div>
                  <div className="comment flex gap-3">
                    <div className="profile h-8 min-w-8 rounded-full">
                      <img
                        src="/images/profile-img-3.png"
                        alt=""
                        className="h-full w-full rounded-full"
                      />
                    </div>
                    <div>
                      <div className="name flex items-center gap-2 text-[#1A1F36] text-sm">
                        Sarah Johnson
                        <span className="text-[#9CA3AF] text-xs">
                          5 hours ago
                        </span>
                      </div>
                      <div className="desc mt-1.5 text-[#6B7280] text-sm">
                        Can we expedite the regulatory submission? Client is
                        requesting faster turnaround.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "Attachments" && (
                <div className="grid grid-cols-2 gap-5">
                  <button className="item border border-[#E6E8EB] p-4 rounded-[10px] flex flex-col justify-start items-start">
                    <div className="icon">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-[#1A1F36] mt-2">
                      Foundation_Drawing.pdf
                    </p>
                    <p className="text-xs mt-1 text-[#9CA3AF]">2.4 MB</p>
                  </button>
                  <button className="item border border-[#E6E8EB] p-4 rounded-[10px] flex flex-col justify-start items-start">
                    <div className="icon">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-[#1A1F36] mt-2">
                      Foundation_Drawing.pdf
                    </p>
                    <p className="text-xs mt-1 text-[#9CA3AF]">2.4 MB</p>
                  </button>
                  <button className="item border border-[#E6E8EB] p-4 rounded-[10px] flex flex-col justify-start items-start">
                    <div className="icon">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-[#1A1F36] mt-2">
                      Foundation_Drawing.pdf
                    </p>
                    <p className="text-xs mt-1 text-[#9CA3AF]">2.4 MB</p>
                  </button>
                  <button className="item border border-[#E6E8EB] p-4 rounded-[10px] flex flex-col justify-start items-start">
                    <div className="icon">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-[#1A1F36] mt-2">
                      Foundation_Drawing.pdf
                    </p>
                    <p className="text-xs mt-1 text-[#9CA3AF]">2.4 MB</p>
                  </button>
                </div>
              )}
              {activeTab === "Audit Trail" && (
                <div className="flex flex-col">
                  <div className="item flex gap-3 border-b border-[#E6E8EB] py-3">
                    <div className="h-2 min-w-2 bg-[#8081F6] rounded-full mt-1.5"></div>
                    <div className="">
                      <div className="title text-sm text-[#1A1F36]">
                        Status changed to Overdue
                      </div>
                      <div className="text mt-1 text-[#6B7280] text-xs flex gap-2">
                        System
                        <span className="text-[#9CA3AF]">· 2 hours ago</span>
                      </div>
                    </div>
                  </div>
                  <div className="item flex gap-3 border-b border-[#E6E8EB] py-3">
                    <div className="h-2 min-w-2 bg-[#8081F6] rounded-full mt-1.5"></div>
                    <div className="">
                      <div className="title text-sm text-[#1A1F36]">
                        Status changed to Overdue
                      </div>
                      <div className="text mt-1 text-[#6B7280] text-xs flex gap-2">
                        System
                        <span className="text-[#9CA3AF]">· 2 hours ago</span>
                      </div>
                    </div>
                  </div>
                  <div className="item flex gap-3 border-b border-[#E6E8EB] py-3">
                    <div className="h-2 min-w-2 bg-[#8081F6] rounded-full mt-1.5"></div>
                    <div className="">
                      <div className="title text-sm text-[#1A1F36]">
                        Status changed to Overdue
                      </div>
                      <div className="text mt-1 text-[#6B7280] text-xs flex gap-2">
                        System
                        <span className="text-[#9CA3AF]">· 2 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* <div className="p-6 text-gray-400">Drawer content here</div> */}
      </DialogContent>
    </Dialog>
  );
}
