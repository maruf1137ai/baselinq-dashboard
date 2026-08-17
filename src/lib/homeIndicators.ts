/**
 * Key indicators, and the certificate run behind them.
 *
 * The client's project-health mock carried a "Key Indicators" strip —
 * *Outstanding VOs · Payment Delay · Retention Status · Risk Alerts* — and a
 * "Payment Timeline" running across the certificate series. This file is the
 * arithmetic for both, kept pure and out of the components for the same reason
 * `homeSignals.ts` and `homeQueueRank.ts` are: a figure with commercial
 * consequence should be testable without mounting a page.
 *
 * ── What is deliberately absent ───────────────────────────────────────────
 *
 * Two of the mock's four indicators cannot be stated honestly from what
 * Baselinq holds, and there is no function for either:
 *
 *  1. **"Payment Delay: 10 Days Overdue".** There is no payment deadline on
 *     this project and no record of payment received. The schema does carry
 *     `PaymentCertificate.date_for_issue` — the date the contract FIXES for
 *     issue, from which JBCC runs its 14 calendar days — and a
 *     `ProjectPaymentTerms` row holding `payment_days`. Both are optional and
 *     neither is populated here: every certificate on project 45 has a null
 *     `dateForIssue`, and the project has no payment-terms row at all. What
 *     CAN be said is how long a certificate has sat awaiting certification,
 *     which is `elapsedAwaitingCertification` below — elapsed time, worded as
 *     elapsed time, measured from a date that is printed beside it so it can
 *     be checked. It is not a countdown and must never be styled as one.
 *
 *  2. **"Retention Status: At Limit".** Retention HELD is real and comes off
 *     the posted certificates. A LIMIT is not: `Project` carries
 *     `retention_rate` (the percentage withheld) and nothing that caps the
 *     accumulated total. `retentionPosition` therefore reports the amount and
 *     the rate, and says nothing about a ceiling.
 *
 * And the mock's second gauge — "65% Complete" — has no function here either,
 * for the reason given at the top of `homeSignals.ts`: Baselinq records no
 * physical progress, and the previous homepage's completion ring was elapsed
 * calendar time wearing that measure's clothes.
 */

import { certifiedValueOf, certificateIsCertified, daysUntil, variationValue } from "./homeSignals";
import type { CertificateLike } from "./homeSignals";

// ── Variations ────────────────────────────────────────────────────────────

/**
 * A variation as either route returns it.
 *
 * `tasks/variation-orders/` returns the VariationOrder itself, whose `status`
 * is the contractual one — Draft / Submitted / Under Review / Priced /
 * Recommended / Approved / Rejected / Closed. `tasks/tasks/?taskType=VO`
 * returns an ASSIGNMENT TASK wrapping it, whose `status` is a task lifecycle
 * (todo / in review / done) and is a weaker thing to count. Both are read; the
 * status sets below cover both vocabularies.
 */
export interface VariationRecord {
  id?: string | number;
  ref?: string | null;
  status?: string | null;
  value?: number | null;
  dateInstructed?: string | null;
}

/**
 * Settled: a decision has been taken and nothing further is awaited.
 * `done` and `completed` are the assignment task's words for the same thing.
 */
const VO_SETTLED = new Set([
  "approved",
  "rejected",
  "declined",
  "closed",
  "cancelled",
  "done",
  "completed",
]);

/**
 * Not yet raised. A draft is the raiser's own unfinished work — it is not
 * sitting with anybody — so it is counted separately rather than swept into
 * "outstanding", which would say two people are waiting when nobody is.
 */
const VO_DRAFT = new Set(["draft", "todo"]);

export interface VariationPosition {
  /** Every variation on the project, drafts included. */
  total: number;
  /** Raised and undecided — the figure the indicator leads with. */
  outstanding: number;
  /** Their combined value, or null when none of them carries one. */
  outstandingValue: number | null;
  /** Drafts, which are nobody's decision yet. */
  drafts: number;
  /** Settled either way. */
  settled: number;
}

