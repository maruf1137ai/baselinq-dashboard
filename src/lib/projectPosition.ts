/**
 * The commercial position of a project, and the indicators over it.
 *
 * This is the arithmetic behind the client's three Project Health blocks —
 * *Financial Overview*, *Current Certificate* and *Key Indicators* — kept pure
 * and out of the components for the same reason `homeSignals.ts` and
 * `homeIndicators.ts` are: a figure with commercial consequence should be
 * testable without mounting a page.
 *
 * ── The rule every function here obeys ────────────────────────────────────
 *
 * **An absent figure is absent, not zero.** A zero is an assertion — "nothing
 * is being held back", "no variation is waiting" — and asserting it over data
 * we were never served, or were not entitled to, is the precedent this
 * codebase already has a scar from: the risk cell once rendered "Open risk
 * signals 0" to a viewer who simply lacked permission to see the twelve that
 * existed. Every builder below returns `null` where it cannot speak, and the
 * call sites drop the row rather than printing a confident nought.
 *
 * ── Colour means state ────────────────────────────────────────────────────
 *
 * `tone` is only ever `red` or `amber` where something has actually breached
 * something — a due date that has passed, a rule that has fired. A pending
 * variation is not a breach; it is work in progress, and it is neutral. This
 * is the inversion the previous build had: a count in red beside a real
 * tolerance breach in grey.
 *
 * ── What the client drew that is NOT here, and why ────────────────────────
 *
 *  1. **"70% Spent" and "65% Complete" gauges, and the "Program Progress"
 *     line.** Baselinq records no measure of physical completion. There is no
 *     field, on any model, that says how much of the works has been built. The
 *     previous homepage approximated it from elapsed calendar time and that was
 *     removed as a fabrication; approximating it again here, on the page whose
 *     whole claim is that its numbers are real, would be worse.
 *
 *  2. **"Retention Status: Retention at Limit".** Retention HELD is real and
 *     comes off the posted certificates. A LIMIT is not: `Project` carries
 *     `retention_rate` — the percentage withheld — and nothing that caps the
 *     accumulated total. `retentionIndicator` therefore reports the amount and
 *     the rate and says nothing about a ceiling, because saying "at limit"
 *     would mean inventing the limit it is at.
 */

import { formatZAR } from "./formatCurrency";
import type { MoneyPosition } from "./homeSignals";
import type { RetentionPosition, VariationPosition } from "./homeIndicators";

// ── Financial Overview ────────────────────────────────────────────────────

export interface OverviewRow {
  key: string;
  label: string;
  /** Formatted for display, or null when the figure cannot be stated. */
  value: string | null;
  /** True for the two rows the client marks as auto-calculated. */
  derived: boolean;
  /** How it was derived — shown against the derived rows so the sum is checkable. */
  formula?: string;
  caveat?: string;
}

/**
 * The client's six financial fields, in his order.
 *
 * Rows 3 and 6 are the two he marks auto-calculated, and they are the two this
 * codebase got wrong: `Revised Contract Sum` did not exist at all, and
 * `Balance` was `contract sum − certified`, which ignored both the variations
 * that raised the sum and the retention that is not available to certify. Both
 * now come off `summariseMoney`, which is the single place either is computed.
 *
 * Every figure traces to one of two responses:
 *
 *   Original Contract Sum        `projects/{id}/`      → contractValue
 *   Approved Variations to Date  `tasks/variation-orders/` (+ the VO
 *                                assignment tasks, merged) → grandTotal on the
 *                                rows whose status is approved/closed
 *   Revised Contract Sum         derived: 1 + 2
 *   Payments Certified to Date   `tasks/payment-certificates/?projectId={id}`
 *                                → Σ claimAmount over POSTED certificates
 *   Retention Held               same response → Σ retentionAmount over POSTED
 *   Balance Remaining            derived: 3 − 4 − 5
 */
