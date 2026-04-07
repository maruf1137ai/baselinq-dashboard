import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChatSidebar } from "@/components/Communications/chatSidebar";
import ChatWindow from "@/components/Communications/chatWindow";
import ChatSammary from "@/components/Communications/chatSammary";
import useFetch from "@/hooks/useFetch";
import { useQueryClient } from "@tanstack/react-query";
import { postData } from "@/lib/Api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Communications = () => {
  const [projectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);
  const { data: channelsData, isLoading } = useFetch<any[]>(
    projectId ? `channels/?projectId=${projectId}` : ""
  );
  const channels = Array.isArray(channelsData) ? channelsData : [];
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const queryClient = useQueryClient();

  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !projectId) return;
    setIsCreating(true);
    try {
      const result = await postData({
        url: "channels/",
        data: {
          project: parseInt(projectId),
          name: newChannelName.trim(),
          description: newChannelDesc.trim(),
          channel_type: "public",
        },
      });
      queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${projectId}`] });
      setShowNewChannel(false);
      setNewChannelName("");
      setNewChannelDesc("");
      if (result) setSelectedChannel(result);
      toast.success("Channel created");
    } catch {
      toast.error("Failed to create channel. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectChannel = async (channel: any) => {
    setSelectedChannel(channel);

    if (channel?.id && channel.unread_count > 0) {
      try {
        await postData({
          url: `channels/${channel.id}/mark_read/`,
          data: {}
        });
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
      <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-2xl font-normal tracking-tight text-foreground">Communications</h1>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="border-r border-border bg-white flex-shrink-0">
            <ChatSidebar
              tasks={channels}
              isLoading={isLoading}
              selectedTask={selectedChannel}
              onSelectTask={handleSelectChannel}
              onNewChat={() => setShowNewChannel(true)}
            />
          </div>
          <div className="chatWindow flex-1">
            <ChatWindow
              channel={selectedChannel}
              projectName={projectName}
              taskDetails={taskDetails}
            />
          </div>
          <div className="chatSummary flex-shrink-0 w-[300px] min-w-[300px] border-l border-border overflow-hidden">
            <ChatSammary task={selectedChannel} />
          </div>
        </div>
      </div>
      <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
        <DialogContent className="sm:max-w-[420px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">New Channel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateChannel} className="space-y-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Channel Name</label>
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. Site Updates"
                className="h-10 text-sm"
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Description <span className="normal-case">(optional)</span></label>
              <Textarea
                value={newChannelDesc}
                onChange={(e) => setNewChannelDesc(e.target.value)}
                placeholder="What is this channel about?"
                className="resize-none h-20 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowNewChannel(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !newChannelName.trim()} className="bg-primary text-white hover:bg-primary/90">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Channel"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Communications;
