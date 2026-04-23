import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, Calendar, MapPin, Users, FileText, MoreHorizontal, Loader2, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import AiIcon from "@/components/icons/AiIcon";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePost } from "@/hooks/usePost";
import { usePatch } from "@/hooks/usePatch";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { GenerateAiNotesDialog } from "@/components/meetings/generateAiNotesDialog";

import { formatMeetingDateTime } from "@/lib/dateUtils";
import { LifecycleBadge, ArtefactBadge } from "@/components/meetings/MeetingStatusBadges";
import type { LifecycleStatus, ArtefactStatus } from "@/components/meetings/MeetingStatusBadges";

interface Participant { id: number; name: string; role: string; }
interface Decision { id: number; text: string; owner: string; }
interface ActionItem { id: number; text: string; owner: string; due: string; }
interface TranscriptSegment { id: number; speaker: string; time: string; text: string; }
interface MeetingDetail {
  id: number;
  title: string;
  status: LifecycleStatus;
  artefact_status: ArtefactStatus;
  date: string;
  date_display: string;
  time: string;
  scheduled_utc?: string;
  location: string;
  meeting_link?: string;
  summary: { overview: string; sections: { title: string; body: string }[] };
  decisions: Decision[];
  action_items: ActionItem[];
  participants: Participant[];
  transcript: TranscriptSegment[];
}

const TASK_CONFIGS = [
  {
    type: "VO",
    url: "tasks/variation-orders/",
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), title, description: title,
      taskStatus: "Draft", discipline: "Architectural", line_items: [],
      currency: "ZAR", sub_total: 0, tax_type: "VAT", tax_rate: 15, tax_amount: 0, grand_total: 0,
    }),
  },
  {
    type: "SI",
    url: "tasks/site-instructions/",
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), title, instruction: title,
      taskStatus: "Open", discipline: "Architectural", urgency: "Normal",
    }),
  },
  {
    type: "RFI",
    url: "tasks/requests-for-information/",
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), subject: title, question: title,
      description: title, taskStatus: "Open", discipline: "Architectural",
    }),
  },
  {
    type: "DC",
    url: "tasks/delay-claims/",
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), title, description: title,
      taskStatus: "Draft", estimated_cost_currency: "ZAR",
    }),
  },
  {
    type: "CPI",
    url: "tasks/critical-path-items/",
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), task_activity_name: title, description: title,
    }),
  },
];

