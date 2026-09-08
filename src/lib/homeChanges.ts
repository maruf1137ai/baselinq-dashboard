/**
 * The homepage's "What changed" feed.
 *
 * The brief was: show "latest or any critical, tailored to each user so each
 * user can focus on what they need to deliver and action to fast track the
 * project", and it must be role-based — "non finance people can't see
 * finance". Four sources belong in it: contractual events, documents,
 * meetings, and tasks/RFIs.
 *
 * This file is pure. It takes fetched payloads in and returns a structure out;
 * a component renders it. That is the same split `homeSignals.ts`,
 * `homeQueueRank.ts` and `compliance.ts` already use, and for the same reason:
 * anything with commercial or contractual consequence should be testable
 * without mounting a page.
 *
 * It inherits four rules from `homeSignals.ts` verbatim, and they are the ones
 * to read this file against:
 *
 *  1. **Nothing is invented.** Every field read below exists on a real
 *     response, and where a payload cannot supply what a row needs, the row is
 *     OMITTED AND COUNTED — see `ChangeFeed.undated`, `.aged` and
 *     `.taskOverflow`, the same device as `CertificateRun.undated`. A feed that
 *     quietly drops what it could not read is a feed that lies about being
 *     complete.
 *
 *  2. **No fabricated actor names.** The homepage that this replaces shipped a
 *     hardcoded list of fake names against fake events. Where the payload
 *     carries no author, the row names none — and where it carries an author
 *     for a DIFFERENT event than the one being reported (a document's
 *     `uploadedBy` is the original uploader, not whoever posted revision C),
 *     the row names none either. See `documentActor`.
 *
 *  3. **Gating happens at construction, not at render.** Every row carries
 *     `requires: PermissionCode[]` and `filterChangesByPermission` fails
 *     closed on an absent flag, exactly as `filterQueueByPermission` does.
 *
 *  4. **Headlines lead with the distinguishing information and carry no day
 *     counts.** A row must be identifiable when truncated at 60 characters.
 *     Time lives in `at` and is rendered as a chip. Tests assert both.
 *
 * ── 1. WHAT AN EVENT IS ───────────────────────────────────────────────────
 *
 *   **An event is an OBJECT AT ITS CURRENT STATE, dated by the last time it
 *   moved.** It is not a transition record.
 *
 * This is the whole of the deduplication rule, and it falls out of what the
 * API actually publishes rather than being imposed on top of it. No endpoint
 * in this app returns a project-scoped transition log — the only audit trail
 * that exists is `audit_trail` on a single certificate's DETAIL response
 * (`src/lib/certificate.ts`), which is one extra request per certificate and
 * is not fetched by the homepage. What every LIST endpoint publishes is the
 * object's current state plus the timestamp it last changed.
 *
 * So a variation that went Draft → Submitted → Priced → Approved in one day
 * produces exactly ONE row — "VO-004 approved" — because there is one object,
 * and its position is Approved. It cannot produce four, because this file has
 * no concept of a fourth thing to produce. The intermediate states are not
 * suppressed by a heuristic; they were never data.
 *
 * The honest cost of this, stated rather than hidden: the feed reports
 * POSITION, not HISTORY. It cannot say "PC-005 was rejected on Tuesday and
 * resubmitted on Thursday" — it says "PC-005 submitted", which is the true
 * current thing. When the backend publishes a project-scoped transition log,
 * a history mode becomes possible; until then a feed claiming to show
 * transitions would be inferring them.
 *
 * One consequence worth naming: because the key is the object, a re-fetch
 * never duplicates a row and a state change never adds one — it moves the
 * existing row. `key` is therefore stable across polls, which is what lets a
 * renderer animate rather than reshuffle.
 *
 * ── 2. HOW RECENCY AND CRITICALITY COMBINE ────────────────────────────────
 *
 * "Latest OR any critical." Those are two axes and this file keeps them
 * separate, because collapsing them is what produced the activity feed that
 * was deleted from this page for being noise.
 *
 *   **Significance sets an event's SHELF LIFE. Recency decides whether it is
 *   still on the shelf. Significance then decides the order.**
 *
 * Concretely:
 *
 *   - `significance` is derived from the STATE REACHED, never from the
 *     timestamp. Three tiers, defined by what the reader must do — see
 *     `Significance` below.
 *   - Each tier has a window (`SHELF_LIFE_DAYS`): decisive 30 days, material
 *     14, routine 7. An event older than its own tier's window leaves the
 *     feed. A decisive event therefore stays visible four times longer than a
 *     routine one, which is exactly the owner's "a three-week-old critical
 *     thing still matters; an hour-old routine one may not".
 *   - Ordering inside the feed is significance first, recency second. Never
 *     recency first. Sorting by timestamp is the failure mode being avoided:
 *     it lets any volume of routine events push a decisive one off the page,
 *     which is precisely how tasks drowned contractual events before.
 *
 * Why a shelf life rather than a fixed "last N days" window:
 *
 *   A single window has to be short enough to be "latest" and is therefore
 *   always too short for "critical". Fourteen days loses a certificate
 *   rejection that is still unresolved; sixty days makes the feed a monument.
 *   Tiering the window is the only way both sentences in the brief can be true
 *   at once.
 *
 * And why events LEAVE at all, rather than the feed simply being capped: a
 * feed that only ever ranks will show its top row forever if nothing more
 * important happens. "What changed" that has not changed in six weeks is not
 * an answer to the question.
 *
 * ── 3. VOLUME — HOW TASKS ARE STOPPED FROM DROWNING CONTRACTUAL EVENTS ────
 *
 * Three mechanisms, in order of how much of the work they do:
 *
 *  a. **A task or RFI event can never be `decisive`.** This is structural and
 *     it is the mechanism that actually matters. The ceiling for the whole
 *     task stream is `material` (an answered RFI genuinely unblocks someone),
 *     so no VOLUME of task events can displace a certificate posting or a
 *     variation approval from the top of the feed — ordering is by tier first.
 *     Ten thousand tasks change nothing about which row is first.
 *
 *  b. **Folding, on the `groupRiskSignals` model.** Task events of the same
 *     shape — same type, same verb — fold into one counted line once there are
 *     `TASK_FOLD_MIN` of them. "6 RFIs answered" is one row, not six, and it
 *     is a truer summary than six rows nobody reads. As with a risk group, the
 *     folded row takes its `at` and its significance from its MOST RECENT and
 *     MOST SIGNIFICANT member respectively, so a group can only overstate its
 *     own importance, never understate it.
 *
 *  c. **A stream cap.** After folding, the task stream is capped at
 *     `TASK_STREAM_CAP` rows. Belt and braces behind (a) and (b), and it
 *     reports what it cut (`ChangeFeed.taskOverflow`) rather than cutting
 *     silently.
 *
 * ── 4. WHERE A ROW GOES ───────────────────────────────────────────────────
 *
 * Every row links to the object it names; none links to a bare page. The
 * parameterised destinations — `/finance?tab=…&pc=`, `&vo=`,
 * `/programme?milestone=`, `/meetings/:id`, `/tasks/:taskId` — all come from
 * `ROUTE` in `homeSignals.ts`, which is the single place the finance tab
 * labels and the query-parameter names are written down. See the note above
 * the route constants for why `riskSignalHref` is NOT used for this, and why
 * a variation is addressed by its id and never by its "VO-004" reference.
 *
 * ── 5. WHAT IS DELIBERATELY NOT IN THIS FEED ──────────────────────────────
 *
 *   **A row that is already somewhere else on this page does not appear
 *   here.**
 *
 * The homepage draws "What needs you" in the left-hand column and this feed in
 * the right, side by side, on one screen. The queue's builders live in
 * `homeSignals.ts` and they are enumerable, so the overlap is not a matter of
 * taste — it can be checked, and it was:
 *
 *   `buildCertificateQueue`          submitted + approved certificates
 *   `buildRejectedCertificateQueue`  rejected certificates
 *   `buildTimeBarQueue`              every OPEN time bar, passed ones included
 *   `buildTaskQueue`                 tasks where `needsAction`
 *   `buildMeetingActionQueue`        meeting actions awaiting approval
 *   `buildRsvpQueue`                 meetings awaiting your RSVP
 *
 * So this file omits certificate states other than `posted` and `draft`, omits
 * the open-but-passed notice deadline that would otherwise be its single most
 * consequential row, omits tasks carrying `needsAction`, and counts meeting
 * ACTIONS RAISED rather than actions awaiting approval. Each omission is
 * argued at the builder it belongs to.
 *
 * The two are also disjoint by DIRECTION, which is the reason the rule is
 * cheap to hold: the queue looks forward at deadlines and this feed looks
 * back at positions reached. Nothing here carries a countdown and nothing
 * here should be coloured like one.
 *
 * Risk signals are absent for the same reason at one remove: `RiskConditionBlock`
 * renders them directly ABOVE this panel, so "Envelope is past its baseline
 * finish" from the register and "Envelope moved out to 14 Sep" from the
 * milestone below it would be one fact twice. The milestone row stays because
 * it names a date and a baseline; the risk restatement of it does not.
 *
 * ── 6. WHAT THE HOMEPAGE CANNOT YET FEED IT ───────────────────────────────
 *
 * Three builders below are complete and tested and are NOT reachable from the
 * live page, because `useHomeData` does not carry what they read. They are
 * kept rather than deleted: each is one line of wiring away, and deleting a
 * correct builder to make the gap invisible is the failure this file's first
 * rule is about.
 *
 *   `buildDocumentChanges`  `documents/?project_id=` is not fetched by
 *                           `useHomeData` at all (`project.documents` is a
 *                           different thing — a count, not the list).
 *                           `Compliance.tsx` already fetches it.
 *
 *   `buildMeetingChanges`   reachable, but only from the meeting LIST, which
 *                           carries no `decisions` and no `action_items`. So
 *                           every held meeting is `routine` today and none can
 *                           say what came out of it. Both fields are on the
 *                           detail response `useHomeData` ALREADY fetches for
 *                           `notes_ready` meetings and drops on the floor.
 *
 *   `buildTaskChanges`      reachable, but `useHomeData`'s task normaliser
 *                           carries neither `created_at` nor `updated_at` nor
 *                           `task_code`, so today every task is counted into
 *                           `undated` and none is drawn. This is the single
 *                           biggest gap and it is visible on the page as the
 *                           disclosure line.
 */

