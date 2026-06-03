/**
 * Werner spec rev H — shared To / CC / Date Required block.
 *
 * Drops into any create-task form (RFI, SI, VO, GI, IC, Claim) so
 * every Werner-spec doc has the same recipient + cc + due-date pickers
 * matching Werner page 3.
 *
 * Outputs:
 *   to:           user[]  — the primary recipient (single-select)
 *   cc:           user[]  — cc'd users (multi-select)
 *   dateRequired: ISO yyyy-mm-dd string
 */
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronsUpDown, Search, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import useFetch from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface TaskMetaValue {
  to: any[];
  cc: any[];
  dateRequired: string;
}

interface Props {
  value: TaskMetaValue;
  onChange: (v: TaskMetaValue) => void;
  toLabel?: string;
  showDateRequired?: boolean;
}

function getInitial(name: string) {
  return (name || "?").charAt(0).toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm">
      {getInitial(name)}
    </span>
  );
}

interface PickerProps {
  label: string;
  selected: any[];
  members: any[];
  multi?: boolean;
  onSelect: (user: any) => void;
  onRemove: (userId: string) => void;
  placeholder: string;
}

function UserPicker({ label, selected, members, multi = false, onSelect, onRemove, placeholder }: PickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.role || "").toLowerCase().includes(q)
    );
  });

  const isSelected = (m: any) =>
    selected.some((s) => (s.userId || s.id) === (m.userId || m.id));

  const nameWithRole = (m: any) =>
    m.role ? `${m.name || m.email} — ${m.role}` : (m.name || m.email);

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : multi
      ? `${selected.length} selected`
      : nameWithRole(selected[0]) || placeholder;

  return (
    <div>
      <Label className="text-sm font-normal">{label}</Label>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-1 w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-input bg-background text-sm hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          >
            <span className={selected.length === 0 ? "text-muted-foreground" : "text-foreground"}>
              {triggerLabel}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 bg-white shadow-lg border border-border rounded-xl overflow-hidden"
          style={{ width: "var(--radix-popover-trigger-width)" }}
          align="start"
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* List */}
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground text-center">No users found</li>
            )}
            {filtered.map((m) => {
              const selected_ = isSelected(m);
              return (
                <li
                  key={m.userId || m.id}
                  onClick={() => {
                    onSelect(m);
                    if (!multi) setOpen(false);
                    setSearch("");
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors"
                >
                  <Avatar name={m.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-normal text-foreground truncate">
                      {m.name || m.email}
                      {m.role && (
                        <span className="text-muted-foreground"> — {m.role}</span>
                      )}
                    </p>
                    {m.email && (
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    )}
                  </div>
                  {/* Radio for single-select, checkbox circle for multi */}
                  <span
                    className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selected_
                        ? "border-primary bg-primary"
                        : "border-border bg-background"
                    }`}
                  >
                    {selected_ && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>

      {/* Selected chips (CC only — To shows inline in trigger) */}
      {multi && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((u) => (
            <span
              key={u.userId || u.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-foreground border border-border"
            >
              {u.name}
              {u.role && (
                <span className="text-muted-foreground">— {u.role}</span>
              )}
              <button
                type="button"
                onClick={() => onRemove(u.userId || u.id)}
                className="hover:bg-border rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskMetaFields({
  value,
  onChange,
  toLabel = "To (recipient)",
  showDateRequired = true,
}: Props) {
  const projectId =
    typeof window !== "undefined"
      ? localStorage.getItem("selectedProjectId") || ""
      : "";

  const { data: teamData } = useFetch<any>(
    projectId ? `projects/${projectId}/team-members/` : "",
    { enabled: !!projectId },
  );

  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ? String(currentUser.id) : "";

  const members: any[] = (teamData?.teamMembers || []).map((m: any) => ({
    userId: m.user_id || m.userId || m.user?.id,
    name: m.user?.name || m.name || m.user?.email || "",
    email: m.user?.email || m.email || "",
    role:
      m.roleName ||
      m.orgRoleName ||
      m.orgRoleInfo?.name ||
      m.user?.role?.name ||
      m.role ||
      m.role_info?.name ||
      "",
  }));

  const handleToSelect = (user: any) => {
    // single-select — replace To, and auto-append the same user to CC
    // if they aren't already there. The user can still remove them from
    // CC manually if they don't want the duplicate notification.
    const userKey = String(user.userId || user.id);
    const alreadyInCc = value.cc.some(
      (u) => String(u.userId || u.id) === userKey,
    );
    onChange({
      ...value,
      to: [user],
      cc: alreadyInCc ? value.cc : [...value.cc, user],
    });
  };

  const handleToRemove = () => {
    onChange({ ...value, to: [] });
  };

  const handleCcSelect = (user: any) => {
    const already = value.cc.some((u) => (u.userId || u.id) === (user.userId || user.id));
    if (already) {
      onChange({ ...value, cc: value.cc.filter((u) => (u.userId || u.id) !== (user.userId || user.id)) });
    } else {
      onChange({ ...value, cc: [...value.cc, user] });
    }
  };

  const handleCcRemove = (userId: string) => {
    onChange({ ...value, cc: value.cc.filter((u) => (u.userId || u.id) !== userId) });
  };

  return (
    <>
      <UserPicker
        label={toLabel}
        selected={value.to}
        members={members}
        multi={false}
        onSelect={handleToSelect}
        onRemove={handleToRemove}
        placeholder="Select a user..."
      />

      <UserPicker
        label="CC"
        selected={value.cc}
        members={members.filter(
          (m) => !currentUserId || String(m.userId) !== currentUserId,
        )}
        multi={true}
        onSelect={handleCcSelect}
        onRemove={handleCcRemove}
        placeholder="Select a user..."
      />

      {showDateRequired && (
        <div>
          <Label className="text-sm font-normal">Date Required</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !value.dateRequired && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.dateRequired
                  ? format(parseISO(value.dateRequired), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={value.dateRequired ? parseISO(value.dateRequired) : undefined}
                onSelect={(d) =>
                  onChange({
                    ...value,
                    dateRequired: d ? format(d, "yyyy-MM-dd") : "",
                  })
                }
                disabled={(d) => d < new Date(new Date().toDateString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground mt-1">
            Deadline by which a response is required.
          </p>
        </div>
      )}
    </>
  );
}

/**
 * Helper called after the entity is created — applies the meta fields
 * to the auto-created Task wrapper so notifications + due-date land
 * on the right row.
 */
export async function applyMetaToTask(
  taskId: number | string,
  meta: TaskMetaValue,
  patchRequest: (args: { url: string; data: any }) => Promise<any>,
) {
  const updatePayload: any = {};
  if (meta.to.length > 0) {
    updatePayload.assigned_to = meta.to.map((u) => u.userId || u.id);
  }
  if (meta.cc.length > 0) {
    updatePayload.response_by = meta.cc.map((u) => u.userId || u.id);
  }
  if (meta.dateRequired) {
    updatePayload.due_date = meta.dateRequired;
  }
  if (Object.keys(updatePayload).length === 0) return;
  try {
    await patchRequest({
      url: `tasks/tasks/${taskId}/`,
      data: updatePayload,
    });
  } catch (err) {
    console.error("Failed to apply task meta:", err);
  }
}
