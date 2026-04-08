import React, { useState, useEffect, useMemo } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, Plus, Bell, Calendar, MessageSquare } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import useFetch from '@/hooks/useFetch';
import { usePatch } from '@/hooks/usePatch';
import { postData } from '@/lib/Api';
import { toast } from 'sonner';
import CreateRequestDialog from '@/components/header/CreateRequestDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import TaskFilterBar, { TaskFilters, defaultFilters } from '@/components/task/TaskFilterBar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";

const btns = [
  {
    code: "VO",
    title: "VO - Variation Order",
    description: "Request to modify scope, cost, or materials.",
    time: "Just now",
    active: false,
  },
  {
    code: "SI",
    title: "SI - Site Instruction",
    description: "Instruction issued directly for immediate site work.",
    time: "5 minutes ago",
    active: false,
  },
  {
    code: "RFI",
    title: "RFI - Request for Information",
    description: "Clarification requested regarding project details.",
    time: "10 minutes ago",
    active: false,
  },
  {
    code: "DC",
    title: "DC - Delay Claim",
    description: "Request for extension of time due to delays.",
    time: "15 minutes ago",
    active: false,
  },
  {
    code: "CPI",
    title: "CPI - Critical Path Item",
    description: "Task affecting the critical path timeline.",
    time: "20 minutes ago",
    active: false,
  },
];

const ALL_TASK_TYPES = ["VO", "SI", "RFI", "DC", "CPI", "GI"];

// Role to document type mapping - keys are normalized to Title Case for simpler lookup
const rolePermissions: Record<string, string[]> = {
  "Client": ALL_TASK_TYPES,
  "Owner": ALL_TASK_TYPES,
  "CLIENT": ALL_TASK_TYPES,
  "OWNER": ALL_TASK_TYPES,
  "CLIENT/OWNER": ALL_TASK_TYPES,
  "Client/Owner": ALL_TASK_TYPES,
  "Client / Owner": ALL_TASK_TYPES,
  "Client Project Manager": ALL_TASK_TYPES,
  "Architect": ["VO", "SI"],
  "Consultant Quantity Surveyor": ["VO"],
  "Consultant Planning Engineer": ["CPI", "DC"],
  "Construction Manager": ["RFI", "SI", "DC", "CPI"],
  "Contracts Manager": ["VO", "DC"],
  "Planning Engineer": ["CPI", "DC"],
  "Site Engineer": ["RFI"],
  "Site Supervisor": ["RFI", "SI"],
  "Foreman": ["RFI"],
  "Project Manager": ["SI", "DC", "CPI"],
};

// Timeline stages per task type — used to map board columns to entity status
const taskTypeStages: Record<string, string[]> = {
  VO: ["Draft", "Submitted", "Under Review", "Priced", "Approved"],
  RFI: ["Draft", "Sent for Review", "Further Info Required", "Response Provided", "Closed"],
  SI: ["Draft", "Issued", "Acknowledged", "Actioned", "Verified"],
  DC: ["Delay Identified", "Notice Issued", "Under Assessment", "Determination Made", "EOT Awarded"],
  CPI: ["Scheduled", "In Progress", "On Track / At Risk", "Completed"],
  CRITICALPATHITEM: ["Scheduled", "In Progress", "On Track / At Risk", "Completed"],
};

// Map board column to entity status based on task type
const getEntityStatusForColumn = (column: string, taskType: string): string => {
  const stages = taskTypeStages[taskType] || ["Pending", "In Review", "Approved", "Closed"];
  if (column === "todo") return stages[0];
  if (column === "done") return stages[stages.length - 1];
  // inReview → second stage
  return stages.length > 2 ? stages[1] : stages[0];
};

// Document type text color mapping
const DOC_TYPE_TEXT_COLORS: Record<string, string> = {
  VO: 'text-purple-600',
  RFI: 'text-blue-600',
  SI: 'text-green-600',
  DC: 'text-orange-600',
  CPI: 'text-amber-600',
  GI: 'text-gray-500',
};