import { ROUTE, daysUntil, shortDate, type PermissionCode } from "./homeSignals";

// ── The axes ──────────────────────────────────────────────────────────────

/**
 * What a change MEANS, defined by what the reader must do about it — never by
 * how recent it is, and never by which source it came from.
 *
 *   decisive  A position changed and cannot simply be changed back. Money
 *             moved or stopped (a certificate posted or rejected); a
 *             commercial decision was taken (a variation approved or
 *             rejected); a contractual notice was served; a milestone moved
 *             off the baseline the programme was agreed against. These are the
 *             events a person needs to know about even three weeks late.
 *
 *   material  The ball is now in somebody's court. A certificate submitted or
 *             approved-awaiting-posting; a variation submitted or priced; an
 *             RFI answered; a new revision of a document other people may be
 *             building from; a contract document uploaded; decisions recorded
 *             at a meeting.
 *
 *   routine   Work proceeding, recorded. Something raised, a document first
 *             uploaded, a task completed, a meeting held.
 *
 * Note what is NOT a tier: "urgent". Urgency is the queue's axis
 * (`homeQueueRank.ts`), it is about a deadline ahead, and it is answered on
 * this page by "What needs you". This feed looks backwards. Nothing here
 * carries a countdown and nothing here should be coloured like one.
 */
export type Significance = "decisive" | "material" | "routine";

/** Which source a row came from. Drives the section it is drawn under. */
export type ChangeSource = "contractual" | "document" | "meeting" | "task";

const SIGNIFICANCE_ORDER: Record<Significance, number> = {
  decisive: 0,
  material: 1,
  routine: 2,
};

/**
 * How long an event of each tier stays in the feed, in calendar days.
 *
 * These are not tuned to look good. They are chosen so that the feed's own
 * refresh rhythm — a person opening the homepage most working days — sees a
 * routine event roughly once (7 days covers a week away), a material event
 * across a reporting fortnight, and a decisive event across the monthly
 * certification cycle this app is built around, which is the interval at which
 * a certificate posting or a variation approval is next revisited.
 */
export const SHELF_LIFE_DAYS: Record<Significance, number> = {
  decisive: 30,
  material: 14,
  routine: 7,
};

/** Task events of the same shape fold once there are this many. */
export const TASK_FOLD_MIN = 2;

/** Rows the task stream may contribute after folding. See §3(c). */
export const TASK_STREAM_CAP = 4;

// ── The row ───────────────────────────────────────────────────────────────

export interface ChangeItem {
  /** Stable across polls: it identifies the OBJECT, not the transition. */
  key: string;
  source: ChangeSource;
  significance: Significance;
  /**
   * Leads with what distinguishes this row from the one under it, and carries
   * no day count — the same rule the queue's headlines obey, for the same
   * reason. Identifiable at 60 characters.
   */
  headline: string;
  /** Provenance behind the headline. Null when the payload gave none. */
  detail: string | null;
  /** ISO instant the object last moved. Never null — an undated event is omitted. */
  at: string;
  /** Whole days since `at`, at the `now` passed to the builder. */
  ageDays: number;
  /** The object this row names. Must be a route that exists (see App.tsx). */
  href: string;
  /** How many objects this row stands for. 1 unless folded. */
  count: number;
  /** Every permission the viewer must hold. Empty means everyone. */
  requires: PermissionCode[];
}

// ── Routes ────────────────────────────────────────────────────────────────
//
// Every parameterised destination comes from `ROUTE` in `homeSignals.ts`,
// which is the one place the finance tab labels and the `?pc=` / `?vo=` /
// `?milestone=` parameter names are written down.
//
// NOT through `riskSignalHref`. That function is the RISK SIGNAL resolver: it
// takes `{ source_type, source_id }` off a signal payload, where `source_id`
// is a Django integer pk, and it types the id as `number`. Two of the objects
// in this feed are not identified by an integer — `Milestone._id` is a string
// and `VariationRecord.id` is `_id ?? id ?? taskId` — so routing them through
// it means `Number("64f1…")`, which is `NaN`, which is
// `/programme?milestone=NaN`. `ROUTE.milestone` / `ROUTE.variation` take
// `number | string` and encode whatever they are given. Same URLs, no
// coercion. The tests assert the strings either way.
//
// `ROUTE.variation` is passed the object's ID and never its "VO-004"
// reference: `finance.tsx` resolves `?vo=` with
// `findByDeepLinkId(param, variationOrders, (o) => [o.id, o.taskId])`, so a
// reference in that parameter matches nothing and the deep link silently does
// not open.

const documentHref = (id: string) => `/documents/${encodeURIComponent(id)}`;

