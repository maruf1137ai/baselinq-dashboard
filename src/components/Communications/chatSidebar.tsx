import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarFooter } from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { Badge } from "@/components/ui/badge";
import InviteMember from "../icons/InviteMember";
import { AwesomeLoader } from "../commons/AwesomeLoader";

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
    const taskIdString = task.taskId ? String(task.taskId) : "";
    const isPrivate = !task.taskId;
    const matchesSearch =
      taskName.includes(searchLower) ||
      taskIdString.includes(searchLower) ||
      (isPrivate && "private".includes(searchLower));

    if (!matchesSearch) return false;

    // Tab filter
    if (filter === 'All') return true;
    if (filter === 'Unread') return (task.unread_count || 0) > 0;
    return true;
  });

  return (
    <div
      className="h-full flex flex-col justify-between max-h-[calc(100vh-65px)] overflow-y-auto w-[300px]">
      <div className="p-3">
        {open && (
          <>
            <button className="w-full rounded-lg flex items-center justify-center h-10 bg-white border border-border text-foreground text-sm font-normal gap-2 hover:bg-muted mb-4" onClick={onNewChat}>
              <Plus className="h-4 w-4" />New Message
            </button>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-white placeholder:text-muted-foreground border-border rounded-lg text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="py-20 flex items-center justify-center">
                  <AwesomeLoader message="Syncing" />
                </div>
              ) : filteredTasks.map((channel) => {
                const taskType = channel.taskType || "TSK";
                // For task-linked channels, show the reference. For others, derive a meaningful title.
                const displayId = channel.taskId
                  ? `${taskType}-${String(channel.taskId).padStart(3, '0')}`
                  : null;

                const displayTitle = channel.name || "Direct Message";
                const count = channel.unread_count || 0;
                const isSelected = selectedTask?.id === channel.id;
                const status = channel.status || "Open";

                return (
                  <div
                    key={channel.id}
                    onClick={() => onSelectTask(channel)}
                    className={`py-3 px-4 rounded-lg cursor-pointer border relative transition-colors group
                      ${isSelected ? 'bg-sidebar border-border' : 'bg-white hover:bg-sidebar border-border'}
                    `}
                  >
                    {/* Header Row: ID/Title and Status */}
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-normal text-primary">
                        {displayId || "Private"}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ml-auto ${['Done', 'Approved', 'Completed', 'Closed', 'Verified', 'Acknowledged', 'EOT Awarded'].includes(status) ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-muted text-muted-foreground'
                        }`}>
                        {status}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="text-sm text-foreground font-normal line-clamp-1 mb-1" title={displayTitle}>
                      {displayTitle}
                    </div>

                    {/* Footer - Description */}
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-muted-foreground truncate max-w-[80%]">
                        {channel.description || "No details"}
                      </div>

                      {count > 0 && (
                        <div className="absolute top-2 right-2 flex items-center justify-center min-w-[20px] h-[20px] px-1 bg-primary rounded-full text-white text-xs font-normal">
                          {count}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!isLoading && filteredTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No channels found
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* <SidebarFooter className="p-3">
        {open ? (
          <button className="flex items-center gap-2 text-sm text-foreground hover:text-foreground w-full justify-center py-2">
            <InviteMember />
            <span>Add users</span>
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
