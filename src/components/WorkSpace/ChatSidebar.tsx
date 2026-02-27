import { useState } from "react";
import {
  Plus,
  PenSquare,
  MoreVertical,
  PanelLeft,
  Grid3x3,
  UserPlus,
  MoreHorizontal,
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
import { isToday, subDays, isAfter, parseISO } from "date-fns";

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
}

export function ChatSidebar({ onNewChat }: ChatSidebarProps) {
  const { taskId: currentTaskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

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
      className={`border-r h-full flex flex-col border-[#DEDEDE] transition-all ${open ? "w-64" : "w-16"
        }`}>
      <div className=" p-3">
        <div
          className={`flex items-center ${open ? "justify-between" : "justify-center"
            } gap-2`}>
          <button
            className="w-[50px] rounded-lg flex items-center justify-center h-10 bg-[#F9F9F9] shrink-0"
            onClick={setOpen.bind(null, !open)}>
            <SideBar />
          </button>
          {/* {open && (
            <button
              className="w-[50px] rounded-lg flex items-center justify-center h-10 bg-[#F9F9F9] shrink-0"
              onClick={onNewChat}>
              <NewChat />
            </button>
          )} */}
        </div>
        {open && (
          <>
            {/* <div className="mt-5 flex px-2 items-center gap-2 text-sm">
              <Explorer />
              <span className="font-medium text-sm">Explore Base</span>
            </div> */}
            <button
              onClick={onNewChat}
              className="mt-3 w-full flex items-center justify-center  border border-[#CBD5E1] text-sm gap-2 bg-[#8081F6] text-primary-foreground rounded-[8px] py-2.5 hover:bg-primary/90">
              <NewDoc />
              Create New Chat
            </button>
          </>
        )}
        {!open && (
          <div className="mt-3 flex flex-col items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNewChat}>
              <PenSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <SidebarContent className="flex-1">
        {open && (
          <div className="flex-1 !block" style={{ display: "block !important" }}>
            <div className="space-y-6 p-3">
              {groupedSessions.map((group) => (
                <div key={group.period}>
                  <h3 className="mb-2 text-xs px-2 font-normal text-[#676767]">
                    {group.period}
                  </h3>
                  <div className="space-y-0.5">
                    {group.items.map((session) => (
                      <div
                        key={session.id}
                        className={`group relative flex items-center justify-between border border-transparent rounded-[8px] px-4 py-[10px] text-left text-sm transition-colors hover:bg-accent cursor-pointer ${currentTaskId === String(session.taskId)
                          ? "bg-[#F3F2F0] border-[#E8E8E8]"
                          : ""
                          }`} onClick={() => navigate(`/ai-workspace/${session.taskTypeSlug}/${session.taskId}`)}>
                        <button

                          className="flex-1 min-w-0 overflow-hidden text-left">
                          <p className="truncate text-[13px] font-normal text-black">
                            {session.label}
                          </p>
                        </button>
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
          </div>
        )}
      </SidebarContent>

      {/* <SidebarFooter className=" p-3">
        {open ? (
          <button className="flex items-center gap-2 text-sm text-[#0D0D0D] hover:text-foreground">
            <InviteMember />
            <span>Invite members</span>
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
