/**
 * Werner spec rev H — additive task actions.
 *
 * Drops into the existing TaskDetails action button row (line ~2024).
 * Uses the same shadcn Button component + Tailwind classes already
 * in use, so it visually matches the rest of the page — no custom
 * gray cards, no layout overrides.
 *
 * Conditionally renders:
 *   • + Action button     — RFI / SI / IC only (escalation chain)
 *   • Sign & Issue button — SI / VO / Claim (DC) only
 *   • Risk-level pills    — IC only (Low / Medium / High)
 *
 * Backend endpoints (already shipped):
 *   POST /api/tasks/escalate/                   — chain escalation
 *   POST /api/tasks/sign-and-issue/             — sign with PIN or click
 *   POST /api/tasks/intentions-to-claim/<id>/set-risk-level/
 */
import { useState } from "react";
import { ChevronDown, Lock, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePost } from "@/hooks/usePost";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions";
import { cn } from "@/lib/utils";

type TaskType = "RFI" | "SI" | "VO" | "GI" | "IC" | "DC" | "CLAIM" | "CRITICALPATHITEM" | string;

// Werner rev H — every action below is gated by the SAME Roles & Permissions
// code the server checks (tasks/views_werner.py, tasks/views_signing.py;
// seeded by backend user/migrations/0073), read from the live
// effective-permissions payload for this project. No role-code sets: an
// admin changing a role on the Roles & Permissions page changes these
// buttons too.
const CLOSE_PERMISSION: Record<string, string> = {
  RFI: "task.rfi.close",
  SI: "task.approve_si",
  VO: "task.vo.close",
  GI: "task.gi.close",
  IC: "task.ic.close",
  DC: "task.claim.close",
  CLAIM: "task.claim.close",
};
const SIGN_PERMISSION: Record<string, string> = {
  SI: "task.si.sign",
  DC: "task.claim.sign",
  CLAIM: "task.claim.sign",
};

interface Props {
  /** Task type from the API (e.g. 'RFI', 'SI', 'VO', 'IC', 'DC'). */
  taskType: TaskType;
  /** The Task PK (used to look up nested task data on refresh). */
  taskId: number | string;
  /** The entity PK (RFI/SI/VO/IC/DC id) — needed by the backend endpoints. */
  entityId: number | string;
  /** Current risk level if this is an IC. */
  riskLevel?: "low" | "medium" | "high" | null;
  /** Whether the doc has already been signed (hide Sign & Issue if so). */
  isSigned?: boolean;
  /**
   * Whether the doc is locked / terminal (workflow over).
   *
   * Werner spec — different lock points per type:
   *  • SI    locks at status=Verified (not at signed_at — workflow
   *          continues through Acknowledged/Actioned after Issued).
   *  • VO/Claim lock at signed_at (terminal on sign).
   *
   * We hide escalation when locked, NOT when signed, so SI → VO can
   * still happen between Issued and Verified if cost/time impact
   * surfaces in the contractor's reply.
   */
  isLocked?: boolean;
  /** The originator's user ID — needed for close-out visibility on GI/RFI/IC. */
  originatorId?: number | string | null;
  /** Current entity status — used to hide Close-out when already closed. */
  currentStatus?: string | null;
  /** IC-only: respondent user ID, used to gate the Resend broker button. */
  respondentId?: number | string | null;
  /** IC-only: whether the broker has already been notified for this IC. */
  brokerNotified?: boolean;
  /** Project ID — used to resolve the user's project-level role for
   *  Sign & Issue / risk-pill visibility. PM is usually assigned at the
   *  project level (ProjectTeamMember), not globally (User.role). */
  projectId?: number | string | null;
  /** Refetch the task after a state change. */
  onChanged: () => void | Promise<void>;
}

const ESCALATION_TARGETS: Partial<Record<TaskType, { type: string; label: string }>> = {
  RFI: { type: "si", label: "Site Instruction" },
  SI: { type: "vo", label: "Variation Order" },
  IC: { type: "claim", label: "Claim" },
};

