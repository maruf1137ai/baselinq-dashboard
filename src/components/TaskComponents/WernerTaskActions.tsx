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
import { ChevronDown, Plus, ShieldCheck } from "lucide-react";
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
import { cn } from "@/lib/utils";

type TaskType = "RFI" | "SI" | "VO" | "GI" | "IC" | "DC" | "CLAIM" | "CRITICALPATHITEM" | string;

// Werner rev H — role buckets used to gate every action below. Match the
// backend's role-code sets in views_werner.py / views_signing.py so the
// frontend hides what the backend would reject anyway.
const CONTRACTOR_ROLES = new Set(["CONTRACTS_MGR", "CM", "FOREMAN", "SS", "CONTRACTOR"]);
const PROFESSIONAL_ROLES = new Set([
  "ARCH", "STRUCT_ENG", "MECH_ENG", "ELEC_ENG", "CIVIL_ENG",
  "QS", "CQS", "PM", "CPM", "PRINCIPAL_PM", "PRINCIPAL_AGENT", "PA",
]);
const PM_ROLES = new Set(["PM", "CPM", "PRINCIPAL_PM", "PRINCIPAL_AGENT", "PA"]);

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
  /** Refetch the task after a state change. */
  onChanged: () => void | Promise<void>;
}

const ESCALATION_TARGETS: Partial<Record<TaskType, { type: string; label: string }>> = {
  RFI: { type: "si", label: "Site Instruction" },
  SI: { type: "vo", label: "Variation Order" },
  IC: { type: "claim", label: "Claim" },
};

const SIGNABLE_TYPES = new Set<string>(["SI", "VO", "DC", "CLAIM"]);

export function WernerTaskActions({
  taskType,
  entityId,
  riskLevel,
  isSigned,
  onChanged,
}: Props) {
  const { mutateAsync: postRequest } = usePost();
  const { data: currentUser } = useCurrentUser();
  const [signOpen, setSignOpen] = useState(false);
  const [signMethod, setSignMethod] = useState<"pin" | "click-confirm">("click-confirm");
  const [pin, setPin] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [signing, setSigning] = useState(false);

  // Werner rev H — derive the current user's role bucket once.
  const userRoleCode = (currentUser?.role?.code || "").toUpperCase();
  const isContractor = CONTRACTOR_ROLES.has(userRoleCode);
  const isProfessional = PROFESSIONAL_ROLES.has(userRoleCode);
  const isPM = PM_ROLES.has(userRoleCode);

  // Escalation visibility per Werner spec:
  //   RFI → SI : professional only (architects, engineers, PMs)
  //   SI  → VO : PM / Principal Agent only
  //   IC  → Claim : the contractor who filed the IC (backend also enforces raised_by match)
  // Anyone else shouldn't see the menu entry at all so they don't even
  // attempt the action (backend still rejects with 403 as a safety net).
  const rawEscalation = ESCALATION_TARGETS[taskType];
  const canEscalateFromHere =
    !rawEscalation ? false :
    taskType === "RFI" ? isProfessional :
    taskType === "SI"  ? isPM :
    taskType === "IC"  ? isContractor :
    false;
  const escalation = canEscalateFromHere ? rawEscalation : undefined;

  // Sign & Issue per Werner spec: SI=Architect/Engineer, VO/Claim=PM.
  const canSignThisType =
    taskType === "SI"    ? isProfessional :
    taskType === "VO"    ? isPM :
    taskType === "DC"    ? isPM :
    taskType === "CLAIM" ? isPM :
    false;
  const showSignIssue = SIGNABLE_TYPES.has(taskType) && !isSigned && canSignThisType;

  // Risk pills on IC are PM-set per Werner page 13. Contractors and
  // other professionals can VIEW the pills (read-only) but only PMs
  // can change. We hide the interactive pills entirely for non-PMs.
  const showRiskPills = taskType === "IC" && isPM;

  // ── Escalation handler ──────────────────────────────────────────────
  const handleEscalate = async (toType: string) => {
    try {
      const res = await postRequest({
        url: "tasks/chain-escalate/",
        data: {
          from_type: taskType.toLowerCase(),
          from_id: Number(entityId),
          to_type: toType,
          payload: {},
        },
      });
      toast.success(`Escalated to ${res?.display || toType.toUpperCase()}.`);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to escalate.");
    }
  };

  // ── Sign & Issue handlers ───────────────────────────────────────────
  // Werner rev H p.19-20: SI requires a pass key (PIN); VO and Claim use
  // click-confirm. We only fall back to click-confirm on SI when the
  // user hasn't set up a PIN yet — better UX than blocking the workflow.
  const openSignModal = async () => {
    if (taskType === "SI") {
      try {
        const res = await postRequest({
          url: "tasks/signing-pin/verify/",
          data: { pin: "" },
        });
        setSignMethod(res?.method === "pin" ? "pin" : "click-confirm");
      } catch {
        setSignMethod("click-confirm");
      }
    } else {
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
  const handleRisk = async (level: "low" | "medium" | "high") => {
    if (riskLevel === level) return;
    if (level === "high") {
      const ok = window.confirm(
        "Setting this Intention to Claim to HIGH will email the "
          + "respondent's insurance broker. Continue?",
      );
      if (!ok) return;
    }
    try {
      await postRequest({
        url: `tasks/intentions-to-claim/${entityId}/set-risk-level/`,
        data: { risk_level: level },
      });
      toast.success(`Risk set to ${level.charAt(0).toUpperCase() + level.slice(1)}.`);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to set risk level.");
    }
  };

  if (!escalation && !showSignIssue && !showRiskPills) return null;

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
                    : `bg-white text-${colour}-700 border-${colour}-300 hover:bg-${colour}-50`,
                )}
              >
                {lvl[0].toUpperCase() + lvl.slice(1)}
              </button>
            );
          })}
        </div>
      )}

      {/* + Action escalation button — solid purple per Werner page 3 */}
      {escalation && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="font-normal bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Action
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
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
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          Sign &amp; Issue
        </Button>
      )}

      {/* Sign & Issue modal */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign &amp; Issue</DialogTitle>
            <DialogDescription>
              By signing, you confirm responsibility for this document.
              Once issued, it cannot be edited.
            </DialogDescription>
          </DialogHeader>

          {signMethod === "pin" ? (
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
                Set or change your PIN in Settings → Profile.
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
                Set a 4-digit PIN in Settings → Profile to require it on every signing.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)} disabled={signing}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={signing}
              onClick={handleSign}
            >
              {signing ? "Signing…" : "Sign & Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
