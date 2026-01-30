import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChatSidebar } from "@/components/Communications/chatSidebar";
import ChatWindow from "@/components/Communications/chatWindow";
import ChatSammary from "@/components/Communications/chatSammary";
import useTask from "@/supabse/hook/useTask";

const Communications = () => {
  const [projectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);
  const { data: tasks, isLoading } = useTask(projectId);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    if (tasks?.length) {
      if (!selectedTask) {
        setSelectedTask(tasks[0]);
      } else {
        const updatedTask = tasks.find((t: any) => t.id === selectedTask.id);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }
    }
  }, [tasks]);

  return (
    <DashboardLayout padding="p-0">
      <div className="h-full flex">
        <div className="border-border bg-white flex-shrink-0">
          <ChatSidebar
            tasks={tasks || []}
            selectedTask={selectedTask}
            onSelectTask={setSelectedTask}
            onNewChat={() => { }} // Placeholder
          />
        </div>
        <div className="chatWindow flex-1">
          <ChatWindow task={selectedTask} />
        </div>
        <div className="chatSummary flex-shrink-0 w-80">
          <ChatSammary task={selectedTask} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Communications;
