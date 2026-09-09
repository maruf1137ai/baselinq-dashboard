import { useState } from "react";
import { Search, SearchX, MessagesSquare, Plus, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SidebarFooter } from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import InviteMember from "../icons/InviteMember";
import { AwesomeLoader } from "../commons/AwesomeLoader";
import { DOC_TYPES, DOC_TYPE_LABEL } from "@/components/task/TaskFilterBar";

interface ChatSidebarProps {
  onNewChat: () => void;
  tasks: any[];
  isLoading?: boolean;
  selectedTask: any;
  onSelectTask: (task: any) => void;
}

export function ChatSidebar({ onNewChat, tasks, isLoading, selectedTask, onSelectTask }: ChatSidebarProps) {
  const [open, setOpen] = useState(true);
  // Empty array = no filter applied (everything matches) for each group.
  const [messageFilter, setMessageFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const taskTypeOptions = DOC_TYPES.filter((t) => t !== 'All');
  const typeCheckboxOptions = ['Private', ...taskTypeOptions];
  const statusCheckboxOptions = ['Open', 'Closed'];
  const messageCheckboxOptions = ['Unread'];

  const toggleInList = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const refinementCount =
    (typeFilter.length > 0 ? 1 : 0) +
    (statusFilter.length > 0 ? 1 : 0) +
    (messageFilter.length > 0 ? 1 : 0);

  // Sort by most-recent activity (newest first). Backend returns
  // `last_message_at` (latest chat message) and `updated_at` (any
  // channel-level change — title, members, etc.). We pick the more
  // recent of the two so a task that was renamed or had a new system
  // banner posted bubbles up alongside ones with fresh chat replies.
  // Falls back to `created_at` for brand-new channels with no activity.
  const channelActivityTs = (channel: any): number => {
    const candidates = [
      channel.last_message_at,
      channel.lastMessageAt,
      channel.updated_at,
      channel.updatedAt,
      channel.created_at,
      channel.createdAt,
    ];
    for (const c of candidates) {
      if (!c) continue;
      const t = new Date(c).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return 0;
  };

  const filteredTasks = tasks
    .filter(task => {
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

      // Task-type filter (multi-select; "Private" matches channels with no linked task)
      if (typeFilter.length > 0) {
        const matchesType =
          (isPrivate && typeFilter.includes('Private')) ||
          (!isPrivate && typeFilter.includes(task.taskType || ""));
        if (!matchesType) return false;
      }

      // Message filter
      if (messageFilter.includes('Unread') && !((task.unread_count || 0) > 0)) return false;

      // Status filter (Open/Closed) — multi-select
      if (statusFilter.length > 0 && !statusFilter.includes(task.status || "Open")) return false;

      return true;
    })
    .sort((a, b) => channelActivityTs(b) - channelActivityTs(a));

  return (
    <div
      className="h-full flex flex-col justify-between max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto w-[300px]">
      <div className="p-3">
        {open && (
          <>
            <button className="w-full rounded-lg flex items-center justify-center h-10 bg-card border border-border text-foreground text-sm font-normal gap-2 hover:bg-muted mb-4" onClick={onNewChat}>
              <Plus className="h-4 w-4" />New Message
            </button>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-card placeholder:text-muted-foreground border-border rounded-lg text-sm"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-1.5 px-3 h-10 rounded-lg text-xs border transition-colors shrink-0 ${refinementCount > 0
                      ? 'bg-primary/10 text-primary border-primary'
                      : 'bg-card text-foreground border-border hover:bg-muted/50'
                      }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                    {refinementCount > 0 && (
                      <span className="tabular-nums font-medium">{refinementCount}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <div className="space-y-1">
                      {typeCheckboxOptions.map((t) => (
                        <label key={t} className="flex items-center gap-2 text-xs text-foreground cursor-pointer px-1 py-1 rounded hover:bg-muted/50">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-border accent-primary"
                            checked={typeFilter.includes(t)}
                            onChange={() => toggleInList(typeFilter, setTypeFilter, t)}
                          />
                          {t === 'Private' ? 'Private Message' : (DOC_TYPE_LABEL[t] || t)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Status</label>
                    <div className="space-y-1">
                      {statusCheckboxOptions.map((s) => (
                        <label key={s} className="flex items-center gap-2 text-xs text-foreground cursor-pointer px-1 py-1 rounded hover:bg-muted/50">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-border accent-primary"
                            checked={statusFilter.includes(s)}
                            onChange={() => toggleInList(statusFilter, setStatusFilter, s)}
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Messages</label>
                    <div className="space-y-1">
                      {messageCheckboxOptions.map((m) => (
                        <label key={m} className="flex items-center gap-2 text-xs text-foreground cursor-pointer px-1 py-1 rounded hover:bg-muted/50">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-border accent-primary"
                            checked={messageFilter.includes(m)}
                            onChange={() => toggleInList(messageFilter, setMessageFilter, m)}
                          />
                          {m} only
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="py-20 flex items-center justify-center">
                  <AwesomeLoader message="Syncing" />
                </div>
              ) : filteredTasks.map((channel) => {
                const taskType = channel.taskType || "TSK";
                // Werner rev H — use the canonical doc number (channel.name,
                // e.g. "VO-012") that the backend generated from vo_number /
                // rfi_number / si_number. Previously we built a synthetic
                // "VO-043" from the Task PK padded to 3 digits, which
                // conflicted with the channel.name displayed alongside.
                const displayId = channel.taskId
                  ? (channel.name && /^[A-Z]+-\d+/.test(channel.name)
                      ? channel.name
                      : `${taskType}-${channel.taskId}`)
                  : null;

                // Use the entity subject/title (stored on channel.description)
                // when displayId already shows the canonical doc number,
                // otherwise fall back to the channel.name itself.
                const displayTitle = displayId && channel.description
                  ? channel.description
                  : (channel.name || "Direct Message");
                const count = channel.unread_count || 0;
                const isSelected = selectedTask?.id === channel.id;
                const status = channel.status || "Open";

                return (
                  <div
                    key={channel.id}
                    onClick={() => onSelectTask(channel)}
                    className={`py-3 px-4 rounded-lg cursor-pointer border relative transition-colors group
                      ${isSelected ? 'bg-muted/50 border-border' : 'bg-card hover:bg-muted/50 border-border'}
                    `}
                  >
                    {/* Header Row: ID/Title and Status */}
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-normal text-primary">
                        {displayId || "Private"}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ml-auto ${status === 'Open' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-muted text-muted-foreground'
                        }`}>
                        {status}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="text-sm text-foreground font-normal line-clamp-1 mb-1" title={displayTitle}>
                      {displayTitle}
                    </div>

                    {/* Footer - Description (hidden when it's already the title) */}
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-muted-foreground truncate max-w-[80%]">
                        {channel.description && channel.description !== displayTitle
                          ? channel.description
                          : "No details"}
                      </div>

                      {/* Sits in the footer row rather than absolutely at
                          top-2 right-2, which put it directly on top of the
                          status chip in the header row. */}
                      {count > 0 && (
                        <div
                          aria-label={`${count} unread`}
                          className="shrink-0 ml-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-primary rounded-full text-primary-foreground text-xs font-medium tabular-nums"
                        >
                          {count}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!isLoading && filteredTasks.length === 0 && (
                /* Was hand-rolled: two bare <p>s inheriting the wrapper's
                   `text-muted-foreground text-sm`, so this title rendered
                   grey and regular-weight while every other empty state in
                   the app draws its title in `text-foreground font-medium`.
                   That is the "different colour and boldness". */
                <EmptyState
                  variant="plain"
                  /* No `size="sm"`. This sits directly beside the chat pane's
                     own empty state on the same screen, and `sm` drops the
                     icon to 24px against the pane's 32px — two empty states a
                     few hundred pixels apart at different scales. `sm` is for
                     a genuinely tight container; a full-height 300px column
                     is not one. */
                  icon={searchQuery ? SearchX : MessagesSquare}
                  title={searchQuery ? "No channels match this search" : "No channels yet"}
                  description={
                    searchQuery
                      ? "Try the item reference, or clear the search."
                      : "Every instruction, RFI and variation gets its own channel."
                  }
                />
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
