import { Calendar, MapPin, Search } from "lucide-react";
import AiIcon from "@/components/icons/AiIcon";
import React, { useState } from "react";
import { Input } from "../ui/input";
import { Link } from "react-router-dom";
import { ScheduleNewMeetingDialog } from "./scheduleMeetingDialog";
import { Badge } from "../ui/badge";
import useFetch from "@/hooks/useFetch";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";

interface Meeting {
  id: number;
  title: string;
  status: "scheduled" | "held" | "cancelled";
  date_time: string;
  location: string;
  meeting_link?: string;
  attendees: string[];
  extra_attendees: number;
  ai_notes: boolean;
}

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "held") {
    return <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full">Completed</Badge>;
  }
  return <Badge className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5 rounded-full">Upcoming</Badge>;
};

export default function MeetingsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const projectId = localStorage.getItem("selectedProjectId");

  const { data, isLoading, refetch } = useFetch<any>(
    projectId ? `meetings/?project_id=${projectId}` : null
  );

  const meetings: Meeting[] = Array.isArray(data) ? data : (data?.results ?? []);
  const upcoming = meetings.filter((m) => m.status !== "held");
  const completed = meetings.filter((m) => m.status === "held");

  const filterMeetings = (list: Meeting[]) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q)
    );
  };

  const filteredUpcoming = filterMeetings(upcoming);
  const filteredCompleted = filterMeetings(completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 bg-white border-border placeholder:text-muted-foreground rounded-lg text-sm"
          />
        </div>
        <ScheduleNewMeetingDialog onCreated={refetch} />
      </div>

      {isLoading && <AwesomeLoader message="Loading Meetings" />}

      {!isLoading && (
        <>
          {filteredUpcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Upcoming</h2>
              <div className="space-y-2">
                {filteredUpcoming.map((item) => (
                  <MeetingCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {filteredCompleted.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Completed</h2>
              <div className="space-y-2">
                {filteredCompleted.map((item) => (
                  <MeetingCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {filteredUpcoming.length === 0 && filteredCompleted.length === 0 && (
            <div className="text-center py-20 text-sm text-muted-foreground">
              No meetings found.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MeetingCard({ item }: { item: Meeting }) {
  return (
    <Link
      to={`/meetings/${item.id}`}
      className="block rounded-lg border border-border px-4 py-3 hover:bg-sidebar transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
          <StatusBadge status={item.status} />
          {item.ai_notes && (
            <span className="flex items-center gap-1 text-xs text-primary shrink-0">
              <AiIcon size={14} className="text-primary" /> AI Notes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <div className="flex -space-x-1.5">
            {item.attendees.slice(0, 3).map((name, i) => (
              <div key={i} className="h-6 w-6 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center">
                <span className="text-[10px] text-primary font-medium">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {item.extra_attendees > 0 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-white flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">+{item.extra_attendees}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1 shrink-0">
          <Calendar className="h-3.5 w-3.5" /> {item.date_time}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <MapPin className="h-3.5 w-3.5" /> {item.location}
        </span>
      </div>
    </Link>
  );
}
