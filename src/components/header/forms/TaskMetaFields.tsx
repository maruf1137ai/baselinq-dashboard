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
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronsUpDown, Info, Search, X } from "lucide-react";
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
  /** Restrict the "To" picker's candidate list to members whose role code
   * (member.roleCode, from orgRoleInfo.code) is in this set, AND
   * auto-select into "To" once the team list loads. When more than one
   * candidate matches and `discipline` is given, prefers whoever's own
   * discipline tag (their ProjectTeamMember.discipline — e.g. "this
   * architect is our Fire & Safety consultant") matches it, mirroring
   * the backend's own get_project_users_by_discipline logic. Falls back
   * to the first role-matching candidate otherwise. Undefined = show
   * everyone, no auto-select, unchanged from before this existed. */
  toRoleFilter?: string[];
  /** Auto-check every project member whose role code is in this set into
   * CC, once, when the team-members list first loads — these are the
   * people with escalate/sign/close authority on this entity type, per
   * src/lib/roleGroups.ts. Additive: never removes a manual pick, and
   * never re-adds someone the user has deliberately removed afterward. */
  ccAutoRoles?: string[];
  /** The form's selected discipline (e.g. "Fire & Safety"), if it has
   * one — see toRoleFilter above for how it's used. */
  discipline?: string;
  /** SLA days for this entity type — mirrors the sla_days table in
   * tasks/views.py::create_task_for_entity (RFI 3, SI 5, VO 7, DC 14,
   * CPI 10, fallback 7 for anything else e.g. GI/IC). When set, "Date
   * Required" is pre-filled with today + this many days as soon as the
   * form loads, so what's shown here always matches the real deadline
   * that gets saved — previously the field showed an empty "Pick a
   * date" while this same default applied silently on the backend if
   * left untouched. Only sets it once, at mount; never overwrites a
   * date the user has since picked or changed. */
  defaultDueDays?: number;
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
  /** Shown next to the label behind a hover-triggered info icon, e.g.
   * explaining why this field came pre-filled. Omit to show no icon. */
  helpText?: string;
}

