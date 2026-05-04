import React, { useMemo } from 'react';
import { DollarSign, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import SaveMoney from './icons/SaveMoney';
import { useProjects } from '@/hooks/useProjects';
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';
import { useNavigate } from 'react-router-dom';

const CATEGORY_CONFIG = [
  { key: 'Subcontractor', label: 'Subcontractor Costs', color: '#6c5ce7' },
  { key: 'Materials', label: 'Materials', color: '#10B981' },
  { key: 'Preliminaries', label: 'Preliminaries', color: '#F97316' },
  { key: 'Professional Fees', label: 'Professional Fees', color: '#3B82F6' },
  { key: 'Contingency', label: 'Contingency', color: '#6B7280' },
  { key: 'Labour', label: 'Labour', color: '#F59E0B' },
  { key: 'Plant & Equipment', label: 'Plant & Equipment', color: '#EC4899' },
  { key: 'Other', label: 'Other', color: '#94A3B8' },
];

const FALLBACK_RATIOS = [0.40, 0.25, 0.15, 0.12, 0.08];

interface CostSummaryResponse {
  totalDebits: number;
  totalCredits: number;
  netPosition: number;
  currency: string;
}

interface CostLedgerEntry {
  id: number;
  category: string;
  net: number;
  total: number;
  entry_type: string;
}

export function BudgetBreakdownCard({ progress: propProgress, daysStatus: propDaysStatus }) {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const selectedProject = (projects as any[]).find((project: any) =>
    String(project._id || project.id) === String(selectedProjectId)
  );

  // Fetch real cost ledger entries for the selected project
  const { data: ledgerEntries = [] } = useQuery<CostLedgerEntry[]>({
    queryKey: ["cost-ledger-entries", selectedProjectId],
    queryFn: () =>
      fetchData(`cost-ledger/?project_id=${selectedProjectId}&entry_type=debit`).then(
        (res: any) => res?.results ?? res ?? []
      ),
    enabled: !!selectedProjectId,
    staleTime: 2 * 60 * 1000,
  });

  const dynamicTimelineData = useMemo(() => {
    if (!selectedProject) return { progress: propProgress, daysStatus: propDaysStatus };

    const startDateStr = selectedProject.startDate || selectedProject.start_date;
    const endDateStr = selectedProject.endDate || selectedProject.end_date;

    if (!startDateStr || !endDateStr) return { progress: propProgress, daysStatus: propDaysStatus };

    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const now = new Date();
    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(now, start);

    let progress = 0;
    if (isAfter(now, end)) progress = 100;
    else if (isAfter(now, start)) progress = Math.round((elapsedDays / totalDays) * 100);

    const daysRemaining = differenceInDays(end, now);
    const daysStatus = daysRemaining >= 0
      ? `${daysRemaining} days remaining`
      : `${Math.abs(daysRemaining)} days behind`;

    return { progress: Math.min(100, Math.max(0, progress)), daysStatus };
  }, [selectedProject, propProgress, propDaysStatus]);

  const { progress, daysStatus } = dynamicTimelineData;
  const projectTotalBudget = selectedProject?.totalBudget ?? selectedProject?.total_budget ?? 0;

  // Build chart data from real ledger entries (debit totals per category)
  const budgetData = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const entry of ledgerEntries as CostLedgerEntry[]) {
      if (entry.entry_type === "debit") {
        totals[entry.category] = (totals[entry.category] ?? 0) + (entry.total ?? entry.net ?? 0);
      }
    }

    const hasRealData = Object.keys(totals).length > 0;

    if (hasRealData) {
      return CATEGORY_CONFIG
        .filter((c) => (totals[c.key] ?? 0) > 0)
        .map((c) => ({
          name: c.label,
          value: totals[c.key] ?? 0,
          percentage: projectTotalBudget > 0
            ? Math.round(((totals[c.key] ?? 0) / Number(projectTotalBudget)) * 100)
            : 0,
          color: c.color,
        }));
    }

    // Fallback: show allocation based on total budget with first 5 categories
    return CATEGORY_CONFIG.slice(0, 5).map((c, i) => ({
      name: c.label,
      value: Number(projectTotalBudget) * FALLBACK_RATIOS[i],
      percentage: Math.round(FALLBACK_RATIOS[i] * 100),
      color: c.color,
    }));
  }, [ledgerEntries, projectTotalBudget]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <SaveMoney />
          </div>
          <h3 className="text-sm text-gray2">Budget Breakdown</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray2">
          <span className="py-1 px-3 bg-white rounded-full">{progress}% Complete</span>
          <span className="text-red_dark border border-red_light py-1 px-3 bg-white rounded-full">{daysStatus}</span>
          <button
            onClick={() => navigate("/programme")}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors py-1 px-2 rounded-full bg-white border border-primary/20"
            title="View Programme">
            <ExternalLink className="h-3 w-3" />
            <span>Programme</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="bg-white p-2 mx-2 rounded-md">
        <div className="grid grid-cols-12 gap-8">
          <div className="flex items-center justify-center col-span-5">
            <div className="relative w-56 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={-1}
                    dataKey="value">
                    {budgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg text-foreground">
                  R {Number(projectTotalBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Total Budget</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4 w-full col-span-7">
            {budgetData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                <span className="text-sm text-foreground">
                  R {item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
