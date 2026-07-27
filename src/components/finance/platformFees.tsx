/**
 * Platform Fees — the screen a client reads when they query their bill.
 *
 * Baselinq charges the employer 1% + VAT on approved commercial flow. Until
 * now that only surfaced as rows in the Cost Ledger under the supplier
 * "Baselinq Platform Fee" — a number with no total and no explanation. This
 * tab is the explanation.
 *
 * The design brief here is unusual: decoration is worth nothing and
 * justification is worth everything. Every figure must be checkable with a
 * calculator, every derivation must reach its own conclusion in words, and
 * every column of money must line up (`tabular-nums` throughout — a finance
 * table whose digits jitter between rows cannot be scanned, and this one is
 * read adversarially).
 *
 * THE THREE SHAPES. `basisDetail` is three different schemas depending on
 * whether the row is a certificate charge, a variation charge, or a credit.
 * A credit carries no `base` and no `cap` at all. `lib/feeBasis.ts` owns that
 * discrimination; this file never sniffs the blob itself.
 *
 * DIRECTION IS CARRIED BY `status`, NOT BY SIGN. Every amount in the payload
 * is positive. A `reversal` row is a credit; a `reversed` row is a debit that
 * has since been credited back and no longer counts toward anything. Summing
 * `totalAmount` across the array gives a wrong answer, so nothing here does.
 */
import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as DisclosureChevron,
  FileText,
  Lock,
  Receipt,
  RotateCcw,
  Search,
} from "lucide-react";

import useFetch from "@/hooks/useFetch";
import { usePermission } from "@/hooks/usePermission";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatZAR } from "@/lib/formatCurrency";
import {
  assumptionStatements,
  baseNarrative,
  basisShape,
  buildBasisFigures,
  capView,
  dedupeView,
  feeArithmetic,
  money,
  pct,
  shortDate,
  statementPeriod,
  strategyLabel,
  type BasisShape,
} from "@/lib/feeBasis";

/* ------------------------------------------------------------------ */
/* Payload                                                             */
/* ------------------------------------------------------------------ */

export interface FeeConfig {
  configured: boolean;
  enabled: boolean;
  feeBase: string;
  feeBaseIsPlaceholder: boolean;
  feeRatePct: number;
  vatRatePct: number;
  capAmount: number | null;
  billingContactName: string;
  billingContactEmail: string;
  updatedAt?: string | null;
}

export interface FeeCharge {
  id: number;
  status: "active" | "reversed" | "reversal";
  eventType: "pc_posted" | "vo_approved";
  feeBase: string;
  sourceRef: string;
  sourceVoId: number | null;
  sourcePcId: number | null;
  baseAmount: number;
  feeRatePct: number;
  feeAmount: number;
  vatRatePct: number;
  vatAmount: number;
  totalAmount: number;
  runningTotal: number;
  capReached: boolean;
  reversesId: number | null;
  reversalReason: string;
  costLedgerEntryId: number | null;
  basisDetail: Record<string, any>;
  createdAt: string | null;
}

export interface FeeTotals {
  feeExVat: number;
  vat: number;
  total: number;
  reversed: number;
  cap: number | null;
  capRemaining: number | null;
  capReached: boolean;
  currency: string;
}

export interface FeesResponse {
  projectId: number;
  viewBillingLedger: boolean;
  config: FeeConfig;
  calculatedFees: FeeCharge[];
  totals: FeeTotals;
}

const PAGE_SIZE = 10;

const EVENT_LABEL: Record<string, string> = {
  pc_posted: "Certificate posted",
  vo_approved: "Variation approved",
};

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

const StatCard: React.FC<{
  label: string;
  value: string;
  meta?: React.ReactNode;
}> = ({ label, value, meta }) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-normal text-foreground tabular-nums mt-1">{value}</p>
    {meta && <div className="text-xs text-muted-foreground mt-2">{meta}</div>}
  </div>
);

