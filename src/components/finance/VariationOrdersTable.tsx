import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, FileDiff, SearchX } from "lucide-react";
import { UserChip } from "@/components/TaskComponents/UserChip";
import { formatMoney } from '@/lib/formatCurrency';
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { pageContaining } from "@/lib/deepLink";
import {
  certificationCell,
  type CertificationCell,
  type CertificationStatus,
  type VariationCertification,
} from "@/lib/variationCertification";

interface VariationOrdersTableProps {
  orders: VariationOrder[];
  /** Opens the underlying VO record. Receives the task id, which is what
   *  `/tasks/:taskId` resolves against — not the display VO number. */
  onViewDetails?: (taskId: string) => void;
  /** Owned by the parent's FinanceToolbar — the table renders no chrome. */
  search: string;
  /** An OrderStatus, "signed", "unsigned" or "all" — owned by the toolbar too. */
  status?: string;
  /** A VO_SORTS key; "default" keeps the server's order. */
  sort?: string;
  /** Task id of the currently selected variation, or null for none.
   *
   *  This is a HIGHLIGHT, never a filter. The row is paged to, scrolled to and
   *  marked; every other row stays exactly where it was. A task id that is not
   *  in `orders` — deleted, or on a project this viewer is not a member of —
   *  highlights nothing and changes nothing else about the table. */
  highlightTaskId?: string | null;
  /** What each variation has had certified and has left, from the server's
   *  certificate ledger. Omitted, the two columns are not shown. */
  certification?: {
    byNumber: Record<string, VariationCertification>;
    status: CertificationStatus;
  };
}

// The VO's own commercial state (`VariationOrder.Status` on the backend) —
// NOT the wrapping Task's kanban column. The two used to be conflated here:
// this table showed `Task.status` (todo/in review/done), which a seed/demo
// script can set to anything with zero regard for the VO's real state, so a
// row could read "Approved" while the underlying VariationOrder was still a
// Draft, or vice versa. These eight values are the real ones.
export enum OrderStatus {
  Draft = "Draft",
  Submitted = "Submitted",
  UnderReview = "Under Review",
  Priced = "Priced",
  Recommended = "Recommended",
  Approved = "Approved",
  Rejected = "Rejected",
  Closed = "Closed",
}

export interface VariationOrder {
  id: string;
  /** The VO number as the server holds it, or null when the record has none.
   *  `id` falls back to a made-up label; this never does. */
  voNumber?: string | null;
  taskId: string;
  title: string;
  value: number;
  status: OrderStatus;
  /**
   * Set ONLY by sign-and-issue (role + PIN) — see `tasks/views_signing.py`.
   * `status === Approved` does not by itself mean this VO was ever signed: a
   * data fix or a seed script can set status directly. This is the one field
   * that can't be, so it's the honest answer to "was this actually signed".
   */
  signedAt: string | null;
  /** null when the record carries no assignee — never substituted. */
  requestedBy: { name: string } | null;
  updated: string;
  /** Schedule impact in days, or null when the record does not state one. */
  impact: number | null;
  rawTask?: any;
}

const PAGE_SIZE = 10;

/** "signed"/"unsigned" read signedAt — the one field only sign-and-issue sets (see VariationOrder.signedAt). */
export function voMatchesStatus(o: VariationOrder, status: string): boolean {
  if (status === "all") return true;
  if (status === "signed") return !!o.signedAt;
  if (status === "unsigned") return !o.signedAt;
  return o.status === status;
}

/** Filter options, in workflow order; the parent offers only those some row matches. */
export const VO_STATUS_OPTIONS: { value: string; label: string }[] = [
  ...Object.values(OrderStatus).map((s) => ({ value: s, label: s })),
  { value: "signed", label: "Signed" },
  { value: "unsigned", label: "Not signed" },
];

const voNo = (o: VariationOrder) => Number(o.id.replace(/\D+/g, "")) || 0;
// `updated` is already formatted for display; sort on the record's ISO date.
const voTime = (o: VariationOrder) => Date.parse(o.rawTask?.updatedAt ?? "") || 0;

export const VO_SORTS: Record<string, { label: string; cmp: ((a: VariationOrder, b: VariationOrder) => number) | null }> = {
  default: { label: "Default order", cmp: null },
  updated_desc: { label: "Updated: newest", cmp: (a, b) => voTime(b) - voTime(a) },
  updated_asc: { label: "Updated: oldest", cmp: (a, b) => voTime(a) - voTime(b) },
  vo_desc: { label: "VO: newest", cmp: (a, b) => voNo(b) - voNo(a) },
  vo_asc: { label: "VO: oldest", cmp: (a, b) => voNo(a) - voNo(b) },
  value_desc: { label: "Value: high → low", cmp: (a, b) => b.value - a.value },
  value_asc: { label: "Value: low → high", cmp: (a, b) => a.value - b.value },
  impact_desc: { label: "Time impact: most days", cmp: (a, b) => (b.impact ?? -Infinity) - (a.impact ?? -Infinity) },
  title_asc: { label: "Title: A → Z", cmp: (a, b) => a.title.localeCompare(b.title) },
};

