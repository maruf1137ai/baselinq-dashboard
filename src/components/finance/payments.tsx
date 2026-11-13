/**
 * Finance → Payments — what has been certified, what the client has actually
 * paid, what is still outstanding, and what is late.
 *
 * WHY THIS TAB EXISTS
 * -------------------
 * The product owner's words: "in order for baselinq to work, we need the
 * values of whats owed and whats paid running through baselinq". Every one of
 * those values was already being computed. `projects/{id}/payments/` has
 * returned the certified, received, outstanding and overdue totals for a
 * project — and the position of every posted certificate behind them — for as
 * long as the payment loop has existed. Two screens read it to derive a single
 * figure each (Home's overdue queue, Project Health's worst delay) and nothing
 * anywhere showed the register itself. A QS wanting to know what the employer
 * owes had to open certificates one at a time.
 *
 * NOTHING IS COMPUTED HERE. Every figure on this screen is the server's.
 * `tasks/payment_terms.py` resolves the payment period from the project's
 * contract form, applies the South African working-day calendar where the
 * period is counted in working days, and reports the basis it counted from.
 * Re-deriving a due date or a balance in the browser would be a second
 * implementation of the rule that decides whether a contractor may claim
 * interest. The sort order and the one-word row state are the only
 * derivations, and both live in `lib/projectPosition.ts` where they are
 * testable without a DOM.
 *
 * ONLY POSTED CERTIFICATES APPEAR, because that is all the endpoint serves,
 * deliberately: a draft's "outstanding balance" is not outstanding, it is
 * unfinished, and mixing the two gives a debtors figure inflated by work
 * nobody has certified. The table says so rather than leaving the absence to
 * be noticed.
 *
 * THE BASIS CAVEAT. JBCC counts payment from the date FOR issue. That field is
 * captured nowhere in the UI, so on effectively every certificate in the
 * product the server falls back to the certificate date and says so. The
 * fallback can only ever run LATE — in the employer's favour. So a days-late
 * count is never printed on this page without the server's own warning being
 * reachable beside it; see `PaymentPositionSection`, which this tab opens
 * rather than restating.
 */
import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, ArrowUpDown, Filter, Lock, Receipt, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Pager, pageOf } from "@/components/ui/pager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FinanceStatCard } from "./FinanceStatCard";
import PaymentPositionSection from "./PaymentPositionSection";
import RecordPaymentDialog from "./RecordPaymentDialog";
import { useProjectPayments } from "@/hooks/useProjectPayments";
import { usePermission } from "@/hooks/usePermission";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate } from "@/lib/dateUtils";
import { formatMoney } from "@/lib/formatCurrency";
import { resolveFinanceAccess } from "@/lib/homeSignals";
import {
  type PaymentPositionLike,
  type PaymentRowState,
  type ProjectPaymentSummaryLike,
  paymentRowState,
  sortPaymentPositions,
} from "@/lib/projectPosition";
import { UnverifiedMark, UnverifiedNote } from "./UnverifiedMark";

/** Money arrives as a decimal STRING. `formatZAR` takes a number. */
const money = (raw: unknown): string => {
  const n = Number(raw);
  return Number.isFinite(n) ? formatMoney(n) : "—";
};

const day = (iso?: string | null) => formatDate(iso, "short", "—");

/*
  Column classes mirror `adminUi`'s: `numeric` drives the alignment on both the
  header and its cells from one declaration, so a column cannot end up with a
  right-aligned heading over left-aligned figures by someone editing one list
  and not the other.
*/
/*
  The tab key, encoded. `resolveTabParam` normalises `+`, `%20` and a raw
  space alike, so all three resolve — but an href is also what a person copies
  out of the address bar and pastes into an email, and a raw space in one gets
  broken by every mail client that touches it.
*/
const PC_TAB_PARAM = encodeURIComponent("Payment Certificates");