// Werner rev H — VO has its OWN dedicated signing surface:
// "Approve & Sign" lives next to the contractor's pricing response in
// the page body (TaskDetails.tsx ~2819). Showing "Sign & Issue" in this
// top action bar AS WELL meant the PM saw two buttons for the same
// backend endpoint (tasks/sign-and-issue/). Confusing.
//
// Excluded VO here so only the contextual Approve & Sign renders.
// SI, DC, and Claim still use this top-bar Sign & Issue (their
// signing isn't tied to a pricing-response review step).
//
// This set previously still listed "VO" despite the comment above,
// which meant this top-bar button rendered for VO too — with no status
// check at all (canSignThisType only checked isPM), so it showed up
// even before the VO had been priced. The contextual Approve & Sign
// button already gates correctly on status ("Priced"/"Recommended");
// this one had no such gate. Removed VO so the comment's intent above
// actually holds.
const SIGNABLE_TYPES = new Set<string>(["SI", "DC", "CLAIM"]);

// Werner spec — high-stakes signs (contract amendment, claim
// determination) MUST require a PIN. The click-confirm fallback is
// allowed only for SI (lower stakes — contractual but no money). For
// these types, if the user hasn't set a PIN, we block signing and link
// them to the Security settings page.
//
// VO removed — VO no longer reaches this modal at all (SIGNABLE_TYPES
// above), so keeping it here would just be dead weight.
const HIGH_STAKES_SIGN_TYPES = new Set<string>(["DC", "CLAIM"]);