const EMPTY_VARIATIONS: VariationPosition = {
  total: 0,
  outstanding: 0,
  outstandingValue: null,
  drafts: 0,
  settled: 0,
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * How many variations are waiting on a decision, and what they are worth.
 *
 * The value is null rather than zero when no outstanding variation carries a
 * `grandTotal`: a variation whose price has not been agreed is genuinely
 * unpriced, and "R0 outstanding" would read as "nothing at stake".
 */
export function summariseVariations(variations: VariationRecord[]): VariationPosition {
  if (variations.length === 0) return EMPTY_VARIATIONS;

  let outstanding = 0;
  let drafts = 0;
  let settled = 0;
  let value = 0;
  let priced = 0;

  for (const v of variations) {
    const status = norm(v.status);
    if (VO_SETTLED.has(status)) {
      settled += 1;
    } else if (VO_DRAFT.has(status)) {
      drafts += 1;
    } else {
      outstanding += 1;
      if (typeof v.value === "number" && Number.isFinite(v.value) && v.value !== 0) {
        value += v.value;
        priced += 1;
      }
    }
  }

  return {
    total: variations.length,
    outstanding,
    outstandingValue: priced > 0 ? value : null,
    drafts,
    settled,
  };
}

/** Normalise either route's payload into a `VariationRecord`. */
export function toVariationRecord(raw: any): VariationRecord {
  // The VariationOrder route puts everything at the top level. The assignment
  // task route nests the variation under `task` and puts the TASK's status at
  // the top level, so the variation's own status is preferred where present.
  const nested = raw?.task ?? null;
  return {
    id: raw?._id ?? raw?.id ?? raw?.taskId,
    ref: raw?.voNumber ?? nested?.voNumber ?? nested?.vo_number ?? null,
    status: nested?.status ?? raw?.status ?? null,
    value: variationValue({ grandTotal: raw?.grandTotal, task: nested }) || null,
    dateInstructed: raw?.dateInstructed ?? nested?.dateInstructed ?? null,
  };
}

// ── The certificate run ───────────────────────────────────────────────────

export interface CertificateRunEntry {
  id: number;
  /** "PC-004", or "PC-{id}" when the number was never set. */
  ref: string;
  /** The certificate's own date. Null where none was recorded. */
  date: string | null;
  /** Value of work certified on this certificate, or null. */
  amount: number | null;
  workflowState: string;
  /** True once posted — the only state that counts towards certified value. */
  certified: boolean;
  /** Certified value up to and including this entry. Null on entries that are not posted. */
  cumulative: number | null;
  /** This entry's amount as a share of the largest in the run, 0–100. */
  share: number;
}

export interface CertificateRun {
  /** Oldest first, by certificate date. Undated entries keep their input order at the end. */
  entries: CertificateRunEntry[];
  /** Certified to date — posted certificates only. Null when none is posted. */
  certified: number | null;
  /** Value on certificates raised but not yet posted. Null when there are none. */
  inFlight: number | null;
  /** Certificates with no date recorded, so the reader knows the series is incomplete. */
  undated: number;
}

const EMPTY_RUN: CertificateRun = { entries: [], certified: null, inFlight: null, undated: 0 };

/** Certificates that are out of the run entirely — no value is riding on them. */
const CERT_DEAD = new Set(["cancelled"]);

const time = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};

/**
 * The certificate series, in date order, with the running certified total.
 *
 * This is the client's "Payment Timeline" and it needs nothing Baselinq does
 * not already hold: every certificate carries a number, a date, an amount and
 * a workflow state.
 *
 * Three things it is careful about:
 *
 *  1. **Ordering is by `certificateDate`, not by id or by certificate number.**
 *     Certificate numbers are free text, and a run re-numbered mid-project
 *     would otherwise render out of sequence. Entries with no date cannot be
 *     placed, so they are kept in input order at the end and counted in
 *     `undated` rather than being quietly slotted somewhere plausible.
 *
 *  2. **`cumulative` is null on anything not posted.** A submitted certificate
 *     has not been certified, so adding it to the running total would state a
 *     certified figure that no principal agent has signed.
 *
 *  3. **`share` scales against the largest entry in the run, not against the
 *     contract sum.** It is there to make one month legible against another,
 *     which is what the reader is comparing, and it means the series reads the
 *     same whether there is one certificate or thirty.
 */