// Both chips go through the Badge primitive's semantic variants. The
// "In Review"/non-zero-impact case was three hardcoded hex values on the
// amber ramp, off the 50/700/200 scale every other status chip uses.
const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  if (status === OrderStatus.Approved) return <Badge variant="success">{status}</Badge>;
  if (status === OrderStatus.Rejected) return <Badge variant="danger">{status}</Badge>;
  if (status === OrderStatus.Draft || status === OrderStatus.Closed) {
    return <Badge variant="neutral">{status}</Badge>;
  }
  return <Badge variant="warning">{status}</Badge>;
};

/** A small, unmissable marker for the one thing the status badge can't say. */
const SignedMark: React.FC<{ signedAt: string | null; status: OrderStatus }> = ({ signedAt, status }) => {
  if (signedAt) {
    return (
      <span
        className="ml-1.5 text-xs text-green-700"
        title={`Signed ${new Date(signedAt).toLocaleDateString()}`}
      >
        ✓ Signed
      </span>
    );
  }
  // Only worth flagging when the badge alone would read as final/decided —
  // an unsigned Draft or Under Review is simply expected, not a discrepancy.
  if (status === OrderStatus.Approved || status === OrderStatus.Rejected) {
    return (
      <span
        className="ml-1.5 text-xs text-muted-foreground"
        title="This VO's status was set without going through sign-and-issue."
      >
        (not signed)
      </span>
    );
  }
  return null;
};

// Only a real time consequence earns a badge; zero days reads as "—" rather
// than a green "+0d" on every row.
const ImpactBadge: React.FC<{ days: number }> = ({ days }) => (
  <Badge variant="warning" className="tabular-nums">
    {days > 0 ? "+" : ""}
    {days}d
  </Badge>
);

/** Sentence case, numerics right-aligned — same shape as the other three
 *  finance tables. No Actions column: a VO is never edited or deleted as a
 *  raw record from this register — it moves forward through its own
 *  workflow (task board / sign-and-issue), same as an SI or RFI. */
type Header = { label: string; align?: "right"; title?: string };

const HEADERS: Header[] = [
  { label: "VO #" },
  { label: "Title" },
  // Excl. VAT: the basis of the contract sum, the Financial Position and the
  // certificate drawer. It said "incl. VAT" while its signed rows added up to
  // the ex-VAT signed-variations figure on the Financial Position.
  { label: "Value excl. VAT", align: "right" },
  { label: "Status" },
  // The person who raised it (VariationOrder.created_by).
  { label: "Raised by" },
  { label: "Updated" },
  { label: "Time impact" },
];

/** Beside Value, so the three money columns read left to right. */
const CERTIFICATION_HEADERS: Header[] = [
  { label: "Certified", align: "right", title: "On posted payment certificates, excl. VAT" },
  { label: "Remaining", align: "right", title: "Approved value not yet on any certificate, excl. VAT" },
];

const certifiable = (status: OrderStatus) =>
  status === OrderStatus.Approved || status === OrderStatus.Closed;

const Muted: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => (
  <span className="text-xs text-muted-foreground" title={title}>
    {children}
  </span>
);

/** The states every certification cell shares before there are figures. */
const NoFigures: React.FC<{ cell: CertificationCell }> = ({ cell }) => {
  if (cell.kind === "loading") return <Muted title="Loading">…</Muted>;
  if (cell.kind === "unavailable") {
    return <Muted title="What has been certified could not be loaded">Unavailable</Muted>;
  }
  if (cell.kind === "not-tracked") {
    return <Muted title="Omissions are not yet tracked against certificates">—</Muted>;
  }
  return <Muted>—</Muted>;
};

const CertifiedCell: React.FC<{ cell: CertificationCell }> = ({ cell }) => {
  if (cell.kind !== "figures") return <NoFigures cell={cell} />;
  const { certified, unposted } = cell.figures;
  return (
    <>
      <span className="font-medium text-foreground">{formatMoney(certified)}</span>
      {unposted > 0 && (
        <span className="block text-xs text-muted-foreground">+ {formatMoney(unposted)} not yet posted</span>
      )}
    </>
  );
};

