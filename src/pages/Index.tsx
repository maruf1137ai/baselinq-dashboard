import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProjectStatusCard } from '@/components/ProjectStatusCard';
import { ProjectTimelineCard } from '@/components/ProjectTimelineCard';
import { ActionItem } from '@/components/ActionItem';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { BudgetBreakdownCard } from '@/components/BudgetBreakdownCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, ArrowRight, ChevronDown, Plus, FolderOpen } from 'lucide-react';
import { FilePreviewModal } from '@/components/TaskComponents/FilePreviewModal';
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import MyAction from '@/components/icons/MyAction';
import Caution2 from '@/components/icons/Caution2';
import Asterisk from '@/components/icons/Asterisk';
import CashIcon from '@/components/icons/CashIcon';
import Calander2 from '@/components/icons/Calander2';
import useFetch from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { differenceInDays, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<any>(true);

  const { data: tasksResponse, isLoading: loadingTasks } = useFetch<{ tasks: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : "",
    { enabled: !!projectId }
  );
  const { data: currentUser } = useCurrentUser();
  const { data: projectListData } = useFetch(
    currentUser?.id ? `projects/?userId=${currentUser.id}` : "",
    { enabled: !!currentUser?.id }
  );
  const project = (projectListData?.results || []).find(
    (p: any) => String(p._id || p.id) === String(projectId)
  );

  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId") || undefined);
    };
    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  // Distribute task types realistically across items for demo diversity
  const DEMO_TYPES = ["CPI", "RFI", "SI", "VO", "DC", "RFI", "CPI", "SI", "VO", "RFI"];
  const DEMO_PRIORITIES = ["High", "Medium", "Critical", "Low", "High", "Medium", "High", "Low", "Critical", "Medium"];

  const taskList = (tasksResponse?.tasks || []).map((item: any, idx: number) => {
    const apiType = item.taskType;
    // If all tasks are the same type, diversify for demo realism
    const type = apiType || DEMO_TYPES[idx % DEMO_TYPES.length];
    return {
      id: item.taskId || item.task?._id,
      title: item.task?.subject || item.task?.title || item.task?.taskActivityName || "",
      description: item.task?.description || item.task?.question || item.task?.instruction || "",
      type,
      status: item.status || item.task?.status || "todo",
      priority: item.task?.priority || DEMO_PRIORITIES[idx % DEMO_PRIORITIES.length],
      discipline: item.task?.discipline,
      due_date: item.task?.dueDate || item.task?.finishDate,
      created_at: item.created_at || item.task?.createdAt,
      updated_at: item.task?.updatedAt || item.created_at || item.task?.createdAt,
      assignedBy: item.assignedBy,
    };
  });

  // Always diversify types and dates for demo realism
  {
    const now = new Date();
    const DEMO_DUE_OFFSETS = [-14, -7, -3, -1, 0, 2, 5, 7, 14, 21];
    taskList.forEach((task: any, idx: number) => {
      task.type = DEMO_TYPES[idx % DEMO_TYPES.length];
      task.priority = DEMO_PRIORITIES[idx % DEMO_PRIORITIES.length];
      const offset = DEMO_DUE_OFFSETS[idx % DEMO_DUE_OFFSETS.length];
      const demoDate = new Date(now);
      demoDate.setDate(demoDate.getDate() + offset);
      task.due_date = demoDate.toISOString();
    });
  }

  const myActions = taskList.filter((t: any) => {
    const s = t.status?.toLowerCase();
    return s !== "done" && s !== "closed";
  });

  // Sort actions by date: overdue first, then by due date ascending
  const sortedActions = useMemo(() => {
    const now = new Date();
    return myActions
      .map((task: any) => ({
        ...task,
        _isOverdue: task.due_date ? isBefore(new Date(task.due_date), now) && !isToday(new Date(task.due_date)) : false,
      }))
      .sort((a: any, b: any) => {
        if (a._isOverdue && !b._isOverdue) return -1;
        if (!a._isOverdue && b._isOverdue) return 1;
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return dateA - dateB;
      });
  }, [myActions]);

  const overdueCount = sortedActions.filter((t: any) => t._isOverdue).length;

  const actorNames = ["Sarah Chen", "Maruf M.", "David K.", "Linda N.", "James P."];
  const statusVerbMap: Record<string, string> = {
    done: "approved",
    closed: "approved",
    in_review: "submitted for review",
    inreview: "submitted for review",
    "in review": "submitted for review",
    answered: "submitted for review",
    todo: "created",
    in_progress: "updated",
  };

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

  // Documents from project
  const recentDocuments = (project?.documents || project?.attachments || []).slice(0, 5);



  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼';
    if (['xlsx', 'xls'].includes(ext || '')) return '📊';
    return '📎';
  };

  useEffect(() => {
    setTimeout(() => {
      setProjectId(localStorage.getItem("selectedProjectId") || undefined);
    }, 1000);
  }, []);

  const allProjects = projectListData?.results || [];
  const hasNoProjects = !projectId && allProjects.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* No Projects Banner */}
        {hasNoProjects && (
          <div className="w-full bg-white rounded-2xl border border-[#e2e5ea] p-8 text-center shadow-sm flex flex-col items-center">
            <div className="w-14 h-14 bg-[#f0edff] rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="w-7 h-7 text-[#6c5ce7]" />
            </div>
            <h2 className="text-lg font-medium text-[#111827] mb-1">No projects yet</h2>
            <p className="text-sm text-[#6b7280] mb-5 max-w-md leading-relaxed">
              Create your first project to get started. You can manage tasks, documents, budgets, and team members all in one place.
            </p>
            <button
              onClick={() => navigate("/create-project")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#6c5ce7] text-white text-sm font-normal rounded-xl hover:bg-[#5a4bd1] transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Create your first project
            </button>
          </div>
        )}
        {/* Project Context Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-sidebar rounded-xl p-4">
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
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                {projectProgress}%
              </span>
            </div>
            <div>
              <h1 className="text-lg font-medium text-foreground leading-tight">
                {project?.name || "Select a Project"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {project?.project_number || project?.projectNumber || "—"}
                {project?.location ? ` • ${project.location}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {daysRemaining !== null && (
              <Badge
                variant="outline"
                className={`text-xs font-medium px-3 py-1 ${daysRemaining < 0
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
              <Badge variant="outline" className="text-xs font-medium px-3 py-1 bg-white text-foreground border-gray-200">
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
            <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <MyAction />
                </div>
                <h3 className="text-sm text-gray2">My Actions ({myActions.length})</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 bg-white p-2 mx-2 rounded-md max-h-[400px] overflow-y-auto">
              {loadingTasks ? (
                <AwesomeLoader message="Loading tasks" />
              ) : sortedActions.length > 0 ? (
                <>
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-xs font-medium text-red-600">{overdueCount} overdue</span>
                    </div>
                  )}
                  {sortedActions.map((task: any) => (
                    <div key={task.id} className="mb-2">
                      <ActionItem
                        title={`${task.type}: ${task.title}`}
                        description={task.description || task.title}
                        priority={task.priority ? (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) as any : "Medium"}
                        dueDate={task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Date"}
                        id={task.id}
                        isOverdue={task._isOverdue}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-gray-500">No actions found for this project.</div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed Card — compact timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Caution2 />
                </div>
                <h3 className="text-sm text-gray2">Activity Feed</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-0 bg-white p-2 mx-2 rounded-md max-h-[400px] overflow-y-auto">
              {loadingTasks ? (
                <AwesomeLoader message="Loading activity" />
              ) : recentActivity.length > 0 ? (
                recentActivity.map((task: any, idx: number) => {
                  const s = task.status?.toLowerCase();
                  const verb = statusVerbMap[s] || "updated";
                  const displayStatus: "In Progress" | "Pending" | "Completed" =
                    s === "done" || s === "closed" ? "Completed"
                      : s === "in review" || s === "in_review" || s === "inreview" || s === "answered" ? "In Progress"
                        : "Pending";

                  const actorName = task.assignedBy?.name || actorNames[idx % actorNames.length];

                  return (
                    <ActivityFeedItem
                      key={task.id}
                      title={`${actorName} ${verb} ${task.type || 'Task'}: ${task.title}`}
                      status={displayStatus}
                      author={actorName}
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

        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
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
          <CardContent className="bg-white p-2 mx-2 rounded-md">
            {recentDocuments.length > 0 ? (
              <div className="divide-y divide-border/50">
                {recentDocuments.map((doc: any, i: number) => {
                  const fileName = doc.file_name || doc.fileName || doc.name || "Document";
                  return (
                    <button
                      key={doc.id || doc._id || i}
                      onClick={() => setSelectedDoc(doc)}
                      className="w-full flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-sidebar transition-colors text-left"
                    >
                      <span className="text-base">{getFileIcon(fileName)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{fileName}</p>
                        <p className="text-xs text-muted-foreground/50">
                          {doc.uploaded_at || doc.uploadedAt
                            ? formatDate(doc.uploaded_at || doc.uploadedAt)
                            : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    </button>
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

        <BudgetBreakdownCard progress={65} daysStatus="On track" />
        <ProjectTimelineCard
          startDate={formatDate(project?.startDate || project?.start_date)}
          currentDate={formatDate(new Date().toISOString())}
          deadline={formatDate(project?.endDate || project?.end_date)}
          progress={45}
          daysStatus={project?.status || "In Progress"}
        />



        {/* Health Score Cards */}
        {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        </div> */}

      </div>
      {/* Document Preview Modal */}
      <FilePreviewModal
        isOpen={!!selectedDoc}
        onOpenChange={(open) => { if (!open) setSelectedDoc(null); }}
        file={selectedDoc ? {
          name: selectedDoc.file_name || selectedDoc.fileName || selectedDoc.name || "Document",
          url: selectedDoc.streamUrl || selectedDoc.stream_url || selectedDoc.file_url || selectedDoc.fileUrl || "",
        } : null}
      />
    </DashboardLayout>
  );
};

export default Index;
