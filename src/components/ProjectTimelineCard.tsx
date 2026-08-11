import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ProjectTimeline from './icons/ProjectTimeline';
import { useProjects } from '@/hooks/useProjects';
import { useMilestones } from '@/hooks/useMilestones';
import { format, differenceInDays, isBefore, isAfter, parseISO } from 'date-fns';

interface ProjectTimelineCardProps {
  startDate: string;
  currentDate: string;
  deadline: string;
  progress: number;
  daysStatus: string;
}

export function ProjectTimelineCard({ startDate: propStartDate, currentDate: propCurrentDate, deadline: propDeadline, progress: propProgress, daysStatus: propDaysStatus }: ProjectTimelineCardProps) {
  const { data: projects = [], isLoading } = useProjects();
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const selectedProject = projects.find((project: any) => (project._id || project.id) === selectedProjectId);
  // Real physical progress, not time elapsed — a phase where nothing has
  // been built must not read the same as one running to plan.
  const { data: milestones = [] } = useMilestones(selectedProject ? selectedProjectId : null);

  const dynamicData = React.useMemo(() => {
    if (!selectedProject) {
      return {
        startDate: propStartDate,
        currentDate: propCurrentDate,
        deadline: propDeadline,
        progress: propProgress,
        daysStatus: propDaysStatus
      };
    }

    const startDateStr = selectedProject.startDate || selectedProject.start_date;
    const endDateStr = selectedProject.endDate || selectedProject.end_date;

    if (!startDateStr || !endDateStr) {
      return {
        startDate: propStartDate,
        currentDate: propCurrentDate,
        deadline: propDeadline,
        progress: propProgress,
        daysStatus: propDaysStatus
      };
    }

    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const now = new Date();

    // Weighted average of recorded physical progress across phases that
    // have one, weighted by each phase's duration. Phases with no recorded
    // progress are left out of both sides of the average rather than
    // guessed at — the same "never guess" rule the PC gate uses.
    const trackedPhases = milestones.filter(
      (m) => m.percentComplete !== null && m.percentComplete !== undefined
    );

    let progress: number;
    if (trackedPhases.length > 0) {
      const totalWeight = trackedPhases.reduce(
        (sum, m) => sum + Math.max(1, differenceInDays(parseISO(m.endDate), parseISO(m.startDate))),
        0
      );
      const weightedSum = trackedPhases.reduce(
        (sum, m) =>
          sum + Number(m.percentComplete) * Math.max(1, differenceInDays(parseISO(m.endDate), parseISO(m.startDate))),
        0
      );
      progress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    } else {
      // No phase has recorded progress yet — fall back to the previous
      // date-based estimate rather than showing 0% on day one.
      const totalDays = differenceInDays(end, start);
      const elapsedDays = differenceInDays(now, start);
      if (isAfter(now, end)) {
        progress = 100;
      } else if (isAfter(now, start)) {
        progress = Math.round((elapsedDays / totalDays) * 100);
      } else {
        progress = 0;
      }
    }

    const daysRemaining = differenceInDays(end, now);
    const daysStatus = daysRemaining >= 0
      ? `${daysRemaining} days remaining`
      : `${Math.abs(daysRemaining)} days behind`;

    return {
      startDate: format(start, 'MMM dd, yyyy'),
      currentDate: format(now, 'MMM dd, yyyy'),
      deadline: format(end, 'MMM dd, yyyy'),
      progress: Math.min(100, Math.max(0, progress)),
      daysStatus
    };
  }, [selectedProject, milestones, propStartDate, propCurrentDate, propDeadline, propProgress, propDaysStatus]);

  const { startDate, currentDate, deadline, progress, daysStatus } = dynamicData;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <ProjectTimeline />
          </div>
          <h3 className="text-sm text-gray2">Project Timeline</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray2">
          <span className="py-1 px-3 bg-card rounded-full">{progress}% Complete</span>
          <span className="text-red_dark border border-red_light py-1 px-3 bg-card rounded-full">{daysStatus}</span>
        </div>
      </CardHeader>
      <CardContent className="bg-card p-2 mx-2 rounded-md">
        <div className="flex flex-col justify-between p-4 relative">
          {/* Phase labels */}
          <div className="flex w-full mb-1">
            {[
              { name: 'Foundation', width: '15%', color: '#6c5ce7' },
              { name: 'Structure', width: '25%', color: '#3B82F6' },
              { name: 'Envelope', width: '20%', color: '#10B981' },
              { name: 'Fitout', width: '25%', color: '#F97316' },
              { name: 'Handover', width: '15%', color: '#6B7280' },
            ].map((phase, i) => (
              <div key={i} className="flex flex-col items-center" style={{ width: phase.width }}>
                <span className="text-xs text-muted-foreground mb-1.5">{phase.name}</span>
                <div className="w-full h-6 rounded-sm mx-[1px]" style={{ backgroundColor: `${phase.color}15`, borderBottom: `2px solid ${phase.color}` }} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-5 mt-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray2 text-sm">Started: {startDate}</span>
              <span className="text-primary text-sm">Current: {currentDate}</span>
              <span className="text-gray2 text-sm">Deadline: {deadline}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
