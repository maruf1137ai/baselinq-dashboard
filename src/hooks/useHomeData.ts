/**
 * Every read the homepage makes, in one hook.
 *
 * Two things it is careful about:
 *
 *  1. **Permission-aware fetching.** The money endpoints are not requested at
 *     all unless the viewer holds `finance.view`. The old homepage fetched and
 *     rendered contract sums for everyone; a contractor without finance.view
 *     was reading the employer's commercial position on their landing page.
 *     Hiding a card is not the fix — not asking is.
 *
 *  2. **Per-source failure.** Each source reports its own `isError` so the page
 *     can say which part is missing instead of rendering a silent, confident
 *     "nothing needs you".
 */
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import useFetch from "@/hooks/useFetch";
import { usePagedList } from "@/hooks/usePagedList";
import { fetchData } from "@/lib/Api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissions } from "@/hooks/usePermissions";
import { useMilestones } from "@/hooks/useMilestones";
import type { Milestone } from "@/hooks/useMilestones";
import {
  buildCertificateQueue,
  buildMeetingActionQueue,
  buildPaymentOverdueQueue,
  homeVerdict,
  buildObligationQueue,
  buildRejectedCertificateQueue,
  groupRiskSignals,
  buildRsvpQueue,
  buildTaskQueue,
  buildTimeBarQueue,
  filterQueueByPermission,
  rankQueue,
  summariseQueue,
  resolveFinanceAccess,
  summariseHomeLoad,
  summariseMoney,
  summariseTime,
  visibleRiskSignals,
  type CertificateLike,
  type HomeLoadState,
  type MeetingActionItemLike,
  type MeetingLike,
  type ObligationLike,
  type PaymentSummaryLike,
  type QueueItem,
  type TimeBarLike,
  type VariationLike,
} from "@/lib/homeSignals";
import {
  buildCertificateRun,
  elapsedAwaitingCertification,
  retentionPosition,
  summariseVariations,
  toVariationRecord,
} from "@/lib/homeIndicators";
import { netRetentionHeld, summariseCertificateBasis } from "@/lib/projectPosition";
import {
  buildCertificateChanges,
  buildCertifiedCurve,
  buildChangeFeed,
  buildContractTimeline,
  buildMeetingChanges,
  buildMilestoneChanges,
  buildNoticeChanges,
  buildTaskChanges,
  buildVariationChanges,
  splitChangeByStatus,
  summariseChangePosition,
  summariseMilestoneDrift,
} from "@/lib/homeVisuals";
import { summariseProjectSetup } from "@/lib/homeSetup";
import { useProjectVariations } from "@/hooks/useProjectVariations";
import { isMeetingPast } from "@/lib/dateUtils";

interface RiskSignal {
  id: number;
  code: string;
  category: "delay" | "financial" | "compliance" | "claim";
  severity: "green" | "orange" | "red";
  status: "open" | "acknowledged" | "resolved" | "muted";
  title: string;
  is_contractual: boolean;
  /**
   * The object the signal is about — the serializer has always sent these
   * (`risk/serializers.py`), and dropping them here is what left the homepage
   * with nowhere to send a reader but `/project-health`. `ProjectHealth.tsx`
   * types the same two fields; this is the same shape, not a new one.
   */
  source_type: string | null;
  source_id: number | null;
  /**
   * `auto_now_add` on the model, so it genuinely dates the signal's
   * appearance. `last_evaluated_at` is `auto_now` and moves on every rules
   * run, so it is deliberately NOT read — ordering a feed by it would put the
   * whole risk register at the top of the page after every evaluation.
   */
  first_detected_at?: string | null;
  /**
   * The rule's own payload. Read for exactly one field —
   * `VO_TOLERANCE_BREACH.detail.tolerance_pct` — because that threshold is
   * this project's risk policy and exists nowhere else on the wire. The rule
   * emits nothing below the threshold, so the field is absent on a healthy
   * project and the band draws no tolerance mark rather than substituting the
   * rule's 10% default, which is a policy default and not this policy.
   */
  detail?: Record<string, unknown> | null;
}

interface SignalsResponse {
  signals: RiskSignal[];
  counts: { red: number; orange: number; green: number; total: number };
}

/** `useFetch` does not disable on an empty URL — it needs `enabled` explicitly. */
const on = (enabled: boolean) => ({ enabled });

/**
 * Read a single-shot response as a list.
 *
 * **Only for endpoints that are not paged.** Every DRF router-registered
 * viewset in this backend pages at twenty with no `page_size` parameter
 * (`baselink_server/settings.py:268`), and this helper reads `results` and
 * silently drops `next` — which is exactly how the money figures on this page
 * came to be summed over an arbitrary twenty rows. Paged routes go through
 * `usePagedList` instead; see `src/lib/fetchAllPages.ts`.
 *
 * What is left on it is the plain `APIView` routes, which return a wrapper
 * object with the whole list in it and no pagination at all: time bars, risk
 * signals, obligations, milestones and `projects/{id}/tasks/`. Each was
 * checked in the backend rather than assumed.
 */
