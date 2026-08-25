import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDate as formatDateCanonical } from "@/lib/dateUtils";
import useFetch from "@/hooks/useFetch";
import { postData, deleteData } from "@/lib/Api";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import {
  AlertTriangle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatZAR } from '@/lib/formatCurrency';
import { EmptyState } from "@/components/ui/empty-state";
import { pageContaining } from "@/lib/deepLink";
import { UnreadNotificationBadge } from "@/components/commons/UnreadNotificationBadge";
import type { Notification } from "@/types/notification";

export interface PCEntry {
  id: number;
  projectId: number;
  pcNumber: string;
  period: string;
  claimAmount: number;
  retentionAmount: number;
  netAmount: number;
  approvalStatus: string;
  workflowState?: string;
  createdAt: string;
  updatedAt: string;
  // ── Server-computed fields ────────────────────────────────────────────────
  // The API returns these and nothing in the app read any of them. The
  // operator signs off the total payable, not the net, and a certificate that
  // takes the project past its contract sum is accepted *with a warning* —
  // which rendered as an ordinary row indistinguishable from a clean one.
  /** VAT the server calculated at the project's own rate. */
  vatAmount?: number;
  /** What is actually payable — the figure being certified. */
  totalPayable?: number;
  /** False when the stored figures are as submitted rather than recomputed. */
  serverComputed?: boolean;
  /** Accepted, but flagged. Never hidden. */
  integrityWarnings?: string[];
  /**
   * What THIS user may do next — server-filtered (permission + creator
   * exclusion, see tasks/pc_workflow.py). The row and the details dialog
   * render one button per entry here; nothing is derived from role client-side.
   */
  availableTransitions?: string[];
  /** Hard-delete (Draft-only, creator-only) — see tasks/pc_workflow.may_delete_payment_certificate. */
  canDelete?: boolean;
  // ── Who / when ─────────────────────────────────────────────────────────────
  /** Name of the certificate's creator. Null for legacy rows written before this was tracked. */
  createdBy?: string | null;
  /** When the Designated Principal Agent certified this — set only once Approved/Posted. */
  approvedAt?: string | null;
  /** Name of whoever approved (certified) it. */
  approvedBy?: string | null;
  // ── Financial build-up (the same figures createPCDrawer.tsx's Financial
  // Summary computes from, frozen at the state they were when certified) ────
  materialsOnSite?: number;
  penalties?: number;
  advanceRecovery?: number;
  retentionRelease?: number;
  /** String, e.g. "5.00" — the rate frozen onto this certificate, not the project's current one. */
  retentionRatePct?: string | null;
  vatRatePct?: string | null;
  retentionApplies?: boolean;
  workItems?: { thisPeriod: number }[];
  voItems?: { thisPeriod: number; included: boolean }[];
}

/** Server fields also arrive snake_cased depending on the endpoint. */
const serverNumber = (entry: PCEntry, camel: string, snake: string): number | null => {
  const v = (entry as any)[camel] ?? (entry as any)[snake];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

const warningsOf = (entry: PCEntry): string[] => {
  const raw = entry.integrityWarnings ?? (entry as any).integrity_warnings;
  return Array.isArray(raw) ? raw.filter((w) => typeof w === "string" && w.trim()) : [];
};

const isServerComputed = (entry: PCEntry): boolean | null => {
  const v = entry.serverComputed ?? (entry as any).server_computed;
  return typeof v === "boolean" ? v : null;
};

const money = (v: number | null) => (v === null ? "—" : formatZAR(v));

// Human labels for the certification-chain transitions the backend exposes
// (tasks/views_pc_workflow.py) — certification is a single Designated
// Principal Agent act (submit/approve), not the old two-stage
// QS-approve/client-approve ladder. Approving is now also the commercial
// moment that accrues the platform fee: it chains straight through to
// posting under the same actor, server-side. There is no "post" action here
// at all any more — Client/Owner/CPM/Admin have no role anywhere in the
// certificate lifecycle. The backend never includes "post" in
// availableTransitions or waitingOn (the route itself was removed), so there
// is nothing for this map to render a button for.
const TRANSITION_LABELS: Record<string, string> = {
  submit: "Submit for Certification",
  approve: "Approve",
  reject: "Reject",
  cancel: "Cancel",
};

const TRANSITION_URL_PATH: Record<string, string> = {
  submit: "submit",
  approve: "approve",
  reject: "reject",
  cancel: "cancel",
};

/** Short label for the inline row/modal buttons — TRANSITION_LABELS above is
 *  the fuller phrasing used in toasts and the ReasonDialog title. */
const TRANSITION_BUTTON_LABELS: Record<string, string> = {
  submit: "Submit",
  approve: "Approve",
  reject: "Reject",
  cancel: "Cancel",
};

const TRANSITION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  submit: Send,
  approve: CheckCircle2,
  reject: XCircle,
  cancel: Ban,
};

