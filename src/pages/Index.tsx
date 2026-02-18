import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProjectStatusCard } from '@/components/ProjectStatusCard';
import { ProjectTimelineCard } from '@/components/ProjectTimelineCard';
import { ActionItem } from '@/components/ActionItem';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { BudgetBreakdownCard } from '@/components/BudgetBreakdownCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, ArrowRight } from 'lucide-react';
import MyAction from '@/components/icons/MyAction';
import Caution2 from '@/components/icons/Caution2';
import Asterisk from '@/components/icons/Asterisk';
import CashIcon from '@/components/icons/CashIcon';
import Calander2 from '@/components/icons/Calander2';
import { useProject } from "@/hooks/useProjects";
import useFetch from "@/hooks/useFetch";
import { differenceInDays, parseISO, isAfter, isBefore, isToday, format } from "date-fns";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);

  const { data: tasksResponse, isLoading: loadingTasks } = useFetch<{ tasks: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : "",
    { enabled: !!projectId }
  );
  const { data: project, isLoading: loadingProject } = useProject(projectId);

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

  // Group actions by urgency
  const groupedActions = useMemo(() => {
    const now = new Date();
    const overdue: any[] = [];
    const dueToday: any[] = [];
    const upcoming: any[] = [];

    myActions.forEach((task: any) => {
      if (!task.due_date) {
        upcoming.push(task);
        return;
      }
      const dueDate = new Date(task.due_date);
      if (isToday(dueDate)) {
        dueToday.push(task);
      } else if (isBefore(dueDate, now)) {
        overdue.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return { overdue, dueToday, upcoming };
  }, [myActions]);

  const recentActivity = [...taskList].sort((a: any, b: any) => {
    const dateA = new Date(b.updated_at || b.created_at).getTime();
    const dateB = new Date(a.updated_at || a.created_at).getTime();
    return dateA - dateB;
  }).slice(0, 8);

  // Project context bar calculations
  const projectProgress = useMemo(() => {
    if (!project) return 0;
    const startStr = project.startDate || project.start_date;
    const endStr = project.endDate || project.end_date;
    if (!startStr || !endStr) return 0;
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    const now = new Date();
    if (isAfter(now, end)) return 100;
    if (isBefore(now, start)) return 0;
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }, [project]);

  const daysRemaining = useMemo(() => {
    if (!project) return null;
    const endStr = project.endDate || project.end_date;
    if (!endStr) return null;
    const end = parseISO(endStr);
    const diff = differenceInDays(end, new Date());
    return diff;
  }, [project]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Documents from project
  const recentDocuments = (project?.documents || project?.attachments || []).slice(0, 5);

  const renderActionGroup = (label: string, tasks: any[], accentColor: string) => {
    if (tasks.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-2 w-2 rounded-full ${accentColor}`} />
          <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">{label} ({tasks.length})</span>
        </div>
        {tasks.map((task: any) => (
          <div key={task.id} className={`border-l-2 ${accentColor.replace('bg-', 'border-')} ml-1 pl-3 mb-2`}>
            <ActionItem
              title={`${task.type}: ${task.title}`}
              description={task.description || task.title}
              priority={task.priority ? (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) as any : "Medium"}
              dueDate={task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Date"}
              id={task.id}
            />
          </div>
        ))}
      </div>
    );
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼';
    if (['xlsx', 'xls'].includes(ext || '')) return '📊';
    return '📎';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        {/* Project Context Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-[#F3F2F0] rounded-xl p-4">
          <div className="flex items-center gap-4">
            {/* Progress Ring */}
            <div className="relative h-12 w-12 shrink-0">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke="#8081F6" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - projectProgress / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[#0F172A]">
                {projectProgress}%
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#0F172A] leading-tight">
                {project?.name || "Select a Project"}
              </h1>
              <p className="text-xs text-[#6B7280]">
                {project?.project_number || project?.projectNumber || "—"}
                {project?.location ? ` • ${project.location}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {daysRemaining !== null && (
              <Badge
                variant="outline"
                className={`text-xs font-medium px-3 py-1 ${
                  daysRemaining < 0
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : daysRemaining <= 30
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                {daysRemaining < 0
                  ? `${Math.abs(daysRemaining)} days overdue`
                  : `${daysRemaining} days remaining`}
              </Badge>
            )}
            {project?.total_budget || project?.totalBudget ? (
              <Badge variant="outline" className="text-xs font-medium px-3 py-1 bg-white text-[#0F172A] border-gray-200">
                R {(project.total_budget || project.totalBudget || 0).toLocaleString()}
              </Badge>
            ) : null}
            <Badge variant="outline" className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary border-primary/20">
              {myActions.length} open actions
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* My Action Card — grouped by urgency */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <MyAction />
                </div>
                <h3 className="text-sm text-gray2">My Actions ({myActions.length})</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 bg-white p-[7px] mx-2 rounded-[6px] max-h-[400px] overflow-y-auto">
              {loadingTasks ? (
                <div className="p-4 text-center text-gray-500">Loading tasks...</div>
              ) : myActions.length > 0 ? (
                <>
                  {renderActionGroup("Overdue", groupedActions.overdue, "bg-red-500")}
                  {renderActionGroup("Due Today", groupedActions.dueToday, "bg-orange-400")}
                  {renderActionGroup("Upcoming", groupedActions.upcoming, "bg-gray-300")}
                </>
              ) : (
                <div className="p-4 text-center text-gray-500">No actions found for this project.</div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed Card — compact timeline */}
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

        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-4 w-4 text-gray2" />
              </div>
              <h3 className="text-sm text-gray2">Recent Documents</h3>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="inline-flex items-center text-xs text-foreground hover:text-primary transition-colors group"
            >
              View all
              <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </CardHeader>
          <CardContent className="bg-white p-[7px] mx-2 rounded-[6px]">
            {recentDocuments.length > 0 ? (
              <div className="divide-y divide-border/50">
                {recentDocuments.map((doc: any, i: number) => {
                  const fileName = doc.file_name || doc.fileName || doc.name || "Document";
                  return (
                    <a
                      key={doc.id || doc._id || i}
                      href={doc.file_url || doc.fileUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-[#F3F2F0] transition-colors"
                    >
                      <span className="text-base">{getFileIcon(fileName)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#111827] truncate">{fileName}</p>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {doc.uploaded_at || doc.uploadedAt
                            ? format(new Date(doc.uploaded_at || doc.uploadedAt), 'MMM dd, yyyy')
                            : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-[#9CA3AF] shrink-0" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No documents uploaded yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Score Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ProjectStatusCard
            icon={<CashIcon />}
            title="Budget Health"
            value="85%"
            subtitle="R 862,500 / R 15,000,000"
            badgeText="On track"
            badgeVariant="success"
            actionText="Review forecast"
            trendArrow="up"
          />
          <ProjectStatusCard
            icon={<Calander2 />}
            title="Schedule Health"
            value="115%"
            subtitle="3 days average"
            badgeText="2 delayed"
            badgeVariant="destructive"
            actionText="Adjust timeline"
            trendArrow="down"
          />
          <ProjectStatusCard
            icon={<Shield />}
            title="Compliance"
            value="5"
            subtitle="2 overdue • 3 due soon"
            badgeText="Action required"
            badgeVariant="destructive"
            actionText="Review obligations"
            trendArrow="down"
          />
          <ProjectStatusCard
            icon={<Asterisk />}
            title="AI Risk Score"
            value="Medium"
            badgeText="Improving"
            badgeVariant="success"
            actionText="View risk dashboard"
            trendArrow="up"
          />
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Index;
