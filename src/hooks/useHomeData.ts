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
  buildRiskQueue,
  buildRsvpQueue,
  buildTaskQueue,
  buildTimeBarQueue,
  filterQueueByPermission,
  rankQueue,
  summariseQueue,
  resolveFinanceAccess,
  summariseHomeLoad,
  summariseMoney,
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
import { summariseProjectSetup } from "@/lib/homeSetup";
import { isMeetingPast } from "@/lib/dateUtils";

interface RiskSignal {
  id: number;
  code: string;
  category: "delay" | "financial" | "compliance" | "claim";
  severity: "green" | "orange" | "red";
  status: "open" | "acknowledged" | "resolved" | "muted";
  title: string;
  is_contractual: boolean;
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

  // Every source contributes independently, so one failing endpoint costs its
  // own rows and not the queue. Order here is irrelevant — `rankQueue` is the
  // only thing that decides what a user sees first, and it is tested on its
  // own in `src/lib/__tests__/homeQueueRank.test.ts`.
  const queue: QueueItem[] = useMemo(() => {
    const items = [
      ...buildTimeBarQueue(timeBars.data?.time_bars ?? []),
      ...buildCertificateQueue(certificateList),
      ...buildRejectedCertificateQueue(certificateList),
      ...buildRiskQueue(risk.data?.signals ?? []),
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
    risk.data,
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
    () => summariseMoney(project, certificateList, variationList),
    [project, certificateList, variationList],
  );

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
      variationsFailed: variations.isError,
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
    currentCertificate,
    upcomingMeetings,
    meetingsWithActions,
    riskSignals,
    riskCounts,
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
