import { Calendar, List, MapPin, PlusIcon, Search } from "lucide-react";
import React, { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import { ScheduleNewMeetingDialog } from "./scheduleMeetingDialog";

const demoData = [
  {
    id: 1,
    title: "Site Coordination Meeting",
    status: "held",
    dateTime: "February 10 2025 • 11 AM – 12 PM",
    location: "Block A Conference Room",
    attendees: [
      "/images/profile-img-4.png",
      "/images/profile-img-4.png",
      "/images/profile-img-4.png",
    ],
    extraAttendees: 1,
    aiNotes: true,
    description:
      "Review foundation progress, discuss concrete pour schedule, address weather-related delays",
  },
  {
    id: 2,
    title: "HVAC System Design Review",
    status: "upcoming",
    dateTime: "February 13 2025 • 2 PM – 3 PM",
    location: "MS Teams",
    attendees: 3,
    extraAttendees: 0,
    aiNotes: false,
    description:
      "Review updated HVAC design specifications, discuss energy efficiency requirements, approve vendor selection",
  },
  {
    id: 3,
    title: "Weekly Progress Review",
    status: "upcoming",
    dateTime: "February 14 2025 • 9 AM – 10 AM",
    location: "Site Office",
    attendees: 3,
    extraAttendees: 1,
    aiNotes: false,
    description:
      "Review weekly progress across all work packages, discuss budget status, identify blockers and risks",
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

export default function MeetingsList() {
  const [viewOption, setViewOption] = useState("list");

  return (
    <div className="w-full h-full ">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 items-center justify-between w-full">
          <div className="flex items-center gap-2 w-full">
            <button className="flex items-center justify-center px-5 py-2.5 border border-[#E5E7EB] rounded-[10px] text-base text-[#1A1F36] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              All Meetings
            </button>
            <div className="relative max-w-md flex-1 block w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meetings or participants…"
                className="pl-10 bg-[#F7F7F7]bg-transparent border-[#E5E7EB] placeholder:text-[#6B7280] rounded-[10px] text-base"
              />
            </div>
          </div>

          <div className="flex items-center flex-1 gap-4">
            <div className="tabs flex flex-1 items-center gap-1 p-1 border border-[#E5E7EB] rounded-[10px] bg-[#F9FAFB]">
              <button
                className={`flex items-center justify-center px-5 py-2.5 rounded-[10px] text-base gap-2 whitespace-nowrap ${
                  viewOption === "list"
                    ? "text-[#1A1F36] bg-[#FFFFFF] shadow-md"
                    : "text-[#6B7280]"
                }`}
                onClick={() => setViewOption("list")}>
                <List className="h-5 w-5" />
                List View
              </button>
              <button
                className={`flex items-center justify-center px-5 py-2.5 rounded-[10px] text-base gap-2 whitespace-nowrap ${
                  viewOption === "calender"
                    ? "text-[#1A1F36] bg-[#FFFFFF] shadow-md"
                    : "text-[#6B7280]"
                }`}
                onClick={() => setViewOption("calender")}>
                <Calendar className="h-5 w-5" />
                Calendar View
              </button>
            </div>

            <ScheduleNewMeetingDialog />
          </div>
        </div>
      </div>

      {/* Card List */}
      <div className="space-y-4">
        {/* CARD 1 */}
        {/* <div className="rounded-[14px] p-5 border border-[#E5E7EB]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <h2 className="text-base text-[#1A1F36]">
                Site Coordination Meeting
              </h2>
              <StatusBadge status={"held"} />
            </div>
            <div className="flex items-center">
              {[1, 2, 3].map((i) => {
                return (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-[#3A6FF7] -ml-2 border-2 border-white flex items-center justify-center"></div>
                );
              })}
              <div className="h-8 w-8 rounded-full bg-transparent -ml-1 text-[#6B7280] text-sm flex items-center justify-center">
                1+
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 mt-3">
            <p className="text-base text-[#6B7280] flex items-center gap-2">
              <Calendar className="h-5 w-5" /> February 10 2025 • 11 AM – 12 PM
            </p>
            <p className="text-base text-[#6B7280] flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Block A Conference Room
            </p>
          </div>

          <p className="text-sm text-[#3A6FF7] flex items-center gap-2 mt-6">
            ✨ AI Notes Available
          </p>
          <p className="text-sm text-[#6B7280] flex items-center gap-2 mt-4">
            Review foundation progress, discuss concrete pour schedule, address
            weather-related delays
          </p>
        </div> */}

        {demoData.map((item, index) => (
          <Link
            to={`/meetings/${item?.id}`}
            key={index}
            className="rounded-[14px] p-5 border border-[#E5E7EB] block">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <h2 className="text-base text-[#1A1F36]">{item.title}</h2>
                <StatusBadge status={item.status} />
              </div>

              {/* Attendees */}
              <div className="flex items-center">
                {Array.isArray(item.attendees)
                  ? item.attendees.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        className="h-8 w-8 rounded-full object-cover -ml-2 border-2 border-white"
                      />
                    ))
                  : Array.from({ length: item.attendees }).map((_, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full bg-[#3A6FF7] -ml-2 border-2 border-white flex items-center justify-center"></div>
                    ))}

                {item.extraAttendees > 0 && (
                  <div className="h-8 w-8 rounded-full bg-transparent -ml-1 text-[#6B7280] text-sm flex items-center justify-center">
                    {item.extraAttendees}+
                  </div>
                )}
              </div>
            </div>

            {/* Date + Location */}
            <div className="flex items-center gap-5 mt-3">
              <p className="text-base text-[#6B7280] flex items-center gap-2">
                <Calendar className="h-5 w-5" /> {item.dateTime}
              </p>
              <p className="text-base text-[#6B7280] flex items-center gap-2">
                <MapPin className="h-5 w-5" /> {item.location}
              </p>
            </div>

            {/* AI Notes */}
            {item.aiNotes && (
              <p className="text-sm text-[#3A6FF7] flex items-center gap-2 mt-6">
                ✨ AI Notes Available
              </p>
            )}

            {/* Description */}
            <p className="text-sm text-[#6B7280] flex items-center gap-2 mt-4">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