/**
 * The two list routes `ROUTE` has no entry for, because no queue row and no
 * risk signal lands on either. Literal paths from `App.tsx`, no parameters.
 */
const TASK_LIST = "/tasks";

// ── Time ──────────────────────────────────────────────────────────────────

/**
 * Whole days since `iso`, or null when the payload carried no readable
 * timestamp. Built on `daysUntil` so the day boundary is defined in exactly
 * one place in the codebase.
 *
 * Negative results — an event stamped in the future — are clamped to 0 rather
 * than dropped. Clock skew between a server and a browser is real and small,
 * and treating a five-minute-future timestamp as "not yet happened" would hide
 * the newest event on the page.
 */
function ageInDays(iso: string | null | undefined, now: Date): number | null {
  const d = daysUntil(iso, now);
  if (d === null) return null;
  // `Math.abs` rather than `-d`, so a same-day event is `0` and never `-0`.
  return d > 0 ? 0 : Math.abs(d);
}

/** The first readable ISO instant among its arguments, or null. */
function firstInstant(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const trimmed = c.trim();
    if (trimmed === "") continue;
    if (Number.isFinite(new Date(trimmed).getTime())) return trimmed;
  }
  return null;
}

// ── The finance vocabulary guard ──────────────────────────────────────────

/**
 * Words a viewer without `finance.view` must never be shown, and a rand
 * figure in any of its forms.
 *
 * Two different things enforce this and both are needed:
 *
 *  - Every row this file composes about money or variations declares
 *    `requires: ["finance.view"]`, so `filterChangesByPermission` removes it.
 *    That covers everything whose WORDING this file controls.
 *
 *  - This guard covers what it does not: free text off the payload. A document
 *    genuinely named "Variation register rev C.pdf", or a meeting titled
 *    "Cost report — certified to date", would carry the restricted vocabulary
 *    into a row that is otherwise open to everyone. Those rows are dropped for
 *    a viewer without `finance.view` rather than being shown with the words in
 *    them.
 *
 * Dropped SILENTLY, and deliberately so: the queue does not disclose
 * permission-hidden counts either. "3 changes hidden" tells a contractor
 * exactly how much commercial activity is happening this week, which is the
 * fact being withheld.
 */
const FINANCE_WORDS = /\b(certif\w*|retention|variation\w*)\b/i;
const RAND_FIGURE = /(\bZAR\b|R\s?\d)/i;

/**
 * "Risk" is NOT a finance word, and putting it in the list above was wrong.
 *
 * Risk is gated on `compliance.view` everywhere else in this app —
 * `visibleRiskSignals` takes `canViewCompliance`, `projects/{id}/risk-signals/`
 * is not requested without it, and `/project-health` is `compliance.view` in
 * `App.tsx`. A document called "Risk register rev B" therefore belongs behind
 * the compliance gate, not the money gate, and hiding it from a QS who holds
 * finance but not compliance — or showing it to one who holds compliance but
 * not finance — is what the single combined list got wrong in both directions.
 */
const COMPLIANCE_WORDS = /\b(risk\w*)\b/i;

/** True when this text may only be shown to a holder of `finance.view`. */
export function isFinanceRestrictedText(text: string | null | undefined): boolean {
  if (!text) return false;
  return FINANCE_WORDS.test(text) || RAND_FIGURE.test(text);
}

/** True when this text may only be shown to a holder of `compliance.view`. */
export function isComplianceRestrictedText(text: string | null | undefined): boolean {
  if (!text) return false;
  return COMPLIANCE_WORDS.test(text);
}

/**
 * Every permission a row needs, once its own text has been inspected.
 *
 * A row that already declares a code keeps it. A row that does not acquires
 * whichever gate its own free text would otherwise walk through.
 */
function requirementsFor(base: PermissionCode[], ...text: (string | null)[]): PermissionCode[] {
  const out = [...base];
  if (!out.includes("finance.view") && text.some(isFinanceRestrictedText)) {
    out.push("finance.view");
  }
  if (!out.includes("compliance.view") && text.some(isComplianceRestrictedText)) {
    out.push("compliance.view");
  }
  return out;
}

// ── Payload shapes ────────────────────────────────────────────────────────
//
// Each interface below is the subset of a real response this file reads.
// Every field is one that has been confirmed in this codebase against a
// consumer that already renders it; the confirming call site is named.

/**
 * `tasks/payment-certificates/?projectId=` — the same rows
 * `buildCertificateQueue` reads, plus `createdAt`.
 *
 * `workflowState` is the only field every transition stamps (`approvalStatus`
 * is written once at creation and lies — see `paymentCertificateTable.tsx`),
 * and `updatedAt` is what the finance table itself prints in its "Updated"
 * column, so it is the movement timestamp for this object.
 */
