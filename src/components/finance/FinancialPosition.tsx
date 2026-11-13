/**
 * Financial Position — the client's one page about money (plan, page 5).
 *
 * What the contract is worth, what has been certified, what has been paid,
 * what is owed and when, and what is coming. Every figure comes from one
 * server payload (GET projects/<id>/financial-position/, tasks/
 * financial_position.py) and states its VAT basis: the contract excluding
 * VAT, the money including it. The original contract sum is always shown as
 * agreed, beside the revised sum (client decision, 10 Nov 2026).
 *
 * Rendered as the first Finance tab and, for printing, on its own at
 * /finance/statement.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/dateUtils";
import { formatMoney, formatZAR, getActiveCurrency } from "@/lib/formatCurrency";
import { BALANCE_LABEL } from "@/lib/homeSignals";
import { fetchData } from "@/lib/Api";
import { Pager, pageOf } from "@/components/ui/pager";
import { BankChangeCheck, type BankChange } from "./BankChangeCheck";
import { UnverifiedNote } from "./UnverifiedMark";
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

/** "0,75%": a fee rate as the client reads it (two places, unlike `pct`). */
const feePct = (rate: string | number): string =>
  `${Number(rate).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}%`;

/**
 * The fee panel's title, with the rate only when every charge shares one. It
 * said "(1%)" always, but a rate below 1% can be approved (board approval,
 * 10 Nov 2026), and a client on 0,75% saw 1% on their own statement.
 */
const feeRateTitle = (items: { feeRatePct?: string | number | null }[]): string => {
  const rates = new Set(items.map((i) => i.feeRatePct).filter((r) => r != null).map((r) => Number(r)));
  return rates.size === 1 ? `Baselinq fees (${feePct([...rates][0])})` : "Baselinq fees";
};

export interface FinancialPositionData {
  projectId?: number;
  projectName: string;
  asAt: string;
  contract: {
    originalContractSum: string;
    revisedContractSum: string;
    signedVariations: string;
    awaitingSignature: { count: number; valueExclVat: string };
    certifiedToDate: string;
    /** Posted certificates only; certifiedToDate adds unlinked ledger credits (cost_ledger/totals.py). */
    certifiedFromCertificates?: string;
    ledgerCredits?: { count: number; total: string };
    ledgerDebits?: { count: number; total: string };
    certifiedPct: number | null;
    /** Revised − certified − unlinked ledger debits. Negative when over-certified. */
    remainingToCertify: string;
    certificatesPosted: number;
    contractEndDate: string | null;
  };
  money: {
    /** What the posted certificates made payable, incl. VAT: paid + outstanding. */
    certifiedPayableInclVat?: string;
    paidInclVat: string;
    outstandingInclVat: string;
    overdueInclVat: string;
    overdueCount: number;
    overpaidInclVat: string;
    unverifiedCount: number;
    paymentsRecorded: number;
    /** Recorded by the employer, not yet confirmed by the contractor. */
    awaitingConfirmationCount?: number;
  };
  dueNext: {
    paymentCertificateId: number;
    pcNumber: string;
    outstanding: string;
    dueDate: string | null;
    overdue: boolean;
    daysPastDue: number;
    /**
     * False when no date for issue is recorded, so the due date is counted
     * from the certificate (or posting) date: an estimate, which can only run
     * late (tasks/payment_terms.py::issue_basis).
     */
    dueBasisIsContractual?: boolean;
    taxInvoice: "draft" | "issued" | null;
  }[];
  comingUp: {
    nextValuationDate: string | null;
    signedVariationsAwaitingCertification: { count: number; remainingExclVat: string };
    certificatesInProgress: { paymentCertificateId: number; pcNumber: string; state: string; payable: string | null }[];
    forecast: { explanation: string; months: { month: string; amountExclVat: string }[] } | null;
  };
  fees: {
    items: {
      source: string;
      baseExclVat?: string;
      feeRatePct?: string;
      totalInclVat: string;
      state: "accrued" | "invoiced" | "paid";
      invoiceId: number | null;
      invoiceNumber: string | null;
      dueOn: string | null;
    }[];
    totals: { accruedInclVat: string; invoicedInclVat: string; paidInclVat: string; outstandingInclVat: string };
    /** The rate new fees are charged at now (negotiated, else the platform default). */
    currentRatePct?: string;
  } | null;
  history: { date: string; text: string; kind: string; refId: number }[];
  /**
   * What needs doing now, detected live by the same rules that notify
   * (backend risk/rules/, via tasks/financial_position.py::_alerts).
   * No longer in the financial-position payload (null there): the page reads
   * them a page at a time from financial-position/alerts/ (NeedsAttentionPanel).
   */
  alerts?: {
    code: string;
    title: string;
    severity: "red" | "orange" | "green";
    /** How long it has stood, where the rule counts one; the server sorts on it. */
    days?: number | null;
    /** FINANCE_SETUP_INCOMPLETE: the settings still missing. */
    missing?: string[] | null;
    /** PAYMENT_OVERDUE: late-payment interest so far, where the terms provide for it. */
    interest?: string | null;
    /** PAYMENT_OVERDUE: false when some months had no repo rate, so the interest is a floor. */
    interestComplete?: boolean | null;
    /** PAYMENT_OVERDUE: false when the due date is estimated from the certificate date. */
    dueBasisIsContractual?: boolean | null;
    /** BANK_DETAILS_CHANGED: the change to verify, masked (tasks/bank_details.py). */
    bankChange?: BankChange;
    sourceType: string | null;
    sourceId: number | null;
  }[] | null;
  /**
   * A non-rand project's headline figures in rand at the latest day's rate
   * (backend project/currency.py). Null for a rand project.
   */
  homeEquivalent?: {
    currency: string;
    available: boolean;
    rate?: string;
    asOf?: string | null;
    source?: string | null;
    revisedContractSum?: string;
    certifiedToDate?: string;
    paidInclVat?: string;
    outstandingInclVat?: string;
  } | null;
  /** Who the statement is between, for the printed version. */
  parties?: {
    employer: string | null;
    contractor: string | null;
    contractForm: string | null;
    projectNumber: string | null;
  };
}

