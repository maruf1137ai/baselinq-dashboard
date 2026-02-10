import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChatSidebar } from "@/components/Communications/chatSidebar";
import ChatWindow from "@/components/Communications/chatWindow";
import ChatSammary from "@/components/Communications/chatSammary";
import useFetch from "@/hooks/useFetch";
import { useQueryClient } from "@tanstack/react-query";

const Communications = () => {
  const [projectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);
  const { data: channelsData, isLoading } = useFetch<any[]>(
    projectId ? `channels/?projectId=${projectId}` : ""
  );
  const channels = Array.isArray(channelsData) ? channelsData : [];
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  return (
    <DashboardLayout padding="p-0">
      <div className="h-full flex">
        <div className="border-border bg-white flex-shrink-0">
          <ChatSidebar
            tasks={channels}
            selectedTask={selectedChannel}
            onSelectTask={setSelectedChannel}
            onNewChat={() => { }} // Placeholder
          />
        </div>
        <div className="chatWindow flex-1">
          <ChatWindow channel={selectedChannel} />
        </div>
        <div className="chatSummary flex-shrink-0 w-80">
          <ChatSammary task={selectedChannel} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Communications;