export interface CertificateChangeLike {
  id: number;
  pcNumber?: string;
  workflowState?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * A variation, from either route.
 *
 * `update_at` is the spelling `finance.tsx:162` reads off
 * `tasks/tasks/?taskType=VO&project=` and prints in the table's "Updated"
 * column — it is the verified one. `updated_at` and `updatedAt` are read as
 * ALTERNATIVE SPELLINGS OF THE SAME FIELD and nothing more; if a future
 * serializer sends camelCase this keeps working, and if none of the three is
 * present the row is omitted and counted rather than dated from something
 * else.
 *
 * `dateInstructed` is NOT used as a movement timestamp. It is the date the
 * variation was instructed, which is a different fact from the date its status
 * last changed, and using it as a fallback would date an approval to the day
 * of instruction.
 */
export interface VariationChangeLike {
  /**
   * Optional because `VariationRecord.id` is: it is `_id ?? id ?? taskId` and
   * the assignment-task route can supply none of the three. A row with no id
   * cannot be deep-linked and goes to the variations list instead.
   */
  id?: string | number;
  /** Display number: "VO-004". Null when the record never got one. */
  ref?: string | null;
  status?: string | null;
  /** `VariationOrder.approved_at`. Names the approval transition exactly. */
  approvedAt?: string | null;
  update_at?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
}

/**
 * `projects/{id}/time-bars/` — the same rows `buildTimeBarQueue` reads.
 *
 * There is NO served-at, satisfied-at or updated-at timestamp anywhere on this
 * response (`TimeBarsTab.tsx` types the whole of it). So a notice that has
 * been served is a real and significant change that this app cannot date, and
 * it is counted into `ChangeFeed.undated` rather than dated from
 * `awareness_date` — which is when the underlying event became known, not when
 * anybody served anything.
 *
 * The one notice event that CAN be dated is a deadline that has passed:
 * `deadline_date` is computed correctly server-side, and the day it fell is
 * the day the position changed.
 */
export interface NoticeChangeLike {
  id: number;
  label: string;
  status: string;
  deadline_date?: string | null;
  clause_ref?: string | null;
  clause_verified?: boolean;
  contract_form?: string | null;
}

/**
 * `projects/{id}/milestones/` — `Milestone` from `useMilestones.ts`, narrowed.
 *
 * `baselineEnd` is set when a programme baseline is accepted
 * (`useAcceptProgrammeBaseline` says so explicitly). A milestone whose
 * `endDate` no longer equals its `baselineEnd` has moved off the agreed
 * programme, and `updatedAt` is when it last did.
 */
export interface MilestoneChangeLike {
  _id: string;
  name: string;
  endDate?: string | null;
  baselineEnd?: string | null;
  /** `Milestone.actual_end` — set once it finishes. Beats `endDate` when present. */
  actualEnd?: string | null;
  status?: string;
  updatedAt?: string | null;
}

/**
 * `documents/?project_id=` — `ApiDocument` from `DocumentTable.tsx`, narrowed.
 *
 * `currentVersion` is the revision the document now stands at.
 * `folderTab === "contracts"` is how the file browser itself decides a
 * document is a contract document (`getCategoryForDoc`).
 *
 * `uploadedBy` is the ORIGINAL uploader on the document record. It is used on
 * an upload row and never on a revision row — see `documentActor`.
 */
export interface DocumentChangeLike {
  _id: string;
  name: string;
  reference?: string | null;
  currentVersion?: string | null;
  folderTab?: "contracts" | "drawings" | "documents" | null;
  uploadedBy?: { userId?: string; name?: string } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * A meeting, from `meetings/?project_id=` for the list fields and
 * `meetings/{id}/` for `decisions` and `action_items`.
 *
 * `decisions` is `Decision[]` from `meetingDetails.tsx`: `{ id, text, owner }`
 * — note it carries NO timestamp of its own, so a decision is dated at the
 * meeting that recorded it, which is true and is the best available.
 *
 * The homepage already fetches the detail for meetings at
 * `artefact_status === "notes_ready"` (`useHomeData`), so `decisions` costs no
 * new request — it is simply a field that hook does not currently carry
 * through. See the note in the report.
 *
 * `status` is `scheduled | held | cancelled`. `completed` and `occurred` do
 * not exist on this model; CLAUDE.md documents that mistake as already living
 * in this codebase, so it is not repeated here.
 */
export interface MeetingChangeLike {
  id: number;
  title: string;
  status?: string;
  date?: string | null;
  scheduled_utc?: string | null;
  decisions?: { id: number; text: string }[];
  action_items?: { id: number; text: string }[];
}

/**
 * A task or RFI, from `projects/{id}/tasks/`, in the shape `useHomeData`
 * already normalises to — plus the two timestamps and the document number.
 *
 * `code` is the canonical document number (`rfiNumber` / `siNumber` /
 * `voNumber` / …) that `Task.tsx` assembles as `task_code` and puts on the
 * board card, so the feed names an RFI the same way every other surface does.
 *
 * `createdAt` is `item.created_at || item.task?.createdAt` (`Task.tsx:729`);
 * `updatedAt` is `task.updated_at || task.updatedAt` (`AuditPage.tsx:298`).
 */
export interface TaskChangeLike {
  id: string;
  /** "RFI-006". Null when the record predates numbering. */
  code?: string | null;
  title?: string | null;
  /** "RFI" / "VO" / "SI" / … Upper-cased by the caller, as `useHomeData` does. */
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /**
   * "This task is assigned to me and is not done" — `useHomeData` computes it
   * off `assignedTo` and it is the exact predicate `buildTaskQueue` filters
   * on. Read here for one purpose: to keep this feed disjoint from the queue
   * beside it. See §5.
   */
  needsAction?: boolean;
}

// ── Contractual: certificates ─────────────────────────────────────────────

/**
 * Which state a certificate now holds, what that means, and how to say it.
 *
 * `posted` and `rejected` are decisive: in the first, money has been released;
 * in the second it has stopped and cannot restart until a person reworks the
 * certificate. `submitted` and `approved` are material — each puts the
 * certificate in front of a named next actor. `draft` is routine: it is the
 * raiser's own unfinished work and nobody is waiting on it, which is the same
 * judgement `homeIndicators.ts` makes about a draft variation.
 *
 * `cancelled` is absent deliberately. A cancelled certificate is not a change
 * anybody acts on and `homeIndicators.ts` already treats it as out of the run.
 */
const CERTIFICATE_EVENT: Record<
  string,
  { significance: Significance; verb: string; note: string | null }
> = {
  posted: { significance: "decisive", verb: "posted", note: null },
  draft: { significance: "routine", verb: "raised", note: null },
};

// The `note` on both this table and the variation one below is `null`
// throughout, and the field is kept because it is where a real fact would go.
// What it used to hold — "Payment released against it", "It is now part of the
// works", "Awaiting a decision" — was editorial: a restatement of the verb in
// the same row, in a second line of text, on a panel whose whole column has to
// fit one 1440px screen. `detail` is for PROVENANCE the headline could not
// carry, which is what the milestone row's "Baseline was 31 Oct 2026" is and
// what a sentence about what "posted" means is not.

/**
 * The certificate states that are NOT here, and why. See §5.
 *
 *   `submitted`  → `buildCertificateQueue` renders "Certify PC-006"
 *   `rejected`   → `buildRejectedCertificateQueue` renders "PC-005 was rejected — raise a new certificate"
 *
 * Both are drawn in "What needs you", in the left-hand column of the same
 * screen, for exactly this feed's audience — both surfaces are `finance.view`
 * and neither queue builder filters per user, so there is no viewer who sees
 * the feed row and not the queue row. A second copy of a row the reader is
 * already looking at is how a panel stops being read.
 *
 * `approved` no longer gets its own queue row either: approving a
 * certificate now auto-posts it atomically in the same request
 * (`tasks/views_pc_workflow.py::_run_transition`) — there is no manual
 * posting step to be "needed" for, and `workflowState` essentially never
 * rests at `approved` long enough to surface here.
 *
 * `posted` and `draft` are the two states with no queue row: posting closes
 * the loop and nobody is waiting on a draft.
 *
 * This is a page-level rule, not a property of certificates, so it is applied
 * by omission from the table above rather than by a filter — a caller building
 * a feed for a surface that has no queue beside it changes one object.
 */

/**
 * Payment certificates, one row each, at the state they now hold.
 *
 * Gated on `finance.view` unconditionally — the row names a certificate and
 * the page it links to carries the certified amount.
 *
 * A `draft` row is dated from `createdAt` where `updatedAt` is missing,
 * because a draft that has never moved has no update to be dated by and its
 * creation IS the change. Every other state is dated from `updatedAt` only:
 * dating a posting from the creation date would be wrong by weeks.
 */
export function buildCertificateChanges(
  certificates: CertificateChangeLike[],
  now: Date = new Date(),
): { items: ChangeItem[]; undated: number } {
  const items: ChangeItem[] = [];
  let undated = 0;

  for (const c of certificates) {
    const state = (c.workflowState ?? "").trim().toLowerCase();
    const event = CERTIFICATE_EVENT[state];
    if (!event) continue;

    const at =
      state === "draft" ? firstInstant(c.updatedAt, c.createdAt) : firstInstant(c.updatedAt);
    const age = ageInDays(at, now);
    if (at === null || age === null) {
      undated += 1;
      continue;
    }

    const ref = c.pcNumber || `PC-${c.id}`;
    items.push({
      key: `certificate-${c.id}`,
      source: "contractual",
      significance: event.significance,
      // Reference first: on a project with eight certificates the reference is
      // the only thing that tells two rows apart, and it is what a QS searches
      // the finance table by.
      headline: `${ref} ${event.verb}`,
      detail: event.note,
      at,
      ageDays: age,
      href: ROUTE.certificate(c.id),
      count: 1,
      requires: ["finance.view"],
    });
  }

  return { items, undated };
}

// ── Contractual: variations ───────────────────────────────────────────────

/**
 * The contractual status vocabulary — Draft / Submitted / Under Review /
 * Priced / Recommended / Approved / Rejected / Closed — plus the assignment
 * task's weaker lifecycle (todo / in review / done), because both routes reach
 * this file and `homeIndicators.ts` documents that they do.
 *
 * `done` maps to approved: on the assignment-task route it is the only word
 * available for a settled variation, and `homeIndicators.ts` already reads it
 * that way in `VO_SETTLED`.
 */
const VARIATION_EVENT: Record<
  string,
  { significance: Significance; verb: string; note: string | null }
> = {
  approved: { significance: "decisive", verb: "approved", note: null },
  done: { significance: "decisive", verb: "approved", note: null },
  completed: { significance: "decisive", verb: "approved", note: null },
  rejected: { significance: "decisive", verb: "rejected", note: null },
  declined: { significance: "decisive", verb: "rejected", note: null },
  recommended: { significance: "material", verb: "recommended", note: null },
  priced: { significance: "material", verb: "priced", note: null },
  submitted: { significance: "material", verb: "submitted", note: null },
  "under review": { significance: "material", verb: "under review", note: null },
  "in review": { significance: "material", verb: "under review", note: null },
  instructed: { significance: "decisive", verb: "instructed", note: null },
  draft: { significance: "routine", verb: "raised", note: null },
  todo: { significance: "routine", verb: "raised", note: null },
};

/**
 * Variations, one row each, at the status they now hold.
 *
 * Gated on `finance.view`: the row carries the word "variation" in its
 * reference and its destination is the Variation Orders tab.
 *
 * No value is ever put in a string here. `homeSignals.ts` keeps every amount
 * behind `finance.view` by not fetching it; this file keeps every amount out
 * of the feed by never formatting one, so there is no rand figure for a
 * permission bug to leak.
 */
export function buildVariationChanges(
  variations: VariationChangeLike[],
  now: Date = new Date(),
): { items: ChangeItem[]; undated: number } {
  const items: ChangeItem[] = [];
  let undated = 0;

  for (const v of variations) {
    const status = (v.status ?? "").trim().toLowerCase();
    const event = VARIATION_EVENT[status];
    if (!event) continue;

    // `approvedAt` FIRST where the status is settled as approved, and only
    // there. It is `VariationOrder.approved_at`, carried onto `VariationRecord`
    // by `toVariationRecord`, and it names the transition exactly — where
    // `updated_at` says only that something on the row moved, which could be a
    // comment. It is deliberately not consulted for any other status: an
    // approval that was later rejected must be dated at the rejection.
    //
    // `dateInstructed` is never a fallback. It is the date the variation was
    // instructed, which is a different fact from the date its status last
    // changed, and using it would date an approval to the day of instruction.
    const at =
      event.verb === "approved"
        ? firstInstant(v.approvedAt, v.update_at, v.updated_at, v.updatedAt)
        : firstInstant(v.update_at, v.updated_at, v.updatedAt);
    const age = ageInDays(at, now);
    if (at === null || age === null) {
      undated += 1;
      continue;
    }

    // No `VO-{id}` fallback. The id here is a task id on one route and a
    // record id on the other, so "VO-43" would be a different number from the
    // "VO-004" the board, the chat and the finance table all show for the same
    // variation — a reference that does not resolve is worse than none.
    const ref = (v.ref ?? "").trim();
    items.push({
      // The ref is the key's fallback, and the timestamp the ref's: a record
      // with neither is one row that cannot collide with another, which is
      // weaker than a stable key and is the most the payload supports.
      key: `variation-${v.id ?? (ref || at)}`,
      source: "contractual",
      significance: event.significance,
      headline: ref ? `${ref} ${event.verb}` : `Variation ${event.verb} — it carries no number`,
      detail: event.note,
      at,
      ageDays: age,
      href: v.id === undefined || v.id === null ? ROUTE.variations : ROUTE.variation(v.id),
      count: 1,
      requires: ["finance.view"],
    });
  }

  return { items, undated };
}

// ── Contractual: notices ──────────────────────────────────────────────────

/** A time bar whose notice has been dealt with. Mirrors `compliance.ts`. */
const NOTICE_SERVED = new Set(["served", "met", "satisfied"]);

/** A clock that stopped without being met. Equally news, equally undatable. */
const NOTICE_CLOSED = new Set(["lapsed", "missed", "expired", "cancelled", "waived"]);

/**
 * Notice deadlines whose position has changed.
 *
 * Two events. One of them cannot be dated, and the other one is a queue row.
 *
 *  - **A notice served.** Real, significant, and UNDATABLE: nothing on
 *    `projects/{id}/time-bars/` records when the status changed — `TimeBarsTab`
 *    types the whole of that response and there is no served-at, satisfied-at
 *    or updated-at on it. Every one of these is counted into `undated` so the
 *    feed can disclose that it is not showing them, rather than dating them
 *    from `awareness_date`, which is when the underlying event became known
 *    and would put a notice served yesterday three weeks in the past.
 *
 *  - **A deadline that has passed** while the clock is still `open`. This is
 *    datable — `deadline_date` is computed server-side through
 *    `add_working_days` — and under JBCC it is as consequential as this feed
 *    gets. It is still not drawn here, because `buildTimeBarQueue` takes
 *    EVERY bar with `status === "open"`, passed ones included, and renders it
 *    with an overdue chip in "What needs you" on the left of the same screen.
 *    Drawing it again on the right would put one fact on the page twice, and
 *    the queue's copy is the better one: it is actionable, it carries the
 *    countdown, and it is ranked against the other forfeiture risks. See §5.
 *
 * So this source contributes no rows today and only a disclosure count. That
 * is the honest result and not a stub: the moment the backend stamps a
 * transition on a time bar, the served row becomes datable and belongs here.
 *
 * Not gated. `homeSignals.ts` makes the same call for the same reason: a
 * notice deadline is not commercial information and every party to the
 * contract is prejudiced by it lapsing.
 */
export function buildNoticeChanges(
  bars: NoticeChangeLike[],
  _now: Date = new Date(),
): { items: ChangeItem[]; undated: number } {
  let undated = 0;

  for (const b of bars) {
    const status = (b.status ?? "").trim().toLowerCase();
    // A clock that has stopped is news. Nothing on the payload says when it
    // stopped, so it is counted rather than dated.
    if (NOTICE_SERVED.has(status) || NOTICE_CLOSED.has(status)) undated += 1;
  }

  return { items: [], undated };
}

// ── Contractual: milestones ───────────────────────────────────────────────

/**
 * Milestones that have moved off the programme baseline.
 *
 * `baselineEnd` is written when a programme baseline is accepted, so a
 * milestone whose `endDate` differs from it has moved against an agreed
 * position — which is decisive, and is the event an extension of time shows up
 * as on the programme.
 *
 * A milestone with NO `baselineEnd` is skipped rather than reported as moved.
 * Nothing has been agreed for it to have moved against, and
 * `useHomeData` already states the rule: only milestones with a real baseline
 * can report slip, the rest get their dates and nothing more.
 *
 * Direction is stated because it is not symmetric — pulled forward is good
 * news and pushed out is not — and it is derived by comparing the two dates,
 * both of which are on the payload.
 *
 * Not gated on `finance.view`: dates are not money. A contractor who cannot
 * see the contract sum can still see when the works are due, which is the
 * call `summariseTime` already makes. It IS gated on `programme.view` below,
 * though — every row here links to `ROUTE.milestone`, which resolves to
 * `/programme?milestone=<id>`, a route `programme.view` gates (App.tsx). The
 * "not gated" claim above was always about money-sensitivity, never about
 * route access.
 */
export function buildMilestoneChanges(
  milestones: MilestoneChangeLike[],
  now: Date = new Date(),
): { items: ChangeItem[]; undated: number } {
  const items: ChangeItem[] = [];
  let undated = 0;

  for (const m of milestones) {
    // `actual_end` is the truth once it exists; before that `end_date` is the
    // current plan and is the honest thing to compare. This is
    // `summariseMilestoneDrift`'s rule verbatim, and it has to be, because
    // that summary is drawn in the visual band directly above this feed — two
    // panels on one screen must not measure the same slip two different ways.
    const liveEnd = firstInstant(m.actualEnd) ?? firstInstant(m.endDate);
    const baseline = shortDate(m.baselineEnd);
    const current = shortDate(liveEnd);
    if (!baseline || !current || baseline === current) continue;

    const at = firstInstant(m.updatedAt);
    const age = ageInDays(at, now);
    if (at === null || age === null) {
      undated += 1;
      continue;
    }

    const moved = daysUntil(liveEnd, new Date(m.baselineEnd as string));
    const direction = moved !== null && moved < 0 ? "pulled forward to" : "moved out to";

    items.push({
      key: `milestone-${m._id}`,
      source: "contractual",
      significance: "decisive",
      // Name first — a programme has many milestones and the name is the only
      // thing that tells two rows apart. The new date follows; it is the fact
      // the reader needs and it is a DATE, not a day count, so it does not
      // duplicate the age chip.
      headline: `${m.name} ${direction} ${current}`,
      detail: `Baseline was ${baseline}`,
      at,
      ageDays: age,
      href: ROUTE.milestone(m._id),
      count: 1,
      requires: ["programme.view"],
    });
  }

  return { items, undated };
}

// ── Documents ─────────────────────────────────────────────────────────────

/**
 * Who to name on a document row, or null.
 *
 * `uploadedBy` on `ApiDocument` is the person who created the DOCUMENT RECORD.
 * On an upload row that is the actor. On a revision row it is not — revision C
 * may have been posted by somebody else entirely, and the revision's own
 * `uploadedBy` lives on the version record behind `documents/{id}/versions/`,
 * which the homepage does not fetch.
 *
 * So a revision row names nobody. This is the rule the old homepage broke by
 * shipping a hardcoded list of names against invented events, and it is
 * cheaper to say nothing than to attribute a superseded drawing to the wrong
 * person on a contract.
 */
function documentActor(doc: DocumentChangeLike, isRevision: boolean): string | null {
  if (isRevision) return null;
  const name = doc.uploadedBy?.name?.trim();
  return name ? `Uploaded by ${name}` : null;
}

/**
 * Documents uploaded and revised.
 *
 * Three cases, one row each, keyed on the document:
 *
 *  - A **contract document** landing is material: obligations are extracted
 *    from these (`documents/obligations/`) and the compliance position changes
 *    when one arrives.
 *  - A **new revision** is material: it supersedes what people are building
 *    from, which is the whole reason the version history exists.
 *  - A **first upload** of anything else is routine.
 *
 * Revision is detected as `updatedAt` later than `createdAt`. That is the only
 * signal on the project-level document list — `currentVersion` is a free-text
 * label ("2", "C", "Rev B") with no ordering this file can rely on, so it is
 * PRINTED and never COMPARED. A metadata-only edit (a rename) therefore reads
 * as a revision here; that overstates the change rather than hiding one, which
 * is the safe direction, and the exact fix is a `versionCount` or a
 * `currentVersionCreatedAt` on the document row. Reported.
 *
 * Not gated as a class — a drawing revision is not commercial information —
 * but every row goes through `requirementsFor`, so a document whose NAME or
 * REFERENCE carries the restricted vocabulary picks up `finance.view` and
 * disappears for a contractor. See the guard's comment.
 */
export function buildDocumentChanges(
  documents: DocumentChangeLike[],
  now: Date = new Date(),
): { items: ChangeItem[]; undated: number } {
  const items: ChangeItem[] = [];
  let undated = 0;

  for (const doc of documents) {
    const created = firstInstant(doc.createdAt);
    const updated = firstInstant(doc.updatedAt);
    const isRevision =
      created !== null &&
      updated !== null &&
      new Date(updated).getTime() > new Date(created).getTime();

    const at = isRevision ? updated : firstInstant(created, updated);
    const age = ageInDays(at, now);
    if (at === null || age === null) {
      undated += 1;
      continue;
    }

    const isContract = doc.folderTab === "contracts";
    const ref = (doc.reference ?? "").trim();
    const version = (doc.currentVersion ?? "").trim();

    // Reference leads where there is one — it is how a drawing is identified
    // on site and it is short, so the name survives the truncation too.
    const named = ref ? `${ref} — ${doc.name}` : doc.name;

    const headline = isRevision
      ? version
        ? `${named} revised to ${version}`
        : `${named} revised`
      : isContract
        ? `${named} added to the contract documents`
        : `${named} uploaded`;

    // Only the actor, and only where there genuinely is one. "The previous
    // revision is superseded" was here and went for the same reason the
    // certificate notes did: it restates "revised to C" in a second line.
    const detail = documentActor(doc, isRevision);

    items.push({
      key: `document-${doc._id}`,
      source: "document",
      significance: isRevision || isContract ? "material" : "routine",
      headline,
      detail,
      at,
      ageDays: age,
      href: documentHref(doc._id),
      count: 1,
      // Base requirement, not vocabulary-sniffed like the finance/compliance
      // guard inside `requirementsFor` — every row here links to
      // `documentHref`, unconditionally gated on `document.view` (App.tsx),
      // so every row needs it regardless of what the headline/detail text
      // happens to say.
      requires: requirementsFor(["document.view"], headline, detail),
    });
  }

  return { items, undated };
}

// ── Meetings ──────────────────────────────────────────────────────────────

/**
 * Meetings that have been held, and what came out of them.
 *
 * ONE ROW PER MEETING, not one per decision. A meeting that recorded four
 * decisions and raised three actions is one thing that happened, and four
 * rows saying "Decision recorded" would be the drowning problem in miniature.
 * The row counts what came out of it and the meeting page lists them.
 *
 * Significance follows the outcome rather than the event: a meeting that
 * recorded decisions is material — a decision binds people and somebody was
 * not in the room — while a meeting that merely happened is routine.
 *
 * A meeting is dated at `scheduled_utc || date`. Decisions and action items
 * carry no timestamp of their own (`Decision` is `{ id, text, owner }`), so
 * they take the meeting's date, which is the day they were recorded.
 *
 * Actions AWAITING APPROVAL are deliberately not what this row counts.
 * `buildMeetingActionQueue` already puts those in "What needs you" as an
 * actionable row; repeating them here would put the same fact on the page
 * twice under two different headings. This row counts what was RAISED, which
 * is a statement about the past and is the feed's business.
 *
 * `owner` on a decision is not read. It is an LLM-inferred free-text string
 * from the notetaker, and rendering it as an attribution on the homepage is
 * the fabricated-actor failure with an extra step.
 */
export function buildMeetingChanges(
  meetings: MeetingChangeLike[],
  now: Date = new Date(),
): { items: ChangeItem[]; undated: number } {
  const items: ChangeItem[] = [];
  let undated = 0;

  for (const m of meetings) {
    // `held` is the real status. `completed` and `occurred` do not exist on
    // this model — see CLAUDE.md, which documents that exact mistake as
    // already present elsewhere in this codebase.
    if ((m.status ?? "").trim().toLowerCase() !== "held") continue;

    const at = firstInstant(m.scheduled_utc, m.date);
    const age = ageInDays(at, now);
    if (at === null || age === null) {
      undated += 1;
      continue;
    }

    const decisions = m.decisions?.length ?? 0;
    const actions = m.action_items?.length ?? 0;

    const outcome =
      decisions > 0
        ? `${decisions} decision${decisions === 1 ? "" : "s"} recorded`
        : actions > 0
          ? `${actions} action${actions === 1 ? "" : "s"} raised`
          : "held";

    const headline = `${m.title} — ${outcome}`;
    const detail =
      decisions > 0 && actions > 0
        ? `and ${actions} action${actions === 1 ? "" : "s"} raised`
        : null;

    items.push({
      key: `meeting-${m.id}`,
      source: "meeting",
      significance: decisions > 0 ? "material" : "routine",
      // Meeting title first: two progress meetings a week apart differ by
      // nothing else in their first sixty characters.
      headline,
      detail,
      at,
      ageDays: age,
      href: ROUTE.meeting(m.id),
      count: 1,
      requires: requirementsFor([], headline, detail),
    });
  }

  return { items, undated };
}

// ── Tasks and RFIs ────────────────────────────────────────────────────────

/**
 * The three things a task or RFI does, and what each is worth.
 *
 * **None of them is `decisive`, and that is the whole volume answer.** See §3
 * of the header: because the feed orders by tier before it orders by time, no
 * quantity of task events can push a certificate posting or a variation
 * approval down the page. The cap below is a second line of defence, not the
 * mechanism.
 *
 * `answered` is material because the ball has moved back across the table —
 * an answered RFI unblocks whoever raised it. `raised` and `completed` are
 * routine: raising is the start of somebody's own work, and completing is its
 * end.
 *
 * The status vocabularies here are the ones `Task.tsx` sorts its three board
 * columns by; each RFI/VO/SI/DC/CPI model has its own choices, which is why
 * several words map to the same verb.
 */
type TaskVerb = "raised" | "answered" | "completed";

const TASK_VERB: Record<string, TaskVerb> = {
  // Raised — the todo column.
  todo: "raised",
  open: "raised",
  draft: "raised",
  // Answered — the in-review column. The ball is back with the raiser.
  "in review": "answered",
  inreview: "answered",
  in_review: "answered",
  pending: "answered",
  answered: "answered",
  recommended: "answered",
  // Completed — the done column.
  done: "completed",
  closed: "completed",
  completed: "completed",
};

const TASK_SIGNIFICANCE: Record<TaskVerb, Significance> = {
  raised: "routine",
  answered: "material",
  completed: "routine",
};

/**
 * Tasks and RFIs, folded.
 *
 * Dating: `raised` takes `createdAt` — it IS the creation — and `answered` and
 * `completed` take `updatedAt`, falling back to nothing. A task whose payload
 * carries neither of the timestamp it needs is counted into `undated`.
 *
 * Folding, on the `groupRiskSignals` model: rows of the same `type × verb`
 * shape collapse into one counted line once there are `TASK_FOLD_MIN` of them.
 * A folded row takes:
 *
 *   - its `at` from the MOST RECENT member, so the group is never presented as
 *     staler than it is;
 *   - its significance from the shape (every member shares it, so this is
 *     exact rather than a worst-case);
 *   - its destination from `riskGroupHref`'s principle — a group of more than
 *     one cannot honestly name one of its members, so it goes to the list.
 *     `/tasks` is that list. A group of one is a single task and keeps
 *     `/tasks/:taskId`.
 *
 * The cap is applied by `buildChangeFeed`, not here, so that a caller who
 * wants the whole folded set can have it.
 */
export function buildTaskChanges(
  tasks: TaskChangeLike[],
  now: Date = new Date(),
): { items: ChangeItem[]; undated: number } {
  let undated = 0;

  interface Resolved {
    task: TaskChangeLike;
    verb: TaskVerb;
    type: string;
    at: string;
    age: number;
  }

  const resolved: Resolved[] = [];

  for (const t of tasks) {
    // Already a row in "What needs you". `buildTaskQueue` filters on exactly
    // this flag, so a task carrying it is on the left of the same screen with
    // its due date and its overdue chip. §5.
    //
    // Note this is a per-VIEWER exclusion, unlike the certificate one: an RFI
    // raised by somebody else and assigned to somebody else is not in anyone's
    // queue on this page and is genuinely news.
    if (t.needsAction === true) continue;

    const status = (t.status ?? "").trim().toLowerCase();
    const verb = TASK_VERB[status];
    if (!verb) continue;

    const at = verb === "raised" ? firstInstant(t.createdAt) : firstInstant(t.updatedAt);
    const age = ageInDays(at, now);
    if (at === null || age === null) {
      undated += 1;
      continue;
    }

    resolved.push({
      task: t,
      verb,
      // "Item" rather than a guessed type: the board falls back to a
      // round-robin demo type when `taskType` is absent, and importing that
      // fallback would put an invented "RFI" on a real row.
      type: (t.type ?? "").trim().toUpperCase() || "Item",
      at,
      age,
    });
  }

  /** One row for one task. */
  const single = (r: Resolved): ChangeItem => {
    const label = (r.task.code ?? "").trim() || (r.task.title ?? "").trim();
    const headline = label
      ? `${label} ${r.verb}`
      : `${r.type === "Item" ? "An item" : r.type} ${r.verb}`;
    const detail = r.task.code && r.task.title ? r.task.title.trim() || null : null;
    return {
      key: `task-${r.task.id}`,
      source: "task",
      significance: TASK_SIGNIFICANCE[r.verb],
      headline,
      detail,
      at: r.at,
      ageDays: r.age,
      href: ROUTE.task(String(r.task.id)),
      count: 1,
      requires: requirementsFor([], headline, detail),
    };
  };

  const buckets = new Map<string, Resolved[]>();
  for (const r of resolved) {
    const shape = `${r.type}|${r.verb}`;
    const bucket = buckets.get(shape);
    if (bucket) bucket.push(r);
    else buckets.set(shape, [r]);
  }

  const items: ChangeItem[] = [];

  for (const [shape, group] of [...buckets.entries()].sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
  )) {
    if (group.length < TASK_FOLD_MIN) {
      items.push(single(group[0]));
      continue;
    }
    // Most recent first: the group is dated at its newest member.
    const ordered = [...group].sort((a, b) => a.age - b.age);
    const newest = ordered[0];
    const { type, verb } = newest;
    const noun = type === "Item" ? "items" : `${type}s`;

    items.push({
      key: `task-group-${shape.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      source: "task",
      significance: TASK_SIGNIFICANCE[verb],
      // The count leads because it is what separates a folded row from a
      // single one; the shape follows because it is what separates one folded
      // row from the next.
      headline: `${ordered.length} ${noun} ${verb}`,
      detail:
        ordered
          .map((r) => (r.task.code ?? "").trim())
          .filter(Boolean)
          .slice(0, 4)
          .join(", ") || null,
      at: newest.at,
      ageDays: newest.age,
      // A group cannot name one of its members — the same judgement
      // `riskGroupHref` makes. `/tasks` is the list that contains them all.
      href: TASK_LIST,
      count: ordered.length,
      requires: [],
    });
  }

  return { items, undated };
}

// ── Permission ────────────────────────────────────────────────────────────

/**
 * Drop everything the viewer is not permitted to see. Fails CLOSED.
 *
 * An absent flag is FALSE, not "assume yes". This is `filterQueueByPermission`
 * with the same guarantee and for the same reason: `resolveFinanceAccess`
 * (`homeSignals.ts`) returns false for finance while the effective-permission
 * map is still in flight, deliberately, and this must not undo that. A
 * contractor flashing one frame of "PC-006 posted" is the bug being defended
 * against.
 *
 * Callers pass the OUTPUT of `resolveFinanceAccess`, never `usePermissions`
 * directly — that hook returns true for every flag while loading so a reload
 * does not bounce a legitimate user off a route, which is the right default
 * for a redirect and the wrong one for money.
 */
export function filterChangesByPermission(
  items: ChangeItem[],
  held: {
    canViewFinance?: boolean;
    canViewCompliance?: boolean;
    canViewProgramme?: boolean;
    canViewDocuments?: boolean;
  },
): ChangeItem[] {
  const grant: Record<PermissionCode, boolean> = {
    "finance.view": held.canViewFinance === true,
    "compliance.view": held.canViewCompliance === true,
    "programme.view": held.canViewProgramme === true,
    "document.view": held.canViewDocuments === true,
  };
  return items.filter((i) => i.requires.every((code) => grant[code]));
}

// ── The feed ──────────────────────────────────────────────────────────────

/**
 * Within the shelf life for its own tier. See §2 of the header.
 *
 * Exported because the rule is the interesting part of this file and a test
 * that has to build a whole feed to check one boundary is a test nobody reads.
 */
export function isOnTheShelf(item: Pick<ChangeItem, "significance" | "ageDays">): boolean {
  return item.ageDays <= SHELF_LIFE_DAYS[item.significance];
}

/**
 * Significance first, recency second, key last.
 *
 * The order of those two is the entire argument of §2 and it is asserted by a
 * test: a decisive event three weeks old sorts above a routine one from this
 * morning. `key` breaks the remaining ties so a re-fetch never reshuffles the
 * list — the same stability rule `rankQueue` ends on.
 */
export function rankChanges(items: ChangeItem[]): ChangeItem[] {
  return [...items].sort((a, b) => {
    const tier = SIGNIFICANCE_ORDER[a.significance] - SIGNIFICANCE_ORDER[b.significance];
    if (tier !== 0) return tier;
    if (a.ageDays !== b.ageDays) return a.ageDays - b.ageDays;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

/**
 * One source's contribution: the rows it justified, and the records it knew
 * changed and could not date.
 *
 * The pair travels together for the reason `CertificateRun` gives: a builder
 * that returns only what it could read is a builder that lies about being
 * complete. Every builder in this file returns one of these, so
 * `buildChangeFeed` can be handed `[buildCertificateChanges(a), …]` and the
 * disclosure count survives the flattening.
 */
export interface ChangeGroup {
  items: ChangeItem[];
  undated: number;
}

export interface ChangeSourcePayloads {
  certificates?: CertificateChangeLike[];
  variations?: VariationChangeLike[];
  notices?: NoticeChangeLike[];
  milestones?: MilestoneChangeLike[];
  documents?: DocumentChangeLike[];
  meetings?: MeetingChangeLike[];
  tasks?: TaskChangeLike[];
}

export interface ChangeFeed {
  /** Ranked, gated, on-the-shelf rows. Worst-consequence first. */
  items: ChangeItem[];
  /**
   * Changes this feed knows happened and could not date, so cannot show.
   * The `CertificateRun.undated` device: a feed that silently drops what it
   * could not read is a feed that lies about being complete. Render it.
   */
  undated: number;
  /**
   * Rows dropped because their tier's shelf life had expired. Not a defect —
   * it is the filter working — but it lets the page say "and 14 older
   * changes" instead of implying the project has been quiet.
   */
  aged: number;
  /** Folded task rows cut by `TASK_STREAM_CAP`. Zero on most projects. */
  taskOverflow: number;
  /** True when every source was empty — "nothing is tracked yet", not "quiet". */
  empty: boolean;
}

/**
 * Every source built independently, in one call.
 *
 * A convenience for callers that hold all seven payloads. `buildChangeFeed`
 * also takes the groups directly, which is what `useHomeData` does: it holds
 * the payloads in seven separate `useMemo`s and passes an array, so one source
 * re-rendering does not rebuild the other six.
 */
export function buildChangeGroups(
  payloads: ChangeSourcePayloads,
  now: Date = new Date(),
): ChangeGroup[] {
  return [
    buildCertificateChanges(payloads.certificates ?? [], now),
    buildVariationChanges(payloads.variations ?? [], now),
    buildNoticeChanges(payloads.notices ?? [], now),
    buildMilestoneChanges(payloads.milestones ?? [], now),
    buildDocumentChanges(payloads.documents ?? [], now),
    buildMeetingChanges(payloads.meetings ?? [], now),
    buildTaskChanges(payloads.tasks ?? [], now),
  ];
}

/**
 * The whole feed, from every source, for one viewer.
 *
 * Order of operations matters and is not arbitrary:
 *
 *   1. build     — each source independently, so one bad payload costs its own
 *                  rows and not the feed (`homeSignals.ts` gives the same
 *                  reason for its separate builders);
 *   2. fold      — inside the task source only;
 *   3. gate      — BEFORE the shelf-life filter and before the cap, so a
 *                  contractor's feed is never shortened by rows they were
 *                  never going to see, and the counts they are shown describe
 *                  their own feed;
 *   4. shelf     — drop what is past its tier's window, counting it;
 *   5. cap       — the task stream only, counting the overflow;
 *   6. rank      — significance, then recency.
 *
 * `limit` caps the finished list. It is applied last and does NOT feed
 * `aged` — a row cut by the limit is still on the shelf and is still the
 * project's most recent position; conflating "too many to draw" with "too old
 * to matter" would make the disclosure counts meaningless.
 */
export function buildChangeFeed(
  sources: ChangeGroup[] | ChangeSourcePayloads,
  held: {
    canViewFinance?: boolean;
    canViewCompliance?: boolean;
    canViewProgramme?: boolean;
    canViewDocuments?: boolean;
  },
  options: { now?: Date; limit?: number } = {},
): ChangeFeed {
  const now = options.now ?? new Date();
  const groups = Array.isArray(sources) ? sources : buildChangeGroups(sources, now);

  const all = groups.flatMap((g) => g.items);
  const undated = groups.reduce((n, g) => n + g.undated, 0);

  // Gate before anything is counted or cut. A contractor's `aged` count must
  // describe a contractor's feed.
  const visible = filterChangesByPermission(all, held);

  let aged = 0;
  const fresh = visible.filter((i) => {
    if (isOnTheShelf(i)) return true;
    aged += 1;
    return false;
  });

  // The task stream is identified by `source`, not by which argument it
  // arrived in, so the cap holds however the caller assembled the groups.
  const freshTasks = rankChanges(fresh.filter((i) => i.source === "task"));
  const cappedTasks = freshTasks.slice(0, TASK_STREAM_CAP);
  const taskOverflow = freshTasks.length - cappedTasks.length;

  const ranked = rankChanges([...fresh.filter((i) => i.source !== "task"), ...cappedTasks]);
  const items = typeof options.limit === "number" ? ranked.slice(0, options.limit) : ranked;

  // "Nothing was passed in" and "nothing survived the filters" are different
  // states and the page must be able to tell them apart — the same distinction
  // `summariseQueue` draws between empty and calm. A brand-new project has no
  // certificates and no meetings, and reading that as "the project has been
  // quiet" would be a claim about a project nobody has started.
  const empty = all.length === 0 && undated === 0;

  return { items, undated, aged, taskOverflow, empty };
}