export function financialOverview(money: MoneyPosition): OverviewRow[] {
  const zar = (n: number | null) => (n === null ? null : formatZAR(n));

  return [
    {
      key: "original",
      label: "Original contract sum",
      value: zar(money.contractSum),
      derived: false,
      caveat:
        "Project.contract_value. A variation signed through the sign-and-issue " +
        "flow is added to this field by the server, so on a project that uses " +
        "that flow it is the sum as already amended.",
    },
    {
      key: "variations",
      label: "Approved variations to date",
      value: zar(money.variations),
      derived: false,
      caveat:
        money.variationCount > 0
          ? `${money.variationCount} approved variation${money.variationCount === 1 ? "" : "s"}. Variations still awaiting a decision are not in this figure.`
          : undefined,
    },
    {
      key: "revised",
      label: "Revised contract sum",
      value: zar(money.revisedContractSum),
      derived: true,
      formula: "original + approved variations",
    },
    {
      key: "certified",
      label: "Payments certified to date",
      value: zar(money.certified),
      derived: false,
      caveat:
        "Value of work certified, excluding VAT, across posted certificates. " +
        "A commercial measure, not physical progress.",
    },
    {
      key: "retention",
      label: "Retention held",
      value: zar(money.retentionHeld),
      derived: false,
      caveat: "Withheld against defects liability across posted certificates.",
    },
    {
      key: "balance",
      label: "Balance remaining",
      value: zar(money.balance),
      derived: true,
      formula: "revised sum − certified − retention",
    },
  ];
}

// ── Current Certificate ───────────────────────────────────────────────────

export interface CertificateAdjustmentsLike {
  claimAmount?: number | null;
  netAmount?: number | null;
  penalties?: number | null;
  advanceRecovery?: number | null;
  retentionRelease?: number | null;
  escalationAmount?: number | null;
}

export interface AdjustmentComponent {
  label: string;
  /** Signed as it enters the certificate — negative reduces what is payable. */
  amount: number;
}

export interface CertificateAdjustments {
  /** The signed sum of the components. Negative reduces the payment. */
  total: number;
  components: AdjustmentComponent[];
}

const num = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/**
 * The certificate's adjustments — the client's middle line, derived.
 *
 * ── The derivation, and why it is this one ────────────────────────────────
 *
 * `tasks/pc_integrity.py::recompute` is the single place certificate
 * arithmetic is defined on the server, and it is the only authority used here.
 * Its chain, verbatim from the source:
 *
 *     valuation     = Σ work thisPeriod + Σ included VO thisPeriod
 *                     + materials_on_site
 *     retention     = valuation × retention rate
 *     certified     = valuation − retention + retention_release + escalation
 *     subtotal      = certified − penalties
 *     vat_amount    = subtotal × vat rate
 *     total_payable = subtotal + vat − advance_recovery
 *
 *     claim_amount  = valuation − penalties − advance_recovery + escalation
 *     net_amount    = total_payable
 *
 * Four fields on the model are adjustments in the sense the client's block
 * means — discretionary amounts added to or taken off a certificate, as
 * against the valuation itself, the retention percentage and the tax. Their
 * signs are read straight off the chain above:
 *
 *     penalties          −   `subtotal = certified − penalties`
 *     advance_recovery   −   `total = subtotal + vat − advance`
 *     retention_release  +   `certified = valuation − retention + release …`
 *     escalation_amount  ±   already signed; CPAP is an index movement and a
 *                            deflationary period is genuinely negative
 *
 * So: `adjustments = −penalties − advance_recovery + retention_release
 * + escalation_amount`.
 *
 * ── The ambiguity, stated rather than papered over ────────────────────────
 *
 * **These three figures do not form a column that sums, and are not drawn as
 * one.** The client's mock stacks *This Period Certified*, *Adjustments* and
 * *Net Amount Payable* as though the first two add to the third. On this
 * schema they cannot:
 *
 *   · `claim_amount` ALREADY has penalties, advance recovery and escalation
 *     netted into it — three of the four adjustments are inside the top line
 *     before the middle line is read.
 *   · `retention_release` is the fourth and is NOT in `claim_amount`.
 *   · The gap between `claim_amount` and `net_amount` is
 *     `VAT + retention_release − retention`, which is dominated by tax and
 *     retention — neither of which is an adjustment, and retention has its own
 *     row in the Financial Overview above.
 *
 * There is no arrangement of the exposed fields that makes the client's three
 * lines a valid sum, and inventing an "adjustments" figure that closed the gap
 * would mean labelling VAT and retention as adjustments. So the three are
 * rendered as three stated facts, side by side, and never as an arithmetic
 * column with a rule above the total.
 *
 * Returns null when every component is zero — which is the case on every
 * certificate on the platform today bar one seeded row — so the block shows
 * two figures rather than a meaningless "R 0,00".
 */
