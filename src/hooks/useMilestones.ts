import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchData, postData, patchData, deleteData } from "@/lib/Api";
import { usePermissions } from "./usePermissions";
import { PROFESSIONAL_DISCIPLINES, type DisciplineGroup } from "@/lib/homeProgress";

export interface Milestone {
  _id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planned" | "in_progress" | "completed" | "delayed";
  percentComplete: number | null;
  baselineStart: string | null;
  baselineEnd: string | null;
  actualEnd: string | null;
  createdBy: { userId: string | null; name: string | null };
  createdAt: string;
  updatedAt: string;
  discipline: "construction" | "architectural" | "engineering" | "quantity_surveying" | "other";
  feeAmount: number | null;
  feeVisible: boolean;
}

// NOTE: snake_case, not camelCase — these hit the `risk` app's endpoints,
// which (like EvidencePack in EvidenceTab.tsx) return hand-built dicts with
// raw field names, unlike the `project` app's camelCase serializers.
export interface ProgrammeBaseline {
  id: number;
  version: number;
  label: string;
  is_current: boolean;
  manifest_hash: string;
  sealed_at: string | null;
  is_sealed: boolean;
  integrity_verified: boolean;
  item_count: number;
  created_by: string | null;
  created_at: string;
}

export interface ProgrammeBaselineItem {
  milestone_id: number | null;
  milestone_name: string;
  snapshot: Record<string, unknown>;
  sha256: string;
}

export interface ProgrammeBaselineDetail extends ProgrammeBaseline {
  items: ProgrammeBaselineItem[];
}

export interface ProgrammeBaselineDiffChange {
  milestone_id: number | null;
  milestone_name: string;
  added: boolean;
  removed: boolean;
  changes: Record<string, { from: unknown; to: unknown }>;
}

export interface ProgrammeBaselineDiff {
  from_version: number;
  to_version: number;
  milestones: ProgrammeBaselineDiffChange[];
}

export interface MilestoneWithCost extends Milestone {
  contractCost: number | null;
}

export interface PhaseCostsResponse {
  milestones: MilestoneWithCost[];
  totalContractCost: number;
  currency: string;
}

