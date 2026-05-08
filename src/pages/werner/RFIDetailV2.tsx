/**
 * Werner spec rev G — RFI detail page using the new shared components.
 *
 * This is a NEW page (route: /tasks/rfi-v2/:id) that exists alongside
 * the existing TaskDetails so we can demo the new layout to Werner
 * without disrupting the production task views. Once approved, the
 * pattern lands on SI / VO / GI / IC / Claim and the old TaskDetails
 * gets retired.
 *
 * Live data: pulls from the existing GET /api/tasks/requests-for-information/<id>/
 * endpoint plus the new GET /api/tasks/replies/?entity_type=rfi&entity_id=<id>.
 *
 * Reply submit hits POST /api/tasks/replies/, escalate hits POST
 * /api/tasks/escalate/. Side-effects (auto-VO, channel mirror) happen
 * server-side.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/DashboardLayout";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";

import { DocumentHeader } from "@/components/werner/DocumentHeader";
import { DocumentBody } from "@/components/werner/DocumentBody";
import { ReplyCard, type ReplyData } from "@/components/werner/ReplyCard";
import { ReplyForm } from "@/components/werner/ReplyForm";
import { LifecycleTimeline, type LifecycleStep } from "@/components/werner/LifecycleTimeline";
import { ActionBar, type DocType } from "@/components/werner/ActionBar";

// API shape returned by the existing RFI endpoint.
interface RFIDetail {
  id: number;
  rfi_number: string;
  subject: string;
  description?: string;
  question: string;
  discipline: string;
  status: string;
  priority: string;
  raised_by?: { id: number; name: string; role?: string };
  responded_by?: { id: number; name: string; role?: string };
  created_at: string;
  responded_at?: string;
  project?: {
    id: number;
    name: string;
    project_number?: string;
    address?: string;
    employer?: string;
  };
}

export default function RFIDetailV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { mutateAsync: postRequest } = usePost();

  const { data: rfi, isLoading, refetch } = useFetch<RFIDetail>(
    id ? `tasks/requests-for-information/${id}/` : "",
  );

  const { data: replies, refetch: refetchReplies } = useFetch<ReplyData[]>(
    id ? `tasks/replies/?entity_type=rfi&entity_id=${id}` : "",
  );

  const lifecycleSteps: LifecycleStep[] = useMemo(() => {
    if (!rfi) return [];
    const status = rfi.status?.toLowerCase() || "";
    const replyCount = replies?.length || 0;

    const isClosed = status.includes("closed");
    const hasResponse = replyCount > 0 || status.includes("response provided") || status.includes("answered");
    const isSent = status !== "draft";

    return [
      {
        label: "Draft created",
        status: "complete",
        timestamp: rfi.created_at?.slice(0, 10),
      },
      {
        label: "Sent for review",
        status: isSent ? "complete" : "active",
        timestamp: isSent ? rfi.created_at?.slice(0, 10) : undefined,
      },
      {
        label: "Response provided",
        status: hasResponse ? "complete" : isSent ? "active" : "pending",
        timestamp: hasResponse && rfi.responded_at ? rfi.responded_at.slice(0, 10) : undefined,
      },
      {
        label: "Closed",
        status: isClosed ? "complete" : hasResponse ? "active" : "pending",
      },
    ];
  }, [rfi, replies]);

  const handleSubmitReply = async (payload: {
    body: string;
    recipient_id?: number | null;
    time_impact: boolean;
    cost_impact: boolean;
  }) => {
    setSubmitting(true);
    try {
      await postRequest({
        url: "tasks/replies/",
        data: {
          entity_type: "rfi",
          entity_id: Number(id),
          body: payload.body,
          recipient_id: payload.recipient_id || null,
          time_impact: payload.time_impact,
          cost_impact: payload.cost_impact,
        },
      });
      toast.success("Reply submitted.");
      setShowReplyForm(false);
      await Promise.all([refetch(), refetchReplies()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to submit reply.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (target: DocType) => {
    if (target !== "si") {
      toast.error(`RFIs can only escalate to SI (got ${target.toUpperCase()}).`);
      return;
    }
    try {
      const result = await postRequest({
        url: "tasks/escalate/",
        data: {
          from_type: "rfi",
          from_id: Number(id),
          to_type: "si",
          payload: {
            title: `From ${rfi?.rfi_number}: ${rfi?.subject}`,
            instruction: rfi?.question || "",
            discipline: rfi?.discipline,
          },
        },
      });
      toast.success(`Escalated to ${result?.display || "SI"}.`);
      navigate(`/tasks/${result?.id || ""}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to escalate.");
    }
  };

  const handleCloseOut = async () => {
    try {
      await postRequest({
        url: `tasks/requests-for-information/${id}/`,
        data: { status: "Closed" },
      });
      toast.success("RFI closed out.");
      await refetch();
    } catch {
      toast.error("Failed to close out.");
    }
  };

  if (isLoading || !rfi) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <AwesomeLoader />
        </div>
      </DashboardLayout>
    );
  }

  const project = rfi.project || ({} as RFIDetail["project"]);
  const isClosed = rfi.status?.toLowerCase().includes("closed");
  const replyCount = replies?.length || 0;

  // Determine which mode the action bar should be in:
  //   - submit:           draft, never sent
  //   - reply:            sent, no response yet (professional)
  //   - after-response:   has at least one reply (contractor or pro can close out)
  const actionMode: "submit" | "reply" | "after-response" =
    rfi.status?.toLowerCase() === "draft"
      ? "submit"
      : replyCount > 0
        ? "after-response"
        : "reply";

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to tasks
        </Link>

        <div className="flex items-start gap-6">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <DocumentHeader
              docTypeLabel="REQUEST FOR INFORMATION"
              projectName={project?.name || "—"}
              projectNumber={project?.project_number || "—"}
              projectAddress={project?.address || "—"}
              employer={project?.employer || "—"}
              showSeal={false}
              onPrint={() => window.print()}
            />

            <DocumentBody
              docNumber={rfi.rfi_number}
              dateIssued={new Date(rfi.created_at).toLocaleString()}
              discipline={rfi.discipline}
              from={rfi.raised_by ? { id: rfi.raised_by.id, name: rfi.raised_by.name, role: rfi.raised_by.role } : undefined}
              subject={rfi.subject}
              isUrgent={rfi.priority === "Urgent"}
              description={rfi.question || rfi.description || ""}
            />

            {replies && replies.length > 0 && (
              <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
                {replies.map((reply) => (
                  <ReplyCard key={reply.id} reply={reply} />
                ))}
              </div>
            )}

            {showReplyForm && (
              <div className="px-6 pt-3 pb-1 bg-gray-50 border-t border-gray-200">
                <ReplyForm
                  entityType="rfi"
                  entityId={Number(id)}
                  showTimeCost={false}
                  onSubmit={handleSubmitReply}
                  onCancel={() => setShowReplyForm(false)}
                  isSubmitting={submitting}
                />
              </div>
            )}

            {!isClosed && (
              <ActionBar
                docType="rfi"
                mode={actionMode}
                onAnalyzeAi={() => toast.info("AI analysis coming in PR-2.")}
                onReply={() => setShowReplyForm(true)}
                onSubmit={async () => {
                  await postRequest({
                    url: `tasks/requests-for-information/${id}/`,
                    data: { status: "Sent for Review" },
                  });
                  toast.success("RFI submitted.");
                  await refetch();
                }}
                onAction={handleEscalate}
                onCloseOut={handleCloseOut}
              />
            )}

            {isClosed && (
              <div className="border-t border-gray-200 bg-green-50 px-6 py-3 text-sm text-green-700 flex items-center gap-2">
                ✓ This RFI has been closed out.
              </div>
            )}
          </div>

          <LifecycleTimeline steps={lifecycleSteps} />
        </div>
      </div>
    </DashboardLayout>
  );
}
