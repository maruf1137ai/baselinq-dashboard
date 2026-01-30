import React, { useRef, useState, useEffect } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Paperclip, Eye, GitBranch, Plus, Link2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Spark from '@/components/icons/Spark';
import { useNavigate } from 'react-router-dom';
import useTask, { useUpdateTask } from '@/supabse/hook/useTask';
import { toast } from 'sonner';
import CreateRequestDialog from '@/components/header/CreateRequestDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  {
    code: "GI",
    title: "GI - General Instruction",
    description: "General instruction for work or processes.",
    time: "30 minutes ago",
    active: false,
  },
];

function TaskCard({ task, isDragging }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const navigate = useNavigate();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formattedDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date');

  const displayId = `#${task.type || 'TSK'}-${task.task_code || task.id.slice(0, 4)}`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3">
      <Card
        onClick={() => navigate(`/tasks/${task.id}`)}
        className="p-[17px] bg-[#F3F2F0] rounded-[13px] shadow-none border-none hover:shadow-md transition-shadow cursor-move"
      >
        <div className="space-y-4">
          <h3 className="text-sm text-[#1A1A1A] leading-tight">
            {displayId} · {task.title}
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#717784]">{formattedDate}</span>
            <span className="text-[#E6E8EB]">•</span>
            <Avatar className="h-6 w-6">
              <AvatarFallback className={`text-xs bg-orange-100 text-orange-600`}>UA</AvatarFallback>
            </Avatar>
            <span className="text-[#E6E8EB]">•</span>
            <Badge variant="secondary" className="text-[11px] bg-orange-50 border border-[#FED7AA] text-orange-600 hover:bg-orange-50">
              Unassigned
            </Badge>
          </div>

          <div>
            <span className="text-xs border-b border-dotted border-[#717784] text-[#717784]">{task.type}</span>
          </div>

          {task.status && (
            <div>
              <span className={`text-xs block ${task.status === 'Overdue' ? 'text-[#DC2626]' : 'text-[#717784] '}`}>{task.status}</span>
            </div>
          )}

          <div>
            {task.warning && (
              <div className="bg-orange-50 border border-[#FED7AA] rounded-[28px] py-[5px] px-[9px] flex items-center gap-2">
                <Spark />
                <span className="text-[11px] text-[#D97706]">{task.warning}</span>
              </div>
            )}

            <div className="flex pt-[15px] border-t border-[#E6E8EB] mt-3 items-center gap-4 text-[#9CA3AF] text-xs">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{task?.chat?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                <span>{task?.chat?.map((chat) => chat?.files?.length || 0).reduce((a, b) => a + b, 0) || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />
                <span>0</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Column({ id, title, count, tasks, onAddClick }: any) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div className="flex-1 min-w-[320px]">
      <div className=" border border-dashed  border-[#0000001C] rounded-[21px] p-6 h-full">
        <div className="flex items-center justify-between mb-6">
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
          <div ref={setNodeRef} className="space-y-3">
            {tasks.map((task: any) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function Task() {
  const [projectId, setProjectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);
  const { data: serverTasks = [], isLoading } = useTask(projectId);
  const { mutateAsync: updateTask } = useUpdateTask();

  /* State */
  const [tasks, setTasks] = useState<{ todo: any[], inReview: any[], done: any[] }>({
    todo: [],
    inReview: [],
    done: [],
  });

  const [activeId, setActiveId] = useState(null);
  const [activeStartContainer, setActiveStartContainer] = useState(null);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [preSelectedStatus, setPreSelectedStatus] = useState("Todo");
  const navigate = useNavigate();

  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId") || undefined);
    };

    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  useEffect(() => {
    if (serverTasks) {
      setTasks({
        todo: serverTasks.filter((t: any) => !t.status || t.status === 'Todo'),
        inReview: serverTasks.filter((t: any) => t.status === 'In Review' || t.status === 'inReview'),
        done: serverTasks.filter((t: any) => t.status === 'Done'),
      });
    }
  }, [serverTasks]);

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
      let newStatus = 'Todo';
      if (overContainer === 'inReview') newStatus = 'In Review';
      if (overContainer === 'done') newStatus = 'Done';

      try {
        await updateTask({ id: active.id, status: newStatus });
        toast.success(`Task moved to ${newStatus}`);
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
          <div className="w-full h-screen bg-white overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-6 min-w-min">
                <Column id="todo" title="To Do" count={tasks.todo.length} tasks={tasks.todo} onAddClick={() => { setPreSelectedStatus("Todo"); setIsSelectionOpen(true); }} />
                <Column id="inReview" title="In Review" count={tasks.inReview.length} tasks={tasks.inReview} onAddClick={() => { setPreSelectedStatus("In Review"); setIsSelectionOpen(true); }} />
                <Column id="done" title="Done" count={tasks.done.length} tasks={tasks.done} onAddClick={() => { setPreSelectedStatus("Done"); setIsSelectionOpen(true); }} />
              </div>

              <DragOverlay>
                {activeId ? (
                  <TaskCard task={allListFlat.find((t: any) => t.id === activeId)} isDragging />
                ) : null}
              </DragOverlay>
            </DndContext>
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
            {btns.map((item, index) => (
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