function UserPicker({ label, selected, members, multi = false, onSelect, onRemove, placeholder, helpText }: PickerProps) {
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
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal">{label}</Label>
        {helpText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Why these users are pre-selected for ${label}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="max-w-xs text-xs">
              {helpText}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
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
          className="p-0 bg-card shadow-lg border border-border rounded-xl overflow-hidden"
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
          {/* onWheel/onTouchMove stopPropagation: this popover is opened from
              inside a Sheet (Radix Dialog primitive), which applies a
              document-level scroll lock while open. Without stopping
              propagation here, that lock swallows wheel/touch scroll
              gestures over this list even though overflow-y-auto is set
              correctly — the list is scrollable, the gesture just never
              reaches it. */}
          <ul
            className="max-h-64 overflow-y-auto py-1"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground text-center">No users match this search</li>
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
                    className={`flex-shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selected_
                        ? "border-primary bg-primary"
                        : "border-border bg-background"
                    }`}
                  >
                    {selected_ && <span className="w-1.5 h-1.5 rounded-full bg-card" />}
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
                aria-label="Remove user"
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
  toRoleFilter,
  ccAutoRoles,
  discipline,
  defaultDueDays,
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
    // Backbone role code (e.g. "ARCH", "PM", "CQS") — from the user's
    // system Role, not the free-text project position label above. This
    // is what toRoleFilter / ccAutoRoles actually match against.
    roleCode: (m.orgRoleInfo?.code || m.user?.role?.code || "").toUpperCase(),
    // ProjectTeamMember.discipline — the specialist tag (e.g. "Fire &
    // Safety"), distinct from roleCode above.
    discipline: m.discipline || "",
  }));

  // "To" candidates are filtered to the roles who can legitimately fill
  // that slot for this entity type (e.g. only professionals for an RFI),
  // and exclude the current user — you can't address the request to
  // yourself. No filter provided = unchanged behavior, show everyone
  // (still excluding self, matching CC's existing rule below).
  const toMembers = (toRoleFilter
    ? members.filter((m) => toRoleFilter.includes(m.roleCode))
    : members
  ).filter((m) => !currentUserId || String(m.userId) !== currentUserId);

  // Auto-populate "To" and CC together, in ONE effect with ONE onChange
  // call. They used to be two separate effects, each reading `value`
  // from the same stale render and calling onChange independently —
  // whichever one committed second silently discarded the other's
  // update, because neither closure had seen the other's change yet.
  // Computing both fields' next values first and writing them in a
  // single onChange avoids that race entirely.
  //
  // "To" (single-select): prefers whoever's discipline tag matches the
  // form's selected discipline, else the first role-matching candidate.
  // Reactive to discipline changes (re-picks as it changes) until the
  // user manually touches "To" — toManuallySetRef makes that permanent.
  //
  // CC (multi-select, additive): every member matching ccAutoRoles,
  // excluding whoever ends up in "To" and excluding the current user
  // (you don't CC yourself, you're the creator). Fires once ever
  // (ccAutoAppliedRef) — never re-adds someone deliberately removed
  // afterward.
  //
  // Date Required: pre-filled with today + defaultDueDays, once, the
  // real SLA default so what's shown always matches what actually gets
  // saved if left untouched. Doesn't depend on members, so it applies
  // even before the team list has loaded.
  const toManuallySetRef = useRef(false);
  const ccAutoAppliedRef = useRef(false);
  const dateAutoAppliedRef = useRef(false);
  useEffect(() => {
    let nextTo = value.to;
    let nextCc = value.cc;
    let nextDate = value.dateRequired;

    if (members.length > 0) {
      if (!toManuallySetRef.current && toRoleFilter && toRoleFilter.length > 0 && toMembers.length > 0) {
        const disciplineMatch = discipline
          ? toMembers.find(
              (m) => (m.discipline || "").toLowerCase() === discipline.toLowerCase(),
            )
          : undefined;
        const best = disciplineMatch || toMembers[0];
        const currentId = value.to[0] && String(value.to[0].userId || value.to[0].id);
        if (currentId !== String(best.userId)) nextTo = [best];
      }

      if (!ccAutoAppliedRef.current && ccAutoRoles && ccAutoRoles.length > 0) {
        const toIds = new Set(nextTo.map((u) => String(u.userId || u.id)));
        const matches = members.filter(
          (m) =>
            ccAutoRoles.includes(m.roleCode) &&
            !toIds.has(String(m.userId)) &&
            (!currentUserId || String(m.userId) !== currentUserId),
        );
        if (matches.length > 0) {
          ccAutoAppliedRef.current = true;
          const existingIds = new Set(value.cc.map((u) => String(u.userId || u.id)));
          const toAdd = matches.filter((m) => !existingIds.has(String(m.userId)));
          if (toAdd.length > 0) nextCc = [...value.cc, ...toAdd];
        }
      }
    }

    if (!dateAutoAppliedRef.current && showDateRequired && defaultDueDays && !value.dateRequired) {
      dateAutoAppliedRef.current = true;
      const due = new Date();
      due.setDate(due.getDate() + defaultDueDays);
      nextDate = format(due, "yyyy-MM-dd");
    }

    if (nextTo !== value.to || nextCc !== value.cc || nextDate !== value.dateRequired) {
      onChange({ ...value, to: nextTo, cc: nextCc, dateRequired: nextDate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length, toMembers.length, toRoleFilter, ccAutoRoles, discipline, showDateRequired, defaultDueDays]);

  // Mutual exclusivity — whoever is in "To" must never also sit in CC.
  // Runs whenever "To" changes for any reason (manual pick, auto-select
  // above, or a clear), and strips that same user out of CC if they're
  // there. This is the one place that enforces the rule, rather than
  // trying to prevent every possible path that could add a duplicate —
  // simpler and correct regardless of which effect/handler fired first.
  useEffect(() => {
    if (value.to.length === 0) return;
    const toIds = new Set(value.to.map((u) => String(u.userId || u.id)));
    const hasOverlap = value.cc.some((u) => toIds.has(String(u.userId || u.id)));
    if (!hasOverlap) return;
    onChange({
      ...value,
      cc: value.cc.filter((u) => !toIds.has(String(u.userId || u.id))),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.to]);

  // CC candidates exclude the current user and whoever's currently in
  // "To" — so the To recipient can't be manually re-added to CC either
  // while they're still the "To" recipient.
  const ccMembers = members.filter(
    (m) =>
      (!currentUserId || String(m.userId) !== currentUserId) &&
      !value.to.some((u) => String(u.userId || u.id) === String(m.userId)),
  );

  const handleToSelect = (user: any) => {
    toManuallySetRef.current = true;
    onChange({ ...value, to: [user] });
  };

  const handleToRemove = () => {
    toManuallySetRef.current = true;
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
        members={toMembers}
        multi={false}
        onSelect={handleToSelect}
        onRemove={handleToRemove}
        placeholder="Select a user..."
        helpText={
          toRoleFilter
            ? "Pre-filled automatically based on role — this is who's expected to respond. Change it if a different person should reply."
            : undefined
        }
      />

      <UserPicker
        label="CC"
        selected={value.cc}
        members={ccMembers}
        multi={true}
        onSelect={handleCcSelect}
        onRemove={handleCcRemove}
        placeholder="Select a user..."
        helpText={
          ccAutoRoles
            ? "Added automatically because their role gives them authority to act on this item (e.g. approve, escalate, or close it). Remove anyone who doesn't need to be included."
            : undefined
        }
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
            <PopoverContent className="w-auto p-0" align="start">
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