export function certificateAdjustments(
  cert: CertificateAdjustmentsLike | null | undefined,
): CertificateAdjustments | null {
  if (!cert) return null;

  const components: AdjustmentComponent[] = [
    { label: "Penalties", amount: -num(cert.penalties) },
    { label: "Advance recovery", amount: -num(cert.advanceRecovery) },
    { label: "Retention release", amount: num(cert.retentionRelease) },
    { label: "Escalation", amount: num(cert.escalationAmount) },
  ].filter((c) => c.amount !== 0);

  if (components.length === 0) return null;

  return {
    total: components.reduce((s, c) => s + c.amount, 0),
    components,
  };
}

// ── Payment delay ─────────────────────────────────────────────────────────

/** One certificate's payment position, as `tasks/payments.py` returns it. */
export interface PaymentPositionLike {
  pcNumber?: string | null;
  paymentCertificateId?: number;
  isOverdue?: boolean;
  daysPastDue?: number;
  outstandingAmount?: string | number | null;
  due?: {
    dueDate?: string | null;
    computable?: boolean;
    basis?: string;
    basisIsContractual?: boolean;
    warning?: string | null;
    reason?: string | null;
  } | null;
}

export interface ProjectPaymentSummaryLike {
  overdueCount?: number;
  overdueTotal?: string | number | null;
  certificates?: PaymentPositionLike[];
}

export interface PaymentDelay {
  /** The certificate that is furthest past its due date. */
  ref: string;
  days: number;
  dueDate: string | null;
  /** How many certificates on the project are overdue, this one included. */
  overdueCount: number;
  /**
   * False when the due date was counted from the certificate date or the
   * posting date rather than the contractual date FOR issue. The caller must
   * surface this — the fallback can only ever run in the employer's favour.
   */
  basisIsContractual: boolean;
  warning: string | null;
}

/**
 * The worst payment delay on the project, off the server's own derivation.
 *
 * **Nothing is recomputed here.** `tasks/payment_terms.py` already resolves the
 * payment period from `ProjectPaymentTerms` — 14 calendar days from the date
 * FOR issue for a private JBCC contract, 21 for an Organ of State, 28 for GCC,
 * and no default at all for NEC4 or FIDIC because there is no defensible one —
 * applies the South African working-day calendar from `risk/timebars.py` where
 * the period is in working days, and returns `daysPastDue` with the basis it
 * used. Re-deriving any of that in the browser would be a second implementation
 * of a rule that decides whether a contractor may claim interest.
 *
 * Endpoint: `GET projects/{id}/payments/`, which the server independently gates
 * on `finance.view`.
 *
 * Returns null when nothing is overdue, which is a different statement from
 * "no delay figure could be computed" and is rendered as an absent row rather
 * than a zero.
 */
export function worstPaymentDelay(
  summary: ProjectPaymentSummaryLike | null | undefined,
): PaymentDelay | null {
  const rows = summary?.certificates ?? [];
  const overdue = rows.filter((r) => r.isOverdue && (r.daysPastDue ?? 0) > 0);
  if (overdue.length === 0) return null;

  const worst = overdue.reduce((a, b) => ((b.daysPastDue ?? 0) > (a.daysPastDue ?? 0) ? b : a));

  return {
    ref: worst.pcNumber || `PC-${worst.paymentCertificateId ?? "?"}`,
    days: worst.daysPastDue ?? 0,
    dueDate: worst.due?.dueDate ?? null,
    overdueCount: summary?.overdueCount ?? overdue.length,
    basisIsContractual: worst.due?.basisIsContractual ?? false,
    warning: worst.due?.warning ?? null,
  };
}

// ── Key Indicators ────────────────────────────────────────────────────────

export type IndicatorTone = "red" | "amber" | "neutral";

export interface Indicator {
  key: string;
  label: string;
  /** The state, in as few words as carry it. Never a bare number. */
  state: string;
  /** Coloured ONLY where something has breached something. */
  tone: IndicatorTone;
  /** A second line, where one is needed to keep the state honest. */
  detail?: string;
  caveat?: string;
}