const TH = "px-5 py-3 text-left text-xs font-normal text-muted-foreground whitespace-nowrap";
const TH_NUM = `${TH} !text-right`;
const TD = "px-5 py-3 text-sm text-foreground whitespace-nowrap";
const TD_NUM = `${TD} text-right tabular-nums`;

/*
  The row state as a badge. Each one carries a WORD as well as a tone: an
  overdue row has to read as overdue in a screenshot, in print, and to a
  reader who cannot distinguish the red from the amber. "Overdue" is the
  label; the day count sits beside it with a warning glyph.
*/
const ROW_BADGE: Record<PaymentRowState, { label: string; variant: "success" | "warning" | "neutral" | "danger" | "info" }> = {
  // Blue, not amber: money is owed the other way, which is information, not
  // the "needs attention" amber of Part paid and Position unclear.
  contractor_owes: { label: "Owed by contractor", variant: "info" },
  overpaid: { label: "Overpaid", variant: "info" },
  settled: { label: "Paid in full", variant: "success" },
  overdue: { label: "Overdue", variant: "danger" },
  partly: { label: "Part paid", variant: "warning" },
  unpaid: { label: "Awaiting payment", variant: "neutral" },
  // Not "Awaiting payment": the server did not state this row's position, and
  // asserting an obligation it did not assert is the error this page is for.
  unknown: { label: "Position unclear", variant: "warning" },
};

const PAGE_SIZE = 10;

/** Toolbar controls: one height, one radius, one border — the search box's. */
const TOOL =
  "h-9 rounded-lg border-border bg-background px-3 text-[13px] text-foreground shadow-none hover:bg-muted/50 focus:ring-1 focus:ring-primary/40 focus:ring-offset-0";
/** A control moved off its default reads as on: the theme's primary, lightly. */
const TOOL_ON = "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** Natural PC order: PC-9 before PC-10. */
const pcNo = (r: PaymentPositionLike) => num(String(r.pcNumber ?? "").replace(/\D+/g, "")) || num(r.paymentCertificateId);
const dueTime = (r: PaymentPositionLike) => {
  const t = r.due?.dueDate ? Date.parse(r.due.dueDate) : NaN;
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY; // no due date: last
};

/** "Most urgent" is the server-agreed order from lib/projectPosition; the rest re-sort it. */
type Cmp = ((a: PaymentPositionLike, b: PaymentPositionLike) => number) | null;
const SORTS: Record<string, { label: string; cmp: Cmp }> = {
  priority: { label: "Most urgent first", cmp: null },
  due_asc: { label: "Due date: soonest", cmp: (a, b) => dueTime(a) - dueTime(b) },
  due_desc: { label: "Due date: latest", cmp: (a, b) => dueTime(b) - dueTime(a) },
  outstanding_desc: { label: "Outstanding: high → low", cmp: (a, b) => num(b.outstandingAmount) - num(a.outstandingAmount) },
  payable_desc: { label: "Payable: high → low", cmp: (a, b) => num(b.certifiedAmount) - num(a.certifiedAmount) },
  pc_desc: { label: "Certificate: newest", cmp: (a, b) => pcNo(b) - pcNo(a) },
  pc_asc: { label: "Certificate: oldest", cmp: (a, b) => pcNo(a) - pcNo(b) },
};
type SortKey = string;

/** Filter options, in the order a reader scans for them; only states present are offered. */
const FILTER_ORDER: PaymentRowState[] = ["overdue", "partly", "unpaid", "unknown", "contractor_owes", "overpaid", "settled"];

/**
 * `embedded`: shown under the Financial Position, which already states the
 * money totals and the unverified note — so the register alone, under a heading.
 */
