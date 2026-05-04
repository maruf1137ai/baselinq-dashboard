import { CalendarIcon } from "lucide-react";
import React, { useState } from "react";
import { format } from "date-fns";
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
import { useCreateMilestone } from "@/hooks/useMilestones";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
};

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
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd MMM yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => { onChange(date); setOpen(false); }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface AddPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | number | null;
}

const EMPTY = { name: "", startDate: undefined as Date | undefined, endDate: undefined as Date | undefined, status: "planned" };

export function AddPhaseDialog({ open, onOpenChange, projectId }: AddPhaseDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const createMutation = useCreateMilestone(projectId);

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
    try {
      await createMutation.mutateAsync({
        name: form.name,
        startDate: format(form.startDate, "yyyy-MM-dd"),
        endDate: format(form.endDate, "yyyy-MM-dd"),
        status: form.status,
      });
      toast.success("Phase created");
      setForm(EMPTY);
      onOpenChange(false);
    } catch {
      toast.error("Failed to create phase");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setForm(EMPTY); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Phase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
          <DatePickerField
            label="Start Date *"
            value={form.startDate}
            onChange={(d) => setForm({ ...form, startDate: d })}
            placeholder="Select start date"
          />
          <DatePickerField
            label="End Date *"
            value={form.endDate}
            onChange={(d) => setForm({ ...form, endDate: d })}
            placeholder="Select end date"
          />
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); setForm(EMPTY); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Create Phase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
