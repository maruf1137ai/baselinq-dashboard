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
import { fetchData } from "@/lib/Api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissions } from "@/hooks/usePermissions";
import { useMilestones } from "@/hooks/useMilestones";
import type { Milestone } from "@/hooks/useMilestones";
import {
  buildCertificateQueue,
  buildMeetingActionQueue,
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
  const { canViewFinance, canApprovePayment } = resolveFinanceAccess(perms);
  const canEditByRole = perms.canEditProject;
  const permissionsLoading = perms.isLoading;

  const has = !!projectId;

  // ── Everyone's data ─────────────────────────────────────────────────────
  const tasks = useFetch<{ tasks: any[] }>(
    has ? `projects/${projectId}/tasks/` : "",
    on(has),
  );
  const meetings = useFetch<any>(has ? `meetings/?project_id=${projectId}` : "", on(has));
  const timeBars = useFetch<{ time_bars: TimeBarLike[] }>(
    has ? `projects/${projectId}/time-bars/` : "",
    on(has),
  );
  // `/project-health` is gated on compliance.view (App.tsx), so the homepage
  // strip that links there is too — and is not requested without it.
  const canViewCompliance = !permissionsLoading && perms.canViewCompliance;
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
  const projectList = useFetch<any>(
    currentUser?.id ? `projects/?userId=${currentUser.id}` : "",
    on(!!currentUser?.id),
  );
  const milestones = useMilestones(has ? projectId : null);

  // ── finance.view only ───────────────────────────────────────────────────
  // Not merely hidden — never requested.
  const wantsMoney = has && canViewFinance;
  const certificates = useFetch<{ results: CertificateLike[] }>(
    wantsMoney ? `tasks/payment-certificates/?projectId=${projectId}` : "",
    on(wantsMoney),
  );
  const variations = useFetch<{ results: VariationLike[] }>(
    wantsMoney ? `tasks/tasks/?taskType=VO&project=${projectId}` : "",
    on(wantsMoney),
  );
  // The variation RECORDS, as distinct from the assignment tasks above. Both
  // are read and merged below — see `useProjectVariations` for why neither
  // alone is sufficient. Same `finance.view` gate: not requested without it.
  const variationRecords = useProjectVariations(projectId, wantsMoney);

  const allProjects = listOf<any>(projectList.data);
  const project = allProjects.find((p: any) => String(p._id || p.id) === String(projectId));

  // ── Meetings ────────────────────────────────────────────────────────────
  const meetingList = useMemo(() => listOf<MeetingLike>(meetings.data), [meetings.data]);

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
      return {
        id: String(item.taskId || item.task?._id || ""),
        title: item.task?.subject || item.task?.title || item.task?.taskActivityName || "",
        type: type || undefined,
        status,
        due_date: item.task?.dueDate || item.task?.finishDate || null,
        needsAction:
          status !== "done" &&
          status !== "closed" &&
          !!currentUserId &&
          (item.assignedTo || []).some((u: any) => String(u.userId) === currentUserId),
      };
    });
  }, [tasks.data, currentUserId]);

  // ── The queue ───────────────────────────────────────────────────────────
  const certificateList = useMemo(
    () => listOf<CertificateLike>(certificates.data),
    [certificates.data],
  );
  const variationList = useMemo(() => listOf<VariationLike>(variations.data), [variations.data]);

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
      ...buildCertificateQueue(certificateList),
      ...buildRejectedCertificateQueue(certificateList),
      ...buildObligationQueue(obligations.data?.obligations ?? []),
      ...buildRsvpQueue(meetingList),
      ...buildMeetingActionQueue(meetingsWithActions),
      ...buildTaskQueue(taskList),
    ];
    // Unchanged gating: finance rows need finance.view, compliance rows need
    // compliance.view, and a financial risk signal needs both. `canViewFinance`
    // has already been through `resolveFinanceAccess`, so it is false while the
    // permission map is in flight — this filter inherits that fail-closed
    // behaviour rather than reopening the hole.
    return rankQueue(
      filterQueueByPermission(items, { canViewFinance, canViewCompliance }),
    );
  }, [
    certificateList,
    timeBars.data,
    obligations.data,
    meetingList,
    meetingsWithActions,
    taskList,
    canViewFinance,
    canViewCompliance,
  ]);

  const queueSummary = useMemo(() => summariseQueue(queue), [queue]);

  // ── Money ───────────────────────────────────────────────────────────────
  const money = useMemo(
    () =>
      summariseMoney(
        project,
        certificateList,
        variationRecordList.map((v) => ({ status: v.status ?? undefined, grandTotal: v.value })),
      ),
    [project, certificateList, variationRecordList],
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

  const retention = useMemo(
    () => retentionPosition(project, money.retentionHeld),
    [project, money.retentionHeld],
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
        // FOUR rows, and the number is a measurement rather than a taste.
        //
        // The page has to hold one screen at 1440px, and the right-hand column
        // is what sets its height: the risk register plus this panel. Measured
        // in the browser at 1440x900, each feed row is 45px and the page came
        // to 901px at six rows and 856px at four. Four is what fits with the
        // header, the band and the grid gaps counted in.
        { limit: 4 },
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
    const base: (keyof HomeLoadState)[] = ["tasksFailed", "meetingsFailed", "timeBarsFailed"];
    if (canViewCompliance) base.push("riskFailed", "obligationsFailed");
    return canViewFinance ? [...base, "certificatesFailed", "variationsFailed"] : base;
  }, [canViewFinance, canViewCompliance]);

  const loadIssue = summariseHomeLoad(
    {
      tasksFailed: tasks.isError,
      meetingsFailed: meetings.isError,
      certificatesFailed: certificates.isError,
      // Either variation source failing means the variation figures are
      // incomplete, and the banner must say so rather than showing a short
      // count as though it were the whole picture.
      variationsFailed: variations.isError || variationRecords.isError,
      timeBarsFailed: timeBars.isError,
      riskFailed: risk.isError,
      obligationsFailed: obligations.isError,
    },
    visibleSources,
  );

  const retryFailed = () => {
    if (tasks.isError) tasks.refetch();
    if (meetings.isError) meetings.refetch();
    if (certificates.isError) certificates.refetch();
    if (variations.isError) variations.refetch();
    if (variationRecords.isError) variationRecords.refetch();
    if (timeBars.isError) timeBars.refetch();
    if (risk.isError) risk.refetch();
    if (obligations.isError) obligations.refetch();
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
    canApprovePayment,
    canEditProject: canEditByRole || isProjectCreator,
    // project
    project,
    allProjects,
    projectStats,
    // derived
    queue,
    queueSummary,
    money,
    time,
    // The visual band
    timeline,
    milestoneDrift,
    certifiedCurve,
    changePosition,
    changeSplit,
    changeFeed,
    // Key indicators
    variationPosition,
    variationsTruncated: variationRecords.truncated,
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
