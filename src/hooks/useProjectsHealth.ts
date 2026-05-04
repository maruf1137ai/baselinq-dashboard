import { useQuery } from "@tanstack/react-query";
import { fetchData } from "@/lib/Api";

export type HealthStatus = "green" | "orange" | "red" | "grey";

export interface HealthDetail {
  health: HealthStatus;
  schedule: {
    status: HealthStatus;
    total_tasks: number;
    overdue_tasks: number;
  };
  budget: {
    status: HealthStatus;
    total_budget: number;
    total_spent: number;
    spent_pct: number;
  };
}

interface HealthSummaryItem extends HealthDetail {
  project_id: number;
}

interface HealthSummaryResponse {
  results: HealthSummaryItem[];
}

export function useProjectsHealth(): {
  healthMap: Map<number, HealthDetail>;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery<HealthSummaryResponse>({
    queryKey: ["projects-health-summary"],
    queryFn: () => fetchData("projects/health-summary/"),
    staleTime: 5 * 60 * 1000,
  });

  const healthMap = new Map<number, HealthDetail>();
  if (data?.results) {
    for (const { project_id, ...detail } of data.results) {
      healthMap.set(project_id, detail);
    }
  }

  return { healthMap, isLoading };
}