export interface IndicatorInputs {
  variations: VariationPosition | null;
  paymentDelay: PaymentDelay | null;
  /** True once the payments endpoint has answered, so silence can be told from absence. */
  paymentsAnswered: boolean;
  retention: RetentionPosition | null;
  riskCounts: { red: number; orange: number; total: number } | null;
  /** True when the risk engine did not respond — never renders as "clear". */
  riskUnavailable: boolean;
  /** Finance-gated indicators are built only for a viewer holding finance.view. */
  canViewFinance: boolean;
}

/**
 * The client's four Key Indicators, each a label and a state.
 *
 * Order is his, and it is a good one: the two that can be breached lead, and
 * the quiet tail follows. An indicator with nothing behind it is dropped from
 * the list entirely — a project with no variations does not get a row reading
 * "0 pending", which would be an assertion, and a viewer without `finance.view`
 * does not get the three financial rows at all.
 */
export function buildKeyIndicators(input: IndicatorInputs): Indicator[] {
  const out: Indicator[] = [];

  // ── Payment delay ──────────────────────────────────────────────────────
  // First, because it is the only one of the four that is money already lost.
  if (input.canViewFinance && input.paymentDelay) {
    const d = input.paymentDelay;
    out.push({
      key: "payment-delay",
      label: "Payment delay",
      state: `${d.days} day${d.days === 1 ? "" : "s"} overdue`,
      tone: "red",
      detail:
        d.overdueCount > 1
          ? `${d.ref} is the worst of ${d.overdueCount} overdue certificates`
          : `${d.ref}${d.dueDate ? `, due ${d.dueDate}` : ""}`,
      // The fallback basis can only ever move a due date LATER, i.e. in the
      // employer's favour, so a reader must be told when it was used.
      caveat: d.basisIsContractual
        ? "Counted from the date for issue the contract fixes."
        : (d.warning ??
          "Counted from a fallback date because no date for issue is recorded."),
    });
  }

  // ── Risk alerts ────────────────────────────────────────────────────────
  // Not finance-gated: it is the risk engine's own count, and this page is
  // already gated on compliance.view.
  if (input.riskUnavailable) {
    out.push({
      key: "risk",
      label: "Risk alerts",
      state: "Unknown",
      tone: "amber",
      detail: "The risk engine did not respond",
      caveat: "Treat this project's risk posture as unknown, not as clear.",
    });
  } else if (input.riskCounts) {
    const c = input.riskCounts;
    out.push({
      key: "risk",
      label: "Risk alerts",
      state:
        c.total === 0
          ? "Clear"
          : c.red > 0
            ? `${c.red} critical`
            : `${c.orange} warning`,
      tone: c.red > 0 ? "red" : c.orange > 0 ? "amber" : "neutral",
      detail:
        c.total === 0
          ? undefined
          : `${c.red} critical · ${c.orange} warning`,
    });
  }

  // ── Outstanding variations ─────────────────────────────────────────────
  // NEUTRAL. A variation awaiting a decision is work in progress, not a
  // breach, and colouring it would be exactly the inversion this page is
  // being corrected for.
  if (input.canViewFinance && input.variations && input.variations.total > 0) {
    const v = input.variations;
    out.push({
      key: "variations",
      label: "Outstanding variations",
      state: v.outstanding === 0 ? "All decided" : `${v.outstanding} pending`,
      tone: "neutral",
      detail:
        v.outstandingValue !== null
          ? `${formatZAR(v.outstandingValue)} awaiting a decision`
          : `of ${v.total} raised`,
      caveat:
        v.drafts > 0
          ? `${v.drafts} further in draft — the raiser's own unfinished work, not waiting on anyone.`
          : undefined,
    });
  }

  // ── Retention ──────────────────────────────────────────────────────────
  // NEUTRAL, always. The client's mock reads "Retention at Limit" in amber and
  // there is no limit on this schema to be at — see the header of this file.
  if (input.canViewFinance && input.retention && input.retention.held !== null) {
    const r = input.retention;
    out.push({
      key: "retention",
      label: "Retention held",
      state: formatZAR(r.held as number),
      tone: "neutral",
      detail: r.ratePct === null ? undefined : `withheld at ${r.ratePct}%`,
      caveat:
        "Withheld across posted certificates. No retention limit is recorded " +
        "on this contract, so no limit is stated.",
    });
  }

  return out;
}
