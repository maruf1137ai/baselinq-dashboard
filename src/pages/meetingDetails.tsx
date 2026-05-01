import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, Calendar, MapPin, Users, FileText, Loader2, ExternalLink } from "lucide-react";
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
  const [outcomeDismissed, setOutcomeDismissed] = useState(
    () => localStorage.getItem(`no_show_confirmed_${id}`) === "1"
  );

  // Track which action items have been approved/declined (persisted per meeting).
  // Keyed by item id so reordering doesn't break it.
  const actionDecisionKey = `meeting_action_decisions_${id}`;
  const [actionDecisions, setActionDecisions] = useState<Record<string, "approved" | "declined">>(
    () => {
      try {
        return JSON.parse(localStorage.getItem(actionDecisionKey) || "{}");
      } catch {
        return {};
      }
    }
  );

  const persistDecision = (itemId: string, decision: "approved" | "declined") => {
    setActionDecisions((prev) => {
      const next = { ...prev, [itemId]: decision };
      localStorage.setItem(actionDecisionKey, JSON.stringify(next));
      return next;
    });
  };
  const [startingBot, setStartingBot] = useState(false);
  const { mutateAsync: postRequest } = usePost();
  const { mutateAsync: patchRequest } = usePatch();

  const { data: meeting, isLoading, isError, refetch } = useFetch<MeetingDetail>(
    id ? `meetings/${id}/` : null,
    {
      refetchInterval: (query: any) => {
        const d = query?.state?.data;
        if (!d) return false;
        if (d.status === "starting_soon" || d.status === "live") return 10000;
        if (d.artefact_status === "processing" || d.artefact_status === "transcribed") return 15000;
        return false;
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
      persistDecision(String(item.id), "approved");
      toast.success(`${config.type} task created successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? err?.message ?? "Failed to create task.");
    } finally {
      setApprovingIndex(null);
    }
  };

  const handleDecline = (item: ActionItem) => {
    persistDecision(String(item.id), "declined");
    toast.success("Action item declined.");
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

  const handleStartBot = async () => {
    setStartingBot(true);
    try {
      await postRequest({ url: `meetings/${id}/start-bot/`, data: {} });
      toast.success("Bot is joining in ~30 seconds. Keep the meeting open.");
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to start bot.");
    } finally {
      setStartingBot(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (meeting?.meeting_link) {
      window.open(meeting.meeting_link, "_blank", "noopener,noreferrer");
    }
    const shouldTriggerBot =
      !!meeting?.meeting_link &&
      meeting.artefact_status === "none" &&
      meeting.status !== "live" &&
      meeting.status !== "completed" &&
      meeting.status !== "cancelled" &&
      meeting.status !== "no_show";
    if (shouldTriggerBot) {
      handleStartBot();
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
  const isTerminal   = meeting.status === "completed" || meeting.status === "cancelled" || (meeting.status === "no_show" && outcomeDismissed);

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
            {meeting.meeting_link && !isTerminal && (
              <button
                onClick={handleJoinMeeting}
                disabled={startingBot}
                className="flex items-center gap-1 text-primary hover:underline disabled:opacity-60"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Join Meeting
              </button>
            )}
          </div>
        </div>

        {/* Linq AI Notes — primary flow when a meeting link was provided */}
        {isPast && (
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <AiIcon size={16} className="text-primary" />
                <h2 className="text-sm font-medium text-foreground">Linq AI Notes</h2>
              </div>
              {hasAiNotes && (
                <span className="text-[11px] text-muted-foreground">
                  Captured by Linq AI from meeting recording
                </span>
              )}
            </div>

            {/* Processing state */}
            {meeting.artefact_status === "processing" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Linq AI is transcribing and summarising. Notes typically land 2–5 minutes after the meeting ends.
              </div>
            )}

            {/* Notes available */}
            {hasAiNotes && (
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
            )}

            {/* Empty state — no bot, no notes, no processing */}
            {!hasAiNotes && meeting.artefact_status !== "processing" && (
              <div className="py-4">
                <p className="text-sm text-foreground mb-2">No Linq AI notes for this meeting.</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {meeting.meeting_link
                    ? "Click \"Join Meeting\" above to open the call — the bot will join automatically and generate notes after the meeting ends."
                    : "This meeting had no link. You can still add notes manually — see the Manual Transcript section below."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Manual Transcript — secondary backup only. Hidden when Linq AI notes exist. */}
        {isPast && !hasAiNotes && meeting.artefact_status !== "processing" && (
          <div className="p-4 border border-dashed border-border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Manual Transcript (Backup)
              </h3>
              <button
                onClick={() => setAiNotesOpen(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <AiIcon size={12} /> Paste transcript
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fallback when Linq AI couldn&apos;t attend the meeting. Paste a transcript from your video-call provider and we&apos;ll still generate a summary — the same AI treatment, just from your text instead of a recording.
            </p>
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
                    <th className="text-right text-xs text-muted-foreground font-normal px-4 py-2.5 w-44">Actions</th>
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
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {actionDecisions[String(item.id)] === "approved" ? (
                              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                                Approved
                              </span>
                            ) : actionDecisions[String(item.id)] === "declined" ? (
                              <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                                Declined
                              </span>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(item, i)}
                                  disabled={isCreating}
                                  className="h-8 px-3 text-xs font-normal"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDecline(item)}
                                  disabled={isCreating}
                                  className="h-8 px-3 text-xs font-normal text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                          </div>
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
                onClick={() => { localStorage.setItem(`no_show_confirmed_${id}`, "1"); setOutcomeDismissed(true); }}
                disabled={statusUpdating}
              >
                Confirm No Show
              </Button>
            </div>
          </div>
        )}

        {/* Confirmed no-show message */}
        {meeting.status === "no_show" && outcomeDismissed && (
          <div className="p-4 border border-border rounded-lg bg-muted/30 text-sm text-muted-foreground">
            This meeting was confirmed as a no-show. No recording or notes are available.
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