// Role to approval permission mapping per document type
const approvalPermissions: Record<string, string[]> = {
  VO: ["Client", "Owner", "Client Project Manager", "Consultant Quantity Surveyor", "Architect"],
  SI: ["Construction Manager", "Project Manager", "Architect", "Client Project Manager"],
  RFI: ["Architect", "Construction Manager", "Project Manager", "Site Engineer"],
  DC: ["Client", "Owner", "Client Project Manager", "Consultant Planning Engineer", "Contracts Manager"],
  CPI: ["Planning Engineer", "Consultant Planning Engineer", "Project Manager", "Construction Manager"],
};

// Helper to get assignee initials
const getAssigneeInitials = (assignedTo: any[]) => {
  if (!assignedTo || assignedTo.length === 0) return 'U';
  const name = assignedTo[0]?.name || '';
  return name.charAt(0).toUpperCase();
};


// Helper to calculate due date status
const getDueDateInfo = (dueDate: string | null, createdAt: string | null) => {
  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} days overdue`,
        color: 'text-red-600',
        isOverdue: true
      };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-red-600', isOverdue: false };
    } else if (diffDays <= 2) {
      return { text: `Due in ${diffDays} days`, color: 'text-red-600', isOverdue: false };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, color: 'text-orange-600', isOverdue: false };
    } else {
      return { text: `Due in ${diffDays} days`, color: 'text-gray-600', isOverdue: false };
    }
  }

  // If no due date, show age
  if (createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: 'Created today', color: 'text-gray-500', isOverdue: false };
    if (diffDays === 1) return { text: 'Created yesterday', color: 'text-gray-500', isOverdue: false };
    return { text: `Created ${diffDays} days ago`, color: 'text-gray-500', isOverdue: false };
  }

  return { text: 'No date', color: 'text-gray-400', isOverdue: false };
};


// Helper to get construction-specific status display name
const getStatusDisplayName = (status: string | null) => {
  if (!status) return null;

  const statusLower = status.toLowerCase();

  // Map backend status values to construction-friendly names
  if (statusLower === 'todo' || statusLower === 'open' || statusLower === 'draft') {
    return 'Open';
  } else if (statusLower === 'in review' || statusLower === 'inreview' || statusLower === 'pending' || statusLower === 'answered' || statusLower === 'in_review') {
    return 'Under Review';
  } else if (statusLower === 'done' || statusLower === 'closed' || statusLower === 'approved') {
    return 'Resolved';
  } else if (statusLower === 'overdue') {
    return 'Overdue';
  }

  // Fallback: capitalize first letter
  return status.charAt(0).toUpperCase() + status.slice(1);
};

function TaskCard({ task, isDragging, currentUserId }: any) {
  const { userRole } = useUserRoleStore();

  const normalizedTaskType = task.type === "CRITICALPATHITEM" ? "CPI" : task.type;
  const allowedApprovers = approvalPermissions[normalizedTaskType] || [];
  const allowedApproversUpper = allowedApprovers.map(a => a.toUpperCase());
  const userRoles = userRole ? userRole.split(/\s*\/\s*/).map((r) => r.trim().toUpperCase()) : [];
  const canDrag = true;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    disabled: false,
  });
  const navigate = useNavigate();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayId = `${task.task_code}`;
  const dueDateInfo = getDueDateInfo(task.due_date, task.created_at);
  const docTypeTextColor = DOC_TYPE_TEXT_COLORS[normalizedTaskType] || 'text-muted-foreground';
  const attachmentCount = task?.attachments?.length || 0;
  // Use assignedTo if available, otherwise fall back to assignedBy
  const displayAssignees = (task.assignedTo && task.assignedTo.length > 0)
    ? task.assignedTo
    : task.assignedBy ? [task.assignedBy] : [];
  const firstAssigneeName = displayAssignees[0]?.name || 'Assignee';

  // Priority config
  const priorityConfig: Record<string, { dot: string; label: string }> = {
    critical: { dot: 'bg-red-500', label: 'Critical' },
    high: { dot: 'bg-orange-500', label: 'High' },
    medium: { dot: 'bg-blue-500', label: 'Medium' },
    low: { dot: 'bg-muted-foreground/40', label: 'Low' },
  };
  const priority = task.priority?.toLowerCase();
  const priorityInfo = priority ? priorityConfig[priority] : null;

  // Days calculation
  const daysUntilDue = task.due_date
    ? Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000)
    : null;
  const overdueDays = dueDateInfo.isOverdue && daysUntilDue !== null ? Math.abs(daysUntilDue) : 0;
  const isWarning = !dueDateInfo.isOverdue && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 2;

  // Is this task resolved/done?
  const isResolved = ['done', 'closed', 'approved'].includes((task.status || '').toLowerCase());

  // Escalation level: 0=on track, 1=SLA breached (0-3d), 2=escalated to PM (3-7d)
  // Only apply to non-resolved tasks
  const escalationLevel = isResolved ? 0 : (!dueDateInfo.isOverdue ? 0 : overdueDays <= 3 ? 1 : 2);

  // Card border + background per escalation level
  const cardBorder = isResolved ? 'border border-border' :
    escalationLevel >= 2 ? 'border border-red-300 bg-red-50/30' :
      escalationLevel === 1 ? 'border border-red-200 bg-red-50/20' :
        isWarning ? 'border border-amber-200' :
          'border border-border';

  const content = (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3">
      <Card
        onClick={() => navigate(`/tasks/${task.id}`)}
        className={`bg-sidebar rounded-xl shadow-none transition-shadow overflow-hidden
          ${cardBorder}
          ${canDrag ? 'cursor-move hover:shadow-md' : 'cursor-default hover:shadow-sm'}`}
      >
        <div className="p-3 space-y-2">
          {/* Row 1: doc type ID + priority badge + status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${docTypeTextColor}`}>{displayId}</span>
              {priorityInfo && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${priority === 'critical' ? 'bg-red-50 text-red-600' :
                  priority === 'high' ? 'bg-orange-50 text-orange-600' :
                    priority === 'medium' ? 'bg-blue-50 text-blue-600' :
                      'bg-muted text-muted-foreground'
                  }`}>{priorityInfo.label}</span>
              )}
            </div>
            {isResolved && dueDateInfo.isOverdue ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                Closed {overdueDays}d late
              </span>
            ) : !isResolved && dueDateInfo.isOverdue ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium shrink-0">
                {overdueDays}d late
              </span>
            ) : !isResolved && isWarning ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 shrink-0">
                Due soon
              </span>
            ) : null}
          </div>

          {/* Row 2: title */}
          <p className="text-sm text-foreground leading-snug line-clamp-2">
            {task.title || task.taskActivityName || '—'}
          </p>

          {/* Row 3: Discipline + due date (or escalation) + avatar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {task.discipline && (
                <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                  {task.discipline}
                </span>
              )}
              {(() => {
                const visibleResponses = (task.responses || []).filter((resp: any) =>
                  String(resp.senderId) === String(currentUserId) ||
                  String(task.assignedBy?.userId) === String(currentUserId)
                );
                return visibleResponses.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] bg-[#8081F6]/10 text-[#8081F6] px-1.5 py-0.5 rounded shrink-0">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {visibleResponses.length}
                  </span>
                );
              })()}
              {/* Escalated: replace due date with bell */}
              {!isResolved && escalationLevel >= 2 ? (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium shrink-0">
                  <Bell className="h-3 w-3" />
                  Escalated to PM
                </span>
              ) : !isResolved && escalationLevel === 1 ? (
                <span className="flex items-center gap-1 text-xs text-amber-600 shrink-0">
                  <Calendar className="h-3 w-3" />
                  {`${overdueDays}d overdue`}
                </span>
              ) : task.due_date && !isResolved ? (
                <span className={`flex items-center gap-1 text-xs shrink-0 ${dueDateInfo.isOverdue ? 'text-red-600 font-medium' :
                  isWarning ? 'text-amber-600' :
                    'text-muted-foreground'
                  }`}>
                  <Calendar className="h-3 w-3" />
                  {dueDateInfo.isOverdue
                    ? `${overdueDays}d overdue`
                    : isWarning
                      ? `Due in ${daysUntilDue}d`
                      : new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  }
                </span>
              ) : isResolved && task.due_date ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              ) : null}
            </div>
            <div className="flex -space-x-1.5 shrink-0">
              <TooltipProvider delayDuration={300}>
                {displayAssignees.slice(0, 3).map((assignee: any, idx: number) => {
                  const name = assignee.name || 'Unknown';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <Tooltip key={`${assignee.userId || assignee.id || idx}-${idx}`}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 border-2 border-white hover:z-20 transition-all cursor-default">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-[#1B1C1F] text-white border-none py-1.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs">{name}</p>
                          {assignee.role && <p className="text-xs opacity-70">{assignee.role}</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
              {displayAssignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-white flex items-center justify-center z-10">
                  <span className="text-[10px] text-muted-foreground">+{displayAssignees.length - 3}</span>
                </div>
              )}
              {displayAssignees.length === 0 && (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">?</AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>


      </Card >
    </div >
  );

  if (!canDrag) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" className="bg-[#1B1C1F] text-white border-none py-1.5 px-3">
            <p className="text-xs">Only authorized roles can move this task type.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

function Column({ id, title, count, tasks, onAddClick, currentUserId }: any) {
  const { setNodeRef } = useSortable({ id });

  // Only count overdue for non-resolved tasks (resolved items shouldn't show "breached")
  const overdueCount = id !== 'done' ? tasks.filter((t: any) => getDueDateInfo(t.due_date, t.created_at).isOverdue).length : 0;

  return (
    <div className="flex-1 min-w-[320px] h-full">
      <div className="border border-dashed border-[#0000001C] rounded-2xl p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm text-foreground">{title}</h2>
            <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
              {count}
            </Badge>
            {overdueCount > 0 && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                {overdueCount} breached
              </span>
            )}
          </div>
          {onAddClick && (
            <button onClick={onAddClick} className="text-muted-foreground hover:text-gray-600">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className="space-y-3 flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-gray-200"
            style={{ minHeight: '100px' }}
          >
            {tasks.map((task: any) => (
              <TaskCard key={task.id} task={task} currentUserId={currentUserId} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// Helper to check if a date falls within a range
const isDateInRange = (dateStr: string | null, range: string): boolean => {
  if (!dateStr) return range === 'all';
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  switch (range) {
    case 'overdue':
      return date < now;
    case 'today':
      return date >= now && date <= endOfToday;
    case 'this_week': {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      return date >= now && date <= endOfWeek;
    }
    case 'this_month': {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return date >= now && date <= endOfMonth;
    }
    default:
      return true;
  }
};

// Apply filters to a flat task array
const applyFilters = (taskList: any[], filters: TaskFilters, currentUserName: string | null): any[] => {
  return taskList.filter(task => {
    // Document type filter
    if (filters.docTypes.length > 0 && !filters.docTypes.includes(task.type)) return false;


    // Assignee filter
    if (filters.assignee !== 'all') {
      const assigneeIds = (task.assignedTo || []).map((a: any) => String(a.userId || a.id || a.name));
      if (!assigneeIds.includes(filters.assignee)) return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      if (!isDateInRange(task.due_date, filters.dateRange)) return false;
    }

    // My Items filter
    if (filters.myItems && currentUserName) {
      const assigneeNames = (task.assignedTo || []).map((a: any) => (a.name || '').toLowerCase());
      if (!assigneeNames.includes(currentUserName.toLowerCase())) return false;
    }

    return true;
  });
};

export default function Task() {
  const [projectId, setProjectId] = useState(() => localStorage.getItem("selectedProjectId") || "");
  const { userRole } = useUserRoleStore();
  const { data: currentUser } = useCurrentUser();

  // Fetch tasks from Django API - response structure: { count, next, previous, results: [] }
  const { data: taskResponse, isLoading, refetch } = useFetch<{ count: number; results: any[]; tasks?: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : "",
    { enabled: !!projectId }
  );

  const { mutateAsync: updateTask } = usePatch();

  // Check if user has permission to create any task type
  const canCreateTask = true;

  // Filter buttons based on user role
  const filteredBtns = btns;

  /* State */
  const [tasks, setTasks] = useState<{ todo: any[], inReview: any[], done: any[] }>({
    todo: [],
    inReview: [],
    done: [],
  });

  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);

  // Extract unique assignees from all tasks for the filter dropdown
  const assigneeOptions = useMemo(() => {
    const allTasks = [...tasks.todo, ...tasks.inReview, ...tasks.done];
    const seen = new Map<string, string>();
    allTasks.forEach(task => {
      (task.assignedTo || []).forEach((a: any) => {
        const id = String(a.userId || a.id || a.name);
        if (!seen.has(id)) seen.set(id, a.name || 'Unknown');
      });
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Apply filters to each column
  const currentUserName = currentUser?.name || null;
  const filteredTasks = useMemo(() => ({
    todo: applyFilters(tasks.todo, filters, currentUserName),
    inReview: applyFilters(tasks.inReview, filters, currentUserName),
    done: applyFilters(tasks.done, filters, currentUserName),
  }), [tasks, filters, currentUserName]);

  const [activeId, setActiveId] = useState(null);
  const [activeStartContainer, setActiveStartContainer] = useState(null);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [preSelectedStatus, setPreSelectedStatus] = useState("todo");
  const navigate = useNavigate();

  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId") || "");
    };

    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  useEffect(() => {
    const serverTasks = taskResponse?.tasks || [];
    if (serverTasks) {
      // Demo fallback data for realistic presentation
      const TASK_TYPES = ["CPI", "RFI", "SI", "VO", "DC", "RFI", "CPI", "SI", "VO", "RFI"];
      const TASK_PRIORITIES = ["High", "Medium", "Critical", "Low", "High", "Medium", "High", "Low", "Critical", "Medium"];
      const TASK_DISCIPLINES = ["Structural", "MEP", "Civil", "Architectural", "Environmental", "Structural", "MEP", "Civil", "Architectural", "Legal"];
      const DUE_OFFSETS = [-14, -7, -3, -1, 0, 2, 5, 7, 14, 21];
      const taskNow = new Date();

      // Transform new API response to match existing UI structure
      const transformedTasks = serverTasks.map((item: any, idx: number) => {
        const apiType = item?.taskType;
        const type = apiType || TASK_TYPES[idx % TASK_TYPES.length];

        // Use real dueDate from Task object, fall back to entity's dueDate
        let dueDate = item.dueDate || item.task?.dueDate;

        // Only use fallback for demo data (if no real IDs are present)
        if (!dueDate && !item.taskId && !item.task?.id) {
          const offset = DUE_OFFSETS[idx % DUE_OFFSETS.length];
          const d = new Date(taskNow);
          d.setDate(d.getDate() + offset);
          dueDate = d.toISOString();
        }

        return ({
          id: item.id || item.taskId || item.task?._id || item.task?.id,
          title: item.task?.subject || item.task?.title || item.task?.taskActivityName || '',
          type,
          status: item.status || item.task?.status || 'todo',
          priority: item.task?.priority || TASK_PRIORITIES[idx % TASK_PRIORITIES.length],
          discipline: item.task?.discipline || TASK_DISCIPLINES[idx % TASK_DISCIPLINES.length],
          task_code: `${type}-${String(item.taskId || item.id || '0').padStart(3, '0')}`,
          due_date: dueDate,
          created_at: item.created_at || item.task?.createdAt,
          assignedTo: item.assignedTo,
          assignedBy: item.assignedBy,
          attachments: item.task?.attachments || [],
          responses: item.responses || [],
          chat: [],
        })
      });

      // setTasks(transformedTasks)
      setTasks({
        todo: transformedTasks.filter((t: any) => !t.status || t.status === 'todo' || t.status === 'Todo' || t.status === 'Open' || t.status === 'Draft'),

        inReview: transformedTasks.filter((t: any) => t.status === 'in review' || t.status === 'In Review' || t.status === 'inReview' || t.status === 'Pending' || t.status === 'Answered' || t.status === 'IN_REVIEW'),

        done: transformedTasks.filter((t: any) => t.status === 'done' || t.status === 'Done' || t.status === 'Closed'),
      });
    }
  }, [taskResponse]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: any) => {
    if (id in tasks) return id;
    return Object.keys(tasks).find(key => (tasks as any)[key].some((task: any) => task.id === id));
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveStartContainer(findContainer(active.id));
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setTasks(prev => {
      const activeItems = (prev as any)[activeContainer];
      const overItems = (prev as any)[overContainer];
      const activeIndex = activeItems.findIndex((t: any) => t.id === active.id);
      const overIndex = overItems.findIndex((t: any) => t.id === over.id);

      let newIndex;
      if (over.id in prev) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: (prev as any)[activeContainer].filter((t: any) => t.id !== active.id),
        [overContainer]: [...(prev as any)[overContainer].slice(0, newIndex), activeItems[activeIndex], ...(prev as any)[overContainer].slice(newIndex)],
      };
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      setActiveStartContainer(null);
      return;
    }

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      setActiveStartContainer(null);
      return;
    }

    const activeIndex = (tasks as any)[activeContainer].findIndex((t: any) => t.id === active.id);
    const overIndex = (tasks as any)[overContainer].findIndex((t: any) => t.id === over.id);

    // If moved to a different container compared to start
    if (activeStartContainer !== overContainer) {
      let newStatus = 'todo';
      if (overContainer === 'inReview') newStatus = 'in review';
      if (overContainer === 'done') newStatus = 'done';

      const activeTask = (tasks as any)[activeContainer]?.find((t: any) => t.id === active.id);
      const entityStatus = getEntityStatusForColumn(overContainer, activeTask?.type || "");
      const taskStatusMap: Record<string, string> = { 'todo': 'todo', 'in review': 'in review', 'done': 'done' };

      try {
        await Promise.all([
          // updateTask({
          //   url: `tasks/tasks/${active.id}/`,
          //   data: { status: newStatus },
          // }),
          updateTask({
            url: `tasks/tasks/${active.id}/update-entity/`,
            data: { status: entityStatus, taskStatus: taskStatusMap[newStatus] || newStatus },
          }),
        ]);
        toast.success(`Task moved to ${getStatusDisplayName(newStatus) || newStatus}`);
        await refetch();

        // Auto-post status change to channel (silently fails until backend adds the endpoint)
        const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';
        postData({
          url: `channels/by-task/${active.id}/messages/`,
          data: {
            content: `Status changed to ${entityStatus} by ${userName}`,
            is_urgent: false,
            message_type: 'status_change',
          },
        }).catch(() => { }); // silent — endpoint may not exist yet
      } catch (error) {
        toast.error("Failed to update status");
      }
    }

    // Reorder validation
    if (activeIndex !== overIndex || activeContainer !== overContainer) {
      setTasks(prev => ({
        ...prev,
        [overContainer]: arrayMove((prev as any)[overContainer], activeIndex, overIndex),
      }));
    }

    setActiveId(null);
    setActiveStartContainer(null);
  };

  const allListFlat = [...tasks.todo, ...tasks.inReview, ...tasks.done];

  return (
    <DashboardLayout>
      {projectId ? (
        isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <AwesomeLoader message="Fetching task board" />
          </div>
        ) : (
          <div className="w-full h-[calc(100vh-120px)] bg-white flex flex-col overflow-hidden">
            <h1 className="text-2xl font-normal tracking-tight text-foreground mb-6">Tasks</h1>
            <TaskFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              assigneeOptions={assigneeOptions}
            />
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-0 pt-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-6 min-w-min h-full">
                  <Column id="todo" title="Open" count={filteredTasks.todo.length} tasks={filteredTasks.todo} currentUserId={currentUser?.id} onAddClick={canCreateTask ? () => { setPreSelectedStatus("todo"); setIsSelectionOpen(true); } : undefined} />
                  <Column id="inReview" title="Under Review" count={filteredTasks.inReview.length} tasks={filteredTasks.inReview} currentUserId={currentUser?.id} onAddClick={canCreateTask ? () => { setPreSelectedStatus("In Review"); setIsSelectionOpen(true); } : undefined} />
                  <Column id="done" title="Resolved" count={filteredTasks.done.length} tasks={filteredTasks.done} currentUserId={currentUser?.id} onAddClick={canCreateTask ? () => { setPreSelectedStatus("Done"); setIsSelectionOpen(true); } : undefined} />
                </div>

                <DragOverlay>
                  {activeId ? (
                    <TaskCard task={allListFlat.find((t: any) => t.id === activeId)} isDragging />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )
      ) : (
        <div className="p-8 text-center text-gray-500">Please select a project from the sidebar</div>
      )}
      <Dialog open={isSelectionOpen} onOpenChange={setIsSelectionOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-base font-medium">Select Request Type</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col">
            {filteredBtns.map((item, index) => (
              <div
                key={index}
                onClick={() => {
                  setSelectedType(item.title);
                  setIsSelectionOpen(false);
                  setIsRequestDialogOpen(true);
                }}
                className="border-b border-border p-4 hover:bg-[#E8F1FF4D] transition cursor-pointer last:border-b-0 group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CreateRequestDialog
        open={isRequestDialogOpen}
        setOpen={setIsRequestDialogOpen}
        selectedType={selectedType}
        initialStatus={preSelectedStatus}
      />
    </DashboardLayout>
  );
}
