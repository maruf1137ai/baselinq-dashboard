import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChatSidebar } from "@/components/Communications/chatSidebar";
import ChatWindow from "@/components/Communications/chatWindow";
import ChatSammary from "@/components/Communications/chatSammary";
import useFetch from "@/hooks/useFetch";
import { useQueryClient } from "@tanstack/react-query";
import { postData } from "@/lib/Api";

const Communications = () => {
  const [projectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);
  const { data: channelsData, isLoading } = useFetch<any[]>(
    projectId ? `channels/?projectId=${projectId}` : ""
  );
  const channels = Array.isArray(channelsData) ? channelsData : [];
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const queryClient = useQueryClient();

  const handleSelectChannel = async (channel: any) => {
    setSelectedChannel(channel);

    // Call mark_read API if there are unread messages
    if (channel?.id && channel.unread_count > 0) {
      try {
        await postData({
          url: `channels/${channel.id}/mark_read/`,
          data: {}
        });
        // Refetch channels to update unread counts in sidebar
        queryClient.invalidateQueries({ queryKey: [projectId ? `channels/?projectId=${projectId}` : ""] });
      } catch (err) {
        console.error("Failed to mark channel as read", err);
      }
    }
  };

  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  const { data: projectData } = useFetch(projectId ? `projects/${projectId}/` : "");
  const projectName = projectData?.name || "Project";

  const { data: taskDetails } = useFetch(
    selectedChannel?.taskId ? `tasks/tasks/${selectedChannel.taskId}/` : null,
    { enabled: !!selectedChannel?.taskId }
  );

  return (
    <DashboardLayout padding="p-0">
      <div className="h-full flex">
        <div className="border-border bg-white flex-shrink-0">
          <ChatSidebar
            tasks={channels}
            isLoading={isLoading}
            selectedTask={selectedChannel}
            onSelectTask={handleSelectChannel}
            onNewChat={() => { }} // Placeholder
          />
        </div>
        <div className="chatWindow flex-1">
          <ChatWindow
            channel={selectedChannel}
            projectName={projectName}
            taskDetails={taskDetails}
          />
        </div>
        <div className="chatSummary flex-shrink-0 w-80">
          <ChatSammary task={selectedChannel} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Communications;