const listOf = <T,>(payload: any): T[] =>
  Array.isArray(payload) ? payload : (payload?.results ?? []);

export function useHomeData(projectId: string | undefined) {
  const { data: currentUser, isLoading: loadingCurrentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ? String(currentUser.id) : undefined;
  // Permissions are resolved per PROJECT off `ProjectTeamMember.role`, not off
  // the account role — the same person can be a Contractor on one job and a
  // Client on another. `usePermissions` already scopes to selectedProjectId.
  //
  // `resolveFinanceAccess` fails closed while the map is loading; see its
  // comment. Without it a contractor gets a flash of the contract sum.
  const perms = usePermissions();
  const {
    canViewFinance,
    canApprovePayment,
    canEditFinance,
    canCertifyCertificate,
    canPostCertificate,
    canPrepareCertificate,
  } = resolveFinanceAccess(perms);
  const canEditByRole = perms.canEditProject;
  const permissionsLoading = perms.isLoading;

  const has = !!projectId;

  // ── Everyone's data ─────────────────────────────────────────────────────
  const tasks = useFetch<{ tasks: any[] }>(
    has ? `projects/${projectId}/tasks/` : "",
    on(has),
  );
  /**
   * PAGED. `MeetingViewSet` is router-registered and sets no
   * `pagination_class`, so the previous single read returned the twenty most
   * recent meetings and no more — losing unanswered invitations and pending
   * meeting actions off the queue, silently, on any project with a real
   * meeting history.
   */
  const meetings = usePagedList<MeetingLike>(
    (page) => `meetings/?project_id=${projectId}&page=${page}`,
    has,
    ["home-meetings", projectId],
  );
  const timeBars = useFetch<{ time_bars: TimeBarLike[] }>(
    has ? `projects/${projectId}/time-bars/` : "",
    on(has),
  );
  // `/project-health` is gated on compliance.view (App.tsx), so the homepage
  // strip that links there is too — and is not requested without it.
  const canViewCompliance = !permissionsLoading && perms.canViewCompliance;
  // Same fail-closed-while-loading treatment as canViewCompliance above —
  // this is not a finance flag, so it does not go through
  // resolveFinanceAccess. A queue-visibility decision must fail CLOSED
  // while permissions are still loading, not open.
  const canManageTimeBars = !permissionsLoading && perms.canManageTimeBars === true;
  const risk = useFetch<SignalsResponse>(
    has && canViewCompliance ? `projects/${projectId}/risk-signals/` : "",
    on(has && canViewCompliance),
  );
  // Obligations are extracted from the project's own contract documents and
  // are rendered on `/compliance`, so they carry the same gate. Like the risk
  // endpoint they are not merely hidden without it — they are not requested.
  const obligations = useFetch<{ obligations: ObligationLike[] }>(
    has && canViewCompliance ? `documents/obligations/?project_id=${projectId}` : "",
    on(has && canViewCompliance),
  );
  /**
   * PAGED, and this one decided whether the page had a project at all.
   *
   * `ProjectViewSet` is router-registered and pages at twenty. The selected
   * project is found by scanning this list, so a user on their twenty-first
   * project found NOTHING — `project` was undefined, and every figure derived
   * from it (contract sum, revised sum, contract dates, retention rate) came
   * back null on a project that has all four. It reads as an empty project
   * rather than as an error, which is the worst of the three possible
   * failures.
   */
  const projectList = usePagedList<any>(
    (page) => `projects/?userId=${currentUser?.id}&page=${page}`,
    !!currentUser?.id,
    ["home-projects", currentUser?.id],
  );
  const milestones = useMilestones(has ? projectId : null);

  // ── finance.view only ───────────────────────────────────────────────────
  // Not merely hidden — never requested.
  const wantsMoney = has && canViewFinance;
  /**
   * PAGED, and this is the read every money figure on the page is built from.
   *
   * `PaymentCertificateViewSet` sets no `pagination_class` and orders
   * `-updated_at`, so the single read this replaces returned the twenty most
   * recently TOUCHED certificates. On a twenty-four-month job that is twenty
   * of twenty-four, chosen by who edited what last, and "Certified to date",
   * "Retention held", the balance, the certified percentage and the certified
   * curve were all summed over that arbitrary subset and printed as totals.
   */
  const certificates = usePagedList<CertificateLike>(
    (page) => `tasks/payment-certificates/?projectId=${projectId}&page=${page}`,
    wantsMoney,
    ["home-certificates", projectId],
  );
  /**
   * PAGED. `TaskViewSet` is router-registered and pages at twenty like the
   * rest, so a project with more than twenty VO assignment tasks was short by
   * the remainder — and this list feeds the approved-variation total, hence
   * the revised contract sum, hence the balance and the certified percentage.
   */
  const variations = usePagedList<VariationLike>(
    (page) => `tasks/tasks/?taskType=VO&project=${projectId}&page=${page}`,
    wantsMoney,
    ["home-vo-tasks", projectId],
  );
  /**
   * The payment position of every POSTED certificate — due date, days past
   * due, and the basis the server counted from.
   *
   * `tasks/payment_terms.py` resolves the payment period from the project's
   * own `ProjectPaymentTerms` and applies the South African working-day
   * calendar where the period is counted in working days.
   * `useProjectCommercials` has read this for Project Health all along; the
   * homepage never asked, so a certificate nineteen days past its contractual
   * due date sat in the queue with no clock, ranked beside one submitted this
   * morning. It is a plain `APIView`, so it is not paged.
   *
   * Same `finance.view` gate as the two reads above — the server enforces it
   * independently at `tasks/views_payments.py:386.
   */
  const payments = useFetch<PaymentSummaryLike>(
    wantsMoney ? `projects/${projectId}/payments/` : "",
    on(wantsMoney),
  );
  /**
   * Manual Cost Ledger credit entries not already counted via a real posted
   * certificate's own claim_amount (`linked_pc`/`linked_vo` both null) — see
   * `useProjectCommercials`'s identical read for the full reasoning. Read
   * here too so Home's certified curve can't drift from Project Health's
   * Financial Overview, the exact drift this file's `summariseMoney` header
   * already describes fixing once.
   */
  const ledgerSummary = useFetch<{ manualCreditsTotal?: number; manualDebitsTotal?: number }>(
    wantsMoney ? `cost-ledger/summary/?project_id=${projectId}` : "",
    on(wantsMoney),
  );
  // The variation RECORDS, as distinct from the assignment tasks above. Both
  // are read and merged below — see `useProjectVariations` for why neither
  // alone is sufficient. Same `finance.view` gate: not requested without it.
  const variationRecords = useProjectVariations(projectId, wantsMoney);

  const allProjects = projectList.rows;
  const project = allProjects.find((p: any) => String(p._id || p.id) === String(projectId));

  // ── Meetings ────────────────────────────────────────────────────────────
  const meetingList = meetings.rows;

  const upcomingMeetings = useMemo(
    () =>
      meetingList
        .filter(
          (m) =>
            m.status !== "cancelled" &&
            m.my_rsvp !== "declined" &&
            !isMeetingPast(m.date ?? "", m.time ?? ""),
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_utc || a.date_time || a.date || 0).getTime() -
            new Date(b.scheduled_utc || b.date_time || b.date || 0).getTime(),
        ),
    [meetingList],
  );

  // Meetings whose notes have landed. Action items live only on the DETAIL
  // endpoint (`meetings/{id}/`) — there is no project-level action-items
  // route — so the detail is fetched only for this bounded set, never for the
  // whole list.
  const notesReady = useMemo(
    () => meetingList.filter((m) => m.artefact_status === "notes_ready").slice(0, 6),
    [meetingList],
  );

  const meetingDetails = useQueries({
    queries: notesReady.map((m) => ({
      queryKey: [`meetings/${m.id}/`],
      queryFn: () => fetchData(`meetings/${m.id}/`),
      staleTime: 60_000,
    })),
  });

  const meetingsWithActions = useMemo(
    () =>
      meetingDetails
        .map((q, i) => {
          const d = q.data as
            | { id: number; title: string; action_items?: MeetingActionItemLike[] }
            | undefined;
          if (!d) return null;
          return {
            id: d.id ?? notesReady[i].id,
            title: d.title ?? notesReady[i].title,
            action_items: d.action_items ?? [],
          };
        })
        .filter(Boolean) as { id: number; title: string; action_items: MeetingActionItemLike[] }[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meetingDetails.map((q) => q.dataUpdatedAt).join(","), notesReady],
  );

  // ── Tasks ───────────────────────────────────────────────────────────────
  // The existing needsAction / overdue logic is the one thing on the old page
  // that was correct, and it is kept verbatim: `assignedTo` is Werner's "To"
  // (the ball is in your court), `responseBy` is "CC'd, watching only".
  const taskList = useMemo(() => {
    const raw = tasks.data?.tasks || [];
    return raw.map((item: any) => {
      const rawType = (item.taskType || "").toString().toUpperCase();
      const type = rawType === "CRITICALPATHITEM" ? "CPI" : rawType;
      const status = (item.status || item.task?.status || "todo").toLowerCase();
      const open = status !== "done" && status !== "closed";
      const assignees = (item.assignedTo || []) as any[];
      const assignedToMe =
        !!currentUserId && assignees.some((u: any) => String(u.userId) === currentUserId);
      // Who the backend actually notified when it escalated. Recorded at
      // escalation time and read back here, rather than re-deriving "who is
      // the PM" in the client: the row on the homepage and the notification in
      // the bell must be the same claim to the same people.
      const escalatedTo = (item.escalatedTo || item.escalated_to || []) as any[];
      return {
        id: String(item.taskId || item.task?._id || ""),
        title: item.task?.subject || item.task?.title || item.task?.taskActivityName || "",
        type: type || undefined,
        status,
        // Raw per-entity status (e.g. VO "Rejected", RFI "Closed") behind
        // the Task.status bucket above. Already on the payload via
        // TaskSerializer's nested entity serializer (item.task.status) —
        // RecentActivity uses it to pick an accurate verb instead of
        // collapsing every terminal state to "approved".
        entityStatus: item.task?.status ?? null,
        due_date: item.task?.dueDate || item.task?.finishDate || null,
        // ── The three fields "Recent activity" reads, and nothing else ─────
        //
        // Read straight off the payload in exactly the order the previous
        // homepage read them, so the restored panel sorts and dates its rows
        // the way it did. `assignedBy` is the only name a task payload
        // carries for WHO moved the row; it is passed through as-is and stays
        // null where the backend attributed nothing. Nothing is substituted
        // for it — see the note in `RecentActivity.tsx`.
        created_at: item.created_at || item.task?.createdAt || null,
        updated_at: item.task?.updatedAt || item.created_at || item.task?.createdAt || null,
        assignedBy: item.assignedBy ?? null,
        // The two fields the "My actions" rows print and the queue never
        // did. Read straight off the task record; no default is invented for
        // either — a task with no priority set draws no chip, and one with no
        // description draws no second line rather than echoing its own title.
        priority: item.task?.priority || item.priority || null,
        description: item.task?.description || item.description || null,
        needsAction: open && assignedToMe,
        // Escalation does not reassign, so this is deliberately NOT folded
        // into `needsAction`: the task remains the assignee's to do and
        // becomes the PM's to chase. Two different claims, two different rows.
        escalatedToMe:
          open &&
          !!currentUserId &&
          !!(item.isEscalated ?? item.is_escalated) &&
          escalatedTo.some((id: any) => String(id) === currentUserId),
        escalatedAt: item.escalatedAt || item.escalated_at || null,
        // The person who is late — the one to call. Named from the assignee
        // list; left null rather than guessed when the payload has no name.
        awaiting:
          assignees.map((u: any) => u?.name).filter(Boolean).join(", ") || null,
      };
    });
  }, [tasks.data, currentUserId]);

  /**
   * ── My actions: the work that is genuinely THIS PERSON'S ────────────────
   *
   * The same `needsAction` predicate the queue uses — `assignedTo` contains
   * the signed-in user and the status is neither done nor closed — and
   * nothing else. It is deliberately NOT derived from `queue`: `queue` is
   * permission-filtered and consequence-ranked for a different question
   * ("what outranks what across the whole contract"), and a plain task lands
   * at the bottom of that order, below every notice deadline and every
   * certificate. An RFI a person has been asked to answer is not a footnote
   * to somebody else's clock, and it was being rendered as one.
   *
   * **Ungated, and that is the point.** No `canViewFinance`, no
   * `canViewCompliance`, no `filterQueueByPermission`. An architect, an
   * engineer or a contractor with no finance permission at all still holds
   * RFIs and site instructions, and this list is the only place on the page
   * that tells them so. The rows carry no money and no risk rating — a task
   * subject, its priority and its due date — so there is nothing here for a
   * permission to protect.
   *
   * An escalation is excluded: `buildTaskQueue` already resolves a task that
   * is both assigned to you AND escalated to you as the escalation, and the
   * queue keeps those rows because what escalated to you is somebody else's
   * lateness, not your own work. One fact, one row, one list.
   *
   * Order: overdue first, then by due date ascending, undated last. That is
   * the previous homepage's sort, kept verbatim — it was correct.
   */
  const myActions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskList
      .filter((t: any) => t.needsAction && !t.escalatedToMe)
      .map((t: any) => {
        const due = t.due_date ? new Date(t.due_date) : null;
        const valid = due && Number.isFinite(due.getTime());
        if (valid) due!.setHours(0, 0, 0, 0);
        return {
          ...t,
          overdue: valid ? due!.getTime() < today.getTime() : false,
          dueTime: valid ? due!.getTime() : Number.POSITIVE_INFINITY,
        };
      })
      .sort((a: any, b: any) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        return a.dueTime - b.dueTime;
      });
  }, [taskList]);

  // ── The queue ───────────────────────────────────────────────────────────
  const certificateList = certificates.rows;
  const variationList = variations.rows;

  /**
   * The two variation sources, merged and de-duplicated on VO number.
   *
   * Neither route sees everything: `tasks/variation-orders/` misses nothing but
   * is paged across projects, while `tasks/tasks/?taskType=VO` is
   * project-scoped but only returns variations that have an assignment task.
   * The variation RECORD wins on collision — its `status` is the contractual
   * one, where the task's is a todo/in-review/done lifecycle.
   *
   * A row with no VO number cannot be matched against anything, so it is kept
   * rather than dropped: under-counting an outstanding variation is the more
   * expensive mistake of the two.
   */
  const variationRecordList = useMemo(() => {
    const merged = [...variationRecords.records];
    const seen = new Set(merged.map((v) => v.ref).filter(Boolean) as string[]);
    for (const raw of variationList) {
      const rec = toVariationRecord(raw);
      if (rec.ref && seen.has(rec.ref)) continue;
      if (rec.ref) seen.add(rec.ref);
      merged.push(rec);
    }
    return merged;
  }, [variationRecords.records, variationList]);

  // Every source contributes independently, so one failing endpoint costs its
  // own rows and not the queue. Order here is irrelevant — `rankQueue` is the
  // only thing that decides what a user sees first, and it is tested on its
  // own in `src/lib/__tests__/homeQueueRank.test.ts`.
  //
  // **Only sources a person can act on are here.** Risk signals are not: they
  // are standing conditions with no move attached, they are already listed and
  // acknowledgeable on `/project-health`, and putting them in this list made
  // twelve of project 45's thirteen rows non-actionable duplicates that buried
  // the one certificate genuinely waiting on the user. They surface as
  // `riskGroups` below instead. See the note above `groupRiskSignals`.
  const queue: QueueItem[] = useMemo(() => {
    const items = [
      ...buildTimeBarQueue(timeBars.data?.time_bars ?? []),
      // The one dated certificate row, and the reason the payments endpoint is
      // now requested: a posted certificate past its contractual due date.
      ...buildPaymentOverdueQueue(payments.data),
      ...buildCertificateQueue(certificateList),
      ...buildRejectedCertificateQueue(certificateList),
      ...buildObligationQueue(obligations.data?.obligations ?? []),
      ...buildRsvpQueue(meetingList),
      ...buildMeetingActionQueue(meetingsWithActions),
      ...buildTaskQueue(taskList),
    ];
    // ── Gating, now down to the ACT and not just the module ──────────────
    //
    // The module gates are unchanged: finance rows need finance.view,
    // compliance rows need compliance.view. What is new is that a certificate
    // row also declares the permission for the transition it names, so
    // "Certify PC-006" reaches the principal agent and not the contractor's
    // QS. Those codes are the server's own `TRANSITION_PERMISSIONS`; see
    // `buildCertificateQueue`.
    //
    // Every finance flag here has been through `resolveFinanceAccess`, and
    // `canManageTimeBars` gets the same fail-closed-while-loading treatment
    // above (not finance-specific, so not routed through that helper) —
    // all are false while the permission map is in flight.
    // `filterQueueByPermission` treats an absent flag as false for the same
    // reason: an unknown authority is not an authority.
    return rankQueue(
      filterQueueByPermission(items, {
        canViewFinance,
        canViewCompliance,
        canEditFinance,
        canCertify: canCertifyCertificate,
        canPostCertificate,
        canPrepareCertificate,
        canManageTimeBars,
      }),
    );
  }, [
    certificateList,
    payments.data,
    timeBars.data,
    obligations.data,
    meetingList,
    meetingsWithActions,
    taskList,
    canViewFinance,
    canViewCompliance,
    canEditFinance,
    canCertifyCertificate,
    canPostCertificate,
    canPrepareCertificate,
    canManageTimeBars,
  ]);

  const queueSummary = useMemo(() => summariseQueue(queue), [queue]);

  // ── Money ───────────────────────────────────────────────────────────────
  //
  // ── EVERY DERIVED FIGURE IS GUARDED ON ITS INPUTS ─────────────────────
  //
  // `summariseMoney` takes NULL for "this list could not be read" and `[]` for
  // "the project has none of these", and the two produce different answers.
  // Handing it `[]` on a failed request is what made the strip fabricate: the
  // certificates request would fail, `certified` and `retentionHeld` came back
  // null correctly, and `balance` quietly computed `revised − 0 − 0` while
  // `certifiedPct` computed 0 — so the page rendered "R 10 000 000,00
  // remaining · 100% remaining" on a job that is 82% certified, with nothing
  // but a muted grey outage line three panels above it.
  //
  // A truncated walk counts as unreadable for the same reason: a total summed
  // over the first five hundred of an unknown number of certificates is not a
  // total. It cannot happen at PAGE_LIMIT on any project this platform has,
  // and it is guarded anyway rather than trusted not to.
  const certificatesReadable = !certificates.isError && !certificates.truncated;
  // EITHER variation source failing makes the approved-variation total short,
  // and the revised contract sum is built on it.
  const variationsReadable =
    !variations.isError && !variations.truncated && !variationRecords.isError;

  const money = useMemo(
    () =>
      summariseMoney(
        project,
        certificatesReadable ? certificateList : null,
        variationsReadable
          ? variationRecordList.map((v) => ({
              status: v.status ?? undefined,
              grandTotal: v.value,
              signedAt: v.signedAt,
            }))
          : null,
        ledgerSummary.isError ? null : ledgerSummary.data?.manualCreditsTotal ?? null,
        ledgerSummary.isError ? null : ledgerSummary.data?.manualDebitsTotal ?? null,
      ),
    [
      project,
      certificateList,
      variationRecordList,
      certificatesReadable,
      variationsReadable,
      ledgerSummary.data,
      ledgerSummary.isError,
    ],
  );

  // ── Key indicators ──────────────────────────────────────────────────────
  //
  // The client's "Key Indicators" strip. Every figure below comes off a real
  // response and each is derived by a pure, tested function in
  // `src/lib/homeIndicators.ts`, which also records the two indicators from
  // that mock that CANNOT be stated honestly and the fields they would need.
  //
  // No new fetch and no new gate: variations and certificates are already
  // behind `finance.view`, risk is already behind `compliance.view`, and the
  // risk counts are the ones `visibleRiskSignals` has already filtered.
  const variationPosition = useMemo(
    () => summariseVariations(variationRecordList),
    [variationRecordList],
  );

  /** The certificate series — the client's "Payment Timeline". */
  const certificateRun = useMemo(() => buildCertificateRun(certificateList), [certificateList]);

  /**
   * How long the longest-waiting certificate has been awaiting certification.
   * ELAPSED time, not a countdown: no payment deadline is modelled on this
   * project. See the header of `homeIndicators.ts`.
   */
  const awaitingCertification = useMemo(
    () => elapsedAwaitingCertification(certificateList),
    [certificateList],
  );

  /**
   * Two facts about the certificate rows that `summariseMoney` does not report
   * — releases, and mixed VAT basis. Read off the SAME rows it read, and only
   * when those rows are trustworthy: a truncated or failed walk is handed `[]`
   * here for the same reason `summariseMoney` is handed `null`.
   */
  const certificateBasis = useMemo(
    () => summariseCertificateBasis(certificatesReadable ? certificateList : []),
    [certificateList, certificatesReadable],
  );

  /**
   * Retention held, NET OF RELEASES — the same figure Project Health prints.
   *
   * `money.retentionHeld` is Σ `retentionAmount` over posted certificates with
   * nothing subtracted. Home printed exactly that, so from the first release at
   * practical completion it permanently overstated money the employer no longer
   * holds — while `useProjectCommercials`, one click away and off the same
   * payload, netted it. One figure, one function, both screens.
   *
   * Where NO posted certificate carries `retention_release` at all,
   * `netRetentionHeld` returns the gross figure unchanged and
   * `retentionReleaseKnown` below is false, so the band says releases could not
   * be read rather than implying there were none.
   */
  const retention = useMemo(
    () =>
      retentionPosition(
        project,
        netRetentionHeld(money.retentionHeld, certificateBasis.retentionReleased),
      ),
    [project, money.retentionHeld, certificateBasis.retentionReleased],
  );

  // ── Contract time ───────────────────────────────────────────────────────
  // Read off the project object that is ALREADY fetched for the page header —
  // no new request, and no permission gate: dates are not money. A contractor
  // who cannot see the contract sum can still see when the works are due.
  const time = useMemo(() => summariseTime(project), [project]);

  /** The certificate the project is currently working on. */
  const currentCertificate = useMemo(() => {
    const rank: Record<string, number> = { submitted: 0, approved: 1, rejected: 2, draft: 3, posted: 4 };
    return [...certificateList].sort((a, b) => {
      const ra = rank[a.workflowState ?? "draft"] ?? 9;
      const rb = rank[b.workflowState ?? "draft"] ?? 9;
      if (ra !== rb) return ra - rb;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    })[0];
  }, [certificateList]);

  // ── Risk ────────────────────────────────────────────────────────────────
  const riskSignals = useMemo(
    () => visibleRiskSignals(risk.data?.signals ?? [], { canViewCompliance, canViewFinance }),
    [risk.data, canViewCompliance, canViewFinance],
  );
  // Counts are recomputed from what this viewer may actually see, so the
  // header never says "3 red" beside two visible rows.
  const riskCounts = useMemo(
    () => ({
      red: riskSignals.filter((s) => s.severity === "red").length,
      orange: riskSignals.filter((s) => s.severity === "orange").length,
      green: riskSignals.filter((s) => s.severity === "green").length,
      total: riskSignals.length,
    }),
    [riskSignals],
  );
  // One line per rule that fired, worst first. Grouping only — `riskSignals`
  // has already been through `visibleRiskSignals`, so no signal reaches this
  // that the viewer was not already entitled to.
  const riskGroups = useMemo(() => groupRiskSignals(riskSignals), [riskSignals]);

  // ── The visual band ─────────────────────────────────────────────────────
  //
  // Four derived shapes, all pure and all tested in
  // `src/lib/__tests__/homeVisuals.test.ts`. NO NEW FETCH: every one is built
  // from a payload already requested above, so the band introduces no new
  // permission surface and a viewer's gates are exactly the ones they had.

  /**
   * The contract dates as an axis. Off the project object the page header
   * already reads — no request, and no gate. Dates are not money.
   */
  const timeline = useMemo(() => buildContractTimeline(time), [time]);

  /**
   * Baseline finish against actual finish, across the WHOLE programme —
   * `milestones.data`, not `milestoneRows`, because that list drops completed
   * milestones and a completed milestone is precisely the one whose slip is
   * finally a fact rather than a plan.
   */
  const milestoneDrift = useMemo(
    () => summariseMilestoneDrift(milestones.data ?? []),
    [milestones.data],
  );

  /**
   * The two reads whose failure this page used to render as a fact.
   *
   * `milestonesUnavailable` and `projectUnavailable` exist so the band can say
   * "could not be read" where it would otherwise say "No milestones recorded"
   * and "No project timeline recorded". A truncated project walk counts as
   * unavailable for the same reason a truncated certificate walk does: the
   * selected project may simply not be in the rows that arrived.
   */
  const milestonesUnavailable = milestones.isError;
  const projectUnavailable = projectList.isError || projectList.truncated;

  /** Cumulative certified value, off the run that had no caller until now. */
  const certifiedCurve = useMemo(
    () => buildCertifiedCurve(certificateRun, money.revisedContractSum),
    [certificateRun, money.revisedContractSum],
  );

  /**
   * The VO tolerance, read off the server's own fired signal and nowhere else.
   *
   * `visibleRiskSignals` has NOT run on `risk.data.signals` at this point, so
   * the gate is applied here explicitly: the threshold is only read when the
   * viewer holds both `compliance.view` (the endpoint's gate) and
   * `finance.view` (the signal is FINANCIAL and its detail carries amounts) —
   * the same pairing `visibleRiskSignals` applies. Without both it stays null
   * and the band draws no tolerance mark.
   */
  const tolerancePct = useMemo(() => {
    if (!canViewCompliance || !canViewFinance) return null;
    const signal = (risk.data?.signals ?? []).find((s) => s.code === "VO_TOLERANCE_BREACH");
    const raw = signal?.detail?.tolerance_pct;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [risk.data, canViewCompliance, canViewFinance]);

  const changePosition = useMemo(
    () =>
      summariseChangePosition(
        variationRecordList,
        money.contractSum,
        money.variations,
        tolerancePct,
      ),
    [variationRecordList, money.contractSum, money.variations, tolerancePct],
  );

  const changeSplit = useMemo(
    () => splitChangeByStatus(variationRecordList),
    [variationRecordList],
  );

  /**
   * "What changed", assembled from what the page already holds.
   *
   * Every group declares the permissions of the endpoint it came from and
   * `buildChangeFeed` enforces them, failing closed on an absent flag exactly
   * as `filterQueueByPermission` does. The finance groups are additionally
   * EMPTY for a viewer without `finance.view`, because the requests behind
   * them were never made — the filter is the second line, not the only one.
   */
  const changeFeed = useMemo(
    () =>
      buildChangeFeed(
        [
          buildCertificateChanges(certificateList),
          buildVariationChanges(variationRecordList),
          buildNoticeChanges(timeBars.data?.time_bars ?? []),
          buildMilestoneChanges(milestones.data ?? []),
          buildMeetingChanges(meetingList),
          buildTaskChanges(taskList),
        ],
        { canViewFinance, canViewCompliance },
        // No `limit` here: the old fixed count was sized to a page that grew
        // to fit its content and had to hold one screen. The panel now scrolls
        // within its own fixed height instead, so the feed hands over
        // everything still on the shelf and the panel decides how much of it
        // to show at once.
      ),
    [
      certificateList,
      variationRecordList,
      timeBars.data,
      milestones.data,
      meetingList,
      taskList,
      canViewFinance,
      canViewCompliance,
    ],
  );

  // ── Milestones ──────────────────────────────────────────────────────────
  // Only milestones with a real baseline can report slip. The rest are shown
  // with their dates and status and nothing more — no invented percentage.
  const milestoneRows: Milestone[] = useMemo(() => {
    const all = milestones.data ?? [];
    return [...all]
      .filter((m) => m.status !== "completed")
      .sort((a, b) => new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime());
  }, [milestones.data]);

  // ── Load state ──────────────────────────────────────────────────────────
  const visibleSources: (keyof HomeLoadState)[] = useMemo(() => {
    // Only sources this viewer was actually going to be shown count towards
    // the outage message — a contractor is not told the certificates endpoint
    // failed for data they were never going to see.
    // `projectFailed` and `milestonesFailed` are ungated: dates are not money,
    // and every viewer is shown the contract axis and the programme.
    const base: (keyof HomeLoadState)[] = [
      "tasksFailed",
      "meetingsFailed",
      "timeBarsFailed",
      "projectFailed",
      "milestonesFailed",
    ];
    if (canViewCompliance) base.push("riskFailed", "obligationsFailed");
    return canViewFinance
      ? [...base, "certificatesFailed", "variationsFailed", "paymentsFailed"]
      : base;
  }, [canViewFinance, canViewCompliance]);

  const loadIssue = summariseHomeLoad(
    {
      tasksFailed: tasks.isError,
      meetingsFailed: meetings.isError,
      // A TRUNCATED walk is a failed read for this purpose. It means the list
      // is short by an unknown amount, and a short list under a total is the
      // defect this whole change exists to close — the badge is the fallback
      // disclosure, and the banner is how it reaches somebody who is not
      // looking at that zone.
      certificatesFailed: certificates.isError || certificates.truncated,
      // Either variation source failing means the variation figures are
      // incomplete, and the banner must say so rather than showing a short
      // count as though it were the whole picture.
      variationsFailed:
        variations.isError ||
        variations.truncated ||
        variationRecords.isError ||
        variationRecords.truncated,
      timeBarsFailed: timeBars.isError,
      riskFailed: risk.isError,
      obligationsFailed: obligations.isError,
      paymentsFailed: payments.isError,
      // A TRUNCATED project walk is a failed read: the selected project is
      // found by scanning these rows, so a short list is indistinguishable
      // from a project that does not exist.
      projectFailed: projectUnavailable,
      milestonesFailed: milestonesUnavailable,
    },
    visibleSources,
  );

  const retryFailed = () => {
    if (tasks.isError) tasks.refetch();
    if (meetings.isError) meetings.refetch();
    if (certificates.isError) certificates.refetch();
    if (variations.isError) variations.refetch();
    if (variationRecords.isError) variationRecords.refetch();
    if (payments.isError) payments.refetch();
    if (timeBars.isError) timeBars.refetch();
    if (risk.isError) risk.refetch();
    if (obligations.isError) obligations.refetch();
    // Both were unretryable until now — "Try again" left the two reads that
    // date this page exactly where they were.
    if (projectUnavailable) projectList.refetch();
    if (milestones.isError) void milestones.refetch();
  };

  // Permissions are part of loading: until the map lands we do not know
  // whether this viewer gets money blocks, and rendering the page without
  // them and then popping them in reads as a glitch to a PM who holds
  // finance.view.
  const isLoading =
    permissionsLoading ||
    loadingCurrentUser ||
    tasks.isLoading ||
    meetings.isLoading ||
    timeBars.isLoading ||
    (wantsMoney && certificates.isLoading);

  /**
   * ── The one line that states where the project is ─────────────────────
   *
   * Built from the ranked, permission-filtered queue and the load state, so
   * it can never name something the reader is not shown, and never asserts
   * "nothing is late" over a source that did not answer. See `homeVerdict`.
   */
  const verdict = useMemo(
    () =>
      // NULL WHILE LOADING, and this is the important half of the guard. An
      // in-flight page has an empty queue and no load issue yet, and
      // `homeVerdict` over that returns "Nothing is past a contractual date."
      // — a confident all-clear about a project nothing has been read from.
      // The line simply is not there until the page can answer.
      isLoading ? null : homeVerdict({ queue, loadLevel: loadIssue.level }),
    [isLoading, queue, loadIssue.level],
  );

  const projectStats = useMemo(() => summariseProjectSetup(project), [project]);
  const isProjectCreator = !!currentUser?.id && String(project?.userId) === String(currentUser.id);


  return {
    // identity + permissions
    currentUser,
    canViewFinance,
    // Exposed so the page can tell "no open signals" from "you may not see
    // them". A viewer without this gate is served an empty `riskSignals`, and
    // rendering that as a zero would assert a clear project to somebody who was
    // simply not shown it.
    canViewCompliance,
    /**
     * `finance.approve_payment` — REVERSING a recorded payment, per
     * `tasks/views_payments.py`. Kept and exposed, and deliberately not used
     * to scope the certificate rows: the acts those rows name are
     * `finance.approve_certificate`, `finance.post_certificate` and
     * `finance.create_certificate`, which are the three flags below.
     */
    canApprovePayment,
    canCertifyCertificate,
    canPostCertificate,
    canPrepareCertificate,
    canEditProject: canEditByRole || isProjectCreator,
    // project
    project,
    allProjects,
    projectStats,
    // derived
    /** The single worst true fact, or the statement that there is not one. */
    verdict,
    queue,
    queueSummary,
    /** Tasks assigned to the signed-in user. Ungated — see the note above. */
    myActions,
    // The normalised tasks themselves. "Recent activity" is the only reader:
    // it orders them by when they were last touched, which is a different
    // question from either "what is mine" (`myActions`) or "what outranks
    // what" (`queue`), and it is not derivable from either list.
    taskList,
    money,
    time,
    /**
     * True when the certificate page walk hit its limit, so every money figure
     * on this page is short by an unknown amount. Rendered as a badge on the
     * money zone, the same disclosure `variationsTruncated` already drives.
     */
    certificatesTruncated: certificates.truncated,
    /**
     * False when NO posted certificate carried `retention_release`, so
     * `retention.held` is gross and the band must say so. True is not a claim
     * that every release is in it — only that at least one was readable.
     */
    retentionReleaseKnown: certificateBasis.retentionReleased !== null,
    /** The two reads whose absence must never be printed as a fact. */
    projectUnavailable,
    milestonesUnavailable,
    // The visual band
    timeline,
    milestoneDrift,
    certifiedCurve,
    changePosition,
    changeSplit,
    changeFeed,
    // Key indicators
    variationPosition,
    variationsTruncated: variationRecords.truncated || variations.truncated,
    certificateRun,
    awaitingCertification,
    retention,
    currentCertificate,
    upcomingMeetings,
    meetingsWithActions,
    riskSignals,
    riskCounts,
    riskGroups,
    milestoneRows,
    documents: (project?.documents || project?.attachments || []) as any[],
    // state
    isLoading,
    loadIssue,
    canRetry: loadIssue.level !== "none",
    retryFailed,
    riskUnavailable: risk.isError,
  };
}

export type HomeData = ReturnType<typeof useHomeData>;