type Alert = NonNullable<FinancialPositionData["alerts"]>[number];

/** Where each alert is acted on, and what the reader does there. */
function alertAction(a: Alert): { to: string; label: string } {
  const pc = a.sourceType === "paymentcertificate" && a.sourceId;
  const vo = a.sourceType === "variationorder" && a.sourceId;
  switch (a.code) {
    case "PAYMENT_UNCONFIRMED":
      return { to: `/finance?tab=Payment%20Certificates&pc=${a.sourceId}`, label: "Confirm receipt" };
    case "PAYMENT_OVERDUE":
    case "PAYMENT_DUE":
      return { to: pc ? `/finance?tab=Payment%20Certificates&pc=${a.sourceId}` : "/finance", label: "Open certificate" };
    case "TAX_INVOICE_MISSING":
      return { to: `/finance?tab=Payment%20Certificates&pc=${a.sourceId}`, label: "Tax invoice" };
    case "VARIATION_UNSIGNED":
      return { to: `/finance?tab=Variation%20Orders&vo=${a.sourceId}`, label: "Sign" };
    case "VARIATION_UNCERTIFIED":
      return { to: `/finance?tab=Variation%20Orders&vo=${a.sourceId}`, label: "Open variation" };
    case "FINANCE_SETUP_INCOMPLETE":
      return { to: "/settings/contract-payment", label: "Complete settings" };
    case "LEDGER_OVER_CERTIFIED":
      return { to: "/finance?tab=Cost%20Ledger", label: "Review entries" };
    case "VALUATION_COMING":
    case "CERTIFICATE_LATE":
      return { to: "/finance?tab=Payment%20Certificates", label: "Certificates" };
    default:
      return {
        to: pc ? `/finance?tab=Payment%20Certificates&pc=${a.sourceId}` : vo ? `/finance?tab=Variation%20Orders&vo=${a.sourceId}` : "/finance",
        label: "Open",
      };
  }
}

/** The line as read: a settings alert names what is missing on a second line, not in one run-on title. */
function alertText(a: Alert): { main: string; sub?: string } {
  if (a.code === "FINANCE_SETUP_INCOMPLETE" && a.missing?.length) {
    return {
      main: `Contract & payment settings: ${a.missing.length} missing`,
      sub: a.missing.join(", "),
    };
  }
  if (a.code === "PAYMENT_OVERDUE" && a.interest && Number(a.interest) > 0) {
    // A floor when a month's repo rate is missing, and counted from an
    // estimated due date unless the date for issue is recorded: both travel
    // with the figure, as they do on the certificate.
    const floor = a.interestComplete === false ? "at least " : "";
    const basis = a.dueBasisIsContractual === false ? " · due date estimated from the certificate date" : "";
    return { main: a.title, sub: `Interest to date ${floor}${formatMoney(Number(a.interest))}${basis}` };
  }
  return { main: a.title };
}