const RemainingCell: React.FC<{ cell: CertificationCell }> = ({ cell }) => {
  if (cell.kind !== "figures") return <NoFigures cell={cell} />;
  const { remaining, over } = cell.figures;
  if (over > 0) return <Badge variant="danger" className="tabular-nums">Over by {formatMoney(over)}</Badge>;
  if (remaining === 0) return <Muted>Fully certified</Muted>;
  return <span className="font-medium text-foreground">{formatMoney(remaining)}</span>;
};

export const VariationOrdersTable: React.FC<VariationOrdersTableProps> = ({
  orders,
  onViewDetails,
  search,
  status = "all",
  sort = "default",
  highlightTaskId = null,
  certification,
}) => {
  const [page, setPage] = useState(1);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);
  const headers = certification
    ? [...HEADERS.slice(0, 3), ...CERTIFICATION_HEADERS, ...HEADERS.slice(3)]
    : HEADERS;

  useEffect(() => {
    setPage(1);
  }, [search, status, sort]);

  // Signed from the value itself: a negative (omission) variation used to read "+ R -…".
  const formatCurrency = (value: number) =>
    value < 0 ? `− ${formatMoney(Math.abs(value))}` : `+ ${formatMoney(value)}`;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matched = orders.filter(
      (o) =>
        voMatchesStatus(o, status) &&
        (!q ||
          o.id.toLowerCase().includes(q) ||
          o.title.toLowerCase().includes(q) ||
          (o.requestedBy?.name || "").toLowerCase().includes(q) ||
          o.status.toLowerCase().includes(q))
    );
    // "default" keeps the server's order. Array.sort is stable, so ties keep it too.
    const cmp = VO_SORTS[sort]?.cmp;
    return cmp ? [...matched].sort(cmp) : matched;
  }, [orders, search, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // A link to the 34th variation is no use if the table opens on page 1 and
  // the row is three pages away. `pageContaining` returns null when the id is
  // not in the visible list, which leaves the pagination untouched.
  useEffect(() => {
    if (!highlightTaskId) return;
    const target = pageContaining(filtered, (o) => o.taskId === highlightTaskId, PAGE_SIZE);
    if (target !== null) setPage(target);
  }, [highlightTaskId, filtered]);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightTaskId, safePage]);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.label}
                  scope="col"
                  title={h.title}
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
                <td colSpan={headers.length}>
                  {search ? (
                    <EmptyState
              icon={SearchX}
                      variant="plain"
                      size="sm"
                      title="No variation orders match this search"
                      description="Try a different VO number, title or requester, or clear the search to see the full register."
                    />
                  ) : (
                    <EmptyState
              icon={FileDiff}
                      variant="plain"
                      size="sm"
                      title="No variation orders yet"
                      description="Variations raised against this project appear here with their approval status and cost impact."
                    />
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((order) => {
                const isHighlighted = highlightTaskId !== null && order.taskId === highlightTaskId;
                const cell = certification
                  ? certificationCell(
                      order.voNumber,
                      certifiable(order.status),
                      order.value,
                      certification.byNumber,
                      certification.status,
                    )
                  : null;
                return (
                <tr
                  key={order.id}
                  ref={isHighlighted ? highlightRef : undefined}
                  aria-current={isHighlighted ? "true" : undefined}
                  data-highlighted={isHighlighted ? "true" : undefined}
                  className={`transition-colors ${isHighlighted ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    {onViewDetails && order.taskId ? (
                      <button
                        type="button"
                        onClick={() => onViewDetails(order.taskId)}
                        className="text-primary hover:text-primary/80 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                        {order.id}
                      </button>
                    ) : (
                      <span className="text-foreground">{order.id}</span>
                    )}
                  </td>
                  {/* Wraps, so the columns after it fit at desktop width. */}
                  <td className="px-4 py-3 text-sm text-foreground min-w-[12rem] max-w-[22rem]">
                    {order.title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground font-medium tabular-nums">
                    {formatCurrency(order.value)}
                  </td>
                  {cell && (
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums">
                        <CertifiedCell cell={cell} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums">
                        <RemainingCell cell={cell} />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className="inline-flex items-center">
                      <StatusBadge status={order.status} />
                      <SignedMark signedAt={order.signedAt} status={order.status} />
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                    {order.requestedBy ? (
                      <UserChip name={order.requestedBy.name} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground tabular-nums">
                    {order.updated}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {order.impact ? (
                      <ImpactBadge days={order.impact} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-muted-foreground">
          <span>
            {filtered.length === 0
              ? "No results"
              : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          {certification && filtered.length > 0 && <span> · Amounts excl. VAT</span>}
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
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm tabular-nums transition-colors ${safePage === p
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
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
