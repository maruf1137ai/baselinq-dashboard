import {
  Plus,
  PenSquare,
  MoreVertical,
  PanelLeft,
  Grid3x3,
  UserPlus,
  MoreHorizontal,
  Search,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import SideBar from "../icons/SideBar";
import NewChat from "../icons/NewChat";
import Explorer from "../icons/Explorer";
import NewDoc from "../icons/NewDoc";
import InviteMember from "../icons/InviteMember";

import { useNavigate, useParams } from "react-router-dom";
import useFetch from "@/hooks/useFetch";
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
  taskId: number;
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
  const { taskId: currentTaskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const { data: sessionsData, isLoading } = useFetch<{ sessions: ChatSession[] }>("ai_analysis/chat-sessions/");

  const sessions = sessionsData?.sessions || [];

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

  const handleChatAction = (action: string, chatId: number) => {
    console.log(`${action} chat ${chatId}`);
  };

  return (
    <div
      className="h-full flex flex-col border-r border-border w-[300px] shrink-0">
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            className="w-full rounded-lg flex items-center justify-center h-10 bg-white border border-border text-foreground text-sm font-medium gap-2 hover:bg-muted"
            onClick={onNewChat}>
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-9 h-10 bg-white border border-border rounded-lg text-sm placeholder:text-muted-foreground outline-none focus:border-border"
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
                      {group.items.map((session) => (
                        <div
                          key={session.id}
                          className={`group relative flex items-center justify-between border border-transparent rounded-lg px-4 py-[10px] text-left text-sm transition-colors hover:bg-accent cursor-pointer ${currentTaskId === String(session.taskId)
                            ? "bg-sidebar border-border"
                            : ""
                            }`} onClick={() => navigate(`/ai-workspace/${session.taskTypeSlug}/${session.taskId}`)}>
                          <SessionLabel label={session.label} />
                          {/* <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal
                                color="#676767"
                                className="h-3.5 w-3.5"
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleChatAction("Rename", session.id)
                              }>
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleChatAction("Share", session.id)
                              }>
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleChatAction("Delete", session.id)
                              }
                              className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu> */}
                        </div>
                      ))}
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
    </div>
  );
}
