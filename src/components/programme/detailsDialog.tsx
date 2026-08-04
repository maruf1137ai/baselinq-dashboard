"use client";

import { useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import type { Milestone as MilestoneType } from "@/hooks/useMilestones";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
};

const STATUS_BADGE: Record<string, string> = {
  planned: "text-gray-600 bg-muted border-border",
  in_progress: "text-purple-700 bg-purple-50 border-purple-200",
  completed: "text-green-600 bg-green-50 border-green-200",
  delayed: "text-red-600 bg-red-50 border-red-200",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

interface ViewDetailsDialogProps {
  milestone: MilestoneType;
  onEdit?: () => void;
  /** Custom trigger element. Defaults to a "View Full Details" button. */
  trigger?: ReactNode;
}

export function ViewDetailsDialog({ milestone, onEdit, trigger }: ViewDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  const pct = milestone.percentComplete;
  const hasBaseline = Boolean(milestone.baselineStart && milestone.baselineEnd);
  const startSlipped = hasBaseline && milestone.baselineStart !== milestone.startDate;
  const endSlipped = hasBaseline && milestone.baselineEnd !== milestone.endDate;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-transparent border border-border hover:bg-primary text-foreground hover:text-white transition-all">
            View Full Details
          </Button>
        )}
      </DialogTrigger>

      <DialogContent size="lg" className="p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>{milestone.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="item p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-2">Status</div>
                <Badge variant="outline" className={cn("text-sm", STATUS_BADGE[milestone.status])}>
                  {STATUS_LABELS[milestone.status] ?? milestone.status}
                </Badge>
              </div>
              <div className="item p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-2">Physical Progress</div>
                <div className="flex items-center gap-2">
                  {milestone.status === "delayed" && (
                    <TriangleAlert className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-xl text-foreground">
                    {pct !== null && pct !== undefined ? `${pct}%` : "Not tracked"}
                  </span>
                </div>
              </div>
            </div>

            <div className="item border border-border rounded-lg mt-4">
              <div className="p-6 flex gap-3">
                <div className="w-full">
                  <div className="title flex items-center gap-4 justify-between w-full">
                    <div className="flex items-center gap-4 text-base">Timeline</div>
                    {!hasBaseline && (
                      <span className="text-xs text-muted-foreground">
                        Not yet baselined — accept a programme to freeze these dates
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-5 mt-5">
                    <div className="item">
                      <div className="text-sm text-muted-foreground mb-1">Baseline Start</div>
                      <div
                        className={cn(
                          "text-base",
                          startSlipped ? "text-amber-600" : "text-foreground"
                        )}>
                        {hasBaseline ? formatDate(milestone.baselineStart) : "—"}
                      </div>
                    </div>
                    <div className="item">
                      <div className="text-sm text-muted-foreground mb-1">Baseline End</div>
                      <div
                        className={cn(
                          "text-base",
                          endSlipped ? "text-amber-600" : "text-foreground"
                        )}>
                        {hasBaseline ? formatDate(milestone.baselineEnd) : "—"}
                      </div>
                    </div>
                    <div className="item">
                      <div className="text-sm text-muted-foreground mb-1">Live Start</div>
                      <div className="text-base text-foreground">{formatDate(milestone.startDate)}</div>
                    </div>
                    <div className="item">
                      <div className="text-sm text-muted-foreground mb-1">Live End</div>
                      <div className="text-base text-foreground">{formatDate(milestone.endDate)}</div>
                    </div>
                    <div className="item">
                      <div className="text-sm text-muted-foreground mb-1">Actual Completion</div>
                      <div className="text-base text-foreground">{formatDate(milestone.actualEnd)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="item border border-border rounded-lg mt-4">
              <div className="p-6 flex gap-3">
                <div className="w-full">
                  <div className="progress">
                    <div className="flex justify-between items-center">
                      <div className="text-muted-foreground text-sm">Physical Progress</div>
                      <div className="text-foreground text-sm">
                        {pct !== null && pct !== undefined ? `${pct}%` : "Not tracked"}
                      </div>
                    </div>
                    <div className="bar bg-muted h-2 w-full rounded-full mt-2">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${pct ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-end border-t pt-4 mt-4">
            <div className="flex gap-2 w-full">
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  onEdit?.();
                }}>
                Edit Milestone
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