/** One page of alerts, as GET projects/<id>/financial-position/alerts/ returns it. */
export interface AlertsPage {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: { red: number; orange: number };
  results: Alert[];
}

/**
 * The "Needs attention" box: compact rows, worst first, a page at a time.
 * Presentational; NeedsAttentionPanel fetches the pages.
 */
export function NeedsAttention({
  alerts,
  total = alerts.length,
  counts,
  page = 1,
  pageSize = alerts.length,
  totalPages = 1,
  onPage,
  loading = false,
}: {
  alerts: Alert[];
  total?: number;
  counts?: { red: number; orange: number };
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPage?: (page: number) => void;
  loading?: boolean;
}) {
  const [verifying, setVerifying] = useState<BankChange | null>(null);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, from + alerts.length - 1);
  return (
    <section className="rounded-xl border border-border bg-card" aria-label="Needs attention">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Needs attention ({total})</h3>
        {counts && (counts.red > 0 || counts.orange > 0) && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {counts.red > 0 && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-destructive" />
                {counts.red} urgent
              </span>
            )}
            {counts.orange > 0 && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {counts.orange} to watch
              </span>
            )}
          </span>
        )}
        {totalPages > 1 && onPage && (
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <span className="mr-1 tabular-nums">
              {from}–{to} of {total}
            </span>
            <button
              type="button"
              aria-label="Previous alerts"
              disabled={page <= 1 || loading}
              onClick={() => onPage(page - 1)}
              className="rounded p-1 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next alerts"
              disabled={page >= totalPages || loading}
              onClick={() => onPage(page + 1)}
              className="rounded p-1 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <ul className={`divide-y divide-border ${loading ? "opacity-60" : ""}`}>
        {alerts.map((a) => {
          const action = alertAction(a);
          const text = alertText(a);
          return (
            <li key={`${a.code}:${a.sourceId ?? ""}`} className="flex items-start gap-2.5 px-4 py-1.5 text-[13px] leading-5">
              <AlertTriangle
                aria-hidden
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${a.severity === "red" ? "text-destructive" : "text-amber-600"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="text-foreground">{text.main}</span>
                {text.sub && <span className="block text-xs text-muted-foreground">{text.sub}</span>}
              </span>
              {a.bankChange ? (
                <button
                  type="button"
                  onClick={() => setVerifying(a.bankChange ?? null)}
                  className="shrink-0 whitespace-nowrap text-xs font-medium text-foreground hover:underline"
                >
                  {a.bankChange.check?.outcome === "not_genuine"
                    ? "Details…"
                    : a.bankChange.canVerify === true
                      ? "Verify…"
                      : "View…"}
                </button>
              ) : (
                <Link to={action.to} className="shrink-0 whitespace-nowrap text-xs font-medium text-foreground hover:underline">
                  {action.label} →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {verifying && <BankChangeCheck change={verifying} onClose={() => setVerifying(null)} />}
    </section>
  );
}

export const ALERTS_PAGE_SIZE = 5;

/**
 * Needs attention, read from the server a page at a time
 * (GET projects/<id>/financial-position/alerts/) so a project with dozens of
 * alerts sends five, not all of them. ``codes`` limits it to those alerts.
 * Renders nothing while there is nothing to do.
 */
export function NeedsAttentionPanel({ projectId, codes }: { projectId: string | number; codes?: string[] }) {
  const [page, setPage] = useState(1);
  const codeParam = codes?.length ? `&codes=${encodeURIComponent(codes.join(","))}` : "";
  const url = `projects/${projectId}/financial-position/alerts/?page=${page}&pageSize=${ALERTS_PAGE_SIZE}${codeParam}`;
  const { data, isFetching, isPlaceholderData } = useQuery<AlertsPage>({
    queryKey: [url],
    queryFn: () => fetchData(url),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });
  if (!data || data.count === 0) return null;
  return (
    <NeedsAttention
      alerts={data.results}
      total={data.count}
      counts={data.counts}
      page={data.page}
      pageSize={data.pageSize}
      totalPages={data.totalPages}
      onPage={setPage}
      loading={isFetching && isPlaceholderData}
    />
  );
}

const zar = (v: string | number) => formatMoney(Number(v));
/** Whole rands, for the headline figures (as on the approved page); the tables keep cents. */
const zarWhole = (v: string | number) => formatMoney(Math.round(Number(v))).replace(/,00$/, "");
/** 71,7 — the same decimal comma as the money. */
const pct = (n: number) => `${n.toLocaleString("en-ZA", { maximumFractionDigits: 1 })}%`;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** One figure in the headline strip. */
function Figure({
  label,
  value,
  meta,
  alarm,
}: {
  label: string;
  value: string | number;
  meta: React.ReactNode;
  alarm?: boolean;
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        title={zar(value)}
        className={`mt-1 whitespace-nowrap text-xl font-semibold tabular-nums ${alarm ? "text-destructive" : "text-foreground"}`}
      >
        {zarWhole(value)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}

/** A labelled row of four figures, divided — the strip on the approved page. */
function FigureRow({ basis, children }: { basis: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="border-b border-border bg-muted/30 px-5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {basis}
      </p>
      <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4 print:grid-cols-4">{children}</div>
    </div>
  );
}

const daysUntil = (iso: string, asAt: string) =>
  Math.round((Date.parse(iso) - Date.parse(asAt)) / 86_400_000);

const monthLabel = (ym: string) =>
  new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

function Panel({ title, footer, children }: { title: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 break-inside-avoid">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      {children}
      {footer}
    </section>
  );
}

/** Rows per page in each box of the statement. The printed statement lists everything. */
const PANEL_PAGE_SIZE = 5;

/** A page of a box's rows, plus its pager; everything at once when printing (linkable = false). */
function usePanelPage<T>(items: T[], linkable: boolean) {
  const [page, setPage] = useState(1);
  const size = linkable ? PANEL_PAGE_SIZE : Math.max(1, items.length);
  const p = pageOf(items, page, size);
  const footer = linkable ? (
    <Pager compact page={p.page} pageSize={p.pageSize} count={p.count} totalPages={p.totalPages} onPage={setPage} />
  ) : null;
  return { rows: p.rows, footer };
}

const CERT_STATE: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted, awaiting approval",
  approved: "Approved, awaiting posting",
};

const TAX_INVOICE_LABEL = { issued: "Tax invoice issued", draft: "Tax invoice not issued" } as const;
const FEE_STATE = {
  paid: { label: "Paid", variant: "success" },
  invoiced: { label: "Invoiced", variant: "info" },
  accrued: { label: "Not yet invoiced", variant: "neutral" },
} as const;

export function FinancialPositionView({ data, linkable = true }: { data: FinancialPositionData; linkable?: boolean }) {
  const c = data.contract;
  const m = data.money;
  const coming = data.comingUp;
  const ledgerCredits = Number(c.ledgerCredits?.total ?? 0);
  const ledgerDebits = Number(c.ledgerDebits?.total ?? 0);
  const overCertified = Number(c.remainingToCertify) < 0;
  const dueNext = usePanelPage(data.dueNext, linkable);
  const fees = usePanelPage(data.fees?.items ?? [], linkable);
  const history = usePanelPage(data.history, linkable);
  type ComingRow =
    | { kind: "pc"; pc: FinancialPositionData["comingUp"]["certificatesInProgress"][number] }
    | { kind: "forecast"; f: { month: string; amountExclVat: string } };
  const comingRows: ComingRow[] = [
    ...coming.certificatesInProgress.map((pc) => ({ kind: "pc" as const, pc })),
    ...(coming.forecast?.months ?? []).map((f) => ({ kind: "forecast" as const, f })),
  ];
  const comingPage = usePanelPage(comingRows, linkable);
  const feeStates = new Set(fees.rows.map((f) => f.state));
  // Every row in the same state: say it once, not five badges.
  const sameFeeState = feeStates.size === 1 ? [...feeStates][0] : null;
  const maxForecast = Math.max(1, ...(coming.forecast?.months ?? []).map((x) => Number(x.amountExclVat)));
  // "Contractual" only when every late certificate's due date is: JBCC counts
  // from the date FOR issue, captured almost nowhere, and the fallback (the
  // certificate date) is an estimate.
  const overdueEstimated = data.dueNext.some((r) => r.overdue && r.dueBasisIsContractual !== true);
  const certLink = (id: number, label: string) =>
    linkable ? (
      <Link to={`/finance?tab=Payment%20Certificates&pc=${id}`} className="text-foreground hover:underline">
        {label}
      </Link>
    ) : (
      label
    );

  return (
    <div className="space-y-5">
      {m.unverifiedCount > 0 && <UnverifiedNote count={m.unverifiedCount} />}

      <section className="overflow-hidden rounded-xl border border-border bg-card break-inside-avoid" aria-label="The figures">
        <FigureRow basis="The contract · excl. VAT">
          <Figure label="Original contract sum" value={c.originalContractSum} meta="As agreed · fixed once work is certified" />
          <Figure
            label="Revised contract sum"
            value={c.revisedContractSum}
            meta={Number(c.signedVariations) !== 0 ? `Original + ${zarWhole(c.signedVariations)} signed` : "No signed variations yet"}
          />
          <Figure
            label="Certified to date"
            value={c.certifiedToDate}
            meta={
              overCertified
                ? "Exceeds the revised sum"
                : `${c.certifiedPct === null ? "No revised sum to measure against" : `${pct(c.certifiedPct)} of the revised sum`} · ${plural(c.certificatesPosted, "certificate")}`
            }
          />
          <Figure
            label={BALANCE_LABEL}
            value={c.remainingToCertify}
            alarm={overCertified}
            meta={overCertified ? "Over-certified — see below" : "Revised sum less certified"}
          />
        </FigureRow>
        <div className="border-t border-border">
          <FigureRow basis="Money · incl. VAT">
            <Figure
              label="Certified payable"
              value={m.certifiedPayableInclVat ?? Number(m.paidInclVat) + Number(m.outstandingInclVat)}
              meta="On posted certificates, after retention"
            />
            <Figure
              label="Paid"
              value={m.paidInclVat}
              meta={`${m.paymentsRecorded} payment${m.paymentsRecorded === 1 ? "" : "s"} recorded${
                (m.awaitingConfirmationCount ?? 0) > 0 ? ` · ${m.awaitingConfirmationCount} awaiting the contractor` : ""
              }`}
            />
            <Figure
              label="Outstanding"
              value={m.outstandingInclVat}
              meta={
                Number(m.overpaidInclVat) > 0
                  ? `${zarWhole(m.overpaidInclVat)} overpaid is held as credit`
                  : `${data.dueNext.length} certificate${data.dueNext.length === 1 ? "" : "s"} to pay`
              }
            />
            <Figure
              label="Overdue"
              value={m.overdueInclVat}
              alarm={m.overdueCount > 0}
              meta={
                m.overdueCount === 0
                  ? "Nothing late"
                  : overdueEstimated
                    ? `${m.overdueCount} past the due date (estimated: no date for issue recorded)`
                    : `${m.overdueCount} past the contractual due date`
              }
            />
          </FigureRow>
        </div>
      </section>

      {data.homeEquivalent && (
        <p className="text-xs text-muted-foreground">
          {data.homeEquivalent.available ? (
            <>
              {/* Two VAT bases on one line, so each figure says its own: the
                  contract figures exclude VAT, the money includes it. */}
              In rand: revised sum {formatZAR(Number(data.homeEquivalent.revisedContractSum))} excl. VAT · certified{" "}
              {formatZAR(Number(data.homeEquivalent.certifiedToDate))} excl. VAT · paid{" "}
              {formatZAR(Number(data.homeEquivalent.paidInclVat))} incl. VAT · outstanding{" "}
              {formatZAR(Number(data.homeEquivalent.outstandingInclVat))} incl. VAT. At 1 {getActiveCurrency()} = R{" "}
              {Number(data.homeEquivalent.rate).toLocaleString("en-ZA", { maximumFractionDigits: 4 })}
              {data.homeEquivalent.asOf ? `, ${formatDate(data.homeEquivalent.asOf)}` : ""}
              {data.homeEquivalent.source ? ` (${data.homeEquivalent.source})` : ""} — a guide; the contract is in{" "}
              {getActiveCurrency()}.
            </>
          ) : (
            <>No exchange rate to rand has been fetched yet, so no rand equivalent is shown.</>
          )}
        </p>
      )}

      {/* Under the figures, in the app only: the printed statement is the client's record, not a to-do list. */}
      {linkable && data.projectId != null && <NeedsAttentionPanel projectId={data.projectId} />}

      {(ledgerCredits > 0 || ledgerDebits > 0) && (
        <section
          className={`rounded-lg border px-4 py-3 text-sm break-inside-avoid ${overCertified ? "border-amber-200 bg-amber-50 text-amber-950" : "border-border bg-card"}`}
          aria-label="What certified to date is made of"
        >
          <p className="flex items-center gap-2 font-medium">
            {overCertified && <AlertTriangle aria-hidden className="h-4 w-4 text-amber-600" />}
            {overCertified
              ? "Certified to date is more than the contract sum because of Cost Ledger entries"
              : "Certified to date includes Cost Ledger entries"}
          </p>
          <dl className="mt-2 grid max-w-xl grid-cols-[1fr_auto] gap-x-8 gap-y-1 tabular-nums">
            <dt>From certificates ({c.certificatesPosted})</dt>
            <dd className="text-right">{zar(c.certifiedFromCertificates ?? 0)}</dd>
            {ledgerCredits > 0 && (
              <>
                <dt>Cost Ledger credits on no certificate ({c.ledgerCredits?.count})</dt>
                <dd className="text-right">{zar(ledgerCredits)}</dd>
              </>
            )}
            {ledgerDebits > 0 && (
              <>
                <dt>Cost Ledger costs on no variation, off the balance ({c.ledgerDebits?.count})</dt>
                <dd className="text-right">{zar(ledgerDebits)}</dd>
              </>
            )}
          </dl>
          {linkable && (
            <Link to="/finance?tab=Cost%20Ledger" className="mt-2 inline-block font-medium hover:underline">
              Review the Cost Ledger entries →
            </Link>
          )}
        </section>
      )}
      {c.awaitingSignature.count > 0 && (
        <p className="text-xs text-muted-foreground">
          {zar(c.awaitingSignature.valueExclVat)} approved, awaiting signature ({c.awaitingSignature.count}). Not in the
          contract sum until signed.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2 print:grid-cols-2">
        <div className="space-y-5">
          <Panel title="Due next" footer={dueNext.footer}>
            {data.dueNext.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is owed on issued certificates.</p>
            ) : (
              <ul className="divide-y divide-border">
                {dueNext.rows.map((r) => {
                  const days = r.dueDate ? daysUntil(r.dueDate, data.asAt) : null;
                  return (
                    <li
                      key={r.paymentCertificateId}
                      className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-2 text-sm"
                    >
                      <span className="whitespace-nowrap font-medium">{certLink(r.paymentCertificateId, r.pcNumber)}</span>
                      <span className="min-w-0">
                        <span className={r.overdue ? "text-destructive" : "text-muted-foreground"}>
                          {r.dueDate ? `Due ${formatDate(r.dueDate)}` : "Due date not set"}
                          {r.overdue
                            ? ` · ${plural(r.daysPastDue, "day")} past due`
                            : days === 0
                              ? " · due today"
                              : days !== null && days > 0
                                ? ` · in ${plural(days, "day")}`
                                : ""}
                          {r.dueDate && r.dueBasisIsContractual === false && (
                            <span className="block text-xs text-muted-foreground">Estimated: no date for issue recorded</span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {linkable ? (
                            <Link to={`/finance?tab=Payment%20Certificates&pc=${r.paymentCertificateId}`} className="hover:underline">
                              {r.taxInvoice ? TAX_INVOICE_LABEL[r.taxInvoice] : "No tax invoice yet"} →
                            </Link>
                          ) : r.taxInvoice ? (
                            TAX_INVOICE_LABEL[r.taxInvoice]
                          ) : (
                            "No tax invoice yet"
                          )}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-right tabular-nums">{zar(r.outstanding)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Coming up" footer={comingPage.footer}>
            <ul className="divide-y divide-border text-sm">
              <li className="flex justify-between gap-4 py-2">
                <span>Next valuation</span>
                <span className="text-muted-foreground">
                  {coming.nextValuationDate ? (
                    formatDate(coming.nextValuationDate)
                  ) : linkable ? (
                    <Link to="/settings/contract-payment" className="underline">
                      Set the certificate issue day
                    </Link>
                  ) : (
                    "Not set"
                  )}
                </span>
              </li>
              <li className="flex justify-between gap-4 py-2">
                <span>
                  Signed variations awaiting certification
                  {coming.signedVariationsAwaitingCertification.count > 0 && ` (${coming.signedVariationsAwaitingCertification.count})`}
                </span>
                <span className={coming.signedVariationsAwaitingCertification.count > 0 ? "tabular-nums" : "text-muted-foreground"}>
                  {coming.signedVariationsAwaitingCertification.count > 0
                    ? zar(coming.signedVariationsAwaitingCertification.remainingExclVat)
                    : "None"}
                </span>
              </li>
              {comingPage.rows.map((row) =>
                row.kind === "pc" ? (
                  <li key={`pc-${row.pc.paymentCertificateId}`} className="flex justify-between gap-4 py-2">
                    <span>
                      {certLink(row.pc.paymentCertificateId, row.pc.pcNumber)}{" "}
                      <span className="text-muted-foreground">· {CERT_STATE[row.pc.state] ?? row.pc.state}</span>
                    </span>
                    <span className="whitespace-nowrap tabular-nums">
                      {row.pc.payable ? zar(row.pc.payable) : "—"}
                      {row.pc.payable && <span className="ml-1 text-xs text-muted-foreground">incl. VAT</span>}
                    </span>
                  </li>
                ) : (
                  <li key={`forecast-${row.f.month}`} className="flex items-center justify-between gap-4 py-2">
                    <span>Forecast: {monthLabel(row.f.month)}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{zar(row.f.amountExclVat)}</span>
                      <span className="hidden sm:block h-2 w-24 rounded bg-muted" aria-hidden="true">
                        <span
                          className="block h-2 rounded bg-muted-foreground/40"
                          style={{ width: `${(Number(row.f.amountExclVat) / maxForecast) * 100}%` }}
                        />
                      </span>
                    </span>
                  </li>
                ),
              )}
            </ul>
            {coming.forecast && <p className="mt-2 text-xs text-muted-foreground">{coming.forecast.explanation}</p>}
          </Panel>
        </div>

        <div className="space-y-5">
          {data.fees && (
            <Panel
              title={
                data.fees.currentRatePct != null
                  ? `Baselinq fees (${Number(data.fees.currentRatePct).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}%)`
                  : feeRateTitle(data.fees.items)
              }
              footer={fees.footer}
            >
              <p className="text-sm">
                <span className="tabular-nums font-medium">{zar(data.fees.totals.accruedInclVat)}</span>{" "}
                <span className="text-muted-foreground">
                  accrued incl. VAT · {zar(data.fees.totals.paidInclVat)} paid · {zar(data.fees.totals.outstandingInclVat)} invoiced and unpaid
                  {sameFeeState && ` · ${FEE_STATE[sameFeeState].label.toLowerCase()}`}
                </span>
              </p>
              {data.fees.items.length > 0 && (
                <ul className="mt-2 divide-y divide-border text-sm">
                  {/* Paged five at a time; the invoices are in Settings → Billing. */}
                  {fees.rows.map((f, i) => (
                    <li key={`${f.source}-${i}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        {f.source}
                        {f.baseExclVat && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {f.feeRatePct != null ? `${feePct(f.feeRatePct)} of ` : "On "}
                            {zar(f.baseExclVat)}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="whitespace-nowrap tabular-nums">{zar(f.totalInclVat)}</span>
                        {!sameFeeState && (
                          <Badge variant={FEE_STATE[f.state].variant} className="w-28 justify-center">
                            {FEE_STATE[f.state].label}
                          </Badge>
                        )}
                        {linkable && f.invoiceId && (
                          <Link to={`/invoices/${f.invoiceId}`} className="text-xs text-muted-foreground hover:underline">
                            {f.invoiceNumber ?? "Invoice"}
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {linkable && (
                <Link to="/settings/billing" className="mt-2 inline-block text-xs text-muted-foreground hover:underline">
                  All fees and invoices
                </Link>
              )}
            </Panel>
          )}

          <Panel title="History" footer={history.footer}>
            {data.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No certificates, payments or signed variations yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {history.rows.map((h, i) => (
                  <li key={`${h.kind}-${h.refId}-${i}`} className="flex gap-4 py-2">
                    <span className="w-24 shrink-0 text-muted-foreground">{formatDate(h.date)}</span>
                    <span>{h.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function FinancialPositionError() {
  return (
    <EmptyState
      icon={AlertCircle}
      title="The financial position could not be loaded"
      description="This is a loading problem, not a statement that nothing is owed. Try again shortly."
    />
  );
}
