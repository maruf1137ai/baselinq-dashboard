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

import { formatMoney } from "./formatCurrency";
import {
  BALANCE_LABEL,
  certificateIsCertified,
  type CertificateLike,
  type MoneyPosition,
} from "./homeSignals";
import type { RetentionPosition, VariationPosition } from "./homeIndicators";

// ── What the certificate rows say about their own basis ───────────────────

export interface CertificateBasis {
  /**
   * Σ `retention_release` over posted certificates, or null where no posted
   * certificate carries the field at all — which is a different statement from
   * "nothing has been released" and must not be rendered as a zero.
   */
  retentionReleased: number | null;
  /**
   * How many posted certificates had no `claimAmount` and so contributed a
   * VAT-INCLUSIVE figure to the certified total through `certifiedValueOf`'s
   * legacy fallback.
   */
  vatInclusiveRows: number;
  /** Posted certificates counted, so the mix can be described honestly. */
  certifiedRows: number;
}

/** Rows carry more than `CertificateLike` declares; these are the extras read here. */
type CertificateRow = CertificateLike & { retentionRelease?: number | null };

/**
 * Two facts about the posted certificates that `summariseMoney` does not
 * report, and that the Financial Overview must not state a figure without.
 *
 * Neither is recomputed money — this only reads fields the payload already
 * carries, so that the rows above can say what basis they are on.
 */
export function summariseCertificateBasis(
  certificates: CertificateRow[] | null | undefined,
): CertificateBasis {
  const posted = (certificates ?? []).filter(certificateIsCertified);

  const withRelease = posted.filter(
    (c) => typeof c.retentionRelease === "number" && Number.isFinite(c.retentionRelease),
  );

  return {
    retentionReleased:
      withRelease.length === 0
        ? null
        : withRelease.reduce((s, c) => s + (c.retentionRelease as number), 0),
    // `certifiedValueOf` is `claimAmount ?? totalPayable ?? netAmount ?? 0`.
    // The two fallbacks are VAT-inclusive; a row that took one of them put a
    // figure on a different basis into the same total.
    vatInclusiveRows: posted.filter(
      (c) => typeof c.claimAmount !== "number" && (c.totalPayable != null || c.netAmount != null),
    ).length,
    certifiedRows: posted.length,
  };
}

/**
 * Retention held, less what has been released.
 *
 * Null in, null out. A null `released` means no posted certificate carried the
 * field, so the gross figure is returned unchanged and the caller states that
 * releases could not be read rather than implying there were none.
 */
export function netRetentionHeld(
  held: number | null,
  released: number | null,
): number | null {
  if (held === null) return null;
  if (released === null) return held;
  // A release cannot take the balance below nothing; `pc_integrity` already
  // bounds `retention_release` by `retention_held()` server-side, so a
  // negative here means the payload disagrees with itself, not that the
  // employer holds negative security.
  return Math.max(0, held - released);
}

// ── Financial Overview ────────────────────────────────────────────────────

export interface OverviewRow {
  key: string;
  label: string;
  /** Formatted for display, or null when the figure cannot be stated. */
  value: string | null;
  /** True for the two rows the client marks as auto-calculated. */
  derived: boolean;
  /** A short line the reader sees under the figure, in plain words. */
  note?: string;
  /**
   * How it was derived — shown against a derived row so the reader can check
   * it. Present ONLY where the stated working is actually true of the figure.
   * A formula that does not hold is worse than no formula: it invites the
   * reader to stop checking. See the `revised` row.
   */
  formula?: string;
  /** Hover detail. Never the only place a correctness problem is stated. */
  caveat?: string;
  /**
   * A known problem with this figure, rendered VISIBLY under the label rather
   * than hidden in a tooltip. Reserved for cases where the number on screen
   * may be wrong and the reader cannot tell from looking at it.
   */
  warning?: string;
}

