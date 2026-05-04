import { useQuery } from "@tanstack/react-query";
import { fetchData } from "@/lib/Api";

export type Severity = "green" | "orange" | "red";

export interface DelayRisk {
  type: "milestone_delayed" | "milestone_overdue" | "tasks_overdue";
  name?: string;
  end_date?: string;
  days_overdue?: number;
  count?: number;
  severity: Severity;
  detail: string;
}

export interface FinancialImpact {
  type: "budget_spend" | "pending_vos";
  spent_pct?: number;
  total_spent?: number;
  total_budget?: number;
  count?: number;
  total_value?: number;
  currency: string;
  severity: Severity;
  detail: string;
}

export interface ComplianceGate {
  type: "milestone_due_soon" | "pc_pending_approval";
  name?: string;
  pc_number?: string;
  end_date?: string;
  certificate_date?: string;
  days_until_due?: number;
  days_pending?: number;
  net_amount?: number;
  currency?: string;
  severity: Severity;
  detail: string;
}

export interface RiskForecast {
  overall_severity: Severity;
  ai_summary: string;
  delay_risks: DelayRisk[];
  financial_impacts: FinancialImpact[];
  compliance_gates: ComplianceGate[];
  recommendations: string[];
}

export function useRiskForecast(projectId: string | number | null) {
  return useQuery<RiskForecast>({
    queryKey: ["risk-forecast", projectId],
    queryFn: () => fetchData(`projects/${projectId}/risk-forecast/`),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