/** Label/value pair inside a derivation well. */
const FigureItem: React.FC<{ label: string; value: string; emphasis?: boolean }> = ({
  label,
  value,
  emphasis,
}) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p
      className={`text-sm tabular-nums mt-0.5 ${
        emphasis ? "text-foreground font-medium" : "text-foreground"
      }`}
    >
      {value}
    </p>
  </div>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm font-medium text-foreground">{children}</p>
);

/**
 * Recessed derivation block. `bg-muted/50`, no border — a well, not a card.
 * The tint lives here and not on the containing cell, so it does not stack
 * with the expanded row's own highlight and darken to a third shade.
 */
const Well: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-muted/50 rounded-xl p-4">{children}</div>
);

/* ------------------------------------------------------------------ */
/* The derivation                                                      */
/* ------------------------------------------------------------------ */

/**
 * `basisDetail`, rendered as an argument rather than a JSON dump.
 *
 * Recursive: a credit row renders its lede, then re-enters with the original
 * charge's basis nested inside, because "why was I credited" is only half an
 * answer without "what was I charged in the first place".
 */
const BasisDetailView: React.FC<{
  detail: Record<string, any>;
  shape: BasisShape;
  charge: FeeCharge;
  /** True when rendering the original basis inside a credit. */
  nested?: boolean;
}> = ({ detail, shape, charge, nested }) => {
  if (shape === "reversal") {
    const original = detail?.original_basis;
    const originalShape = basisShape(original, charge.eventType, "active");

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <SectionHeading>Why this is a credit</SectionHeading>
          <p className="text-sm text-foreground leading-relaxed">
            This row reverses charge #{detail?.reverses_charge_id ?? "—"} in full. The original
            debit no longer counts toward the fee total or the cap, and the amounts below are
            credited back to the project.
          </p>
          {detail?.reason ? (
            <p className="text-sm text-foreground leading-relaxed">
              Reason given: {String(detail.reason)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No reason was recorded against this reversal.</p>
          )}
          <p className="text-sm text-foreground tabular-nums leading-relaxed">
            Credited: {money(charge.feeAmount)} fee and {money(charge.vatAmount)} VAT,{" "}
            {money(charge.totalAmount)} in total.
          </p>
        </div>

        {original && typeof original === "object" && originalShape !== "unknown" && (
          <div className="space-y-3 border-t border-border pt-4">
            <SectionHeading>What the original charge was calculated on</SectionHeading>
            <BasisDetailView
              detail={original}
              shape={originalShape}
              charge={charge}
              nested
            />
          </div>
        )}
      </div>
    );
  }

  if (shape === "unknown" || !detail || Object.keys(detail).length === 0) {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        No derivation was stored against this charge. It predates the basis being recorded, so the
        fee cannot be broken down here — the amounts above remain authoritative.
      </p>
    );
  }

  const figures = buildBasisFigures(detail);
  const narrative = baseNarrative(detail, shape);
  const dedupe = shape === "pc" ? dedupeView(detail) : null;
  const cap = capView(detail);
  const assumptions = assumptionStatements(detail);
  const strategy = strategyLabel(detail.strategy);

  return (
    <div className="space-y-5">
      {/* 1 — how the base was reached */}
      <div className="space-y-3">
        <SectionHeading>
          {shape === "pc" ? "How the certified value was reached" : "How the variation value was reached"}
        </SectionHeading>
        {narrative.map((line, i) => (
          <p key={i} className="text-sm text-foreground leading-relaxed">
            {line}
          </p>
        ))}
        {figures.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 pt-1">
            {figures.map((f) => (
              <FigureItem key={f.key} label={f.label} value={f.value} emphasis={f.emphasis} />
            ))}
          </div>
        )}
      </div>

      {/* 2 — de-duplication */}
      {dedupe && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <SectionHeading>De-duplication against variation orders</SectionHeading>
            <span className="text-sm text-foreground tabular-nums">
              −{money(dedupe.deduction)}
            </span>
          </div>
          {dedupe.why && (
            <p className="text-sm text-foreground leading-relaxed">{dedupe.why}</p>
          )}

          {dedupe.matched.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Already charged at approval — deducted from this certificate
              </p>
              {dedupe.matched.map((m) => (
                <div
                  key={`m-${m.voNumber}`}
                  className="flex items-baseline justify-between gap-4 text-sm text-foreground"
                >
                  <span>{m.voNumber}</span>
                  <span className="tabular-nums">−{money(m.thisPeriod)}</span>
                </div>
              ))}
            </div>
          )}

          {dedupe.unmatched.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Certified in this period but never charged at approval — no deduction, so these
                attract fee here for the first time
              </p>
              {dedupe.unmatched.map((m) => (
                <div
                  key={`u-${m.voNumber}`}
                  className="flex items-baseline justify-between gap-4 text-sm text-muted-foreground"
                >
                  <span>{m.voNumber}</span>
                  <span className="tabular-nums">{money(m.thisPeriod)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3 — the fee, and the cap */}
      <div className="space-y-3 border-t border-border pt-4">
        <SectionHeading>Fee calculation</SectionHeading>
        <p className="text-sm text-foreground tabular-nums leading-relaxed">
          {feeArithmetic(charge)}
        </p>
        {cap && (
          <>
            <p className="text-sm text-foreground leading-relaxed">{cap.narrative}</p>
            {cap.capAmount !== null && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                <FigureItem label="Fee cap" value={money(cap.capAmount)} />
                <FigureItem label="Charged before this" value={money(cap.runningTotalBefore)} />
                <FigureItem label="Fee before cap" value={money(cap.uncappedFee)} />
                <FigureItem label="Fee charged" value={money(cap.chargedFee)} emphasis />
              </div>
            )}
          </>
        )}
        {!nested && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Running fee total after this charge: {money(charge.runningTotal)}
          </p>
        )}
      </div>

      {/* 4 — the rules in force when this charge was raised */}
      {(assumptions.length > 0 || strategy) && (
        <div className="space-y-2 border-t border-border pt-4">
          <SectionHeading>Rules applied when this charge was raised</SectionHeading>
          {strategy && (
            <p className="text-sm text-foreground leading-relaxed">Charged on: {strategy}.</p>
          )}
          <ul className="space-y-1">
            {assumptions.map((a, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Charge row                                                          */
/* ------------------------------------------------------------------ */

const COLUMNS = 9;

const ChargeRow: React.FC<{
  charge: FeeCharge;
  expanded: boolean;
  onToggle: () => void;
}> = ({ charge, expanded, onToggle }) => {
  const isCredit = charge.status === "reversal";
  const isSuperseded = charge.status === "reversed";
  const shape = basisShape(charge.basisDetail, charge.eventType, charge.status);
  const dedupe = shape === "pc" ? dedupeView(charge.basisDetail) : null;
  const deduction = dedupe?.deduction ?? 0;

  // A credit is shown with an explicit minus. The payload is all-positive, so
  // the sign is authored here from `status` and nowhere else.
  const sign = isCredit ? "−" : "";
  const amountClass = isCredit
    ? "text-green-700"
    : isSuperseded
    ? "text-muted-foreground line-through"
    : "text-foreground";

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors ${
          expanded ? "bg-muted/50" : "hover:bg-muted/50"
        } ${isSuperseded ? "opacity-60" : ""}`}
      >
        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
          <div className="flex items-center gap-2">
            <DisclosureChevron
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
              aria-hidden="true"
            />
            <span className="tabular-nums">{shortDate(charge.createdAt)}</span>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
          <div className="flex items-center gap-2">
            <span>{charge.sourceRef || "—"}</span>
            {isCredit && (
              <Badge variant="success" className="gap-1">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Credit
              </Badge>
            )}
            {isSuperseded && <Badge variant="neutral">Reversed</Badge>}
            {charge.capReached && <Badge variant="warning">Cap reached</Badge>}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
          {EVENT_LABEL[charge.eventType] ?? charge.eventType}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground tabular-nums">
          {money(charge.baseAmount)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums">
          {deduction > 0 ? (
            <span className="text-foreground">−{money(deduction)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums ${amountClass}`}>
          {sign}
          {money(charge.feeAmount)}
        </td>
        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums ${amountClass}`}>
          {sign}
          {money(charge.vatAmount)}
        </td>
        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums ${amountClass}`}>
          {sign}
          {money(charge.totalAmount)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground tabular-nums">
          {isCredit ? "—" : money(charge.runningTotal)}
        </td>
      </tr>
      {expanded && (
        <tr className={isSuperseded ? "opacity-60" : ""}>
          <td colSpan={COLUMNS} className="px-4 pb-4 pt-2">
            <Well>
              <BasisDetailView
                detail={charge.basisDetail}
                shape={shape}
                charge={charge}
              />
            </Well>
          </td>
        </tr>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Totals helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fold a set of charges the way the backend does: only `active` rows count
 * toward the fee, `reversal` rows are reported separately as credits, and
 * `reversed` rows count toward nothing at all (their credit already exists as
 * its own row, so netting them here would double-count).
 */
function foldTotals(charges: FeeCharge[]) {
  let fee = 0;
  let vat = 0;
  let credited = 0;
  for (const c of charges) {
    if (c.status === "active") {
      fee += c.feeAmount;
      vat += c.vatAmount;
    } else if (c.status === "reversal") {
      credited += c.totalAmount;
    }
  }
  return { fee, vat, total: fee + vat, credited };
}

/* ------------------------------------------------------------------ */
/* Table shells                                                        */
/* ------------------------------------------------------------------ */

const HEADERS: { label: string; align?: "right" }[] = [
  { label: "Date" },
  { label: "Source" },
  { label: "Event" },
  { label: "Base", align: "right" },
  { label: "De-duplication", align: "right" },
  { label: "Fee", align: "right" },
  { label: "VAT", align: "right" },
  { label: "Total", align: "right" },
  { label: "Running total", align: "right" },
];

const TableHead: React.FC = () => (
  <thead className="bg-muted/50">
    <tr>
      {HEADERS.map((h) => (
        <th
          key={h.label}
          scope="col"
          className={`px-4 py-3 text-xs text-muted-foreground font-normal whitespace-nowrap ${
            h.align === "right" ? "text-right" : "text-left"
          }`}
        >
          {h.label}
        </th>
      ))}
    </tr>
  </thead>
);

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const PlatformFees: React.FC = () => {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const numericProjectId = parseInt(projectId, 10) || null;

  // PERMISSION — see the TODO at the tab gate in src/pages/finance.tsx.
  // Repeated here so the component is not safe only by virtue of where it is
  // mounted, but this remains a client-side gate over a server endpoint that
  // does not enforce it.
  const canView = usePermission("finance.approve_payment", numericProjectId);

  const [view, setView] = useState<"charges" | "statements">("charges");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading, isError } = useFetch<FeesResponse>(
    projectId && canView ? `cost-ledger/fees/?project_id=${projectId}` : "",
    { enabled: !!projectId && canView }
  );

  const charges = useMemo(() => data?.calculatedFees ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return charges;
    return charges.filter(
      (c) =>
        (c.sourceRef || "").toLowerCase().includes(q) ||
        (EVENT_LABEL[c.eventType] ?? c.eventType).toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        statementPeriod(c.createdAt).label.toLowerCase().includes(q)
    );
  }, [charges, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /**
   * Statement periods. Presentational only — the backend has no period field
   * on a charge, so this groups on `createdAt`, the date the fee accrued.
   * Newest period first, matching the charge list's ordering.
   */
  const periods = useMemo(() => {
    const map = new Map<string, { label: string; charges: FeeCharge[] }>();
    for (const c of filtered) {
      const { key, label } = statementPeriod(c.createdAt);
      if (!map.has(key)) map.set(key, { label, charges: [] });
      map.get(key)!.charges.push(c);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, v]) => ({ key, ...v, totals: foldTotals(v.charges) }));
  }, [filtered]);

  const toggle = (id: number) => setExpanded((cur) => (cur === id ? null : id));

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    setExpanded(null);
  };

  /* ---- gates ---- */

  if (!canView) {
    return (
      <main className="pt-6">
        <EmptyState
          icon={Lock}
          title="Platform fees are not visible to your role"
          description="The platform fee is billed to the employer. Ask a project administrator if you need sight of it."
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
          description="Platform fees are billed per project. Select a project to see what has accrued on it."
        />
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="pt-6">
        <AwesomeLoader compact message="Totalling platform fees" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="pt-6">
        <EmptyState
          icon={Receipt}
          title="Platform fees could not be loaded"
          description="The fee ledger did not respond. Reload the page, and if it persists the charges remain recorded against the cost ledger in the meantime."
        />
      </main>
    );
  }

  const { config, totals } = data;

  if (!config.configured) {
    return (
      <main className="pt-6">
        <EmptyState
          icon={Receipt}
          title="Billing is not enabled for this project"
          description="No platform fee configuration exists here, so nothing has accrued and nothing will. Fees begin accruing on approved variations and posted certificates once billing is switched on for the project."
        />
      </main>
    );
  }

  const capUsagePct =
    totals.cap && totals.cap > 0
      ? Math.min(100, (totals.feeExVat / totals.cap) * 100)
      : null;

  return (
    <main className="pt-6 space-y-6">
      {/* Header stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Fee excluding VAT"
          value={formatZAR(totals.feeExVat)}
          meta={`Charged at ${pct(config.feeRatePct)} of approved commercial flow`}
        />
        <StatCard label={`VAT at ${pct(config.vatRatePct)}`} value={formatZAR(totals.vat)} />
        <StatCard
          label="Total charged"
          value={formatZAR(totals.total)}
          meta={
            totals.reversed > 0
              ? `${formatZAR(totals.reversed)} credited back separately`
              : "No credits raised"
          }
        />
        {totals.cap === null ? (
          <StatCard
            label="Fee cap"
            value="None set"
            meta="Fees accrue without a ceiling on this project"
          />
        ) : (
          <StatCard
            label="Cap headroom"
            value={formatZAR(Math.max(totals.capRemaining ?? 0, 0))}
            meta={
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      totals.capReached ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${capUsagePct ?? 0}%` }}
                  />
                </div>
                <p className="tabular-nums">
                  {formatZAR(totals.feeExVat)} of {formatZAR(totals.cap)}
                  {totals.capReached ? " — cap reached" : ""}
                </p>
              </div>
            }
          />
        )}
      </div>

      {/* Configuration line — what the client is actually signed up to */}
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-sm text-foreground leading-relaxed">
          The platform fee is {pct(config.feeRatePct)} plus VAT on{" "}
          {strategyLabel(config.feeBase)?.toLowerCase() ??
            "approved variations and posted certificates"}
          . Where a variation is later certified inside a payment certificate, its value is deducted
          from that certificate's base so the same rand is charged once and the effective rate stays
          at {pct(config.feeRatePct)}.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
          {!config.enabled && (
            <p className="text-xs text-muted-foreground">
              Billing is configured but currently paused — no new fees are accruing.
            </p>
          )}
          {config.billingContactName && (
            <p className="text-xs text-muted-foreground">
              Billing contact: {config.billingContactName}
              {config.billingContactEmail ? ` (${config.billingContactEmail})` : ""}
            </p>
          )}
          {config.feeBaseIsPlaceholder && (
            <p className="text-xs text-muted-foreground">
              The fee base on this project is a shipped default, not a negotiated term.
            </p>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={onSearch}
            placeholder="Search by certificate, variation or period..."
            className="w-full h-10 pl-9 pr-4 text-sm border border-border rounded-lg bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50" role="tablist">
          {(["charges", "statements"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => {
                setView(v);
                setExpanded(null);
              }}
              className={`h-8 px-3 rounded-md text-sm transition-colors ${
                view === v
                  ? "bg-card text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "charges" ? "Charges" : "Statements"}
            </button>
          ))}
        </div>
      </div>

      {/* Charges — flat, paginated */}
      {view === "charges" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="min-w-full divide-y divide-border">
              <TableHead />
              <tbody className="bg-card divide-y divide-border">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS}>
                      {search ? (
                        <EmptyState
                          variant="plain"
                          size="sm"
                          title="No charges match this search"
                          description="Try a different certificate or variation reference, or clear the search to see every fee raised on this project."
                        />
                      ) : (
                        <EmptyState
                          variant="plain"
                          size="sm"
                          icon={FileText}
                          title="No platform fees have accrued yet"
                          description="A fee is raised when a variation order is approved or a payment certificate is posted. Nothing has reached either point on this project."
                        />
                      )}
                    </td>
                  </tr>
                ) : (
                  paginated.map((c) => (
                    <ChargeRow
                      key={c.id}
                      charge={c}
                      expanded={expanded === c.id}
                      onToggle={() => toggle(c.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {filtered.length === 0
                ? "No results"
                : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                    safePage * PAGE_SIZE,
                    filtered.length
                  )} of ${filtered.length}`}
            </p>
            <div className="flex items-center gap-1">
              <button
                aria-label="Previous page"
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setExpanded(null);
                }}
                disabled={safePage === 1}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground tabular-nums px-2">
                {safePage} / {totalPages}
              </span>
              <button
                aria-label="Next page"
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  setExpanded(null);
                }}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statements — grouped by the month the fee accrued in */}
      {view === "statements" && (
        <div className="space-y-4">
          {periods.length === 0 ? (
            <div className="bg-card border border-border rounded-xl">
              <EmptyState
                variant="plain"
                icon={FileText}
                title={search ? "No charges match this search" : "No statement periods yet"}
                description={
                  search
                    ? "Clear the search to see every period in which a fee was raised."
                    : "Periods appear here once a fee has been raised. Each groups the charges that accrued in a calendar month."
                }
              />
            </div>
          ) : (
            periods.map((p) => (
              <div key={p.key} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3 border-b border-border">
                  <div className="flex items-baseline gap-3">
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {p.charges.length} {p.charges.length === 1 ? "charge" : "charges"}
                    </p>
                  </div>
                  <p className="text-sm text-foreground tabular-nums">
                    {formatZAR(p.totals.total)}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formatZAR(p.totals.fee)} fee + {formatZAR(p.totals.vat)} VAT
                      {p.totals.credited > 0
                        ? `, ${formatZAR(p.totals.credited)} credited`
                        : ""}
                      )
                    </span>
                  </p>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="min-w-full divide-y divide-border">
                    <TableHead />
                    <tbody className="bg-card divide-y divide-border">
                      {p.charges.map((c) => (
                        <ChargeRow
                          key={c.id}
                          charge={c}
                          expanded={expanded === c.id}
                          onToggle={() => toggle(c.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Statement periods are a presentational grouping by the calendar month in which each fee
            accrued. Charges are not assigned to a billing period on the record itself, so a period
            subtotal is not an invoice. Reversed charges are excluded from a subtotal; the credit
            that reversed them is shown separately, so no amount is counted twice.
          </p>
        </div>
      )}

      {/* Footing note — the arithmetic the whole screen rests on */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Every amount above is positive on the record; a credit is identified by its status, not by
        its sign. The fee total counts live charges only — a charge that has been reversed drops out
        of the total and out of the cap, and its credit is reported separately.
      </p>
    </main>
  );
};

export default PlatformFees;
