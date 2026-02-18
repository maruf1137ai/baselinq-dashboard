import React, { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import SaveMoney from './icons/SaveMoney';
import { useProjects } from '@/supabse/hook/useProject';
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';


export function BudgetBreakdownCard({ progress: propProgress, daysStatus: propDaysStatus }) {
  const { data: projects = [], isLoading } = useProjects();
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const selectedProject = projects.find((project: any) => (project._id || project.id) === selectedProjectId);

  const dynamicTimelineData = useMemo(() => {
    if (!selectedProject) {
      return {
        progress: propProgress,
        daysStatus: propDaysStatus
      };
    }

    const startDateStr = selectedProject.startDate || selectedProject.start_date;
    const endDateStr = selectedProject.endDate || selectedProject.end_date;

    if (!startDateStr || !endDateStr) {
      return {
        progress: propProgress,
        daysStatus: propDaysStatus
      };
    }

    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const now = new Date();

    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(now, start);

    let progress = 0;
    if (isAfter(now, end)) {
      progress = 100;
    } else if (isAfter(now, start)) {
      progress = Math.round((elapsedDays / totalDays) * 100);
    }

    const daysRemaining = differenceInDays(end, now);
    const daysStatus = daysRemaining >= 0
      ? `${daysRemaining} days remaining`
      : `${Math.abs(daysRemaining)} days behind`;

    return {
      progress: Math.min(100, Math.max(0, progress)),
      daysStatus
    };
  }, [selectedProject, propProgress, propDaysStatus]);

  const { progress, daysStatus } = dynamicTimelineData;

  const projectTotalBudget = selectedProject?.totalBudget ?? selectedProject?.total_budget ?? 0;

  const dynamicBudgetData = [
    { name: 'Subcontractor Costs', value: projectTotalBudget * 0.40, percentage: 40, color: '#8081F6' },
    { name: 'Materials', value: projectTotalBudget * 0.25, percentage: 25, color: '#10B981' },
    { name: 'Preliminaries', value: projectTotalBudget * 0.15, percentage: 15, color: '#F97316' },
    { name: 'Professional Fees', value: projectTotalBudget * 0.12, percentage: 12, color: '#3B82F6' },
    { name: 'Contingency', value: projectTotalBudget * 0.08, percentage: 8, color: '#6B7280' },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-1 ">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <SaveMoney />
            </div>
            <h3 className="text-sm text-gray2">Budget Breakdown</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray2">
            <span className="py-[1px] px-3 bg-white rounded-full">{progress}% Complete</span>
            <span className="text-red_dark border border-red_light py-[1px] px-3 bg-white rounded-full">{daysStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 bg-white rounded-[6px] py-6 px-10">
          <div className="flex items-center justify-center col-span-5">
            <div className="relative w-56 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dynamicBudgetData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={-1} dataKey="value">
                    {dynamicBudgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg text-[#111827]">R {projectTotalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-[#6B7280]">Total Budget</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4 w-full col-span-7">
            {dynamicBudgetData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-[#111827]">{item.name}</span>
                </div>
                <span className="text-sm text-[#111827]">
                  R {item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-[#6B7280]">({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
