import React, { useMemo } from 'react';
import { ExternalLink, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import SaveMoney from './icons/SaveMoney';
import { useProjects } from '@/hooks/useProjects';
import { differenceInDays, isAfter, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';
import { formatZAR } from '@/lib/formatCurrency';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { usePermission } from '@/hooks/usePermission';

// Same shape cost_ledger/summary/ returns and costLadger.tsx's Cost Ledger
// tab already consumes — fetching it here too is what keeps this card and
// the Finance page permanently in sync (one source of truth, not a copy).
interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  netPosition: number;
  totalProjectCost: number;
  originalBudget: number;
  remainingBudget: number;
  currency: string;
}

interface BarSegment {
  label: string;
  value: number;
  color: string;
}

function BudgetBar({ title, segments, total }: { title: string; segments: BarSegment[]; total: number }) {
  // Segment widths are clamped cumulatively, not just individually — real
  // ledger data can have non-VO debits pushing a segment's true share past
  // what's left in the bar, and letting widths sum past 100% would overflow
  // the track rather than just under-representing that segment.
  let cumulativePct = 0;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{title}</p>
      <div className="flex w-full h-4 rounded-full overflow-hidden bg-muted">
        {segments.map((s, i) => {
          const rawPct = total > 0 ? Math.max(0, (s.value / total) * 100) : 0;
          const pct = Math.max(0, Math.min(rawPct, 100 - cumulativePct));
          cumulativePct += pct;
          if (pct <= 0) return null;
          return (
            <div
              key={s.label}
              className={i > 0 ? 'ml-0.5' : undefined}
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              title={`${s.label}: ${formatZAR(s.value)}`}
            />
          );
        })}
      </div>
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-foreground">{s.label}</span>
            <span className="text-xs text-muted-foreground">
              {formatZAR(s.value)} ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetBreakdownCard({ progress: propProgress, daysStatus: propDaysStatus }) {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const selectedProject = (projects as any[]).find((project: any) =>
    String(project._id || project.id) === String(selectedProjectId)
  );

  // The summary endpoint 403s without finance.view/finance.edit on the
  // project (unlike the old list-based query this replaced, which just
  // returned an empty list) — gate the fetch and the empty state on it the
  // same way costLadger.tsx's Cost Ledger tab does.
  const projectIdNum = selectedProjectId ? parseInt(selectedProjectId, 10) : null;
  // Both hooks must always run, every render — `a() || b()` would short-circuit
  // and skip calling b() whenever a() is truthy (which it is by default while
  // loading, see usePermission's docstring), changing the hook count between
  // renders and crashing React's reconciler ("change in the order of Hooks").
  const canViewFinanceView = usePermission("finance.view", projectIdNum);
  const canViewFinanceEdit = usePermission("finance.edit", projectIdNum);
  const canViewFinance = canViewFinanceView || canViewFinanceEdit;

  // Same endpoint the Finance > Cost Ledger tab uses for its summary tiles.
  const { data: summary } = useQuery<LedgerSummary>({
    queryKey: ["cost-ledger-summary", selectedProjectId],
    queryFn: () => fetchData(`cost-ledger/summary/?project_id=${selectedProjectId}`),
    enabled: !!selectedProjectId && canViewFinance,
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

  const totalNewBudget = summary?.totalProjectCost ?? 0;
  const originalBudget = summary?.originalBudget ?? 0;
  const debit = summary?.totalDebits ?? 0;
  const credit = summary?.totalCredits ?? 0;
  const pending = summary?.remainingBudget ?? 0;

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
          <span className="py-1 px-3 bg-card rounded-full">{progress}% Complete</span>
          <span className="text-red_dark border border-red_light py-1 px-3 bg-card rounded-full">{daysStatus}</span>
          <button
            onClick={() => navigate("/programme")}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors py-1 px-2 rounded-full bg-card border border-primary/20"
            title="View Programme">
            <ExternalLink className="h-3 w-3" />
            <span>Programme</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="bg-card p-3 mx-2 rounded-md">
        {!selectedProjectId ? (
          <EmptyState
            icon={Receipt}
            variant="plain"
            size="sm"
            title="No project selected"
            description="Budget is tracked per project. Select a project to view its breakdown."
          />
        ) : !canViewFinance ? (
          <EmptyState
            icon={Receipt}
            variant="plain"
            size="sm"
            title="No permission to view financials"
            description="Ask a project admin for Finance access to see the budget breakdown."
          />
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-lg text-foreground">{formatZAR(totalNewBudget)}</p>
              <p className="text-xs text-muted-foreground">
                Total Budget{originalBudget !== totalNewBudget ? ` · Original: ${formatZAR(originalBudget)}` : ''}
              </p>
            </div>

            <BudgetBar
              title="Budget growth"
              total={totalNewBudget}
              segments={[
                { label: 'Original Budget', value: originalBudget, color: '#94A3B8' },
                { label: 'Variations (Debit)', value: debit, color: '#F97316' },
              ]}
            />

            <BudgetBar
              title="Payment status"
              total={totalNewBudget}
              segments={[
                { label: 'Certified (Credit)', value: credit, color: '#10B981' },
                { label: 'Pending', value: pending, color: '#3B82F6' },
              ]}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