export function WernerTaskActions({
  taskType,
  entityId,
  riskLevel,
  isSigned,
  isLocked,
  originatorId,
  currentStatus,
  respondentId,
  brokerNotified,
  projectId,
  onChanged,
}: Props) {
  const { mutateAsync: postRequest } = usePost();
  const { data: currentUser } = useCurrentUser();
  // Resolve the user's role IN THIS PROJECT (e.g. ProjectTeamMember.role).
  // Sign & Issue depends on this — a user is often Project Manager on a
  // project but has no global User.role.code set.
  const projectIdNum = projectId != null && projectId !== "" ? Number(projectId) : null;
  const { data: effectivePerms } = useEffectivePermissions(projectIdNum);
  const [signOpen, setSignOpen] = useState(false);
  const [signMethod, setSignMethod] = useState<"pin" | "click-confirm">("click-confirm");
  const [pin, setPin] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [signing, setSigning] = useState(false);
  // Close-out modal state — mirrors the sign-and-issue pattern so the
  // two destructive actions feel consistent (Dialog + Cancel/Confirm).
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closing, setClosing] = useState(false);
  // HIGH-risk confirmation modal (replaces the browser confirm dialog
  // so it matches the app's design — same Dialog shell as Sign & Issue
  // and Close out).
  const [riskOpen, setRiskOpen] = useState(false);
  const [pendingRisk, setPendingRisk] = useState<"low" | "medium" | "high" | null>(null);
  const [settingRisk, setSettingRisk] = useState(false);
  // IC → Claim mitigation gate (Werner notes line 71). Contractor must
  // describe what they did to resolve the issue before escalating.
  const [mitigationOpen, setMitigationOpen] = useState(false);
  // The escalation awaiting confirmation (its target type), or null.
  const [escalateConfirm, setEscalateConfirm] = useState<string | null>(null);
  const [mitigationNotes, setMitigationNotes] = useState("");
  const [escalatingClaim, setEscalatingClaim] = useState(false);

  // Live, project-scoped permission lookup — the server's own codes.
  const has = (code?: string) => !!code && effectivePerms?.permissions?.[code] === true;

  // Escalation visibility per Werner spec:
  //   RFI → SI    : task.rfi.escalate_to_si
  //   SI  → VO    : task.si.escalate_to_vo
  //   IC  → Claim : task.ic.escalate_to_claim AND only the contractor who
  //                 filed the IC (raised_by) — an identity rule the backend
  //                 also enforces.
  const isIcRaiser = !!(
    originatorId && currentUser?.id && String(originatorId) === String(currentUser.id)
  );
  const rawEscalation = ESCALATION_TARGETS[taskType];
  const canEscalateFromHere =
    !rawEscalation ? false :
    taskType === "RFI" ? has("task.rfi.escalate_to_si") :
    taskType === "SI"  ? has("task.si.escalate_to_vo") :
    taskType === "IC"  ? (has("task.ic.escalate_to_claim") && isIcRaiser) :
    false;
  // Werner spec — escalation stays available while the doc is "live",
  // i.e. NOT in its terminal locked state. For SI that's anything before
  // Verified (so PM can still escalate to VO mid-flow if the contractor
  // flags cost/time impact). For VO/Claim, isLocked = signed_at, so the
  // behaviour matches the old `!isSigned` rule there. Backend rejects
  // out-of-state attempts too as a safety net.
  const escalation = canEscalateFromHere && !isLocked ? rawEscalation : undefined;

  // Sign & Issue: task.si.sign for SI, task.claim.sign for DC / Claim. VO
  // has its own dedicated signing surface (see SIGNABLE_TYPES above).
  const canSignThisType = has(SIGN_PERMISSION[taskType]);
  const showSignIssue = SIGNABLE_TYPES.has(taskType) && !isSigned && canSignThisType;

  // Risk pills on IC (Werner page 13): everyone may view the level, only
  // task.ic.manage_risk may change it — the interactive pills are hidden
  // otherwise.
  const canManageIcRisk = has("task.ic.manage_risk");
  const showRiskPills = taskType === "IC" && canManageIcRisk;

  // Resend broker email — visible on IC when:
  //   • Current risk is HIGH
  //   • The original broker email never went out (brokerNotified === false)
  //   • Viewer holds task.ic.manage_risk or is the respondent (mirrors backend gate)
  // Use case: PM rated HIGH while the respondent had no broker email
  // configured. Respondent later adds one in Settings → Security and
  // hits this button so their broker actually gets the notice.
  const isRespondent = !!(
    respondentId && currentUser?.id && String(respondentId) === String(currentUser.id)
  );
  const showResendBroker =
    taskType === "IC"
    && (riskLevel || "").toLowerCase() === "high"
    && brokerNotified === false
    && (canManageIcRisk || isRespondent);

  // ── Close-out button visibility ─────────────────────────────────────
  // Mirrors backend CloseOutView: the originator may always close their
  // own document; anyone else needs the type's close permission
  // (CLOSE_PERMISSION above). Hidden when already in a terminal state.
  const isOriginator = !!(
    originatorId && currentUser?.id && String(originatorId) === String(currentUser.id)
  );
  const TERMINAL_STATUSES = new Set([
    "Closed", "Verified", "EOT Awarded", "Escalated to Claim", "Approved",
  ]);
  const alreadyTerminal = !!currentStatus && TERMINAL_STATUSES.has(currentStatus);
  const closeCode = CLOSE_PERMISSION[taskType];
  const canCloseOut = !alreadyTerminal && !!closeCode && (isOriginator || has(closeCode));

  // Map frontend taskType to backend entity_type for the close-out POST.
  const closeOutEntityType =
    taskType === "DC" || taskType === "CLAIM" ? "claim" : taskType.toLowerCase();

  const openCloseModal = () => {
    setCloseReason("");
    setCloseOpen(true);
  };

  const handleCloseOut = async () => {
    setClosing(true);
    try {
      await postRequest({
        url: "tasks/close-out/",
        data: {
          entity_type: closeOutEntityType,
          entity_id: Number(entityId),
          reason: closeReason.trim(),
        },
      });
      toast.success(`${taskType} closed out.`);
      setCloseOpen(false);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to close out.");
    } finally {
      setClosing(false);
    }
  };

  // ── Escalation handler ──────────────────────────────────────────────
  // IC → Claim goes through a mitigation-notes modal first (Werner spec
  // requires evidence of mitigation efforts before formal escalation).
  // Every other escalation (RFI → SI, SI → VO) asks for confirmation: it
  // creates a new formal document and cannot be undone from here, and it
  // used to fire on the first click of a menu item (QA BUG-18).
  const handleEscalate = async (toType: string) => {
    if (taskType === "IC" && toType === "claim") {
      setMitigationNotes("");
      setMitigationOpen(true);
      return;
    }
    setEscalateConfirm(toType);
  };

  const runEscalate = async (toType: string, payload: Record<string, any>) => {
    setEscalatingClaim(true);
    try {
      const res = await postRequest({
        url: "tasks/chain-escalate/",
        data: {
          from_type: taskType.toLowerCase(),
          from_id: Number(entityId),
          to_type: toType,
          payload,
        },
      });
      toast.success(`Escalated to ${res?.display || toType.toUpperCase()}.`);
      setMitigationOpen(false);
      setEscalateConfirm(null);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to escalate.");
    } finally {
      setEscalatingClaim(false);
    }
  };

  const handleSubmitMitigation = () => {
    const notes = mitigationNotes.trim();
    if (notes.length < 20) {
      toast.error("Please describe the mitigation steps taken (at least 20 characters).");
      return;
    }
    void runEscalate("claim", { mitigation_notes: notes });
  };

  // ── Sign & Issue handlers ───────────────────────────────────────────
  // Werner spec — every signable doc type (SI / VO / DC / Claim) gates
  // on the same rule: if the user has a 4-digit signing PIN configured,
  // require it; otherwise fall back to a click-confirm checkbox. VO and
  // Claim are the highest-stakes docs (contract amendments, claim
  // determinations) — they MUST be capable of using the PIN gate just
  // like SI.
  //
  // Uses the dedicated GET endpoint rather than a verify-with-empty-PIN
  // trick — cleaner, no false-positive side effects.
  const openSignModal = async () => {
    try {
      const res = await postRequest({
        url: "tasks/signing-pin/verify/",
        data: { pin: "" },
      });
      // verify with empty PIN returns {valid:true, method:"click-confirm"}
      // when no PIN is set; {valid:false, method:"pin"} when one is. The
      // method field is the source of truth.
      setSignMethod(res?.method === "pin" ? "pin" : "click-confirm");
    } catch {
      setSignMethod("click-confirm");
    }
    setPin("");
    setConfirmed(false);
    setSignOpen(true);
  };

  const handleSign = async () => {
    if (signMethod === "pin" && !/^\d{4}$/.test(pin)) {
      toast.error("Enter your 4-digit PIN.");
      return;
    }
    if (signMethod === "click-confirm" && !confirmed) {
      toast.error("Tick the confirmation box to proceed.");
      return;
    }
    setSigning(true);
    try {
      const apiType =
        taskType === "DC" || taskType === "CLAIM" ? "claim" :
        taskType === "SI" ? "si" :
        taskType === "VO" ? "vo" : taskType.toLowerCase();
      await postRequest({
        url: "tasks/sign-and-issue/",
        data: {
          entity_type: apiType,
          entity_id: Number(entityId),
          pin: signMethod === "pin" ? pin : undefined,
          confirmed: signMethod === "click-confirm" ? true : undefined,
        },
        // A refused signature (wrong PIN, lock-out) is not an expired
        // session — never refresh the token and replay it.
        config: { skipAuthRefresh: true },
      });
      toast.success("Signed and issued.");
      setSignOpen(false);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Sign failed.");
    } finally {
      setSigning(false);
    }
  };

  // ── Risk level handler ──────────────────────────────────────────────
  // HIGH risk goes through a confirmation Dialog (same styling as the
  // Sign & Issue / Close-out modals). Low / Medium fire immediately.
  const handleRisk = (level: "low" | "medium" | "high") => {
    if (riskLevel === level) return;
    if (level === "high") {
      setPendingRisk("high");
      setRiskOpen(true);
      return;
    }
    void persistRisk(level);
  };

  // ── Resend broker email handler ─────────────────────────────────────
  const [resendingBroker, setResendingBroker] = useState(false);
  const handleResendBroker = async () => {
    setResendingBroker(true);
    try {
      await postRequest({
        url: `tasks/intentions-to-claim/${entityId}/resend-broker-email/`,
        data: {},
      });
      toast.success("Broker has been emailed.");
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not resend broker email.");
    } finally {
      setResendingBroker(false);
    }
  };

  const persistRisk = async (level: "low" | "medium" | "high") => {
    setSettingRisk(true);
    try {
      await postRequest({
        url: `tasks/intentions-to-claim/${entityId}/set-risk-level/`,
        data: { risk_level: level },
      });
      toast.success(`Risk set to ${level.charAt(0).toUpperCase() + level.slice(1)}.`);
      setRiskOpen(false);
      setPendingRisk(null);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to set risk level.");
    } finally {
      setSettingRisk(false);
    }
  };

  if (!escalation && !showSignIssue && !showRiskPills && !canCloseOut && !showResendBroker) return null;

  return (
    <>
      {/* Risk pills row — sits ABOVE the existing button row, looks like
          the rest of the page's pill chips. */}
      {showRiskPills && (
        <div className="flex items-center gap-2 mr-3">
          <span className="text-xs text-muted-foreground">PM risk:</span>
          {(["low", "medium", "high"] as const).map((lvl) => {
            const isActive = riskLevel === lvl;
            const colour = lvl === "high" ? "red" : lvl === "medium" ? "amber" : "green";
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleRisk(lvl)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  isActive
                    ? `bg-${colour}-600 text-white border-${colour}-600`
                    : `bg-card text-${colour}-700 border-${colour}-300 hover:bg-${colour}-50`,
                )}
              >
                {lvl[0].toUpperCase() + lvl.slice(1)}
              </button>
            );
          })}
        </div>
      )}

      {/* Resend broker email — visible when IC is HIGH but the broker
          email never went out (e.g. no broker email was configured at
          rating time). Once the broker gets emailed, the button hides. */}
      {showResendBroker && (
        <Button
          variant="outline"
          className="font-normal text-amber-700 border-amber-300 hover:bg-amber-50"
          onClick={handleResendBroker}
          disabled={resendingBroker}
        >
          {resendingBroker ? "Sending…" : "Resend broker email"}
        </Button>
      )}

      {/* + Action escalation button — solid purple per Werner page 3 */}
      {escalation && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="font-normal bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-1" />
              Action
              <ChevronDown className="ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleEscalate(escalation.type)}>
              Escalate to {escalation.label}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Sign & Issue button */}
      {showSignIssue && (
        <Button
          variant="outline"
          className="font-normal text-green-700 border-green-300 hover:bg-green-50"
          onClick={openSignModal}
        >
          <ShieldCheck className="mr-1" />
          Sign &amp; Issue
        </Button>
      )}

      {/* Close-out button — gated per-task-type by canCloseOut above.
          Werner spec: GI = originator only; SI = professional;
          VO = PM; RFI/IC/Claim = contractor or originator.
          Matches Sign & Issue's outline/icon style, but slate-toned
          so it reads as "wrap up" rather than "approve". */}
      {canCloseOut && (
        <Button
          variant="outline"
          className="font-normal text-gray-700 border-border hover:bg-muted/50"
          onClick={openCloseModal}
        >
          <Lock className="mr-1" />
          Close out
        </Button>
      )}

      {/* Sign & Issue modal */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Sign &amp; Issue</DialogTitle>
            <DialogDescription>
              By signing, you confirm responsibility for this document.
              Once issued, it cannot be edited.
            </DialogDescription>
          </DialogHeader>

          {/* Werner spec — block high-stakes signs without a PIN. */}
          {signMethod === "click-confirm" && HIGH_STAKES_SIGN_TYPES.has(taskType) ? (
            <div className="py-2">
              <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-2 text-amber-900">
                  <p className="font-normal">A signing PIN is required to sign this document.</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {taskType === "VO" ? "Variation Orders" : "Claims"} are binding contractual
                    instructions and must be signed with a 4-digit PIN. Set one up to continue.
                  </p>
                  <Link
                    to="/settings/security"
                    onClick={() => setSignOpen(false)}
                    className="inline-block text-xs font-normal text-amber-900 underline hover:text-amber-700 mt-1"
                  >
                    Set up signing PIN →
                  </Link>
                </div>
              </div>
            </div>
          ) : signMethod === "pin" ? (
            <div className="py-2">
              <label className="text-sm text-foreground block mb-2">
                Enter your 4-digit signing PIN:
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full border border-border rounded-md px-3 py-2 text-lg tracking-[0.5em] text-center font-mono"
                placeholder="••••"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                Set or change your PIN in Settings → Security.
              </p>
            </div>
          ) : (
            <div className="py-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-foreground">
                  I confirm I am signing this document.
                </span>
              </label>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Set a 4-digit PIN in Settings → Security to require it on every signing.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)} disabled={signing}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-600/40 disabled:cursor-not-allowed"
              disabled={
                signing
                || (signMethod === "click-confirm" && HIGH_STAKES_SIGN_TYPES.has(taskType))
                || (signMethod === "pin" && !/^\d{4}$/.test(pin))
                || (signMethod === "click-confirm" && !confirmed)
              }
              onClick={handleSign}
            >
              {signing ? "Signing…" : "Sign & Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HIGH-risk confirmation — same Dialog shell as Sign & Issue
          and Close out. Replaces the browser-native confirm dialog so
          the warning matches the rest of the app. */}
      <Dialog open={riskOpen} onOpenChange={(o) => { if (!settingRisk) setRiskOpen(o); }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Set risk to HIGH</DialogTitle>
            <DialogDescription>
              Rating this Intention to Claim as HIGH triggers an automated
              email to the respondent professional's insurance broker so
              they can advise mitigation steps early.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1 text-amber-900">
                <p className="font-normal">This action sends an email.</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  If no broker is configured on the respondent's profile,
                  they receive an in-app reminder to add one instead.
                  The email fires at most once per Intention to Claim.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRiskOpen(false)}
              disabled={settingRisk}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white disabled:bg-red-600/40 disabled:cursor-not-allowed"
              disabled={settingRisk}
              onClick={() => pendingRisk && persistRisk(pendingRisk)}
            >
              {settingRisk ? "Setting…" : "Set HIGH risk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IC → Claim mitigation gate — Werner notes line 71. Contractor
          must describe the mitigation steps taken before lodging the
          formal Claim. Same Dialog shell as the other action modals. */}
      <Dialog
        open={mitigationOpen}
        onOpenChange={(o) => { if (!escalatingClaim) setMitigationOpen(o); }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Escalate to formal Claim</DialogTitle>
            <DialogDescription>
              Before escalating to a formal Claim, briefly describe the
              steps you've taken to try to resolve this issue. Your note
              will be saved to the audit trail on both this Intention to
              Claim and the new Claim.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-sm text-foreground block mb-2">
              Mitigation steps taken
            </label>
            <textarea
              value={mitigationNotes}
              onChange={(e) => setMitigationNotes(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Issued RFI-018 on 2026-04-12, followed up by email on the 19th and 26th. Met on-site with the architect on the 30th. No drawing revisions received by the contractual deadline."
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                At least 20 characters — describe the actual steps, not a placeholder.
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {mitigationNotes.trim().length} chars
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMitigationOpen(false)}
              disabled={escalatingClaim}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white disabled:bg-primary/40 disabled:cursor-not-allowed"
              disabled={escalatingClaim || mitigationNotes.trim().length < 20}
              onClick={handleSubmitMitigation}
            >
              {escalatingClaim ? "Escalating…" : "Escalate to Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalation confirm (RFI → SI, SI → VO) — same Dialog shell. */}
      <Dialog
        open={escalateConfirm !== null}
        onOpenChange={(o) => { if (!o && !escalatingClaim) setEscalateConfirm(null); }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Escalate to {escalation?.label ?? escalateConfirm?.toUpperCase()}?</DialogTitle>
            <DialogDescription>
              This raises a new {escalation?.label ?? escalateConfirm?.toUpperCase()} linked to this{" "}
              {taskType}, and records the escalation on both. It cannot be undone from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateConfirm(null)} disabled={escalatingClaim}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white disabled:bg-primary/40 disabled:cursor-not-allowed"
              disabled={escalatingClaim}
              onClick={() => { if (escalateConfirm) void runEscalate(escalateConfirm, {}); }}
            >
              {escalatingClaim ? "Escalating…" : `Escalate to ${escalation?.label ?? escalateConfirm?.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close-out modal — same Dialog shell as Sign & Issue so the
          two final actions feel consistent. Optional reason for the
          audit trail; backend stores it on the close-out audit row. */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Close out {taskType}</DialogTitle>
            <DialogDescription>
              This marks the document as complete. It moves to the
              Done column on the task board and the status is locked.
              The action is recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-sm text-foreground block mb-2">
              Reason (optional)
            </label>
            <textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Resolved in discussion with the structural engineer."
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Adds context to the audit log — visible to everyone with
              access to this document.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={closing}>
              Cancel
            </Button>
            <Button
              className="bg-gray-700 hover:bg-gray-800 text-white disabled:bg-gray-700/40 disabled:cursor-not-allowed"
              disabled={closing}
              onClick={handleCloseOut}
            >
              {closing ? "Closing…" : "Close out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
