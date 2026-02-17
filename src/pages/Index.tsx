import { useState, useEffect } from "react";
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProjectStatusCard } from '@/components/ProjectStatusCard';
import { ProjectTimelineCard } from '@/components/ProjectTimelineCard';
import { ActionItem } from '@/components/ActionItem';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { BudgetBreakdownCard } from '@/components/BudgetBreakdownCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, Shield, TrendingUp } from 'lucide-react';
import svgPaths from '../components/svg-msqaf6zyu8';
import MyAction from '@/components/icons/MyAction';
import Caution from '@/components/icons/Caution';
import Caution2 from '@/components/icons/Caution2';
import Asterisk from '@/components/icons/Asterisk';
import CashIcon from '@/components/icons/CashIcon';
import Calander2 from '@/components/icons/Calander2';
import useTask from "@/supabse/hook/useTask";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProject } from "@/hooks/useProjects";
import useFetch from "@/hooks/useFetch";

const icons = ['/images/cash-01.png', '/images/calendar-02.png', '/images/shield-01.png', '/images/asterisk-02.png'];

const Index = () => {
  const [projectId, setProjectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);

  // const { data: tasks = [], isLoading: loadingTasks } = useTask(projectId);
  const { data: tasksResponse, isLoading: loadingTasks } = useFetch<{ tasks: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : "",
    { enabled: !!projectId }
  );
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: user } = useCurrentUser(); // Django auth hook

  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId") || undefined);
    };

    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  const taskList = (tasksResponse?.tasks || []).map((item: any) => ({
    id: item.taskId || item.task?._id,
    title: item.task?.subject || item.task?.title || item.task?.taskActivityName || "",
    description: item.task?.description || item.task?.question || item.task?.instruction || "",
    type: item.taskType,
    status: item.status || item.task?.status || "todo",
    priority: item.task?.priority,
    discipline: item.task?.discipline,
    due_date: item.task?.dueDate || item.task?.finishDate,
    created_at: item.created_at || item.task?.createdAt,
    updated_at: item.task?.updatedAt || item.created_at || item.task?.createdAt,
    assignedBy: item.assignedBy,
  }));

  const myActions = taskList.filter((t: any) => {
    const s = t.status?.toLowerCase();
    return s !== "done" && s !== "closed";
  });
  const recentActivity = [...taskList].sort((a: any, b: any) => {
    const dateA = new Date(b.updated_at || b.created_at).getTime();
    const dateB = new Date(a.updated_at || a.created_at).getTime();
    return dateA - dateB;
  }).slice(0, 5);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num || 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <div>
          {/* <p className="text-base text-gray3 mb-1">Dashboard</p>
          <h1 className="text-3xl  tracking-tight text-foreground">Project Overview</h1> */}
          <p className="text-3xl  tracking-tight text-foreground capitalize">Welcome , {user?.name || user?.email?.split('@')[0] || "User"} </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* My Action Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <MyAction />
                </div>
                <h3 className="text-sm text-gray2">My Action ({myActions.length})</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 bg-white p-[7px] mx-2 rounded-[6px] max-h-[400px] overflow-y-auto">
              {loadingTasks ? (
                <div className="p-4 text-center text-gray-500">Loading tasks...</div>
              ) : myActions.length > 0 ? (
                myActions.map((task: any) => (
                  <ActionItem
                    key={task.id}
                    title={`${task.type}: ${task.title}`}
                    description={task.description || task.title}
                    priority={task.priority ? (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) as any : "Medium"}
                    dueDate={task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Date"}
                    id={task.id}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No actions found for this project.</div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Caution2 />
                </div>
                <h3 className="text-sm text-gray2">Activity Feed</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-0 bg-white p-[7px] mx-2 rounded-[6px] max-h-[400px] overflow-y-auto">
              {loadingTasks ? (
                <div className="p-4 text-center text-gray-500">Loading activity...</div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((task: any) => {
                  const s = task.status?.toLowerCase();
                  const displayStatus: "In Progress" | "Pending" | "Completed" =
                    s === "done" || s === "closed" ? "Completed"
                      : s === "in review" || s === "in_review" || s === "inreview" || s === "answered" ? "In Progress"
                        : "Pending";

                  return (
                    <ActivityFeedItem
                      key={task.id}
                      title={`${task.type || 'Task'}: ${task.title}`}
                      status={displayStatus}
                      author={task.assignedBy?.name || task.discipline || "User"}
                      timeAgo={task.updated_at || task.created_at ? new Date(task.updated_at || task.created_at).toLocaleDateString() : "Just now"}
                    />
                  );
                })
              ) : (
                <div className="p-4 text-center text-gray-500">No recent activity.</div>
              )}
            </CardContent>
          </Card>
        </div>


        <BudgetBreakdownCard progress={65} daysStatus="On track" />
        <ProjectTimelineCard
          startDate={formatDate(project?.startDate || project?.start_date)}
          currentDate={formatDate(new Date().toISOString())}
          deadline={formatDate(project?.endDate || project?.end_date)}
          progress={45}
          daysStatus={project?.status || "In Progress"}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ProjectStatusCard
            icon={<CashIcon />}
            title="Budget Health"
            value="85%"
            subtitle="R 862,500 / R 15,000,000"
            badgeText="On track"
            badgeVariant="success"
            actionText="Review forecast"
          />
          <ProjectStatusCard
            icon={<Calander2 />}
            title="Schedule Health"
            value="115%"
            subtitle="3 days average"
            badgeText="2 delayed"
            badgeVariant="destructive"
            actionText="Adjust timeline"
          />
          <ProjectStatusCard
            icon={<Shield />}
            title="Compliance"
            value="5"
            subtitle="2 overdue • 3 due soon"
            badgeText="Action required"
            badgeVariant="destructive"
            actionText="Review obligations"
          />
          <ProjectStatusCard
            icon={<Asterisk />}
            title="AI Risk Score"
            value="Medium"
            badgeText="Improving"
            badgeVariant="success"
            actionText="View risk dashboard"
          />
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Index;
