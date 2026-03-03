import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarFooter } from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { Badge } from "@/components/ui/badge";
import InviteMember from "../icons/InviteMember";

interface ChatSidebarProps {
  onNewChat: () => void;
  tasks: any[];
  isLoading?: boolean;
  selectedTask: any;
  onSelectTask: (task: any) => void;
}

export function ChatSidebar({ onNewChat, tasks, isLoading, selectedTask, onSelectTask }: ChatSidebarProps) {
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTasks = tasks.filter(task => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const taskName = task.name?.toLowerCase() || "";
    const taskId = task.taskId ? String(task.taskId) : "";
    const matchesSearch = taskName.includes(searchLower) || taskId.includes(searchLower);

    if (!matchesSearch) return false;

    // Tab filter
    if (filter === 'All') return true;
    if (filter === 'Unread') return (task.unread_count || 0) > 0;
    return true;
  });

  return (
    <div
      className={`border-r h-full flex flex-col border-[#DEDEDE] transition-all justify-between max-h-[calc(100vh-65px)] overflow-y-auto ${open ? "w-80" : "w-16"
        }`}>
      <div className="p-3">
        {open && (
          <>
            <div className="flex items-center gap-1.5 mb-4">
              <div className="relative max-w-md flex-1 hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
                <Input
                  placeholder="Search Channels" // Changed from Search Channels
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#F7F7F7] py-[12px] placeholder:text-[#6B6B6B] border-[#EDEDED] rounded-[11px]"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
              {['All', 'Unread'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab as any)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filter === tab
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="flex flex-col gap-2 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="py-3 px-4 rounded-[8px] border border-[#F0F0F0] animate-pulse">
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-3 w-16 bg-gray-200 rounded" />
                        <div className="h-3 w-10 bg-gray-200 rounded-full" />
                      </div>
                      <div className="h-3.5 w-3/4 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredTasks.map((channel) => {
                const taskType = channel.taskType || "TSK";
                const displayId = channel.taskId
                  ? `${taskType}-${String(channel.taskId).padStart(3, '0')}`
                  : `# ${channel.name}`;
                const count = channel.unread_count || 0;
                const isSelected = selectedTask?.id === channel.id;
                const status = channel.status || "Open";

                return (
                  <div
                    key={channel.id}
                    onClick={() => onSelectTask(channel)}
                    className={`py-3 px-4 rounded-[8px] cursor-pointer border relative transition-colors group
                      ${isSelected ? 'bg-[#F3F4F6] border-gray-200' : 'bg-white hover:bg-[#F9FAFB] border-[#F0F0F0] hover:border-gray-200'}
                    `}
                  >
                    {/* Header Row: ID and Date/Status */}
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium text-gray-900">
                        {displayId}
                      </span>
                      {/* Using status as a badge-like element */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {status}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="text-sm text-gray-700 font-medium line-clamp-1 mb-1" title={channel.name}>
                      {channel.name}
                    </div>

                    {/* Footer: Count and optional snippet (if we had it) */}
                    <div className="flex justify-between items-center mt-1">
                      {/* You could put last message snippet here if available */}
                      <div className="text-xs text-gray-400 truncate max-w-[80%]">
                        {channel.description || "No specific details"}
                      </div>

                      {count > 0 && (
                        <div className="flex items-center justify-center min-w-[20px] h-[20px] px-1 bg-black rounded-full text-white text-[10px] font-medium">
                          {count}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!isLoading && filteredTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No channels found
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* <SidebarFooter className="p-3">
        {open ? (
          <button className="flex items-center gap-2 text-sm text-[#0D0D0D] hover:text-foreground w-full justify-center py-2">
            <InviteMember />
            <span>Add members</span>
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
