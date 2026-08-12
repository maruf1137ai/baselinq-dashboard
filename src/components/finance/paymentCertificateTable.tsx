import React, { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDate as formatDateCanonical } from "@/lib/dateUtils";
import useFetch from "@/hooks/useFetch";
import { postData } from "@/lib/Api";
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
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import { AlertTriangle, MoreHorizontal, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatZAR } from '@/lib/formatCurrency';
import { EmptyState } from "@/components/ui/empty-state";

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
// Principal Agent act (submit/approve/post), not the old two-stage
// QS-approve/client-approve ladder. "post" is called out specially: it's the
// commercial moment that accrues the platform fee.
const TRANSITION_LABELS: Record<string, string> = {
  submit: "Submit for Certification",
  approve: "Approve",
  post: "Post Certificate",
  reject: "Reject",
  cancel: "Cancel",
};

const TRANSITION_URL_PATH: Record<string, string> = {
  submit: "submit",
  approve: "approve",
  post: "post",
  reject: "reject",
  cancel: "cancel",
};

/** How the "waiting on" popover phrases each ladder stage — shorter and
 *  read as a noun phrase ("Waiting on: Approval"), unlike TRANSITION_LABELS
 *  above which reads as a button ("Approve"). */
const WAITING_ON_STAGE_LABEL: Record<string, string> = {
  approve: "Approval (Principal Agent)",
  post: "Posting",
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

const PCDetailsDialog = ({
  entry,
  open,
  onOpenChange,
}: {
  entry: PCEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Details for {entry.pcNumber}</DialogTitle>
            <DialogDescription>Period: {entry.period}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 text-sm tabular-nums">
            <p><span className="text-muted-foreground">Claim Amount:</span> {formatCurrency(entry.claimAmount)}</p>
            <p><span className="text-muted-foreground">Retention:</span> {formatCurrency(entry.retentionAmount)}</p>
            <p><span className="text-muted-foreground">Net Amount:</span> {formatCurrency(entry.netAmount)}</p>
            <p><span className="text-muted-foreground">VAT:</span> {money(serverNumber(entry, "vatAmount", "vat_amount"))}</p>
            <p><span className="text-muted-foreground">Total Payable:</span> {money(serverNumber(entry, "totalPayable", "total_payable"))}</p>
            <p><span className="text-muted-foreground">Status:</span> {(entry.workflowState && WORKFLOW_STATE_BADGE[entry.workflowState]?.label) || entry.approvalStatus}</p>
            <p><span className="text-muted-foreground">Updated:</span> {formatDate(entry.updatedAt)}</p>
            {isServerComputed(entry) === false && (
              <p className="text-amber-700">
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
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-10 px-4 border border-border rounded-lg text-sm text-foreground bg-card hover:bg-muted/50 transition-colors">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const PCRow = ({ entry }: { entry: PCEntry }) => {
  const warnings = warningsOf(entry);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [waitingOnOpen, setWaitingOnOpen] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  // Reject/Cancel need a reason from the person, not just a click — this
  // dialog replaces what used to be a window.prompt(). null means closed;
  // "reject" | "cancel" says which transition it's collecting a reason for.
  const [reasonTransition, setReasonTransition] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");
  const queryClient = useQueryClient();

  // Fetched lazily (only once the row's menu OR its Approvals badge is
  // opened) rather than for every row on page load — availableTransitions is
  // already permission-filtered server-side for the current user, so the
  // buttons shown here can never offer an action that would 403, and
  // waitingOn is the same "who may act" question answered for display rather
  // than for the current viewer specifically.
  const { data: workflow, isLoading: workflowLoading } = useFetch<WorkflowResponse>(
    `tasks/payment-certificates/${entry.id}/workflow/`,
    { enabled: menuOpen || waitingOnOpen }
  );

  const runTransition = async (transition: string, reason?: string) => {
    setActingOn(transition);
    try {
      await postData({
        url: `tasks/payment-certificates/${entry.id}/${TRANSITION_URL_PATH[transition]}/`,
        data: reason !== undefined ? { reason } : {},
      });
      toast.success(`${entry.pcNumber}: ${TRANSITION_LABELS[transition]} done.`);
      queryClient.invalidateQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === "string" &&
          (query.queryKey[0].startsWith("tasks/payment-certificates") ||
            query.queryKey[0].startsWith("cost-ledger")),
      });
      setMenuOpen(false);
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

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <button
          type="button"
          onClick={() => setShowViewDialog(true)}
          className="text-primary hover:text-primary/80 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          {entry.pcNumber}
        </button>
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
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="More actions" className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end">
            <DropdownMenuItem onSelect={() => setShowViewDialog(true)}>
              View Details
            </DropdownMenuItem>
            {menuOpen && (workflowLoading || (workflow?.availableTransitions?.length ?? 0) > 0) && (
              <>
                <DropdownMenuSeparator />
                {workflowLoading ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking available actions…
                  </div>
                ) : (
                  workflow?.availableTransitions?.map((t) => (
                    <DropdownMenuItem
                      key={t}
                      disabled={actingOn !== null}
                      onSelect={(e) => {
                        e.preventDefault();
                        if (requiresReason(t)) {
                          setReasonText("");
                          setReasonTransition(t);
                        } else {
                          runTransition(t);
                        }
                      }}
                      className={t === "reject" || t === "cancel" ? "text-destructive" : undefined}
                    >
                      {actingOn === t ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" /> {TRANSITION_LABELS[t]}…
                        </span>
                      ) : (
                        TRANSITION_LABELS[t] || t
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <PCDetailsDialog
          entry={entry}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
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
  { label: "Actions", align: "right" },
];

export const PaymentCertificateTable: React.FC<PaymentCertificateTableProps> = ({ orders, search }) => {
  const [page, setPage] = useState(1);

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
              paginated.map((order) => <PCRow key={order.id} entry={order} />)
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
