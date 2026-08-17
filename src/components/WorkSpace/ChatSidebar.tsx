import {
  Plus,
  PenSquare,
  MoreVertical,
  PanelLeft,
  Grid3x3,
  UserPlus,
  Search,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import SideBar from "../icons/SideBar";
import NewChat from "../icons/NewChat";
import Explorer from "../icons/Explorer";
import NewDoc from "../icons/NewDoc";
import InviteMember from "../icons/InviteMember";

import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { deleteData } from "@/lib/Api";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isToday, subDays, isAfter, parseISO } from "date-fns";
function SessionLabel({ label }: { label: string }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex-1 min-w-0 overflow-hidden text-left">
            <p className="truncate text-sm font-normal text-black">{label}</p>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-[#1B1C1F] text-white border-none py-1.5 px-3 max-w-[220px]">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ChatSession {
  id: number;
  /** 'task' = bound to a single task; 'project' = general project chat. */
  kind?: 'task' | 'project';
  /** Present on task chats only. */
  taskId?: number;
  /** Present on project chats only. */
  projectId?: number;
  taskTypeSlug: string;
  taskType: string;
  label: string;
  updatedAt: string;
}

interface GroupedSessions {
  period: string;
  items: ChatSession[];
}

interface ChatSidebarProps {
  onNewChat: () => void;
  open: boolean;
  onToggle: () => void;
}

export function ChatSidebar({ onNewChat, open, onToggle }: ChatSidebarProps) {
  const { taskId: currentTaskId, sessionId: currentSessionId } = useParams<{ taskId: string; sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);

  // Scope chat history to the selected project so a user working across
  // multiple projects doesn't see Project A's chats while in Project B.
  const projectId = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
  const chatSessionsQueryKey = `ai_analysis/chat-sessions/?project_id=${projectId}`;
  const { data: sessionsData, isLoading } = useFetch<{ sessions: ChatSession[] }>(
    projectId ? chatSessionsQueryKey : 'ai_analysis/chat-sessions/',
    { enabled: !!projectId }
  );

  const sessions = sessionsData?.sessions || [];

  const { mutate: deleteSession, isPending: isDeletingSession } = useMutation({
    mutationFn: (session: ChatSession) => deleteData({ url: `ai_analysis/session/${session.id}/`, data: undefined }),
    onSuccess: (_data, session) => {
      queryClient.invalidateQueries({ queryKey: [chatSessionsQueryKey] });
      toast.success('Chat deleted.');
      setSessionToDelete(null);
      // If the deleted chat is the one currently open, fall back to a
      // fresh/empty chat — same reset the "New Chat" button does below.
      if (session.kind === 'project' && projectId && String(session.id) === currentSessionId) {
        onNewChat();
        navigate(`/ai-workspace/project/${projectId}`);
      }
    },
    onError: () => {
      toast.error('Failed to delete chat. Please try again.');
    },
  });

  const groupedSessions: GroupedSessions[] = [
    {
      period: "Today",
      items: sessions.filter(s => isToday(parseISO(s.updatedAt))),
    },
    {
      period: "Previous 7 Days",
      items: sessions.filter(s => {
        const date = parseISO(s.updatedAt);
        return !isToday(date) && isAfter(date, subDays(new Date(), 7));
      }),
    },
    {
      period: "Previous 30 Days",
      items: sessions.filter(s => {
        const date = parseISO(s.updatedAt);
        return !isToday(date) && !isAfter(date, subDays(new Date(), 7)) && isAfter(date, subDays(new Date(), 30));
      }),
    },
  ].filter(group => group.items.length > 0);

  return (
    <div
      className="h-full flex flex-col border-r border-border w-[300px] shrink-0">
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            className="w-full rounded-lg flex items-center justify-center h-10 bg-card border border-border text-foreground text-sm font-medium gap-2 hover:bg-muted"
            onClick={() => {
              // "+ New Chat" starts a fresh general project chat. The project
              // route (no sessionId) triggers backend init, which assigns a
              // new session id and redirects the URL.
              if (projectId) {
                onNewChat();
                navigate(`/ai-workspace/project/${projectId}`);
              }
            }}
            disabled={!projectId}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-9 h-10 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground outline-none focus:border-border"
          />
        </div>
      </div>

      <SidebarContent className="flex-1">
        {open && (
          <div className="flex-1 !block" style={{ display: "block !important" }}>
            {isLoading ? (
              <AwesomeLoader compact message="Loading chats" />
            ) : (
              <div className="space-y-6 p-3">
                {groupedSessions.map((group) => (
                  <div key={group.period}>
                    <h3 className="mb-2 text-xs px-2 font-normal text-muted-foreground">
                      {group.period}
                    </h3>
                    <div className="space-y-0.5">
                      {group.items.map((session) => {
                        const isProjectChat = session.kind === 'project';
                        const targetUrl = isProjectChat
                          ? `/ai-workspace/project/${session.projectId}/${session.id}`
                          : `/ai-workspace/${session.taskTypeSlug}/${session.taskId}`;
                        const isActive = !isProjectChat && currentTaskId === String(session.taskId);
                        return (
                          <div
                            key={session.id}
                            className={`group relative flex items-center justify-between border border-transparent rounded-lg px-4 py-[10px] text-left text-sm transition-colors hover:bg-accent cursor-pointer ${isActive
                              ? "bg-muted/50 border-border"
                              : ""
                              }`} onClick={() => navigate(targetUrl)}>
                            <SessionLabel label={session.label} />
                            {isProjectChat && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSessionToDelete(session);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SidebarContent>

      {/* <SidebarFooter className=" p-3">
        {open ? (
          <button className="flex items-center gap-2 text-sm text-foreground hover:text-foreground">
            <InviteMember />
            <span>Invite users</span>
          </button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 mx-auto">
            <InviteMember />
          </Button>
        )}
      </SidebarFooter> */}

      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{sessionToDelete?.label}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSession}>Cancel</AlertDialogCancel>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={isDeletingSession}
              onClick={() => { if (sessionToDelete) deleteSession(sessionToDelete); }}
            >
              {isDeletingSession ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