/**
 * The client's six financial fields, in his order.
 *
 * Every figure traces to a named response:
 *
 *   Original contract sum   `projects/{id}/` → contractValue
 *   Approved variations     `tasks/variation-orders/` (+ the VO assignment
 *                           tasks, merged) → grandTotal on approved/closed rows
 *   Revised contract sum    derived: original + approved variations
 *   Certified to date       `tasks/payment-certificates/?projectId={id}`
 *                           → Σ claimAmount over POSTED certificates
 *   Retention held          same response → Σ retentionAmount − Σ
 *                           retentionRelease over POSTED certificates
 *   Balance still to certify  derived: revised − certified
 *
 * ── THE BALANCE, AND WHY IT IS `money.balance` AGAIN ──────────────────────
 *
 * `summariseMoney` used to return `revised − certified − retention`, which
 * deducts retention twice. Per the server chain in
 * `tasks/pc_integrity.py::recompute`, `claim_amount` is the VALUATION less
 * penalties and advance recovery — it is GROSS of retention; retention is
 * taken out further down the certificate, at line 4.0, on its way to what is
 * paid. So retention is a SUBSET of the certified total, not a quantity
 * sitting alongside it, and taking it off again removes the same rand twice.
 *
 * This file used to rebuild the figure locally and leave the shared derivation
 * wrong, on the grounds that changing it was not this page's call. The result
 * was that Home said R 1 590 000 and Project Health said R 2 000 000 for the
 * same project, one click apart. `summariseMoney` is fixed, so the local
 * rebuild is gone and both screens now read the same function AND the same
 * label — `BALANCE_LABEL`, which is exported for exactly that reason.
 *
 * There are two defensible figures and they answer different questions:
 *
 *   (a) BALANCE TO CERTIFY  = revised − certified.
 *       How much of the contract sum has not yet been certified. Retention has
 *       no place in it, because retention is withheld from money that has
 *       already been certified.
 *
 *   (b) CASH STILL TO FLOW  = revised − paid + retention due for release.
 *       What the contractor can still expect to receive.
 *
 * **(a) is what this page shows**, for the plain reason that (b) cannot be
 * computed from what the payload carries: nothing on the certificate list
 * distinguishes PAID from POSTED — `tasks/payment_terms.py` is explicit that
 * posted means certified, not paid — and no release schedule exists to say
 * when retention falls due. Guessing (b) from (a)'s inputs would be a cash
 * forecast with no cash data in it.
 *
 * So the row is labelled "Balance still to certify", not "Balance remaining":
 * the label says which of the two questions the number answers, and it is the
 * name the homepage uses for the same figure.
 */
