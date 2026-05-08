/**
 * Werner spec rev H — generic detail page used by all 6 task types.
 *
 * One component handles RFI / SI / VO / GI / IC / Claim because the
 * Werner-spec layout is identical across them — only the doc title,
 * status flow, and which action chains are allowed differ. Per-type
 * config lives in ENTITY_CONFIG below.
 *
 * Each thin wrapper page (RFIDetailV2, SIDetailV2, etc.) just imports
 * this component with the right entityType prop.
 *
 * Why a generic component instead of 6 copies: the Werner spec is
 * 'the doc reads as one certificate' — the layout is the WHOLE point.
 * If we forked it 6 ways, the chance of drift is high. One component
 * keeps it consistent.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/DashboardLayout";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { DocumentHeader } from "@/components/werner/DocumentHeader";
import { DocumentBody, type EntityRefDisplay } from "@/components/werner/DocumentBody";
import { ReplyCard, type ReplyData } from "@/components/werner/ReplyCard";
import { ReplyForm } from "@/components/werner/ReplyForm";
import { LifecycleTimeline, type LifecycleStep } from "@/components/werner/LifecycleTimeline";
import { ActionBar, type DocType } from "@/components/werner/ActionBar";
import { WernerErrorBoundary } from "@/components/werner/ErrorBoundary";
import { SignIssueButton } from "@/components/werner/SignIssueButton";
import { RiskLevelButtons } from "@/components/werner/RiskLevelButtons";


// ─── Per-entity-type config ──────────────────────────────────────────────


export type EntityType = "rfi" | "si" | "vo" | "gi" | "ic" | "claim";

interface EntityConfig {
  apiPath: string;            // e.g. "tasks/requests-for-information"
  docTypeLabel: string;       // e.g. "REQUEST FOR INFORMATION"
  numberField: string;        // e.g. "rfi_number"
  showSeal: boolean;          // contractually-binding docs show signature stamp
  showTimeCostOnReply: boolean; // SI replies and Claim
  showReplyButton: boolean;   // VO has no reply button per spec page 8
  showSignIssue: boolean;     // SI / VO / Claim
  showRiskButtons: boolean;   // IC only
  showStructuredTimeCost: boolean; // VO and Claim show structured fields
  // What "+Action" can escalate to. Werner: rfi→si only, si→vo only, ic→claim only.
  escalationTarget: DocType | null;
}

const ENTITY_CONFIG: Record<EntityType, EntityConfig> = {
  rfi: {
    apiPath: "tasks/requests-for-information",
    docTypeLabel: "REQUEST FOR INFORMATION",
    numberField: "rfi_number",
    showSeal: false,
    showTimeCostOnReply: false,
    showReplyButton: true,
    showSignIssue: false,
    showRiskButtons: false,
    showStructuredTimeCost: false,
    escalationTarget: "si",
  },
  si: {
    apiPath: "tasks/site-instructions",
    docTypeLabel: "SITE INSTRUCTION",
    numberField: "si_number",
    showSeal: true,
    showTimeCostOnReply: true,
    showReplyButton: true,
    showSignIssue: true,
    showRiskButtons: false,
    showStructuredTimeCost: false,
    escalationTarget: "vo",
  },
  vo: {
    apiPath: "tasks/variation-orders",
    docTypeLabel: "VARIATION ORDER",
    numberField: "vo_number",
    showSeal: true,
    showTimeCostOnReply: false,
    showReplyButton: false, // Werner annotation page 8: VO has no reply
    showSignIssue: true,
    showRiskButtons: false,
    showStructuredTimeCost: true,
    escalationTarget: null,
  },
  gi: {
    apiPath: "tasks/general-instructions",
    docTypeLabel: "GENERAL INSTRUCTION",
    numberField: "gi_number",
    showSeal: false,
    showTimeCostOnReply: false,
    showReplyButton: true,
    showSignIssue: false,
    showRiskButtons: false,
    showStructuredTimeCost: false,
    escalationTarget: null,
  },
  ic: {
    apiPath: "tasks/intentions-to-claim",
    docTypeLabel: "INTENTION TO CLAIM",
    numberField: "ic_number",
    showSeal: false,
    showTimeCostOnReply: false,
    showReplyButton: true,
    showSignIssue: false,
    showRiskButtons: true,
    showStructuredTimeCost: false,
    escalationTarget: "claim",
  },
  claim: {
    apiPath: "tasks/delay-claims",
    docTypeLabel: "CLAIM",
    numberField: "dc_number",
    showSeal: true,
    showTimeCostOnReply: false,
    showReplyButton: false,
    showSignIssue: true,
    showRiskButtons: false,
    showStructuredTimeCost: true,
    escalationTarget: null,
  },
};


// ─── Shared types ────────────────────────────────────────────────────────


type MaybeUser = number | { id: number; name?: string; email?: string; role?: string } | null;

interface UserInfo {
  id: number;
  name?: string;
  email?: string;
  role?: string;
}

function userObject(u: MaybeUser): UserInfo | undefined {
  if (u == null) return undefined;
  if (typeof u === "number") return { id: u };
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

interface EntityDetail {
  id: number;
  subject?: string;
  title?: string;
  description?: string;
  question?: string;
  instruction?: string;
  discipline?: string;
  status?: string;
  priority?: string;
  raised_by?: MaybeUser;
  submitted_by?: MaybeUser;
  responded_by?: MaybeUser;
  signed_by?: MaybeUser;
  signed_at?: string | null;
  issued_at?: string | null;
  intention_ref?: number | null;
  // Some serializers nest, some flatten — accept both
  ic_number?: string;
  rfi_number?: string;
  si_number?: string;
  vo_number?: string;
  gi_number?: string;
  dc_number?: string;
  date_required?: string;
  time_days_claimed?: number;
  cost_amount_claimed?: number;
  estimated_cost_currency?: string;
  risk_level?: "low" | "medium" | "high" | null;
  created_at: string;
  updated_at?: string;
  responded_at?: string;
  project?: number | { id: number; name?: string; project_number?: string; address?: string; employer?: string };
}


// ─── Component ──────────────────────────────────────────────────────────


interface Props {
  entityType: EntityType;
}


// Werner's role mapping for who can do what:
//   contractor-side roles  → write RFI, write IC, write Claim, close out RFI
//   professional roles     → write SI, write GI, reply on RFI, close out SI/GI
//   PM/Principal roles     → write VO, set IC risk level, close out VO/Claim
const CONTRACTOR_CODES = new Set(["CONTRACTS_MGR", "CM", "FOREMAN", "SS", "CONTRACTOR"]);
const PM_CODES = new Set(["PM", "CPM", "PRINCIPAL_PM", "PRINCIPAL_AGENT", "PA"]);
const PROFESSIONAL_CODES = new Set([
  "ARCH", "STRUCT_ENG", "MECH_ENG", "ELEC_ENG", "CIVIL_ENG", "QS", "CQS",
  "PM", "CPM", "PRINCIPAL_PM", "PRINCIPAL_AGENT", "PA",
]);

function EntityDetailV2Inner({ entityType }: Props) {
  const cfg = ENTITY_CONFIG[entityType];
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { mutateAsync: postRequest } = usePost();
  const { data: currentUser } = useCurrentUser();
  const userRoleCode = (currentUser?.role?.code || "").toUpperCase();
  const isContractor = CONTRACTOR_CODES.has(userRoleCode);
  const isPM = PM_CODES.has(userRoleCode);
  const isProfessional = PROFESSIONAL_CODES.has(userRoleCode);

  const { data: entity, isLoading, refetch } = useFetch<EntityDetail>(
    id ? `${cfg.apiPath}/${id}/` : "",
  );

  const { data: rawReplies, refetch: refetchReplies } = useFetch<ReplyData[]>(
    id ? `tasks/replies/?entity_type=${entityType}&entity_id=${id}` : "",
  );
  const replies: ReplyData[] = Array.isArray(rawReplies) ? rawReplies : [];

  // ─── Lifecycle steps ──────────────────────────────────────────────────
  const lifecycleSteps: LifecycleStep[] = useMemo(() => {
    if (!entity) return [];
    const status = (entity.status || "").toLowerCase();
    const replyCount = replies.length;

    const isClosed = status.includes("closed") || status.includes("issued") || status.includes("approved");
    const isSent = status !== "draft";

    return [
      { label: "Draft created", status: "complete", timestamp: entity.created_at?.slice(0, 10) },
      { label: "Sent for review", status: isSent ? "complete" : "active" },
      {
        label: "Response provided",
        status: replyCount >= 1 ? "complete" : isSent ? "active" : "pending",
        timestamp: replyCount >= 1 ? replies[0]?.created_at?.slice(0, 10) : undefined,
      },
      {
        label: "Response provided",
        status: replyCount >= 2 ? "complete" : replyCount >= 1 ? "active" : "pending",
        timestamp: replyCount >= 2 ? replies[1]?.created_at?.slice(0, 10) : undefined,
      },
      { label: "Closed", status: isClosed ? "complete" : replyCount >= 1 ? "active" : "pending" },
    ];
  }, [entity, replies]);

  // ─── Action handlers ──────────────────────────────────────────────────
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
          entity_type: entityType,
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

  const handleEscalate = async () => {
    if (!cfg.escalationTarget || !entity) return;
    try {
      const result = await postRequest({
        url: "tasks/escalate/",
        data: {
          from_type: entityType,
          from_id: Number(id),
          to_type: cfg.escalationTarget,
          payload: {
            title: `From ${getDocNumber(entity, cfg)}: ${entity.subject || entity.title || ""}`,
            description: entity.description || entity.question || entity.instruction || "",
            discipline: entity.discipline,
          },
        },
      });
      toast.success(`Escalated to ${result?.display || cfg.escalationTarget.toUpperCase()}.`);
      // Navigate to the newly created entity's v2 page
      navigate(`/tasks/${cfg.escalationTarget}-v2/${result?.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to escalate.");
    }
  };

  const handleCloseOut = async () => {
    if (!entity) return;
    try {
      await postRequest({ url: `${cfg.apiPath}/${id}/`, data: { status: "Closed" } });
      toast.success("Closed out.");
      await refetch();
    } catch {
      toast.error("Failed to close out.");
    }
  };

  // ─── Loading / error states ───────────────────────────────────────────
  if (isLoading || !entity) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <AwesomeLoader />
        </div>
      </DashboardLayout>
    );
  }

  const project = (typeof entity.project === "number" || entity.project == null)
    ? { id: typeof entity.project === "number" ? entity.project : 0 }
    : entity.project;
  const raisedBy = userObject(entity.raised_by ?? entity.submitted_by);
  const docNumber = getDocNumber(entity, cfg);
  const isSigned = !!entity.signed_at;
  const isClosed = (entity.status || "").toLowerCase().includes("closed") || isSigned;
  const replyCount = replies.length;

  const actionMode: "submit" | "reply" | "after-response" =
    (entity.status || "").toLowerCase() === "draft"
      ? "submit"
      : replyCount > 0
        ? "after-response"
        : "reply";

  // ── Role-based gating per Werner's WhatsApp answers ───────────────
  // Determines which user can press CLOSE OUT on this doc type.
  //   RFI    → contractor closes
  //   SI     → professional closes
  //   VO     → PM/Principal closes
  //   GI     → the initiator (raised_by) closes
  //   IC     → not closed out by user; auto-closes when escalated
  //   Claim  → contractor closes (effectively when they hit Submit)
  const canCloseThisDoc =
    entityType === "rfi"   ? isContractor :
    entityType === "si"    ? isProfessional :
    entityType === "vo"    ? isPM :
    entityType === "gi"    ? (raisedBy?.id === currentUser?.id) :
    entityType === "claim" ? isContractor :
    false;

  // Reply visibility per role:
  //   - Contractor on initiating doc (RFI/IC/Claim) drafts → Submit only, no Reply
  //   - VO has no reply at all (Werner page 8)
  //   - Otherwise: anyone in the conversation can reply
  const canReply =
    cfg.showReplyButton
    && !(actionMode === "submit" && isContractor && (entityType === "rfi" || entityType === "ic" || entityType === "claim"));

  // Action button (escalation) visibility:
  //   - RFI → SI: only professional escalates (contractor has no SI rights)
  //   - SI → VO: only PM (Werner: only PM can write VO)
  //   - IC → Claim: contractor escalates to formal Claim
  const canEscalate = !!cfg.escalationTarget && (
    entityType === "rfi"   ? isProfessional :
    entityType === "si"    ? isPM :
    entityType === "ic"    ? isContractor :
    false
  );

  // Sign & Issue: Werner says architect signs SI; PM signs VO/Claim.
  const canSignIssue =
    cfg.showSignIssue
    && (
      entityType === "si"    ? isProfessional :
      entityType === "vo"    ? isPM :
      entityType === "claim" ? isPM :
      false
    );

  // Auto-references rendered in the doc body. The replies endpoint
  // returns these per-reply; the doc itself doesn't have an endpoint
  // for them yet, so we surface the parent-doc auto-refs from any
  // reply that has them. Werner: the reference list shows on the
  // doc itself, not just on replies.
  const docReferences: EntityRefDisplay[] = replies
    .flatMap((r) => r.references_display || [])
    .filter((r, i, arr) => arr.findIndex((x) => x.display === r.display) === i);

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
          <div className="flex-1 space-y-3">
            {/* Doc card */}
            <div className="bg-white rounded-md border border-gray-300 shadow-sm overflow-hidden">
              <DocumentHeader
                docTypeLabel={cfg.docTypeLabel}
                projectName={project?.name || "—"}
                projectNumber={project?.project_number || "—"}
                projectAddress={project?.address || "—"}
                employer={project?.employer || "—"}
                showSeal={cfg.showSeal && isSigned}
                onPrint={() => window.print()}
              />
              <DocumentBody
                docNumber={docNumber}
                dateIssued={new Date(entity.created_at).toLocaleString()}
                discipline={entity.discipline}
                from={raisedBy ? {
                  id: raisedBy.id,
                  name: raisedBy.name || raisedBy.email || `User #${raisedBy.id}`,
                  role: raisedBy.role,
                } : undefined}
                subject={entity.subject || entity.title || ""}
                isUrgent={entity.priority === "Urgent" || entity.priority === "High"}
                description={
                  entity.question || entity.instruction || entity.description || ""
                }
                references={docReferences}
                referenceIcNumber={entityType === "claim" ? icNumberForClaim(entity) : undefined}
                structuredTimeCost={
                  cfg.showStructuredTimeCost
                    ? {
                        timeDays: entity.time_days_claimed ?? undefined,
                        costAmount: entity.cost_amount_claimed
                          ? Number(entity.cost_amount_claimed)
                          : undefined,
                        costCurrency: entity.estimated_cost_currency || "ZAR",
                      }
                    : undefined
                }
              />

              {/* Sign & Issue terminal state — green confirmation card per Werner page 12 */}
              {isSigned && (
                <div className="px-6 py-4 bg-green-100 border-t border-green-200 text-sm">
                  <div className="font-medium text-gray-900 mb-1">
                    {cfg.docTypeLabel.split(" ")[0]}: No {docNumber}
                  </div>
                  <div className="text-gray-700">
                    Issued by:{" "}
                    <span className="font-medium">
                      {userObject(entity.signed_by)?.name || userObject(entity.signed_by)?.email || "—"}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    DATE: {entity.issued_at
                      ? new Date(entity.issued_at).toLocaleString()
                      : entity.signed_at
                      ? new Date(entity.signed_at).toLocaleString()
                      : "—"}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-2xl">📄</span>
                    <span className="font-script italic text-gray-700" style={{ fontFamily: "cursive" }}>
                      signature
                    </span>
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-green-200 text-green-800 text-[10px] font-semibold">
                      Seal
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Risk level buttons (IC only) */}
            {cfg.showRiskButtons && (
              <RiskLevelButtons
                entityId={Number(id)}
                currentLevel={entity.risk_level || null}
                onChanged={() => refetch()}
              />
            )}

            {/* Action bar — sits BETWEEN doc card and reply card.
                Buttons are role-gated per Werner's WhatsApp answers. */}
            {!isClosed && (
              <ActionBar
                docType={entityType as DocType}
                mode={actionMode}
                onAnalyzeAi={() => toast.info("AI analysis available in next iteration.")}
                onReply={canReply ? () => setShowReplyForm(true) : undefined}
                onSubmit={async () => {
                  await postRequest({
                    url: `${cfg.apiPath}/${id}/`,
                    data: { status: "Sent for Review" },
                  });
                  toast.success("Submitted.");
                  await refetch();
                }}
                onAction={canEscalate ? () => handleEscalate() : undefined}
                onCloseOut={canCloseThisDoc ? handleCloseOut : undefined}
              />
            )}

            {/* Sign & Issue button — SI, VO, Claim only, role-gated */}
            {canSignIssue && !isSigned && (
              <SignIssueButton
                entityType={entityType as "si" | "vo" | "claim"}
                entityId={Number(id)}
                onSigned={() => refetch()}
              />
            )}

            {/* Reply cards */}
            {replies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                showTimeCost={cfg.showTimeCostOnReply}
              />
            ))}

            {/* Reply composer */}
            {showReplyForm && (
              <ReplyForm
                entityType={entityType}
                entityId={Number(id)}
                showTimeCost={cfg.showTimeCostOnReply}
                onSubmit={handleSubmitReply}
                onCancel={() => setShowReplyForm(false)}
                isSubmitting={submitting}
              />
            )}

            {isClosed && !isSigned && (
              <div className="bg-green-50 border border-green-200 rounded-md px-5 py-3 text-sm text-green-700 flex items-center gap-2">
                ✓ This {cfg.docTypeLabel.toLowerCase()} has been closed out.
              </div>
            )}
          </div>

          <LifecycleTimeline steps={lifecycleSteps} />
        </div>
      </div>
    </DashboardLayout>
  );
}


// ─── Helpers ────────────────────────────────────────────────────────────


function getDocNumber(entity: EntityDetail, cfg: EntityConfig): string {
  return ((entity as any)[cfg.numberField] as string | undefined) || `#${entity.id}`;
}

function icNumberForClaim(entity: EntityDetail): string | undefined {
  // Backend returns intention_ref as a PK — the form should render the
  // IC number as a string. We could fetch the IC separately, but for
  // now show the PK as a placeholder if present.
  return entity.intention_ref ? `IC-${String(entity.intention_ref).padStart(3, "0")}` : undefined;
}


// ─── Default export wrapped in error boundary ──────────────────────────


export default function EntityDetailV2(props: Props) {
  return (
    <WernerErrorBoundary>
      <EntityDetailV2Inner {...props} />
    </WernerErrorBoundary>
  );
}