export function useMilestones(projectId: string | number | null, discipline?: string) {
  return useQuery<Milestone[]>({
    queryKey: ["milestones", projectId, discipline ?? "construction"],
    queryFn: () => fetchData(`projects/${projectId}/milestones/${discipline ? `?discipline=${discipline}` : ""}`),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

export interface DisciplineAccess {
  ownDiscipline: string;
  fullVisibility: boolean;
  canViewOther: boolean;
}

// Fetched once per project — own-discipline/full-visibility don't depend on
// which discipline tab is currently selected. Lets the frontend decide
// whether to show "Add Phase" without duplicating discipline.py's
// role->discipline mapping (see window.tsx).
export function useMilestoneDisciplineAccess(projectId: string | number | null) {
  return useQuery<DisciplineAccess>({
    queryKey: ["milestone-discipline-access", projectId],
    queryFn: () => fetchData(`projects/${projectId}/milestones/discipline-access/`),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMilestonePhaseCosts(projectId: string | number | null, discipline?: string) {
  return useQuery<PhaseCostsResponse>({
    queryKey: ["milestone-phase-costs", projectId, discipline ?? "construction"],
    queryFn: () => fetchData(`projects/${projectId}/milestones/phase-costs/${discipline ? `?discipline=${discipline}` : ""}`),
    enabled: !!projectId,
    // Payment Certificates (which drive Construction's contractCost) live in
    // a separate data-fetching system (useFetch, not react-query) with no
    // mechanism to invalidate this cache — creating/posting a PC on /finance
    // can't tell this query to refetch. staleTime: 0 means every visit to
    // the Schedule tab refetches instead of trusting a stale cached total
    // (still shows the cached data instantly, then updates in place — no
    // loading flash, just correctness).
    staleTime: 0,
  });
}

/**
 * Phase cost-vs-progress milestones for one discipline GROUP, for the
 * homepage's `PhaseCostProgressBlock` — see `src/lib/homeProgress.ts` for the
 * arithmetic built on the result.
 *
 * ── Construction vs Professional, and why they fetch differently ─────────
 *
 * Construction is one discipline and one request: `useMilestonePhaseCosts`
 * as-is. Professional is not a discipline the backend knows — it is four of
 * them (`PROFESSIONAL_DISCIPLINES`) pooled on the client, so it is four
 * requests merged into one milestone list, which `buildCostProgressCurve`
 * then re-totals as a single group.
 *
 * ── The permission gate fires BEFORE any request, not after an empty one ──
 *
 * `programme/window.tsx` already gates its discipline picker on
 * `canViewOtherDisciplines` so a Contractor never even offers the control.
 * This hook applies the same gate to the four Professional requests
 * themselves: `gated` is computed from the permission flag alone, and while
 * it is true `professionalProjectId` is `null` for all four —
 * `useMilestonePhaseCosts`'s own `enabled: !!projectId` is what actually
 * suppresses the request, so no new "disabled" flag was added to it.
 *
 * All 5 underlying queries (1 construction + 4 professional) are called on
 * every render regardless of `group` or `gated` — Rules of Hooks forbids
 * calling a variable number of hooks — and the ones not relevant to this
 * call are simply passed `null` and stay inert.
 */
export function useDisciplineCostProgress(
  projectId: string | number | null,
  group: DisciplineGroup,
) {
  const { canViewOtherDisciplines, isLoading: permsLoading } = usePermissions();

  const construction = useMilestonePhaseCosts(
    group === "construction" ? projectId : null,
    "construction",
  );

  // While permissions are still loading, `usePermissions()` optimistically
  // returns `true` for every flag (its own header comment explains why), so
  // this only turns on once loading has actually finished and the check has
  // actually failed — never inferred from an empty response.
  const gated = group === "professional" && !permsLoading && !canViewOtherDisciplines;
  const professionalProjectId = group === "professional" && !gated ? projectId : null;

  const architectural = useMilestonePhaseCosts(professionalProjectId, PROFESSIONAL_DISCIPLINES[0]);
  const engineering = useMilestonePhaseCosts(professionalProjectId, PROFESSIONAL_DISCIPLINES[1]);
  const quantitySurveying = useMilestonePhaseCosts(professionalProjectId, PROFESSIONAL_DISCIPLINES[2]);
  const other = useMilestonePhaseCosts(professionalProjectId, PROFESSIONAL_DISCIPLINES[3]);

  if (group === "construction") {
    return {
      milestones: construction.data?.milestones ?? [],
      isLoading: construction.isLoading,
      gated: false,
      currency: construction.data?.currency ?? "ZAR",
    };
  }

  const professionalQueries = [architectural, engineering, quantitySurveying, other];
  const milestones = gated ? [] : professionalQueries.flatMap((q) => q.data?.milestones ?? []);
  const isLoading = permsLoading || (!gated && professionalQueries.some((q) => q.isLoading));
  const currency = professionalQueries.find((q) => q.data?.currency)?.data?.currency ?? "ZAR";

  return { milestones, isLoading, gated, currency };
}

export function useCreateMilestone(projectId: string | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; startDate: string; endDate: string; status?: string; discipline?: string; feeAmount?: number | null }) =>
      postData({ url: `projects/${projectId}/milestones/`, data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", projectId] });
      qc.invalidateQueries({ queryKey: ["milestone-phase-costs", projectId] });
    },
  });
}

export function useUpdateMilestone(projectId: string | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Milestone> }) =>
      patchData({ url: `projects/${projectId}/milestones/${id}/`, data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", projectId] });
      qc.invalidateQueries({ queryKey: ["milestone-phase-costs", projectId] });
    },
  });
}

export function useDeleteMilestone(projectId: string | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      deleteData({ url: `projects/${projectId}/milestones/${id}/`, data: undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", projectId] });
      qc.invalidateQueries({ queryKey: ["milestone-phase-costs", projectId] });
    },
  });
}

export function useProgrammeBaselines(projectId: string | number | null) {
  return useQuery<{ baselines: ProgrammeBaseline[] }>({
    queryKey: ["programme-baselines", projectId],
    queryFn: () => fetchData(`projects/${projectId}/programme-baselines/`),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useProgrammeBaselineDetail(baselineId: number | string | null) {
  return useQuery<ProgrammeBaselineDetail>({
    queryKey: ["programme-baseline-detail", baselineId],
    queryFn: () => fetchData(`programme-baselines/${baselineId}/`),
    enabled: !!baselineId,
  });
}

export function useAcceptProgrammeBaseline(projectId: string | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { label?: string } = {}) =>
      postData({ url: `projects/${projectId}/programme-baselines/`, data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-baselines", projectId] });
      // Accepting sets baseline_start/baseline_end on every milestone, so the
      // milestone list itself is now stale too.
      qc.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
  });
}

export function useProgrammeBaselineDiff(
  projectId: string | number | null,
  fromVersionId?: number | string | null,
  toVersionId?: number | string | null,
) {
  return useQuery<ProgrammeBaselineDiff>({
    queryKey: ["programme-baseline-diff", projectId, fromVersionId, toVersionId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (fromVersionId) params.set("from", String(fromVersionId));
      if (toVersionId) params.set("to", String(toVersionId));
      const query = params.toString();
      return fetchData(`projects/${projectId}/programme-baselines/diff/${query ? `?${query}` : ""}`);
    },
    enabled: !!projectId,
  });
}
