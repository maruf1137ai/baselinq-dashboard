import React, { useState, useEffect, useMemo } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Paperclip, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Spark from '@/components/icons/Spark';
import { useNavigate } from 'react-router-dom';
import useFetch from '@/hooks/useFetch';
import { usePatch } from '@/hooks/usePatch';
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

// Role to document type mapping
const rolePermissions: Record<string, string[]> = {
  "Client": ["VO"],
  "Owner": ["VO"],
  "CLIENT": ["VO"],
  "OWNER": ["VO"],
  "Client Project Manager": ["VO"],
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

// Document type color mapping
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

// Helper to get assignee display info
const getAssigneeInfo = (assignedTo: any[]) => {
  if (!assignedTo || assignedTo.length === 0) {
    return { initials: 'U', color: 'bg-orange-100 text-orange-600', name: 'Unassigned' };
  }
  const name = assignedTo[0]?.name || 'Assigned';
  const initials = name.charAt(0).toUpperCase();
  return {
    initials,
    color: 'bg-blue-100 text-blue-600',
    name: assignedTo.length > 1 ? `${name} +${assignedTo.length - 1}` : name
  };
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

// Helper to get priority badge info
const getPriorityInfo = (priority: string | null) => {
  if (!priority) return null;

  const priorityLower = priority.toLowerCase();
  if (priorityLower === 'high' || priorityLower === 'urgent') {
    return { label: 'High', color: 'bg-red-100 text-red-700 border-red-200' };
  } else if (priorityLower === 'medium') {
    return { label: 'Medium', color: 'bg-orange-100 text-orange-700 border-orange-200' };
  }
  return null; // Don't show low priority
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

function TaskCard({ task, isDragging }: any) {
  const { userRole } = useUserRoleStore();

  // Check if the current user's role is authorized to drag/approve this task type
  const normalizedTaskType = task.type === "CRITICALPATHITEM" ? "CPI" : task.type;
  const allowedApprovers = approvalPermissions[normalizedTaskType] || [];
  const allowedApproversUpper = allowedApprovers.map(a => a.toUpperCase());

  const userRoles = userRole ? userRole.split(/\s*\/\s*/).map((r) => r.trim().toUpperCase()) : [];
  const canDrag = userRoles.some((role) => allowedApproversUpper.includes(role));

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    disabled: !canDrag
  });
  const navigate = useNavigate();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayId = `#${task.task_code}`;
  const assigneeInfo = getAssigneeInfo(task.assignedTo);
  const dueDateInfo = getDueDateInfo(task.due_date, task.created_at);
  const priorityInfo = getPriorityInfo(task.priority);

  // Calculate counts
  const commentCount = task?.chat?.length || 0;
  const attachmentCount = task?.attachments?.length || 0;
  // console.log(task)

  const content = (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3">
      <Card
        onClick={() => navigate(`/tasks/${task.id}`)}
        className={`p-[17px] bg-[#F3F2F0] rounded-[13px] shadow-none border-none hover:shadow-md transition-shadow relative overflow-hidden ${dueDateInfo.isOverdue ? 'ring-2 ring-red-200' : ''} ${canDrag ? 'cursor-move' : 'cursor-default opacity-90'}`}

      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm text-[#1A1A1A] leading-tight flex-1">
              {displayId} · {task.title || task.taskActivityName}
            </h3>
            {priorityInfo && (
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${priorityInfo.color} shrink-0`}>
                {priorityInfo.label}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs ${dueDateInfo.color}`}>
              {dueDateInfo.text}
            </span>
            <span className="text-[#E6E8EB]">•</span>
            <div className="flex -space-x-2">
              <TooltipProvider delayDuration={300}>
                {(task.assignedTo || []).slice(0, 3).map((assignee: any, idx: number) => {
                  const name = assignee.name || 'Unknown';
                  const initials = name.charAt(0).toUpperCase();
                  return (
                    <Tooltip key={`${assignee.userId}-${idx}`}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 border-2 border-[#F3F2F0] hover:z-20 transition-all cursor-default">
                          <AvatarFallback className="text-[10px] bg-blue-100 text-blue-600">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-[#1B1C1F] text-white border-none py-1.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs">{name}</p>
                          {assignee.role && <p className="text-[10px] opacity-70">{assignee.role}</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>

              {task.assignedTo && task.assignedTo.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-[#F3F2F0] flex items-center justify-center z-10">
                  <span className="text-[9px] text-gray-600">+{task.assignedTo.length - 3}</span>
                </div>
              )}

              {(!task.assignedTo || task.assignedTo.length === 0) && (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-orange-100 text-orange-600">
                    U
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs border-b border-dotted border-[#717784] text-[#717784]">{task.type}</span>
          </div>

          <div>
            {task.warning && (
              <div className="bg-orange-50 border border-[#FED7AA] rounded-[28px] py-[5px] px-[9px] flex items-center gap-2">
                <Spark />
                <span className="text-[11px] text-[#D97706]">{task.warning}</span>
              </div>
            )}

            {(commentCount > 0 || attachmentCount > 0) && (
              <div className="flex pt-[15px] border-t border-[#E6E8EB] mt-3 items-center gap-4 text-[#9CA3AF] text-xs">
                {commentCount > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{commentCount}</span>
                  </div>
                )}
                {attachmentCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{attachmentCount}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );

  if (!canDrag) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[#1B1C1F] text-white border-none py-1.5 px-3">
            <p className="text-xs">Only authorized roles can move this task type.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

function Column({ id, title, count, tasks, onAddClick }: any) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div className="flex-1 min-w-[320px] h-full">
      <div className=" border border-dashed  border-[#0000001C] rounded-[21px] p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm text-[#1A1A1A]">{title}</h2>
            <Badge variant="secondary" className="bg-[#F2F3F5] text-[#717784] text-xs">
              {count}
            </Badge>
          </div>
          <button
            onClick={onAddClick}
            className="text-[#717784] hover:text-gray-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className="space-y-3 flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-gray-200"
            style={{ minHeight: '100px' }}
          >
            {tasks.map((task: any) => (
              <TaskCard key={task.id} task={task} />
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

  // Filter buttons based on user role
  const filteredBtns = useMemo(() => {
    if (!userRole) return btns; // Show all if no role set

    // Support compound roles like "Client / Owner"
    const currentRoles = userRole.split(/\s*\/\s*/).map(r => r.trim());

    // Aggregate allowed document types from all user roles
    const allowedDocTypes = new Set<string>();
    currentRoles.forEach(role => {
      // Direct match
      const permissions = rolePermissions[role] || [];
      permissions.forEach(type => allowedDocTypes.add(type));

      // Case-insensitive match if direct match fails
      if (permissions.length === 0) {
        const foundKey = Object.keys(rolePermissions).find(
          key => key.toLowerCase() === role.toLowerCase()
        );
        if (foundKey) {
          rolePermissions[foundKey].forEach(type => allowedDocTypes.add(type));
        }
      }
    });

    if (allowedDocTypes.size === 0) return btns; // Show all if no roles identified in mapping

    return btns.filter(btn => allowedDocTypes.has(btn.code));
  }, [userRole]);

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
      // Transform new API response to match existing UI structure
      const transformedTasks = serverTasks.map((item: any) => {
        return ({
          id: item.taskId || item.task?._id,
          title: item.task?.subject || item.task?.title || item.task?.taskActivityName || '',
          type: item?.taskType,
          status: item.status || item.task?.status || 'todo',
          priority: item.task?.priority,
          discipline: item.task?.discipline,
          task_code: `${item.taskType}-${String(item.taskId).padStart(3, '0')}`,
          due_date: item.task?.dueDate,
          created_at: item.created_at || item.task?.createdAt,
          assignedTo: item.assignedTo,
          assignedBy: item.assignedBy,
          attachments: item.task?.attachments || [],
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
          updateTask({
            url: `tasks/tasks/${active.id}/`,
            data: { status: newStatus },
          }),
          updateTask({
            url: `tasks/tasks/${active.id}/update-entity/`,
            data: { status: entityStatus, taskStatus: taskStatusMap[newStatus] || newStatus },
          }),
        ]);
        toast.success(`Task moved to ${getStatusDisplayName(newStatus) || newStatus}`);
        await refetch();
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
          <div className="p-8 text-center text-gray-500">Loading tasks...</div>
        ) : (
          <div className="w-full h-[calc(100vh-120px)] bg-white flex flex-col overflow-hidden">
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
                  <Column id="todo" title="Open" count={filteredTasks.todo.length} tasks={filteredTasks.todo} onAddClick={() => { setPreSelectedStatus("todo"); setIsSelectionOpen(true); }} />
                  <Column id="inReview" title="Under Review" count={filteredTasks.inReview.length} tasks={filteredTasks.inReview} onAddClick={() => { setPreSelectedStatus("In Review"); setIsSelectionOpen(true); }} />
                  <Column id="done" title="Resolved" count={filteredTasks.done.length} tasks={filteredTasks.done} onAddClick={() => { setPreSelectedStatus("Done"); setIsSelectionOpen(true); }} />
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
        <DialogContent className="sm:max-w-[425px] bg-white p-0 overflow-hidden rounded-[13px]">
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
                className="border-b border-[#EDEDED] p-4 hover:bg-[#E8F1FF4D] transition cursor-pointer last:border-b-0 group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1A1A1A] group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#717784] mt-1 leading-relaxed">
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
