import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ProjectTimeline from './icons/ProjectTimeline';
import { useProjects } from '@/supabse/hook/useProject';
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
  const selectedProject = projects.find((project: any) => project.id === selectedProjectId);

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

    const start = parseISO(selectedProject.start_date);
    const end = parseISO(selectedProject.end_date);
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
      startDate: format(start, 'MMM dd, yyyy'),
      currentDate: format(now, 'MMM dd, yyyy'),
      deadline: format(end, 'MMM dd, yyyy'),
      progress: Math.min(100, Math.max(0, progress)),
      daysStatus
    };
  }, [selectedProject, propStartDate, propCurrentDate, propDeadline, propProgress, propDaysStatus]);

  const { startDate, currentDate, deadline, progress, daysStatus } = dynamicData;

  return (
    <Card>
      <CardContent className="p-5 bg-[#F3F2F0] border-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              {/* <img
                src="/images/time-schedule.png"
                alt=""
                className="h-4 w-4 text-gray2"
              /> */}
              <ProjectTimeline />
            </div>
            <h3 className="text-sm text-gray2">Project Timeline</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray2">
            <span className="py-[1px] px-3 bg-white rounded-full">{progress}% Complete</span>
            <span className="text-red_dark border border-red_light py-[1px] px-3 bg-white rounded-full">{daysStatus}</span>
          </div>
        </div>

        <div className=" bg-white flex flex-col justify-between p-4 rounded-[6px] relative">
          <div className="flex justify-between px-1 h-[58px]">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-full w-[1px] bg-[#E5E7EB]" />
            ))}
          </div>
          <div className="flex flex-col gap-5">
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
