import { Calendar, MapPin, Search } from "lucide-react";
import AiIcon from "@/components/icons/AiIcon";
import React, { useState } from "react";
import { Input } from "../ui/input";
import { Link } from "react-router-dom";
import { ScheduleNewMeetingDialog } from "./scheduleMeetingDialog";
import { Badge } from "../ui/badge";

const demoData = [
  {
    id: 1,
    title: "Werner/Darren — Dashboard Review",
    status: "held",
    dateTime: "March 23 2026 • 9 AM – 10:36 AM",
    location: "Virtual — Video Call",
    attendees: ["Grant Mcevoy", "Maruf Mia", "David Zeeman", "Risalat Shahriar"],
    extraAttendees: 0,
    aiNotes: true,
    description: "Invited: Grant Mcevoy, Maruf Mia, David Zeeman, Risalat Shahriar",
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "held") {
    return <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full">Completed</Badge>;
  }
  return <Badge className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5 rounded-full">Upcoming</Badge>;
};

export default function MeetingsList() {
  const [searchQuery, setSearchQuery] = useState("");

  const upcoming = demoData.filter(m => m.status !== "held");
  const completed = demoData.filter(m => m.status === "held");

  const filterMeetings = (meetings: typeof demoData) => {
    if (!searchQuery) return meetings;
    const q = searchQuery.toLowerCase();
    return meetings.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.description.toLowerCase().includes(q) ||
      m.location.toLowerCase().includes(q)
    );
  };

  const filteredUpcoming = filterMeetings(upcoming);
  const filteredCompleted = filterMeetings(completed);

  return (
    <div className="space-y-6">
      {/* Header — Search + Schedule */}
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
        <ScheduleNewMeetingDialog />
      </div>

      {/* Upcoming Meetings */}
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

      {/* Completed Meetings */}
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
    </div>
  );
}

function MeetingCard({ item }: { item: typeof demoData[0] }) {
  return (
    <Link
      to={`/meetings/${item.id}`}
      className="block rounded-lg border border-border px-4 py-3 hover:bg-sidebar transition-colors"
    >
      {/* Row 1: Title + badge + AI notes + attendees */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
          <StatusBadge status={item.status} />
          {item.aiNotes && (
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
                  {typeof name === 'string' ? name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            ))}
            {item.extraAttendees > 0 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-white flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">+{item.extraAttendees}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Row 2: Date + location + description */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1 shrink-0">
          <Calendar className="h-3.5 w-3.5" /> {item.dateTime}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <MapPin className="h-3.5 w-3.5" /> {item.location}
        </span>
        {item.description && (
          <span className="truncate">{item.description}</span>
        )}
      </div>
    </Link>
  );
}