export function financialOverview(
  money: MoneyPosition,
  basis?: CertificateBasis,
): OverviewRow[] {
  const zar = (n: number | null) => (n === null ? null : formatMoney(n));

  const retentionNet = netRetentionHeld(money.retentionHeld, basis?.retentionReleased ?? null);

  // (a) above, straight off the shared derivation. `summariseMoney` already
  // guards it on BOTH its inputs — null when the revised sum is unknown, and
  // null when the certificate list could not be READ, which is not the same
  // as a project with no posted certificate. Recomputing it here is how the
  // two screens drifted in the first place.
  const balanceToCertify = money.balance;

  const mixedBasis = (basis?.vatInclusiveRows ?? 0) > 0;

  return [
    {
      key: "original",
      label: "Original contract sum",
      value: zar(money.contractSum),
      derived: false,
      note: "As agreed. Fixed once work is certified.",
      caveat:
        "Project.total_budget: the sum agreed when the contract was let. The " +
        "server fixes it once a certificate is posted or a variation signed.",
    },
    {
      key: "variations",
      label: "Signed variations to date",
      value: zar(money.variations),
      derived: false,
      note:
        (money.awaitingSignatureCount ?? 0) > 0
          ? `${zar(money.awaitingSignatureValue ?? 0)} incl. VAT approved, awaiting signature (${money.awaitingSignatureCount}). Not in the contract sum until signed.`
          : undefined,
      caveat:
        "Revised contract sum less the original: what signed variations have " +
        "added to the contract. Variations still awaiting signature are not in it.",
    },
    {
      key: "revised",
      label: "Revised contract sum",
      value: zar(money.revisedContractSum),
      derived: true,
      // Stated only where it is exactly true: with the agreed original in the
      // payload, revised is the server's amended value and the variations line
      // is their difference. An older payload cannot show that.
      formula: money.originalAgreed ? "original contract sum + signed variations" : undefined,
      caveat: "Project.contract_value, which the server amends as each variation is signed.",
    },
    {
      key: "certified",
      // NOT "Payments certified to date". Nothing here has been PAID —
      // `tasks/payment_terms.py` is explicit that posting a certificate
      // certifies it and starts the payment clock. This is also the name the
      // homepage uses for the same number, so one figure now has one name.
      label: "Certified to date",
      value: zar(money.certified),
      derived: false,
      // Said on the screen, not only in the caveat: the Financial Position
      // shows the same split, so a reader can match the two figure for figure.
      note:
        (money.manualCredits ?? 0) > 0
          ? `${zar(money.certifiedFromCertificates ?? 0)} from certificates plus ${zar(money.manualCredits ?? 0)} of Cost Ledger credits with no certificate.`
          : undefined,
      warning: mixedBasis
        ? `${basis?.vatInclusiveRows} of ${basis?.certifiedRows} posted certificates carry no ex-VAT claim value, so their VAT-inclusive total is in this figure. It reads high against an ex-VAT contract sum.`
        : undefined,
      caveat:
        "Σ claim_amount over posted certificates, plus any Cost Ledger credit " +
        "entry not already linked to one of those certificates (a manual " +
        "entry, or one linked to a Variation Order instead). Certified, not " +
        "paid. A commercial measure, not physical progress.",
    },
    {
      key: "retention",
      label: "Retention held",
      value: zar(retentionNet),
      derived: false,
      // Stated as working only where the release figure was actually readable.
      formula:
        basis?.retentionReleased != null ? "withheld − released" : undefined,
      warning:
        basis && basis.retentionReleased === null && basis.certifiedRows > 0
          ? "No posted certificate carries a retention-release figure, so nothing has been deducted for releases. If retention has been released, this reads high."
          : undefined,
      caveat:
        "Withheld against defects liability across posted certificates, less " +
        "any retention_release on those certificates.",
    },
    {
      key: "balance",
      label: BALANCE_LABEL,
      value: zar(balanceToCertify),
      derived: true,
      formula: "revised sum minus certified to date minus unlinked Cost Ledger debits",
      // The Financial Position flags the same over-certified balance; say it
      // here too, where the entries that cause it are listed.
      warning:
        balanceToCertify !== null && balanceToCertify < 0
          ? "More is certified than the revised contract sum. Check the credits below with no linked certificate."
          : undefined,
      caveat:
        "What remains of the revised contract sum to be certified, less any " +
        "Cost Ledger debit entry not already linked to an approved Variation " +
        "Order (a manual cost eats into the balance immediately, not only " +
        "once certified). Retention is NOT deducted: it is withheld out of " +
        "value that has already been certified, so it is inside the certified " +
        "figure already. This is not cash still to flow — the payload does " +
        "not distinguish paid from posted, so that figure cannot be stated.",
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

/**
 * One certificate's payment position, as `tasks/payments.py` returns it —
 * `payment_position` in tasks/payment_terms.py:505.
 *
 * Every field is optional and every money field admits a string, because the
 * server sends money as decimal STRINGS and a field this file does not read
 * must not become a field a caller may assume. Nothing here is parsed into a
 * number until it is being rendered or compared.
 */
export interface PaymentPositionLike {
  pcNumber?: string | null;
  paymentCertificateId?: number;
  /** draft | submitted | approved | rejected | posted — the server's own value. */
  workflowState?: string | null;
  /** False until the certificate is posted; the summary only carries posted ones. */
  isPayable?: boolean;
  isOverdue?: boolean;
  daysPastDue?: number;
  certifiedAmount?: string | number | null;
  receivedAmount?: string | number | null;
  outstandingAmount?: string | number | null;
  /** Received above the certified amount. A credit on THIS certificate; never netted against another. */
  overpaidAmount?: string | number | null;
  /** On a negative certificate (JBCC 25.2), what the contractor owes the employer. */
  owedByContractor?: string | number | null;
  direction?: "employer_pays" | "contractor_pays";
  /**
   * "total_payable", or "net_amount_unverified" for a certificate saved before
   * its total was stored — that figure may exclude VAT.
   */
  certifiedBasis?: string;
  isFullySettled?: boolean;
  isPartlyPaid?: boolean;
  /** The server's sentence stating the calculation. Rendered verbatim, never paraphrased. */
  statement?: string | null;
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
  projectId?: number;
  /** The date every figure below is "as at" — the project's date, not the browser's. */
  asAt?: string | null;
  certificateCount?: number;
  certifiedTotal?: string | number | null;
  receivedTotal?: string | number | null;
  outstandingTotal?: string | number | null;
  /** Credits held on certificates paid above their amount, reported apart from what is owed. */
  overpaidTotal?: string | number | null;
  owedByContractorTotal?: string | number | null;
  /** Certificates whose amount predates stored totals and may exclude VAT. */
  unverifiedCount?: number;
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

// ── The payment register, row by row ──────────────────────────────────────

/**
 * Where one posted certificate stands, as a single word.
 *
 * Read off the server's own booleans rather than recomputed from the amounts.
 * `isFullySettled` is `outstanding <= 0` server-side, which is NOT the same
 * test as `receivedAmount === certifiedAmount`: an over-payment settles the
 * certificate, and a certificate certified at nil is settled with nothing
 * received. Deriving it here from the two amounts would disagree with the
 * figure printed beside it.
 *
 * "unknown" is its own answer and never collapses into "unpaid": a row whose
 * position the server could not state must not be presented as an unpaid
 * obligation.
 */
export type PaymentRowState =
  | "contractor_owes"
  | "overpaid"
  | "settled"
  | "overdue"
  | "partly"
  | "unpaid"
  | "unknown";

export function paymentRowState(row: PaymentPositionLike): PaymentRowState {
  // A negative certificate runs the other way. "Paid in full" — what it used
  // to read, because nothing is owed BY the employer — said the opposite of
  // the truth.
  if (row.direction === "contractor_pays") return "contractor_owes";
  if (row.isFullySettled === true) return Number(row.overpaidAmount) > 0 ? "overpaid" : "settled";
  // Overdue outranks partly paid: a part payment on a certificate that is past
  // its due date is still a certificate past its due date, and that is the
  // fact the reader is scanning for.
  if (row.isOverdue === true) return "overdue";
  if (row.isPartlyPaid === true) return "partly";
  if (row.isFullySettled === false) return "unpaid";
  return "unknown";
}

/**
 * The register's reading order: what somebody has to act on, first.
 *
 * Overdue certificates lead, longest-overdue first, because the number of days
 * is the only clock on this page that is running. Everything still owed
 * follows, largest balance first. Settled rows go last — they are the record,
 * not the work.
 *
 * Sorts a COPY. The array belongs to the query cache, and sorting it in place
 * mutates what every other consumer of that cache entry reads.
 */
export function sortPaymentPositions<T extends PaymentPositionLike>(rows: readonly T[]): T[] {
  const rank: Record<PaymentRowState, number> = {
    overdue: 0,
    partly: 1,
    unpaid: 1,
    contractor_owes: 1,
    unknown: 2,
    overpaid: 2,
    settled: 3,
  };
  const outstanding = (r: PaymentPositionLike) => {
    const n = Number(r.outstandingAmount);
    return Number.isFinite(n) ? n : 0;
  };
  return [...rows].sort((a, b) => {
    const ra = rank[paymentRowState(a)];
    const rb = rank[paymentRowState(b)];
    if (ra !== rb) return ra - rb;
    const da = a.daysPastDue ?? 0;
    const db = b.daysPastDue ?? 0;
    if (da !== db) return db - da;
    return outstanding(b) - outstanding(a);
  });
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
          ? "None detected"
          : c.red > 0
            ? `${c.red} critical`
            : `${c.orange} warning`,
      // NEUTRAL, ALWAYS. This is a COUNT, and a count is not a breach: "12"
      // painted red says nothing about what the twelve are, while the sentence
      // naming the actual breach sits in the feed below. The twelve are drawn
      // where they can be read — in the feed, under a tier heading that says
      // in words what they are. Colouring the tally as well would be the same
      // ink spent twice, on the less informative of the two.
      tone: "neutral",
      detail:
        c.total === 0
          ? "The engine found nothing; that is not the same as nothing being there"
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
          ? `${formatMoney(v.outstandingValue)} awaiting a decision`
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
      state: formatMoney(r.held as number),
      tone: "neutral",
      detail: r.ratePct === null ? undefined : `withheld at ${r.ratePct}%`,
      caveat:
        "Withheld across posted certificates, net of any retention released " +
        "on them. No retention limit is recorded on this contract, so no " +
        "limit is stated.",
    });
  }

  return out;
}
