/**
 * Homepage derivations.
 *
 * Everything the homepage shows is computed here, as pure functions over API
 * payloads, so it can be unit-tested without mounting the page — the same
 * split `src/lib/compliance.ts` uses for the Compliance page.
 *
 * Two rules govern this file:
 *
 *  1. **Nothing is invented.** Every field read below exists on a real
 *     response. Where a figure is not available (physical % complete,
 *     cash-flow forecast, payment received, earned value, cost-to-complete)
 *     there is no function for it, deliberately.
 *
 *  2. **Elapsed calendar time is not progress.** The previous homepage drew a
 *     ring from `(now - start) / (end - start)` and labelled it as the
 *     project's completion — a project where nothing had been built read 50%
 *     at its halfway date. The only "percent" this file computes is
 *     `certifiedPct`: certified value against contract sum, which is a real
 *     commercial measure and is labelled as one at the call site.
 */

/** The permission code a block or queue item requires, or null for everyone. */
export type PermissionCode = "finance.view" | "finance.approve_payment" | null;

export type QueueKind =
  | "certificate"
  | "time-bar"
  | "rsvp"
  | "meeting-action"
  | "rejected"
  | "task";

/**
 * Rank order of the queue, worst-first. The brief's order: certificates
 * awaiting you, notices inside their deadline window, RSVPs pending, meeting
 * actions needing approval, rejected items, then tasks.
 */
const KIND_RANK: Record<QueueKind, number> = {
  certificate: 0,
  "time-bar": 1,
  rsvp: 2,
  "meeting-action": 3,
  rejected: 4,
  task: 5,
};

export interface QueueItem {
  key: string;
  kind: QueueKind;
  /** Names the next move, never the state. */
  headline: string;
  /** Clause, date or value behind the headline. Null when the API gave none. */
  detail: string | null;
  /** Days until the clock runs out. Negative is past. Null when no clock. */
  daysRemaining: number | null;
  overdue: boolean;
  href: string;
  /** Permission required to see this item at all. */
  requires: PermissionCode;
}

