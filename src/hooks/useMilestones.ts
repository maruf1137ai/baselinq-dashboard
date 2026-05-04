import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchData, postData, patchData, deleteData } from "@/lib/Api";

export interface Milestone {
  _id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planned" | "in_progress" | "completed" | "delayed";
  createdBy: { userId: string | null; name: string | null };
  createdAt: string;
  updatedAt: string;
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