/** submit/approve read as the positive, forward action; reject/cancel are
 *  destructive and terminal — same distinction ReasonDialog already draws. */
const isPositiveTransition = (t: string) => t === "submit" || t === "approve";

/** How the "waiting on" popover phrases each ladder stage — shorter and
 *  read as a noun phrase ("Waiting on: Approval"), unlike TRANSITION_LABELS
 *  above which reads as a button ("Approve"). */
const WAITING_ON_STAGE_LABEL: Record<string, string> = {
  approve: "Approval (Principal Agent)",
};

interface WaitingOnActor {
  id: number;
  name: string | null;
}

interface WaitingOnChainStep {
  role: string;
  roleLabel: string;
  eligibleActors: WaitingOnActor[];
}

type WaitingOn =
  | { mode: "chain"; steps: WaitingOnChainStep[] }
  | { mode: "ladder"; transition: string; eligibleActors: WaitingOnActor[] }
  | null
  | undefined;

interface WorkflowResponse {
  availableTransitions: string[];
  workflowState: string;
  waitingOn: WaitingOn;
}

interface PaymentCertificateTableProps {
  orders: PCEntry[];
  /** Owned by the parent's FinanceToolbar — the table renders no chrome. */
  search: string;
  /** Id of the certificate whose details are open, or null for none.
   *
   *  Lifted out of the row so that clicking a PC number and following a
   *  `/finance?tab=Payment Certificates&pc=…` link drive the SAME state
   *  instead of two dialogs that can disagree about what is selected. */
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
  unreadByPcId?: Record<string, Notification[]>;
}

const PAGE_SIZE = 10;

const formatCurrency = formatZAR;

const formatDate = (iso: string) => formatDateCanonical(iso, "short", "—");

// Status colour comes from the Badge primitive's semantic variants rather
// than a local colour map, so a certified/pending/rejected chip here is the
// same chip as everywhere else in the app.
//
// Reads workflowState (the certification chain's real state), not the legacy
// approvalStatus label. approvalStatus is written once at creation
// ("pending") and only partially kept in step by the ladder (see
// pc_workflow._LEGACY_STATUS_MAP) — a certificate could sit at "Pending" for
// its entire life, or show as "Draft" while genuinely APPROVED, because
// that state has no legacy equivalent. workflowState is the one field every
// transition actually stamps.
const WORKFLOW_STATE_BADGE: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  draft: { variant: "neutral", label: "Draft" },
  submitted: { variant: "warning", label: "Submitted" },
  approved: { variant: "warning", label: "Approved" },
  posted: { variant: "success", label: "Posted" },
  rejected: { variant: "danger", label: "Rejected" },
  cancelled: { variant: "neutral", label: "Cancelled" },
};