export default function Payments({ embedded = false }: { embedded?: boolean } = {}) {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const numericProjectId = projectId ? Number(projectId) : 0;

  /*
    The same gate, resolved the same way, as Home and Project Health:
    `resolveFinanceAccess` fails CLOSED while the permission map is in flight,
    because `canViewFinance` defaults permissive during loading and would flash
    the employer's certified total at a contractor for a frame.

    `finance.view` and nothing new. The server gates the identical endpoint on
    the identical code (tasks/views_payments.py:386), so inventing a second
    permission here would only create a way for the two to disagree.
  */
  const perms = usePermissions();
  const { canViewFinance } = resolveFinanceAccess(perms);

  // Recording a receipt is data entry: `finance.edit`, or the Employer role,
  // which records payments with proof without holding finance.edit (client
  // decision, 10 Nov 2026). The server says which, as `canRecordPayment`.
  const holdsFinanceEdit = usePermission("finance.edit", numericProjectId || undefined);

  const [recordFor, setRecordFor] = useState<PaymentPositionLike | null>(null);
  const [positionFor, setPositionFor] = useState<PaymentPositionLike | null>(null);

  const { data, isLoading, isError, refetch } = useProjectPayments<ProjectPaymentSummaryLike>(
    projectId,
    canViewFinance,
  );
  const canRecord = (data as { canRecordPayment?: boolean } | undefined)?.canRecordPayment ?? holdsFinanceEdit;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PaymentRowState | "all">("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const [page, setPage] = useState(1);

  const all = useMemo(() => sortPaymentPositions(data?.certificates ?? []), [data]);
  // Search, filter and sort run on the rows the server sent — the totals above
  // stay the whole project's, never just what is filtered.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = all.filter((r) => {
      if (filter !== "all" && paymentRowState(r) !== filter) return false;
      if (!q) return true;
      const ref = (r.pcNumber || (r.paymentCertificateId ? `PC-${r.paymentCertificateId}` : "")).toLowerCase();
      return ref.includes(q) || ROW_BADGE[paymentRowState(r)].label.toLowerCase().includes(q);
    });
    // Array.sort is stable: ties keep the most-urgent order.
    const cmp = SORTS[sort]?.cmp;
    return cmp ? [...matched].sort(cmp) : matched;
  }, [all, search, filter, sort]);
  const paged = pageOf(rows, page, PAGE_SIZE);
  const presentStates = useMemo(() => new Set(all.map(paymentRowState)), [all]);
  const resetPage = () => setPage(1);

  if (!canViewFinance) {
    return (
      <main className="pt-6">
        <EmptyState
          icon={Lock}
          title="Payments are not visible to your role"
          description="Ask a project administrator if you need sight of what has been certified and paid."
        />
      </main>
    );
  }

  if (!projectId) {
    return (
      <main className="pt-6">
        <EmptyState
          icon={Receipt}
          title="No project selected"
          description="Payments are tracked per project. Select a project to see what is owed on it."
        />
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="pt-6">
        <AwesomeLoader compact message="Reconciling payments" />
      </main>
    );
  }

  /*
    An outage is not an all-clear. "Nothing outstanding" over a failed read is
    the single most dangerous thing this screen could say, so the error state
    is explicit and says what it is not.
  */
  if (isError || !data) {
    return (
      <main className="pt-6">
        <EmptyState
          icon={AlertCircle}
          title="The payment position could not be loaded"
          description="This is not a statement that nothing is owed. The certificates and receipts are unaffected."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch?.()}>
              Try again
            </Button>
          }
        />
      </main>
    );
  }

  const overdueCount = data.overdueCount ?? 0;

  return (
    <main className={embedded ? "space-y-3" : "pt-6 space-y-4"}>
      {/* Above the cards: the Certified card's total includes these amounts. */}
      {!embedded && (data.unverifiedCount ?? 0) > 0 && <UnverifiedNote count={data.unverifiedCount} />}

      {!embedded && <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4 items-stretch">
        {/* "incl. VAT" in the label, not only the meta line: Cost Ledger's
            certified figure is ex VAT, and the same word showed two numbers. */}
        <FinanceStatCard
          label="Certified incl. VAT"
          value={money(data.certifiedTotal)}
          meta={
            (data.unverifiedCount ?? 0) > 0
              ? `Includes ${data.unverifiedCount} unverified amount${data.unverifiedCount === 1 ? "" : "s"} that may exclude VAT`
              : `${data.certificateCount ?? 0} certificate${(data.certificateCount ?? 0) === 1 ? "" : "s"} payable`
          }
        />
        <FinanceStatCard
          label="Received"
          value={money(data.receivedTotal)}
          meta="Recorded against those certificates"
        />
        <FinanceStatCard
          label="Outstanding"
          value={money(data.outstandingTotal)}
          meta={
            Number(data.overpaidTotal) > 0
              ? `Still to be paid. ${money(data.overpaidTotal)} overpaid is held as credit, not netted off`
              : "Still to be paid on these certificates"
          }
        />
        <FinanceStatCard
          label="Overdue"
          value={money(data.overdueTotal)}
          alarm={overdueCount > 0}
          meta={
            overdueCount > 0
              ? `${overdueCount} certificate${overdueCount === 1 ? "" : "s"} past the contractual due date`
              : "Nothing past its due date"
          }
        />
      </div>}

      {all.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No posted certificates yet"
          description="Until a certificate is posted it is not an obligation to pay, so nothing appears here."
        />
      ) : (
        <div className="relative bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Payment by certificate
              </h3>
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {rows.length === all.length ? all.length : `${rows.length} / ${all.length}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="relative w-full sm:w-60">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                placeholder="Search certificate…"
                aria-label="Search certificates"
                className="h-9 rounded-lg border-border bg-background pl-9 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => { setSearch(""); resetPage(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={filter} onValueChange={(v) => { setFilter(v as PaymentRowState | "all"); resetPage(); }}>
              <SelectTrigger
                className={`${TOOL} w-[172px] ${filter !== "all" ? TOOL_ON : ""}`}
                aria-label="Filter by position"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Filter aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All positions</SelectItem>
                {FILTER_ORDER.filter((s) => presentStates.has(s)).map((s) => (
                  <SelectItem key={s} value={s}>{ROW_BADGE[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setSort(v as SortKey); resetPage(); }}>
              <SelectTrigger
                className={`${TOOL} w-[200px] ${sort !== "priority" ? TOOL_ON : ""}`}
                aria-label="Sort by"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ArrowUpDown aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORTS) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{SORTS[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || filter !== "all" || sort !== "priority") && (
              <button
                type="button"
                onClick={() => { setSearch(""); setFilter("all"); setSort("priority"); resetPage(); }}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
            </div>
          </div>
          <div className="relative overflow-x-auto">
          {/* `relative` is load-bearing. The Actions header's sr-only label is
              position:absolute; with no positioned ancestor it was placed
              against the page, escaped this box's overflow clip, and widened
              the whole document (1,021px in a 769px window). Anchoring it here
              keeps it clipped, so only the table scrolls sideways. */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={TH}>Certificate</th>
                <th className={TH_NUM}>Payable incl. VAT</th>
                <th className={TH_NUM}>Received</th>
                <th className={TH_NUM}>Outstanding</th>
                <th className={TH}>Due</th>
                <th className={TH}>Position</th>
                <th className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No certificate matches.
                  </td>
                </tr>
              )}
              {paged.rows.map((row) => {
                const state = paymentRowState(row);
                const badge = ROW_BADGE[state];
                const id = row.paymentCertificateId;
                const ref = row.pcNumber || (id ? `PC-${id}` : "—");
                return (
                  <tr key={id ?? ref} className="border-b border-border last:border-0">
                    <td className={TD}>
                      {/*
                        The EXISTING deep link, not a new route: `?pc=` already
                        drives the selection on the Payment Certificates tab,
                        and `resolveTabParam` normalises the tab key, so this
                        resolves whether or not the space survives encoding.
                        A deep link may only ever SELECT something already on
                        that page — a deleted id simply finds nothing there.
                      */}
                      {id ? (
                        <Link
                          to={`/finance?tab=${PC_TAB_PARAM}&pc=${id}`}
                          className="text-foreground hover:underline"
                        >
                          {ref}
                        </Link>
                      ) : (
                        ref
                      )}
                    </td>
                    <td className={TD_NUM}>
                      {money(row.certifiedAmount)}
                      {row.certifiedBasis === "net_amount_unverified" && <UnverifiedMark />}
                    </td>
                    <td className={TD_NUM}>{money(row.receivedAmount)}</td>
                    <td className={TD_NUM}>{money(row.outstandingAmount)}</td>
                    <td className={TD}>
                      {row.due?.computable === false ? (
                        /* Not "—", which reads as a missing value rather than
                           as a date the contract cannot yet supply. */
                        <span className="text-muted-foreground">Cannot be computed</span>
                      ) : (
                        day(row.due?.dueDate)
                      )}
                    </td>
                    <td className={TD}>
                      <span className="flex items-center gap-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {state === "overdue" && (row.daysPastDue ?? 0) > 0 && (
                          /* The glyph and the words both say "late". Colour is
                             never the only carrier of that on this table. */
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {row.daysPastDue} day{row.daysPastDue === 1 ? "" : "s"} late
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={`${TD} text-right`}>
                      <span className="inline-flex items-center gap-1">
                        {/*
                          The full position — the due-date derivation, the
                          basis warning, late-payment interest and every
                          receipt — is `PaymentPositionSection`, unchanged and
                          reused. This tab answers "how much and how late"; the
                          working belongs to the component that already states
                          it, and restating it here would be a second version
                          of the same arithmetic.
                        */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setPositionFor(row)}
                          aria-label={`View position for ${ref}`}
                        >
                          View position
                        </Button>
                        {canRecord && row.isFullySettled === false && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setRecordFor(row)}
                            aria-label={`Record payment for ${ref}`}
                          >
                            Record payment
                          </Button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <Pager
            compact
            page={paged.page}
            pageSize={paged.pageSize}
            count={paged.count}
            totalPages={paged.totalPages}
            onPage={setPage}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {/* A screenshot of these figures pasted into a dispute must carry its
            own date — every one of them is "as at" a day, and it is the date in
            the project's timezone, not the reader's. */}
        As at {day(data.asAt)}. Posted certificates only: payment is not due on a certificate
        that has not been posted.
      </p>

      <Dialog open={!!positionFor} onOpenChange={(v) => !v && setPositionFor(null)}>
        <DialogContent className="max-w-lg">
          {positionFor && (
            <>
              <DialogHeader>
                <DialogTitle>{positionFor.pcNumber || `PC-${positionFor.paymentCertificateId}`}</DialogTitle>
                <DialogDescription>
                  What is outstanding on this certificate, when it fell due, and every receipt
                  recorded against it.
                </DialogDescription>
              </DialogHeader>
              <PaymentPositionSection
                certificateId={positionFor.paymentCertificateId as number}
                projectId={numericProjectId}
                open
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/*
        Recording a receipt is NOT reimplemented here. `RecordPaymentDialog`
        owns the parse of a typed amount, the over-outstanding warning before
        the write, and the server's post-write warnings that must stay on
        screen rather than becoming a four-second toast. It also invalidates
        this tab's query, so the register refreshes without a second
        refetch path.
      */}
      {recordFor && (
        <RecordPaymentDialog
          open={!!recordFor}
          onOpenChange={(v) => !v && setRecordFor(null)}
          certificateId={recordFor.paymentCertificateId as number}
          projectId={numericProjectId}
          pcNumber={recordFor.pcNumber || `PC-${recordFor.paymentCertificateId}`}
          outstanding={String(recordFor.outstandingAmount ?? "0")}
          serverToday={data.asAt}
          unverified={recordFor.certifiedBasis === "net_amount_unverified"}
          onRecorded={() => refetch?.()}
        />
      )}
    </main>
  );
}
