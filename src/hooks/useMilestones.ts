import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchData, postData, patchData, deleteData } from "@/lib/Api";

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
  contractCost: number;
}

export interface PhaseCostsResponse {
  milestones: MilestoneWithCost[];
  totalContractCost: number;
  currency: string;
}

export function useMilestones(projectId: string | number | null) {
  return useQuery<Milestone[]>({
    queryKey: ["milestones", projectId],
    queryFn: () => fetchData(`projects/${projectId}/milestones/`),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMilestonePhaseCosts(projectId: string | number | null) {
  return useQuery<PhaseCostsResponse>({
    queryKey: ["milestone-phase-costs", projectId],
    queryFn: () => fetchData(`projects/${projectId}/milestones/phase-costs/`),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateMilestone(projectId: string | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; startDate: string; endDate: string; status?: string }) =>
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