export default function MeetingDetails() {
  const { id } = useParams<{ id: string }>();
  const [showTranscript, setShowTranscript] = useState(false);
  const [approvingIndex, setApprovingIndex] = useState<number | null>(null);
  const [aiNotesOpen, setAiNotesOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [outcomeDismissed, setOutcomeDismissed] = useState(false);
  const { mutateAsync: postRequest } = usePost();
  const { mutateAsync: patchRequest } = usePatch();

  const { data: meeting, isLoading, isError, refetch } = useFetch<MeetingDetail>(
    id ? `meetings/${id}/` : null,
    {
      refetchInterval: (query: any) => {
        const s = query?.state?.data?.status;
        return s === "starting_soon" || s === "live" ? 10000 : false;
      },
    }
  );

  const handleApprove = async (item: ActionItem, index: number) => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) { toast.error("No project selected."); return; }
    const config = TASK_CONFIGS[index % TASK_CONFIGS.length];
    setApprovingIndex(index);
    try {
      const result = await postRequest({ url: config.url, data: config.payload(item.text, projectId) });
      try {
        await postRequest({
          url: "channels/",
          data: { project: parseInt(projectId), taskId: result?.task?.id, taskType: result?.task?.taskType, name: item.text, channel_type: "public" },
        });
      } catch { /* non-fatal */ }
      toast.success(`${config.type} task created successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? err?.message ?? "Failed to create task.");
    } finally {
      setApprovingIndex(null);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      await patchRequest({ url: `meetings/${id}/`, data: { status: newStatus } });
      await refetch();
      toast.success(`Meeting marked as ${newStatus.replace("_", " ")}.`);
    } catch {
      toast.error("Failed to update meeting status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <AwesomeLoader message="Loading Meeting" />
      </DashboardLayout>
    );
  }

  if (isError || !meeting) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-sm text-muted-foreground">
          Meeting not found.{" "}
          <Link to="/meetings" className="text-primary underline">Back to meetings</Link>
        </div>
      </DashboardLayout>
    );
  }

  const isCompleted  = meeting.status === "completed";
  const isPast       = isCompleted || meeting.status === "no_show";
  const hasAiNotes   = meeting.artefact_status === "notes_ready";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Meetings
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-normal tracking-tight text-foreground">{meeting.title}</h1>
              <LifecycleBadge status={meeting.status} />
              {isCompleted && <ArtefactBadge artefactStatus={meeting.artefact_status} />}
            </div>
            {(meeting.status === "scheduled" || meeting.status === "starting_soon") && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={statusUpdating}
              >
                Cancel Meeting
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {meeting.scheduled_utc ? formatMeetingDateTime(meeting.scheduled_utc) : (meeting.date_display + (meeting.time ? ` • ${meeting.time}` : ""))}
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {meeting.location}
              </span>
            )}
            {meeting.participants.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {meeting.participants.length} participants
              </span>
            )}
            {meeting.meeting_link && (
              <a
                href={meeting.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Join Meeting
              </a>
            )}
          </div>
        </div>

        {/* AI Summary — for completed/no-show meetings */}
        {isPast && (
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <AiIcon size={16} className="text-primary" />
                <h2 className="text-sm font-medium text-foreground">AI Summary</h2>
              </div>
              {(meeting.artefact_status === "none" || meeting.artefact_status === "transcribed") && (
                <button
                  onClick={() => setAiNotesOpen(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <AiIcon size={12} /> Generate AI Notes
                </button>
              )}
            </div>

            {meeting.artefact_status === "processing" && (
              <p className="text-sm text-muted-foreground">Transcript is being processed, notes will appear shortly...</p>
            )}

            {hasAiNotes ? (
              <>
                <p className="text-sm text-foreground leading-relaxed mb-4">{meeting.summary.overview}</p>
                <div className="space-y-4">
                  {meeting.summary.sections.map((s, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-foreground mb-1">{s.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : meeting.artefact_status !== "processing" ? (
              <p className="text-sm text-muted-foreground">
                No AI notes yet. Click "Generate AI Notes" to create a summary from the meeting transcript.
              </p>
            ) : null}
          </div>
        )}

        {/* Key Decisions */}
        {isCompleted && meeting.decisions.length > 0 && (
          <div className="p-4 border border-border rounded-lg">
            <h2 className="text-sm font-medium text-foreground mb-3">Key Decisions</h2>
            <div className="space-y-2">
              {meeting.decisions.map((d) => (
                <div key={d.id} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <div>
                    <p className="text-sm text-foreground">{d.text}</p>
                    {d.owner && <p className="text-xs text-muted-foreground mt-0.5">→ {d.owner}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {isCompleted && meeting.action_items.length > 0 && (
          <div className="p-4 border border-border rounded-lg">
            <h2 className="text-sm font-medium text-foreground mb-3">Action Items</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs text-muted-foreground font-normal px-4 py-2.5">Action</th>
                    <th className="text-left text-xs text-muted-foreground font-normal px-4 py-2.5 w-40">Owner</th>
                    <th className="text-left text-xs text-muted-foreground font-normal px-4 py-2.5 w-28">Due</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {meeting.action_items.map((item, i) => {
                    const isCreating = approvingIndex === i;
                    return (
                      <tr key={item.id} className={`border-t border-border transition-colors ${isCreating ? "bg-primary/5" : ""}`}>
                        <td className="text-sm text-foreground px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.text}
                            {isCreating && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                                <Loader2 className="h-3 w-3 animate-spin" /> Creating task…
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-sm text-muted-foreground px-4 py-3">{item.owner}</td>
                        <td className="text-sm text-muted-foreground px-4 py-3">{item.due}</td>
                        <td className="pr-3 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                disabled={isCreating}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-36" align="end">
                              <DropdownMenuItem onSelect={() => handleApprove(item, i)}>
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                Decline
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Participants */}
        {meeting.participants.length > 0 && (
          <div className="p-4 border border-border rounded-lg">
            <h2 className="text-sm font-medium text-foreground mb-3">Participants</h2>
            <div className="flex flex-wrap gap-2">
              {meeting.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-[10px] text-primary font-medium">
                      {p.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-foreground">{p.name}</span>
                    {p.role && <span className="text-xs text-muted-foreground ml-1">• {p.role}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        {isCompleted && meeting.transcript.length > 0 && (
          <div className="p-4 border border-border rounded-lg">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showTranscript ? "rotate-180" : ""}`} />
              <FileText className="h-4 w-4" />
              Transcript
            </button>
            {showTranscript && (
              <div className="mt-3 border border-border rounded-lg p-4 space-y-3">
                {meeting.transcript.map((segment) => (
                  <div key={segment.id} className="flex gap-3">
                    <span className="text-xs text-muted-foreground w-10 shrink-0 pt-0.5">{segment.time}</span>
                    <div>
                      <span className="text-xs font-medium text-foreground">{segment.speaker}</span>
                      <p className="text-sm text-muted-foreground mt-0.5">{segment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending outcome — no_show */}
        {meeting.status === "no_show" && !outcomeDismissed && (
          <div className="p-6 border border-amber-200 bg-amber-50 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-1">Awaiting outcome</p>
            <p className="text-sm text-amber-700 mb-4">The scheduled time has passed. What happened with this meeting?</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleStatusUpdate("completed")}
                disabled={statusUpdating}
              >
                Mark as Completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={statusUpdating}
              >
                Mark as Cancelled
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOutcomeDismissed(true)}
                disabled={statusUpdating}
              >
                Confirm No Show
              </Button>
            </div>
          </div>
        )}

        {/* Upcoming meeting placeholder */}
        {!isPast && meeting.status !== "no_show" && (
          <div className="p-8 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground">
            Meeting details will appear here once the meeting is completed and AI notes are generated.
          </div>
        )}
      </div>
      {meeting && (
        <GenerateAiNotesDialog
          meetingId={meeting.id}
          open={aiNotesOpen}
          onOpenChange={setAiNotesOpen}
          onSuccess={refetch}
        />
      )}
    </DashboardLayout>
  );
}
