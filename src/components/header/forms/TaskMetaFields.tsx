/**
 * Werner spec rev H — shared To / CC / Date Required block.
 *
 * Drops into any create-task form (RFI, SI, VO, GI, IC, Claim) so
 * every Werner-spec doc has the same recipient + cc + due-date pickers
 * matching Werner page 3.
 *
 * Outputs:
 *   to:           user[]  — the primary recipient(s)
 *   cc:           user[]  — cc'd users
 *   dateRequired: ISO yyyy-mm-dd string
 *
 * Parent forms wire `applyMetaToTask(taskId, metaFields)` after the
 * entity is created so the auto-Task gets the right assigned_to /
 * response_by / due_date.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UserPlus, X } from "lucide-react";
import useFetch from "@/hooks/useFetch";

export interface TaskMetaValue {
  to: any[];
  cc: any[];
  dateRequired: string;
}

interface Props {
  value: TaskMetaValue;
  onChange: (v: TaskMetaValue) => void;
  /** "To (recipient)" or "To (contractor)" depending on doc type. */
  toLabel?: string;
  /** Render the Date Required row? Some forms (DC) already have their own. */
  showDateRequired?: boolean;
}

export function TaskMetaFields({
  value,
  onChange,
  toLabel = "To (recipient)",
  showDateRequired = true,
}: Props) {
  const [toOpen, setToOpen] = useState(false);
  const [ccOpen, setCcOpen] = useState(false);

  const projectId =
    typeof window !== "undefined"
      ? localStorage.getItem("selectedProjectId") || ""
      : "";
  const { data: teamData } = useFetch<any>(
    projectId ? `projects/${projectId}/team-members/` : "",
    { enabled: !!projectId },
  );
  const members: any[] = teamData?.teamMembers || [];

  const setTo = (to: any[]) => onChange({ ...value, to });
  const setCc = (cc: any[]) => onChange({ ...value, cc });
  const setDate = (dateRequired: string) =>
    onChange({ ...value, dateRequired });

  const renderPicker = (
    selected: any[],
    setSelected: (v: any[]) => void,
    open: boolean,
    setOpen: (v: boolean) => void,
    placeholder: string,
    chipStyle: "primary" | "muted",
  ) => (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      {selected.map((u) => (
        <span
          key={u.userId || u.id}
          className={
            chipStyle === "primary"
              ? "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
              : "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-foreground border border-border"
          }
        >
          {u.name}
          <button
            type="button"
            onClick={() =>
              setSelected(
                selected.filter(
                  (x) => (x.userId || x.id) !== (u.userId || u.id),
                ),
              )
            }
            className={
              chipStyle === "primary"
                ? "hover:bg-primary/20 rounded"
                : "hover:bg-border rounded"
            }
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <UserPlus className="h-3 w-3" />
            {selected.length === 0 ? placeholder : "Add more"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search team members…" />
            <CommandList>
              <CommandEmpty>No members found</CommandEmpty>
              <CommandGroup>
                {members
                  .filter(
                    (m) =>
                      !selected.some(
                        (s) => (s.userId || s.id) === (m.userId || m.id),
                      ),
                  )
                  .map((m) => (
                    <CommandItem
                      key={m.userId || m.id}
                      onSelect={() => {
                        setSelected([...selected, m]);
                        setOpen(false);
                      }}
                    >
                      {m.name}
                      {m.role && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({m.role})
                        </span>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <>
      <div>
        <Label>{toLabel}</Label>
        {renderPicker(value.to, setTo, toOpen, setToOpen, "Pick recipient", "primary")}
      </div>

      <div>
        <Label>CC</Label>
        {renderPicker(value.cc, setCc, ccOpen, setCcOpen, "Pick CC users", "muted")}
      </div>

      {showDateRequired && (
        <div>
          <Label>Date Required</Label>
          <Input
            type="date"
            className="mt-1"
            value={value.dateRequired}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Deadline by which a response is required. Drives reminders + auto-escalation.
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
    // Don't block the create flow — log and move on.
    // The entity is created; the meta failed to attach.
    // eslint-disable-next-line no-console
    console.error("Failed to apply task meta:", err);
  }
}
