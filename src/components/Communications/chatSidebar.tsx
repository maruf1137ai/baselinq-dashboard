import { useState } from "react";
import {
  Plus,
  PenSquare,
  MoreVertical,
  PanelLeft,
  Grid3x3,
  UserPlus,
  MoreHorizontal,
  Search,
  Command,
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
import { Input } from "../ui/input";

interface ChatSidebarProps {
  onNewChat: () => void;
  tasks: any[];
  selectedTask: any;
  onSelectTask: (task: any) => void;
}

export function ChatSidebar({ onNewChat, tasks, selectedTask, onSelectTask }: ChatSidebarProps) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={`border-r h-full flex flex-col border-[#DEDEDE] transition-all justify-between max-h-[calc(100vh-65px)] overflow-y-auto ${open ? "w-64" : "w-16"
        }`}>
      <div className=" p-3">
        {/* Toggle button commented out in original, keeping it that way or as is */}

        {open && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="relative max-w-md flex-1 hidden md:block ">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
                <Input
                  placeholder="Search Channels"
                  className="pl-10 bg-[#F7F7F7] py-[12px] placeholder:text-[#6B6B6B] border-[#EDEDED] rounded-[11px]"
                />
                {/* <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-sm text-muted-foreground border border-[#EDEDED] bg-white p-[9px] rounded-[9px]">
                <Command color="#000" className="h-[14px] w-[14px]" />
                <span>K</span>
              </div> */}
              </div>
              <button className="py-[15px] border rounded-[9px] px-[15px]">
                <UserPlus size={14} />
              </button>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              {tasks.map((task) => {
                const displayId = task.type ? `${task.type}-${task.id.slice(0, 4)}` : `Task-${task.id.slice(0, 4)}`;
                const count = task.chat?.length || 0;
                const isSelected = selectedTask?.id === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`py-3.5 px-4 rounded-[8px] cursor-pointer border relative
                      ${isSelected ? 'bg-[#F3F4F6] border-[#E8E8E8]' : 'bg-white border-transparent hover:bg-[#F3F4F6] border-[#E8E8E8]'}
                    `}>
                    {count > 0 && (
                      <div className="py-[2px] px-2 bg-black rounded-full inline-block text-white absolute top-2 right-2 text-xs">
                        {count}
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      <div className="title text-black text-sm">{displayId}</div>
                      <div className="title text-[#4B5563] text-sm line-clamp-2">
                        {task.title}
                      </div>
                      <div className="title text-[#6B7280] text-xs">
                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Date'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <SidebarFooter className=" p-3">
        {open ? (
          <button className="flex items-center gap-2 text-sm text-[#0D0D0D] hover:text-foreground">
            <InviteMember />
            <span>Add members</span>
          </button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 mx-auto">
            <InviteMember />
          </Button>
        )}
      </SidebarFooter>
    </div>
  );
}
