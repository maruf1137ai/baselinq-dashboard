import { CircleCheck, CalendarIcon, Pencil, Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useMilestones,
  useUpdateMilestone,
  useDeleteMilestone,
  Milestone as MilestoneType,
} from "@/hooks/useMilestones";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "text-gray-600 bg-gray-100",
  in_progress: "text-purple-700 bg-purple-100",
  completed: "text-green-700 bg-green-100",
  delayed: "text-red-700 bg-red-100",
};

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

interface FormState {
  name: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  status: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  startDate: undefined,
  endDate: undefined,
  status: "planned",
};

// Reusable date picker field
function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd MMM yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface MilestoneProps {
  projectId: string | number | null;
  onAddMilestone?: () => void;
}

const Milestone = ({ projectId, onAddMilestone }: MilestoneProps) => {
  const { data: milestones = [], isLoading } = useMilestones(projectId);
  const updateMutation = useUpdateMilestone(projectId);
  const deleteMutation = useDeleteMilestone(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function openEdit(m: MilestoneType) {
    setEditingId(m._id);
    setForm({
      name: m.name,
      startDate: m.startDate ? parseISO(m.startDate) : undefined,
      endDate: m.endDate ? parseISO(m.endDate) : undefined,
      status: m.status,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error("Name, start date and end date are required");
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error("End date must be after start date");
      return;
    }

    const payload = {
      name: form.name,
      startDate: format(form.startDate, "yyyy-MM-dd"),
      endDate: format(form.endDate, "yyyy-MM-dd"),
      status: form.status,
    };

    try {
      await updateMutation.mutateAsync({ id: editingId!, data: payload as any });
      toast.success("Phase updated");
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch {
      toast.error("Failed to save phase");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Phase deleted");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Failed to delete phase");
    }
  }

  const isSaving = updateMutation.isPending;

  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b border-border">
        <span className="w-6 shrink-0" />
        <span className="flex-1">Phase / Milestone</span>
        <span className="w-28 shrink-0">Start Date</span>
        <span className="w-28 shrink-0">End Date</span>
        <span className="w-28 shrink-0">Status</span>
        <span className="w-16 shrink-0 flex justify-end">
          <Button size="sm" variant="outline" onClick={onAddMilestone} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading phases...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && milestones.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-lg">
          <CircleCheck className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No phases added yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Define programme phases to track contract costs by timeline
          </p>
          <Button size="sm" variant="outline" onClick={onAddMilestone} className="mt-4 gap-1.5">
            <Plus className="h-3 w-3" />
            Add first phase
          </Button>
        </div>
      )}

      {/* Milestone rows */}
      {!isLoading &&
        milestones.map((m) =>
          deleteConfirmId === m._id ? (
            <div
              key={m._id}
              className="flex items-center gap-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50">
              <span className="text-xs text-red-700 flex-1">
                Delete <strong>"{m.name}"</strong>? This cannot be undone.
              </span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => handleDelete(m._id)}
                disabled={deleteMutation.isPending}>
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div
              key={m._id}
              className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <CircleCheck
                className="h-4 w-4 shrink-0"
                style={{ color: m.status === "completed" ? "#10B981" : "#D1D5DB" }}
              />
              <span className="flex-1 text-sm text-foreground font-medium">{m.name}</span>
              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                {formatDate(m.startDate)}
              </span>
              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                {formatDate(m.endDate)}
              </span>
              <span className="w-28 shrink-0">
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium",
                    STATUS_COLORS[m.status]
                  )}>
                  {STATUS_LABELS[m.status]}
                </span>
              </span>
              <div className="w-16 shrink-0 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEdit(m)}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(m._id)}
                  className="text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Phase" : "Add Phase"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="phase-name">Phase Name *</Label>
              <Input
                id="phase-name"
                placeholder="e.g. Foundation Works"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* Start Date */}
            <DatePickerField
              label="Start Date *"
              value={form.startDate}
              onChange={(date) => setForm({ ...form, startDate: date })}
              placeholder="Select start date"
            />

            {/* End Date */}
            <DatePickerField
              label="End Date *"
              value={form.endDate}
              onChange={(date) => setForm({ ...form, endDate: date })}
              placeholder="Select end date"
            />

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); setEditingId(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingId ? "Update Phase" : "Create Phase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Milestone;