const ApprovalBadge = ({ workflowState }: { workflowState?: string }) => {
  const c = (workflowState && WORKFLOW_STATE_BADGE[workflowState]) || WORKFLOW_STATE_BADGE.draft;
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

/** Content of the "waiting on" popover opened from the Approvals badge. */
const WaitingOnContent = ({
  waitingOn,
  isLoading,
}: {
  waitingOn: WaitingOn;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking who can act…
      </div>
    );
  }
  if (!waitingOn) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is currently pending on this certificate.
      </p>
    );
  }

  const groups =
    waitingOn.mode === "chain"
      ? waitingOn.steps.map((s) => ({ label: s.roleLabel, actors: s.eligibleActors }))
      : [
          {
            label:
              WAITING_ON_STAGE_LABEL[waitingOn.transition] ||
              TRANSITION_LABELS[waitingOn.transition] ||
              waitingOn.transition,
            actors: waitingOn.eligibleActors,
          },
        ];

  return (
    <div className="space-y-3">
      {groups.map((g, i) => (
        <div key={i}>
          <p className="text-sm font-medium text-foreground">Waiting on: {g.label}</p>
          {g.actors.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-1">
              Nobody on this project currently holds this role — the certificate is
              held until someone does.
            </p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {g.actors.map((a) => (
                <li key={a.id} className="text-sm text-muted-foreground">
                  {a.name || `User #${a.id}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

// Reject and Cancel are the two transitions the backend requires a reason
// for (views_pc_workflow.py's require_reason=True) — both are terminal, and
// both close the certificate's live approval chain. What they mean is not
// the same act, though: Reject is the certifier's-side judgement on the
// claim itself ("I decline to certify this"), Cancel is the raising side
// withdrawing its own submission ("we're pulling this back"). The copy here
// says so, rather than presenting an identical dialog for two different
// decisions.
const REASON_TRANSITION_COPY: Record<string, { description: string; placeholder: string; confirmLabel: string }> = {
  reject: {
    description:
      "Rejecting is terminal — a fresh certificate is raised rather than reopening this one. The contractor is entitled to know the grounds.",
    placeholder: "e.g. Quantities on line 3 don't match the site measure…",
    confirmLabel: "Confirm Reject",
  },
  cancel: {
    description:
      "Cancelling withdraws this certificate on behalf of whoever raised it. This is terminal and cannot be undone.",
    placeholder: "e.g. Raised against the wrong valuation period, refiling…",
    confirmLabel: "Confirm Cancel",
  },
};

const ReasonDialog = ({
  entry,
  transition,
  reason,
  onReasonChange,
  isSubmitting,
  onConfirm,
  onOpenChange,
}: {
  entry: PCEntry;
  transition: string | null;
  reason: string;
  onReasonChange: (value: string) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) => {
  const copy = transition ? REASON_TRANSITION_COPY[transition] : null;
  return (
    <Dialog open={transition !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {transition ? TRANSITION_LABELS[transition] : ""} {entry.pcNumber}?
          </DialogTitle>
          <DialogDescription>{copy?.description}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-1.5">
          <label htmlFor={`reason-${entry.id}`} className="text-sm font-medium text-foreground">
            Reason <span className="text-muted-foreground font-normal">(required)</span>
          </label>
          <Textarea
            id={`reason-${entry.id}`}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={copy?.placeholder}
            rows={3}
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button className="h-10 px-4 border border-border rounded-lg text-sm text-foreground bg-card hover:bg-muted/50 transition-colors">
              Cancel
            </button>
          </DialogClose>
          <button
            onClick={onConfirm}
            disabled={!reason.trim() || isSubmitting}
            className="h-10 px-4 rounded-lg text-sm text-destructive-foreground bg-destructive hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {copy?.confirmLabel ?? "Confirm"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteConfirmDialog = ({
  entry,
  open,
  onOpenChange,
  isDeleting,
  onConfirm,
}: {
  entry: PCEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onConfirm: () => void;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {entry.pcNumber}?</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently deletes the draft certificate — unlike Cancel, it leaves nothing behind
          to audit. This cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={isDeleting}
          className="bg-destructive hover:opacity-90 focus:ring-destructive"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/**
 * One primary button — whichever of Submit/Approve applies, the "forward"
 * action (see isPositiveTransition) — plus a "..." menu for everything else
 * this user may do (Reject/Cancel, Delete, and optionally View Details).
 * Shared between the row's Actions cell and the details dialog's footer, so
 * both surfaces have the same shape and act through the same handlers.
 */
const ActionButtons = ({
  entry,
  actingOn,
  onTransitionClick,
  onDeleteClick,
  onViewDetails,
}: {
  entry: PCEntry;
  actingOn: string | null;
  onTransitionClick: (transition: string) => void;
  onDeleteClick: () => void;
  /** Omit when rendering inside the details dialog itself — nothing to view-details *to*. */
  onViewDetails?: () => void;
}) => {
  const transitions = entry.availableTransitions ?? [];
  const primary = transitions.find(isPositiveTransition) ?? null;
  const rest = transitions.filter((t) => t !== primary);
  const PrimaryIcon = primary ? TRANSITION_ICONS[primary] ?? Send : null;
  const isEmpty = !onViewDetails && rest.length === 0 && !entry.canDelete;

  return (
    <div className="flex items-center gap-1">
      {primary && (
        <button
          type="button"
          disabled={actingOn !== null}
          onClick={() => onTransitionClick(primary)}
          className="h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 bg-primary text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actingOn === primary ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            PrimaryIcon && <PrimaryIcon className="h-3.5 w-3.5" />
          )}
          {TRANSITION_BUTTON_LABELS[primary] || primary}
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="More actions"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end">
          {onViewDetails && (
            <DropdownMenuItem onSelect={onViewDetails}>View Details</DropdownMenuItem>
          )}
          {onViewDetails && (rest.length > 0 || entry.canDelete) && <DropdownMenuSeparator />}
          {rest.map((t) => (
            <DropdownMenuItem
              key={t}
              disabled={actingOn !== null}
              onSelect={(e) => {
                e.preventDefault();
                onTransitionClick(t);
              }}
              className="text-destructive"
            >
              {actingOn === t ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> {TRANSITION_LABELS[t]}…
                </span>
              ) : (
                TRANSITION_LABELS[t] || t
              )}
            </DropdownMenuItem>
          ))}
          {entry.canDelete && (
            <DropdownMenuItem
              disabled={actingOn !== null}
              onSelect={(e) => {
                e.preventDefault();
                onDeleteClick();
              }}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          )}
          {isEmpty && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No further actions available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/**
 * Every applicable button shown at once, no "..." — unlike the row (tight on
 * horizontal space), the details dialog is already the "see everything"
 * surface, so nothing needs to stay hidden behind a menu here.
 */
const ModalActionButtons = ({
  entry,
  actingOn,
  onTransitionClick,
  onDeleteClick,
}: {
  entry: PCEntry;
  actingOn: string | null;
  onTransitionClick: (transition: string) => void;
  onDeleteClick: () => void;
}) => {
  const transitions = entry.availableTransitions ?? [];
  if (transitions.length === 0 && !entry.canDelete) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {transitions.map((t) => {
        const Icon = TRANSITION_ICONS[t] ?? Send;
        const positive = isPositiveTransition(t);
        return (
          <button
            key={t}
            type="button"
            disabled={actingOn !== null}
            onClick={() => onTransitionClick(t)}
            className={`h-9 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              positive
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "border border-destructive/30 text-destructive hover:bg-destructive/10"
            }`}
          >
            {actingOn === t ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {TRANSITION_BUTTON_LABELS[t] || t}
          </button>
        );
      })}
      {entry.canDelete && (
        <button
          type="button"
          disabled={actingOn !== null}
          onClick={onDeleteClick}
          className="h-9 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      )}
    </div>
  );
};

/** Read-only mirror of createPCDrawer.tsx's SummaryLine — same look, no editable inputs. */
const SummaryLine = ({
  label,
  value,
  bold,
  deduction,
  addition,
  indent,
  border,
  doubleBorder,
  pending,
}: {
  label: string;
  value: number;
  bold?: boolean;
  deduction?: boolean;
  addition?: boolean;
  indent?: boolean;
  border?: boolean;
  doubleBorder?: boolean;
  /** Renders "—" instead of a figure — a pre-integrity-check certificate has no computed VAT/total yet. */
  pending?: boolean;
}) => (
  <div
    className={`flex justify-between items-center py-2 ${
      doubleBorder ? "border-t-2 border-foreground mt-3 pt-3" : border ? "border-t border-border mt-2 pt-3" : ""
    } ${indent ? "pl-4" : ""}`}
  >
    <span className={`text-sm ${bold ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    <span
      className={`text-sm tabular-nums ${
        deduction ? "text-red-500" : addition ? "text-green-600" : "text-foreground"
      }`}
    >
      {pending
        ? "—"
        : deduction
          ? `- ${formatCurrency(value)}`
          : addition
            ? `+ ${formatCurrency(value)}`
            : formatCurrency(value)}
    </span>
  </div>
);

/**
 * The same build-up createPCDrawer.tsx's live "Financial Summary" computes
 * while a certificate is being drafted (see its `calc` useMemo) — reproduced
 * here from the certificate's own FROZEN figures once it exists, so a
 * historical certificate reads the same way it did the day it was raised,
 * regardless of the project's rates today.
 */
const financialBuildUp = (entry: PCEntry) => {
  const grossWorkValue = (entry.workItems ?? []).reduce((s, i) => s + (i.thisPeriod || 0), 0);
  const voThisPeriod = (entry.voItems ?? [])
    .filter((v) => v.included)
    .reduce((s, v) => s + (v.thisPeriod || 0), 0);
  const materialsOnSite = entry.materialsOnSite ?? 0;
  const grossValuation = grossWorkValue + voThisPeriod + materialsOnSite;
  const penalties = entry.penalties ?? 0;
  const advanceRecovery = entry.advanceRecovery ?? 0;
  return { grossWorkValue, voThisPeriod, materialsOnSite, grossValuation, penalties, advanceRecovery };
};

const PCDetailsDialog = ({
  entry,
  open,
  onOpenChange,
  actingOn,
  onTransitionClick,
  onDeleteClick,
}: {
  entry: PCEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actingOn: string | null;
  onTransitionClick: (transition: string) => void;
  onDeleteClick: () => void;
}) => {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Details for {entry.pcNumber}</DialogTitle>
            <DialogDescription>Period: {entry.period}</DialogDescription>
          </DialogHeader>

          {/* Who / when — creation is always known; certification only once it's happened. */}
          <div className="mt-3 space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {(entry.workflowState && WORKFLOW_STATE_BADGE[entry.workflowState]?.label) || entry.approvalStatus}
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span>{" "}
              {entry.createdBy ? `${entry.createdBy} — ` : ""}
              {formatDate(entry.createdAt)}
            </p>
            {entry.approvedAt && (
              <p>
                <span className="text-muted-foreground">Approved:</span>{" "}
                {entry.approvedBy ? `${entry.approvedBy} — ` : ""}
                {formatDate(entry.approvedAt)}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Updated:</span> {formatDate(entry.updatedAt)}
            </p>
          </div>

          {/* Financial Summary — same build-up createPCDrawer.tsx shows while
              drafting, reproduced from this certificate's own frozen figures. */}
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Financial Summary
            </p>
            <div className="bg-muted rounded-lg border border-border px-5 py-4">
              {(() => {
                const b = financialBuildUp(entry);
                const vat = serverNumber(entry, "vatAmount", "vat_amount");
                const totalPayable = serverNumber(entry, "totalPayable", "total_payable");
                const hasAdjustment = b.penalties > 0 || b.advanceRecovery > 0;
                return (
                  <>
                    <SummaryLine label="Gross Work Value" value={b.grossWorkValue} />
                    <SummaryLine
                      label="Plus: Variation Orders (this period)"
                      value={b.voThisPeriod}
                      indent
                      addition
                    />
                    <SummaryLine label="Plus: Materials on Site" value={b.materialsOnSite} indent addition />
                    <SummaryLine label="Gross Valuation" value={b.grossValuation} bold border />

                    {b.penalties > 0 && (
                      <SummaryLine label="Less: Contractual Penalties" value={b.penalties} indent deduction />
                    )}
                    {b.advanceRecovery > 0 && (
                      <SummaryLine
                        label="Less: Advance Payment Recovery"
                        value={b.advanceRecovery}
                        indent
                        deduction
                      />
                    )}

                    <SummaryLine
                      label="Net Valuation This Period (Claim)"
                      value={entry.claimAmount}
                      bold
                      border={hasAdjustment}
                    />

                    <SummaryLine
                      label={
                        entry.retentionApplies === false
                          ? "Less: Retention (not applied)"
                          : entry.retentionRatePct
                            ? `Less: Retention @ ${entry.retentionRatePct}%`
                            : "Less: Retention"
                      }
                      value={entry.retentionAmount}
                      deduction
                      border
                    />
                    {(entry.retentionRelease ?? 0) > 0 && (
                      <SummaryLine label="Plus: Retention Release" value={entry.retentionRelease ?? 0} addition />
                    )}

                    <SummaryLine label="Subtotal (ex VAT)" value={entry.netAmount} bold border />
                    <SummaryLine
                      label={entry.vatRatePct ? `Plus: VAT @ ${entry.vatRatePct}%` : "Plus: VAT"}
                      value={vat ?? 0}
                      pending={vat === null}
                      indent
                      addition
                    />

                    <div className="border-t-2 border-foreground mt-3 pt-4 flex justify-between items-center">
                      <span className="text-sm text-foreground">Amount Due to Contractor</span>
                      <span className="text-sm font-medium text-primary tabular-nums">
                        {totalPayable === null ? "—" : formatCurrency(totalPayable)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
            {isServerComputed(entry) === false && (
              <p className="text-amber-700 text-sm mt-2">
                These figures were stored as submitted — the server did not
                recompute them from the project's retention and VAT rates.
              </p>
            )}
          </div>

          {warningsOf(entry).length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Accepted with warnings
              </p>
              <ul className="mt-1.5 space-y-1">
                {warningsOf(entry).map((w, i) => (
                  <li key={i} className="text-sm text-amber-700">{w}</li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-1.5">
            <DialogClose asChild>
              <button className="h-10 px-4 border border-border rounded-lg text-sm text-foreground bg-card hover:bg-muted/50 transition-colors">
                Close
              </button>
            </DialogClose>
            <ModalActionButtons
              entry={entry}
              actingOn={actingOn}
              onTransitionClick={onTransitionClick}
              onDeleteClick={onDeleteClick}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const PCRow = ({
  entry,
  isSelected,
  onSelect,
  rowRef,
  unreadNotifications,
}: {
  entry: PCEntry;
  isSelected: boolean;
  onSelect: (id: number | null) => void;
  rowRef?: React.Ref<HTMLTableRowElement>;
  unreadNotifications?: Notification[];
}) => {
  const warnings = warningsOf(entry);
  // The details dialog is open exactly when this row is the selected one —
  // lifted so a `/finance?tab=Payment Certificates&pc=…` link and a row
  // click drive the same dialog instead of two that can disagree.
  const showViewDialog = isSelected;
  const setShowViewDialog = (open: boolean) => onSelect(open ? entry.id : null);
  const [waitingOnOpen, setWaitingOnOpen] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  // Reject/Cancel need a reason from the person, not just a click — this
  // dialog replaces what used to be a window.prompt(). null means closed;
  // "reject" | "cancel" says which transition it's collecting a reason for.
  const [reasonTransition, setReasonTransition] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Fetched lazily, only once the Approvals badge is opened — "who is this
  // waiting on" is display-only detail, unlike availableTransitions/canDelete
  // on `entry` itself, which arrive with the list fetch already
  // permission-filtered for the current user and need no extra call.
  const { data: workflow, isLoading: workflowLoading } = useFetch<WorkflowResponse>(
    `tasks/payment-certificates/${entry.id}/workflow/`,
    { enabled: waitingOnOpen }
  );

  const invalidatePcQueries = () =>
    queryClient.invalidateQueries({
      predicate: (query) =>
        typeof query.queryKey[0] === "string" &&
        (query.queryKey[0].startsWith("tasks/payment-certificates") ||
          query.queryKey[0].startsWith("cost-ledger")),
    });

  const runTransition = async (transition: string, reason?: string) => {
    setActingOn(transition);
    try {
      await postData({
        url: `tasks/payment-certificates/${entry.id}/${TRANSITION_URL_PATH[transition]}/`,
        data: reason !== undefined ? { reason } : {},
      });
      toast.success(`${entry.pcNumber}: ${TRANSITION_LABELS[transition]} done.`);
      invalidatePcQueries();
      setReasonTransition(null);
      setReasonText("");
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err?.message || "Action failed.";
      toast.error(message);
    } finally {
      setActingOn(null);
    }
  };

  const requiresReason = (transition: string) => transition === "reject" || transition === "cancel";

  const handleTransitionClick = (transition: string) => {
    if (requiresReason(transition)) {
      setReasonText("");
      setReasonTransition(transition);
    } else {
      runTransition(transition);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteData({ url: `tasks/payment-certificates/${entry.id}/`, data: undefined });
      toast.success(`${entry.pcNumber} deleted.`);
      invalidatePcQueries();
      setShowDeleteDialog(false);
      setShowViewDialog(false);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || "Delete failed.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <tr
      ref={rowRef}
      aria-current={isSelected ? "true" : undefined}
      data-highlighted={isSelected ? "true" : undefined}
      className={`transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"}`}>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowViewDialog(true)}
            className="text-primary hover:text-primary/80 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            {entry.pcNumber}
          </button>
          <UnreadNotificationBadge notifications={unreadNotifications} />
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
        {entry.period}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground tabular-nums">
        {formatCurrency(entry.claimAmount)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground tabular-nums">
        {formatCurrency(entry.retentionAmount)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground tabular-nums">
        {formatCurrency(entry.netAmount)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground tabular-nums">
        {money(serverNumber(entry, "vatAmount", "vat_amount"))}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground tabular-nums">
        {money(serverNumber(entry, "totalPayable", "total_payable"))}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <div className="flex items-center gap-1.5">
          <Popover open={waitingOnOpen} onOpenChange={setWaitingOnOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`${entry.pcNumber} approval status — click to see who can act next`}
                className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                <ApprovalBadge workflowState={entry.workflowState} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <WaitingOnContent waitingOn={workflow?.waitingOn} isLoading={waitingOnOpen && workflowLoading} />
            </PopoverContent>
          </Popover>
          {warnings.length > 0 && (
            <Badge variant="warning" title={warnings.join("\n")}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {warnings.length === 1 ? "1 warning" : `${warnings.length} warnings`}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground tabular-nums">
        {formatDate(entry.updatedAt)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <ActionButtons
          entry={entry}
          actingOn={actingOn}
          onTransitionClick={handleTransitionClick}
          onDeleteClick={() => setShowDeleteDialog(true)}
          onViewDetails={() => setShowViewDialog(true)}
        />
        <PCDetailsDialog
          entry={entry}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
          actingOn={actingOn}
          onTransitionClick={handleTransitionClick}
          onDeleteClick={() => setShowDeleteDialog(true)}
        />
        <ReasonDialog
          entry={entry}
          transition={reasonTransition}
          reason={reasonText}
          onReasonChange={setReasonText}
          isSubmitting={actingOn !== null}
          onConfirm={() => {
            if (reasonTransition) runTransition(reasonTransition, reasonText.trim());
          }}
          onOpenChange={(open) => {
            if (!open) {
              setReasonTransition(null);
              setReasonText("");
            }
          }}
        />
        <DeleteConfirmDialog
          entry={entry}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
        />
      </td>
    </tr>
  );
};

/** Sentence case, numerics right-aligned — same shape as the other three
 *  finance tables. */
const HEADERS: { label: string; align?: "right" }[] = [
  { label: "PC #" },
  { label: "Period" },
  { label: "Claim", align: "right" },
  { label: "Retention", align: "right" },
  { label: "Net", align: "right" },
  { label: "VAT", align: "right" },
  { label: "Total Payable", align: "right" },
  { label: "Approvals" },
  { label: "Updated" },
  { label: "Actions" },
];

export const PaymentCertificateTable: React.FC<PaymentCertificateTableProps> = ({
  orders,
  search,
  selectedId = null,
  onSelect,
  unreadByPcId,
}) => {
  const [page, setPage] = useState(1);
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.pcNumber.toLowerCase().includes(q) ||
        (o.period || "").toLowerCase().includes(q) ||
        (o.approvalStatus || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Page to the selected certificate, then bring it into view. A selection
  // that is not in `filtered` — a stale id, or one hidden behind the current
  // search — leaves the pagination exactly where the user left it.
  useEffect(() => {
    if (selectedId === null) return;
    const target = pageContaining(filtered, (o) => o.id === selectedId, PAGE_SIZE);
    if (target !== null) setPage(target);
  }, [selectedId, filtered]);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedId, safePage]);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h.label}
                  scope="col"
                  className={`px-4 py-3 text-xs font-normal text-muted-foreground whitespace-nowrap ${
                    h.align === "right" ? "text-right" : "text-left"
                  }`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length}>
                  {search ? (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      title="No payment certificates match this search"
                      description="Try a different certificate number or period, or clear the search to see every certificate issued."
                    />
                  ) : (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      title="No payment certificates issued yet"
                      description="Certificates appear here once a payment claim is assessed, showing the amount certified, retention held and net due."
                    />
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((order) => (
                <PCRow
                  key={order.id}
                  entry={order}
                  isSelected={order.id === selectedId}
                  onSelect={(id) => onSelect?.(id)}
                  rowRef={order.id === selectedId ? selectedRowRef : undefined}
                  unreadNotifications={unreadByPcId?.[String(order.id)]}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0
            ? "No results"
            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
            .reduce<(number | string)[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm tabular-nums transition-colors ${
                    safePage === p ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  }`}>
                  {p}
                </button>
              )
            )}
          <button
            aria-label="Next page"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
