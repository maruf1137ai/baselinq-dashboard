import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChatSidebar } from "@/components/Communications/chatSidebar";
import ChatWindow from "@/components/Communications/chatWindow";
import ChatSammary from "@/components/Communications/chatSammary";
import useFetch from "@/hooks/useFetch";
import { useQueryClient } from "@tanstack/react-query";
import { postData, fetchData } from "@/lib/Api";
import { Loader2, Check, X, Hash, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const Communications = () => {
  const [projectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  const { data: channelsData, isLoading } = useFetch<any[]>(
    projectId ? `channels/?projectId=${projectId}` : ""
  );
  const channels = Array.isArray(channelsData) ? channelsData : [];
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  // Messages lifted out of ChatWindow so the right-side summary panel can
  // derive shared attachments/links from the same poll (no second fetch).
  const [channelMessages, setChannelMessages] = useState<any[]>([]);
  const queryClient = useQueryClient();

  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Member selection state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false);

  // Fetch team members when modal opens
  useEffect(() => {
    if (!showNewChannel || !projectId) return;
    fetchData(`projects/${projectId}/team-members/`).then((res: any) => {
      const members: any[] = res?.teamMembers || res?.results || (Array.isArray(res) ? res : []);
      setTeamMembers(members);
    }).catch(() => { });
  }, [showNewChannel, projectId]);

  // Members available to add (exclude creator and already-selected)
  const availableMembers = useMemo(() => {
    const selectedIds = new Set(selectedMembers.map((m: any) => parseInt(m.user_id || m.user?.id)));
    return teamMembers.filter((m: any) => {
      const uid = parseInt(m.user_id || m.user?.id);
      return uid !== currentUser.id && !selectedIds.has(uid);
    });
  }, [teamMembers, selectedMembers, currentUser.id]);

  const removeMember = (userId: number) => {
    setSelectedMembers(prev => prev.filter((m: any) => parseInt(m.user_id || m.user?.id) !== userId));
  };

  const resetModal = () => {
    setNewChannelName("");
    setNewChannelDesc("");
    setSelectedMembers([]);
    setMemberPopoverOpen(false);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !projectId) return;
    setIsCreating(true);
    try {
      const memberIds = selectedMembers.map((m: any) => parseInt(m.user_id || m.user?.id));
      const result = await postData({
        url: "channels/",
        data: {
          project: parseInt(projectId),
          name: newChannelName.trim(),
          description: newChannelDesc.trim(),
          channel_type: "private",
          member_ids: memberIds,
        },
      });
      queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${projectId}`] });
      setShowNewChannel(false);
      resetModal();
      if (result) setSelectedChannel(result);
      toast.success("Channel created");
    } catch {
      toast.error("Failed to create channel. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectChannel = async (channel: any) => {
    if (!channel?.id) return;

    // Set initial channel from list first for immediate UI response
    setSelectedChannel(channel);

    try {
      // Fetch full details including members
      const fullChannel = await fetchData(`channels/${channel.id}/`);
      if (fullChannel) {
        setSelectedChannel(fullChannel);
      }
    } catch (err) {
      console.error("Failed to fetch full channel details", err);
    }

    if (channel.unread_count > 0) {
      try {
        await postData({
          url: `channels/${channel.id}/mark_read/`,
          data: {}
        });
        queryClient.invalidateQueries({ queryKey: [projectId ? `channels/?projectId=${projectId}` : ""] });
        window.dispatchEvent(new Event("notifications-marked-read"));
      } catch (err) {
        console.error("Failed to mark channel as read", err);
      }
    }
  };

  // Auto-select channel from URL param (?channel=5) — used by notification deep links
  const channelParamId = searchParams.get("channel");
  useEffect(() => {
    if (!channels.length) return;
    if (channelParamId) {
      const target = channels.find((c: any) => String(c.id) === channelParamId);
      if (target) {
        handleSelectChannel(target);
        setSearchParams({}, { replace: true }); // clean up URL
      }
    } else if (!selectedChannel) {
      handleSelectChannel(channels[0]);
    }
  }, [channels, channelParamId]);

  // Clear shared-files data when switching channels so stale attachments
  // don't flash before the new channel's messages load.
  useEffect(() => {
    setChannelMessages([]);
  }, [selectedChannel?.id]);

  const { data: projectData } = useFetch(projectId ? `projects/${projectId}/` : "");
  const projectName = projectData?.name || "Project";

  const { data: taskDetails } = useFetch(
    selectedChannel?.taskId ? `tasks/tasks/${selectedChannel.taskId}/` : null,
    { enabled: !!selectedChannel?.taskId }
  );

  return (
    <DashboardLayout padding="p-0">
      <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
        {/* Header inset matches the canonical 24px top padding used by every
            other page (Tasks/Compliance/Meetings/Documents). DashboardLayout
            uses padding="p-0" here because the chat below needs full-bleed —
            so we apply the canonical 24px on the header itself. */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h1 className="text-2xl font-normal tracking-tight text-foreground">Communications</h1>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="border-r border-border bg-card flex-shrink-0">
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
              onMessagesChange={setChannelMessages}
            />
          </div>
          <div className="chatSummary flex-shrink-0 w-[300px] min-w-[300px] border-l border-border overflow-hidden">
            <ChatSammary task={selectedChannel} messages={channelMessages} />
          </div>
        </div>
      </div>
      {showNewChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#f0edff] flex items-center justify-center">
                  <Hash className="h-4 w-4 text-[#6c5ce7]" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-[#1a1a2e]">New Channel</h3>
                  <p className="text-xs text-[#9ca3af]">Create a new communication channel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowNewChannel(false); resetModal(); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#374151] hover:bg-muted transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateChannel} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Channel Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-normal text-[#6b7280]">Channel Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. Site Updates"
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-xs text-[#374151] bg-muted/50 focus:outline-none focus:border-[#6c5ce7] focus:bg-card transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-normal text-[#6b7280]">Description <span className="text-[#9ca3af]">(optional)</span></label>
                  <textarea
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    placeholder="What is this channel about?"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-xs text-[#374151] bg-muted/50 focus:outline-none focus:border-[#6c5ce7] focus:bg-card transition-all resize-none"
                  />
                </div>

                {/* Members */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-normal text-[#6b7280]">Users</label>

                  <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/50 hover:bg-card hover:border-[#6c5ce7] transition-all text-left">
                        <span className="text-xs text-[#9ca3af]">Add users…</span>
                        <ChevronsUpDown className="h-4 w-4 text-[#9ca3af] shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search users…" className="text-xs" />
                        <CommandList>
                          <CommandEmpty className="text-xs text-[#9ca3af] py-4 text-center">No users match this search</CommandEmpty>
                          <CommandGroup>
                            {availableMembers.map((m: any) => {
                              const uid = parseInt(m.user_id || m.user?.id);
                              const name: string = m.user?.name || m.name || m.user?.email || "Unknown";
                              const email: string = m.user?.email || m.email || "";
                              return (
                                <CommandItem
                                  key={uid}
                                  value={name + " " + email}
                                  onSelect={() => {
                                    setSelectedMembers(prev => [...prev, m]);
                                    setMemberPopoverOpen(false);
                                  }}
                                  className="cursor-pointer px-3 py-2.5">
                                  <div className="flex items-center gap-2.5 w-full">
                                    <div className="w-8 h-8 rounded-full bg-[#6c5ce7] flex items-center justify-center text-white text-xs shrink-0">
                                      {(name).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#374151]">{name}</p>
                                      <p className="text-xs text-[#9ca3af]">{email}</p>
                                    </div>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Selected members + creator pill */}
                  {(selectedMembers.length > 0 || currentUser.id) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {/* Creator — locked */}
                      {currentUser.id && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f0edff] border border-[#d6d3ff] text-xs text-[#6c5ce7]">
                          <div className="h-4 w-4 rounded-full bg-[#6c5ce7] flex items-center justify-center text-white text-xs shrink-0">
                            {(currentUser.name || currentUser.email || "Y").charAt(0).toUpperCase()}
                          </div>
                          <span>{currentUser.name || currentUser.email || "You"}</span>
                          <span className="text-xs opacity-60">(you)</span>
                        </div>
                      )}
                      {/* Selected members */}
                      {selectedMembers.map((m: any) => {
                        const uid = parseInt(m.user_id || m.user?.id);
                        const name: string = m.user?.name || m.name || m.user?.email || "Unknown";
                        return (
                          <div key={uid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border text-xs text-[#374151]">
                            <div className="h-4 w-4 rounded-full bg-[#6c5ce7] flex items-center justify-center text-white text-xs shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span>{name}</span>
                            <button
                              aria-label="Remove member"
                              type="button"
                              onClick={() => removeMember(uid)}
                              className="ml-0.5 text-[#9ca3af] hover:text-[#374151] transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/50 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowNewChannel(false); resetModal(); }}
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg text-xs text-[#6b7280] hover:text-[#374151] hover:bg-muted transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newChannelName.trim()}
                  className="px-5 py-2 rounded-lg text-xs text-white font-normal flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ background: "linear-gradient(135deg, #6c5ce7, #5a4bd1)" }}>
                  {isCreating ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</>
                  ) : (
                    <><Check className="h-4 w-4" /> Create Channel</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Communications;