/** Whole days from today to `iso`, or null when unparseable. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return Math.round((startOfDay(then) - startOfDay(now.getTime())) / 86_400_000);
}

/** "in 3 days" / "today" / "6 days ago" — plain, British, no exclamation. */
export function relativeDays(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// ── Queue builders ────────────────────────────────────────────────────────
//
// Each builder takes one API payload and returns the items it justifies. They
// are separate so a failing source contributes nothing rather than collapsing
// the whole queue.

export interface CertificateLike {
  id: number;
  pcNumber?: string;
  netAmount?: number;
  totalPayable?: number;
  retentionAmount?: number;
  workflowState?: string;
  updatedAt?: string;
}

/**
 * Certificates sitting in a state that needs a human.
 *
 * `workflowState` is the only field every transition stamps — `approvalStatus`
 * is written once at creation and lies (see paymentCertificateTable.tsx).
 *
 * These are gated on `finance.view` because the row carries the certified
 * amount. Acting on them additionally needs `finance.approve_payment`.
 */
export function buildCertificateQueue(certificates: CertificateLike[]): QueueItem[] {
  return certificates
    .filter((c) => c.workflowState === "submitted" || c.workflowState === "approved")
    .map((c) => {
      const ref = c.pcNumber || `PC-${c.id}`;
      const awaitingCertification = c.workflowState === "submitted";
      return {
        key: `certificate-${c.id}`,
        kind: "certificate" as const,
        headline: awaitingCertification
          ? `Certify ${ref} — submitted and waiting on you`
          : `Post ${ref} to release payment`,
        detail: null,
        daysRemaining: null,
        overdue: false,
        href: "/finance",
        requires: "finance.view" as const,
      };
    });
}

/** Certificates the payer sent back. Real, and the most ignorable if unlisted. */
export function buildRejectedCertificateQueue(certificates: CertificateLike[]): QueueItem[] {
  return certificates
    .filter((c) => c.workflowState === "rejected")
    .map((c) => ({
      key: `rejected-certificate-${c.id}`,
      kind: "rejected" as const,
      headline: `${c.pcNumber || `PC-${c.id}`} was rejected — it needs reworking before it can be certified`,
      detail: null,
      daysRemaining: null,
      overdue: false,
      href: "/finance",
      requires: "finance.view" as const,
    }));
}

export interface TimeBarLike {
  id: number;
  label: string;
  clause_ref?: string;
  clause_verified?: boolean;
  contract_form?: string;
  deadline_date?: string;
  days_remaining: number;
  status: string;
}

/**
 * Contractual notice deadlines still open.
 *
 * The clause reference is only rendered when the backend verified it against
 * the contract corpus — an unverified clause number on a legally consequential
 * deadline is worse than none, which is the rule TimeBarsTab already follows.
 */
export function buildTimeBarQueue(bars: TimeBarLike[]): QueueItem[] {
  return bars
    .filter((b) => b.status === "open")
    .map((b) => {
      const days = b.days_remaining;
      const clause =
        b.clause_verified && b.clause_ref
          ? `${b.contract_form ?? ""} ${b.clause_ref}`.trim()
          : null;
      return {
        key: `time-bar-${b.id}`,
        kind: "time-bar" as const,
        headline:
          days < 0
            ? `Notice on ${b.label} passed its deadline ${Math.abs(days)} days ago`
            : `${days} days left to serve notice on ${b.label}`,
        detail: clause,
        daysRemaining: days,
        overdue: days < 0,
        href: "/project-health",
        requires: null,
      };
    });
}

export interface MeetingLike {
  id: number;
  title: string;
  status: string;
  artefact_status?: string;
  date?: string;
  time?: string;
  date_time?: string;
  scheduled_utc?: string;
  location?: string;
  attendees?: string[];
  extra_attendees?: number;
  my_rsvp?: string | null;
}

/**
 * Meetings the current user has been invited to but not answered.
 *
 * `my_rsvp` is resolved per-requesting-user by the server, so this is already
 * "mine" — there is no attendee array to match against.
 *
 * Note: no organiser or inviter name exists on any meeting payload, so this
 * headline names the meeting rather than a person. Inventing "Werner is
 * waiting on your RSVP" would mean rendering a name the API never gave us.
 */
export function buildRsvpQueue(meetings: MeetingLike[], now: Date = new Date()): QueueItem[] {
  return meetings
    .filter(
      (m) =>
        m.my_rsvp === "invited" &&
        (m.status === "scheduled" || m.status === "starting_soon" || m.status === "live"),
    )
    .map((m) => {
      const days = daysUntil(m.scheduled_utc || m.date, now);
      const when = relativeDays(days);
      return {
        key: `rsvp-${m.id}`,
        kind: "rsvp" as const,
        headline: `Reply to the invitation for ${m.title}`,
        detail: when ? `Meets ${when}` : null,
        daysRemaining: days,
        overdue: days !== null && days < 0,
        href: `/meetings/${m.id}`,
        requires: null,
      };
    });
}

export interface MeetingActionItemLike {
  id: number;
  text: string;
  state?: string | null;
  approved_at?: string | null;
  declined_at?: string | null;
  linked_task_id?: number | null;
  linked_task_type?: string | null;
  can_approve?: boolean;
}

/** Decided means decided — server state wins over the absent `state` field. */
export function actionItemIsPending(item: MeetingActionItemLike): boolean {
  if (item.approved_at || item.declined_at) return false;
  if (item.state === "approved" || item.state === "declined") return false;
  return true;
}

/**
 * Proposed actions from a meeting's notes that the current user may approve.
 *
 * `can_approve` is the backend's own rule (assignee, organiser, or PM/CPM/
 * CLIENT). When it is explicitly false the user would be 403'd, so the item is
 * not their job and is left out of their queue.
 */
export function buildMeetingActionQueue(
  meetings: { id: number; title: string; action_items?: MeetingActionItemLike[] }[],
): QueueItem[] {
  const out: QueueItem[] = [];
  for (const meeting of meetings) {
    const pending = (meeting.action_items ?? []).filter(
      (i) => actionItemIsPending(i) && i.can_approve !== false,
    );
    if (pending.length === 0) continue;
    out.push({
      key: `meeting-actions-${meeting.id}`,
      kind: "meeting-action",
      headline:
        pending.length === 1
          ? `Approve one action proposed in ${meeting.title}`
          : `Approve ${pending.length} actions proposed in ${meeting.title}`,
      detail:
        pending.length === 1
          ? pending[0].text
          : `Approving one raises it as a numbered instruction`,
      daysRemaining: null,
      overdue: false,
      href: `/meetings/${meeting.id}`,
      requires: null,
    });
  }
  return out;
}

export interface TaskLike {
  id: string;
  title: string;
  type?: string;
  due_date?: string | null;
  needsAction: boolean;
}

/** Tasks where the ball is in the current user's court. */
export function buildTaskQueue(tasks: TaskLike[], now: Date = new Date()): QueueItem[] {
  return tasks
    .filter((t) => t.needsAction)
    .map((t) => {
      const days = daysUntil(t.due_date, now);
      const overdue = days !== null && days < 0;
      const label = t.type ? `${t.type}: ${t.title}` : t.title;
      return {
        key: `task-${t.id}`,
        kind: "task" as const,
        headline: overdue
          ? `${label} — ${Math.abs(days as number)} days past its due date`
          : label,
        detail: days === null ? "No due date recorded" : `Due ${relativeDays(days)}`,
        daysRemaining: days,
        overdue,
        href: `/tasks/${t.id}`,
        requires: null,
      };
    });
}

/**
 * One ranked list. Overdue always floats above its own kind's on-time items,
 * because a passed deadline outranks a comfortable one of the same sort.
 */
export function rankQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    const rank = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (rank !== 0) return rank;
    const da = a.daysRemaining ?? Number.POSITIVE_INFINITY;
    const db = b.daysRemaining ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

/**
 * Resolve finance access for RENDERING, which is not the same question a route
 * gate asks.
 *
 * `usePermissions` deliberately returns `true` for every flag while the
 * effective-permission map is still in flight, so a page reload does not
 * bounce a legitimate user off a route they hold. That is the right default
 * for a redirect and the wrong one for a money block: it fails OPEN, so a
 * contractor without `finance.view` would get a flash of the contract sum and
 * the certified total before the map lands.
 *
 * Rendering fails CLOSED. A PM waits an extra moment for figures they are
 * entitled to; a contractor never sees figures they are not.
 *
 * Note these permissions are resolved per PROJECT (`permissions/effective/
 * ?project_id=`), off `ProjectTeamMember.role` — the same person can be a
 * Contractor on one job and a Client on another, so this must never be
 * inferred from the account role.
 */
export function resolveFinanceAccess(perms: {
  canViewFinance: boolean;
  canApprovePayment: boolean;
  isLoading: boolean;
}): { canViewFinance: boolean; canApprovePayment: boolean } {
  if (perms.isLoading) return { canViewFinance: false, canApprovePayment: false };
  return {
    canViewFinance: perms.canViewFinance,
    canApprovePayment: perms.canApprovePayment,
  };
}

export interface RiskSignalLike {
  category: "delay" | "financial" | "compliance" | "claim";
  status: string;
}

/**
 * Risk signals the viewer may see.
 *
 * Two separate gates apply:
 *
 *  - The strip as a whole is `compliance.view`, because that is what the
 *    `/project-health` route it links to is gated on (App.tsx). Showing a
 *    signal to someone who cannot open the page behind it is a dead end.
 *
 *  - `financial` signals additionally require `finance.view`: their titles and
 *    details carry certified values and contract-sum overruns, which is
 *    exactly the data a contractor is not entitled to. Note ProjectHealth
 *    itself is more permissive — it shows every category to anyone holding
 *    compliance.view. That divergence is real and should be settled on the
 *    page, not just worked around here.
 */
export function visibleRiskSignals<T extends RiskSignalLike>(
  signals: T[],
  held: { canViewCompliance: boolean; canViewFinance: boolean },
): T[] {
  if (!held.canViewCompliance) return [];
  return signals.filter(
    (s) => s.status === "open" && (s.category !== "financial" || held.canViewFinance),
  );
}

/** Drop everything the viewer is not permitted to see. */
export function filterQueueByPermission(
  items: QueueItem[],
  held: { canViewFinance: boolean },
): QueueItem[] {
  return items.filter((i) => {
    if (i.requires === "finance.view") return held.canViewFinance;
    return true;
  });
}

// ── Money ─────────────────────────────────────────────────────────────────

export interface MoneyPosition {
  /** Live contract value, kept in step by signed variations on the backend. */
  contractSum: number | null;
  /** Approved variations by value. */
  variations: number | null;
  variationCount: number;
  /** Value certified to date — posted certificates only. */
  certified: number | null;
  retentionHeld: number | null;
  /** Contract sum less certified. Not a forecast; not cost-to-complete. */
  balance: number | null;
  /**
   * Certified value as a share of contract sum. A COMMERCIAL measure —
   * it is not physical progress and must never be labelled as such.
   */
  certifiedPct: number | null;
}

export interface VariationLike {
  status?: string;
  task?: { grandTotal?: number } | null;
}

const APPROVED_VO = new Set(["done", "approved", "completed"]);

/** A certificate counts as certified once it is posted. */
export function certificateIsCertified(c: CertificateLike): boolean {
  return c.workflowState === "posted";
}

export function summariseMoney(
  project: any,
  certificates: CertificateLike[],
  variations: VariationLike[],
): MoneyPosition {
  const rawSum = project?.contractValue ?? project?.contract_value;
  const parsedSum = rawSum === null || rawSum === undefined || rawSum === "" ? NaN : Number(rawSum);
  const contractSum = Number.isFinite(parsedSum) && parsedSum > 0 ? parsedSum : null;

  const approvedVos = variations.filter((v) =>
    APPROVED_VO.has((v.status || "").toLowerCase()),
  );
  const variationsTotal = approvedVos.reduce((s, v) => s + (v.task?.grandTotal || 0), 0);

  const certifiedCerts = certificates.filter(certificateIsCertified);
  const certified = certifiedCerts.reduce(
    (s, c) => s + (c.totalPayable ?? c.netAmount ?? 0),
    0,
  );
  const retentionHeld = certifiedCerts.reduce((s, c) => s + (c.retentionAmount ?? 0), 0);

  return {
    contractSum,
    variations: approvedVos.length > 0 ? variationsTotal : null,
    variationCount: approvedVos.length,
    certified: certifiedCerts.length > 0 ? certified : null,
    retentionHeld: certifiedCerts.length > 0 ? retentionHeld : null,
    balance: contractSum !== null ? contractSum - certified : null,
    certifiedPct:
      contractSum !== null && contractSum > 0
        ? Math.round((certified / contractSum) * 100)
        : null,
  };
}

// ── Load-state machine ────────────────────────────────────────────────────
//
// Copied in spirit from `summariseLoadIssues` in src/lib/compliance.ts. An API
// failure must never render as "nothing needs you" — on a homepage whose whole
// job is telling someone what is outstanding, that is the single most
// expensive thing we could say.

export interface HomeLoadState {
  tasksFailed: boolean;
  meetingsFailed: boolean;
  certificatesFailed: boolean;
  variationsFailed: boolean;
  timeBarsFailed: boolean;
  riskFailed: boolean;
}

export interface HomeLoadIssue {
  level: "none" | "partial" | "total";
  message?: string;
}

const EMPTY_LOAD_STATE: HomeLoadState = {
  tasksFailed: false,
  meetingsFailed: false,
  certificatesFailed: false,
  variationsFailed: false,
  timeBarsFailed: false,
  riskFailed: false,
};

const SOURCE_LABEL: Record<keyof HomeLoadState, string> = {
  tasksFailed: "your tasks",
  meetingsFailed: "your meetings",
  certificatesFailed: "payment certificates",
  variationsFailed: "variation orders",
  timeBarsFailed: "notice deadlines",
  riskFailed: "risk signals",
};

/**
 * `visible` names the sources this viewer is actually permitted to read, so a
 * contractor without finance.view is not told the certificates endpoint failed
 * — that source was never going to be shown to them.
 */
export function summariseHomeLoad(
  partial: Partial<HomeLoadState>,
  visible: (keyof HomeLoadState)[] = Object.keys(EMPTY_LOAD_STATE) as (keyof HomeLoadState)[],
): HomeLoadIssue {
  const state = { ...EMPTY_LOAD_STATE, ...partial };
  const relevant = visible.filter((k) => state[k]);

  if (relevant.length === 0) return { level: "none" };

  if (relevant.length === visible.length) {
    return {
      level: "total",
      message:
        "None of this project's data could be loaded, so nothing on this page can be shown. This is not a statement that nothing is outstanding.",
    };
  }

  const names = relevant.map((k) => SOURCE_LABEL[k]);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  return {
    level: "partial",
    message: `Could not load ${list}. Anything outstanding there is missing from the queue below.`,
  };
}