export function buildCertificateRun(certificates: CertificateLike[]): CertificateRun {
  const live = certificates.filter((c) => !CERT_DEAD.has(norm(c.workflowState)));
  if (live.length === 0) return EMPTY_RUN;

  const ordered = live
    .map((c, i) => ({ c, i, t: time(c.certificateDate) }))
    .sort((a, b) => {
      if (a.t === null && b.t === null) return a.i - b.i;
      if (a.t === null) return 1;
      if (b.t === null) return -1;
      if (a.t !== b.t) return a.t - b.t;
      return a.i - b.i;
    })
    .map(({ c }) => c);

  const amountOf = (c: CertificateLike): number | null => {
    const v = certifiedValueOf(c);
    return Number.isFinite(v) && v !== 0 ? v : null;
  };

  const largest = ordered.reduce((m, c) => Math.max(m, amountOf(c) ?? 0), 0);

  let running = 0;
  let inFlight = 0;
  let inFlightCount = 0;
  let posted = 0;

  const entries: CertificateRunEntry[] = ordered.map((c) => {
    const amount = amountOf(c);
    const certified = certificateIsCertified(c);
    if (certified) {
      running += amount ?? 0;
      posted += 1;
    } else if (amount !== null) {
      inFlight += amount;
      inFlightCount += 1;
    }
    return {
      id: c.id,
      ref: c.pcNumber || `PC-${c.id}`,
      date: c.certificateDate ?? null,
      amount,
      workflowState: c.workflowState ?? "draft",
      certified,
      cumulative: certified ? running : null,
      share: largest > 0 && amount !== null ? Math.round((amount / largest) * 100) : 0,
    };
  });

  return {
    entries,
    certified: posted > 0 ? running : null,
    inFlight: inFlightCount > 0 ? inFlight : null,
    undated: ordered.filter((c) => time(c.certificateDate) === null).length,
  };
}

// ── Awaiting certification ────────────────────────────────────────────────

export interface AwaitingCertification {
  ref: string;
  /** Whole days elapsed. Never negative — a future-dated certificate reads 0. */
  days: number;
  /** The date the count runs FROM, so the reader can check it. */
  since: string;
  /**
   * Which date that is. `certificate` is the certificate's own date;
   * `last-change` is when the row last moved, used only where no certificate
   * date was recorded. Named so the call site can word it accurately.
   */
  basis: "certificate" | "last-change";
}

/**
 * The certificate that has been awaiting certification longest.
 *
 * **This is elapsed time and nothing else.** There is no contractual clock on
 * it: see the note at the top of this file. The call site says "awaiting
 * certification for N days", never "N days overdue", and never renders it in a
 * severity colour — no deadline has been missed because no deadline exists.
 */
export function elapsedAwaitingCertification(
  certificates: CertificateLike[],
  now: Date = new Date(),
): AwaitingCertification | null {
  const waiting = certificates.filter((c) => norm(c.workflowState) === "submitted");
  if (waiting.length === 0) return null;

  const measured = waiting
    .map((c) => {
      const since = c.certificateDate ?? c.updatedAt ?? null;
      if (!since) return null;
      const d = daysUntil(since, now);
      if (d === null) return null;
      return {
        ref: c.pcNumber || `PC-${c.id}`,
        days: Math.max(0, -d),
        since,
        basis: (c.certificateDate ? "certificate" : "last-change") as "certificate" | "last-change",
      };
    })
    .filter(Boolean) as AwaitingCertification[];

  if (measured.length === 0) return null;
  return measured.sort((a, b) => b.days - a.days)[0];
}

// ── Retention ─────────────────────────────────────────────────────────────

export interface RetentionPosition {
  /** Retention withheld across posted certificates, or null when none is. */
  held: number | null;
  /** The contract's retention percentage, from `Project.retention_rate`. */
  ratePct: number | null;
}

/**
 * Retention held, and the rate it was withheld at.
 *
 * There is no ceiling here on purpose. The client's mock read "At Limit", and
 * `Project` carries no field a limit could come from — only `retention_rate`.
 * Stating a limit would mean inventing one.
 */
export function retentionPosition(project: any, held: number | null): RetentionPosition {
  const raw = project?.retentionRate ?? project?.retention_rate;
  const parsed = raw === null || raw === undefined || raw === "" ? NaN : Number(raw);
  return {
    held,
    ratePct: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
  };
}
