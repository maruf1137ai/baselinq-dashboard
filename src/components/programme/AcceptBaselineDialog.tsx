"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, History, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useProgrammeBaselines,
  useAcceptProgrammeBaseline,
  useProgrammeBaselineDiff,
} from "@/hooks/useMilestones";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd MMM yyyy, HH:mm");
  } catch {
    return "—";
  }
}

interface AcceptBaselineDialogProps {
  projectId: string | number | null;
}

export function AcceptBaselineDialog({ projectId }: AcceptBaselineDialogProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [fromVersionId, setFromVersionId] = useState<string>("");
  const [toVersionId, setToVersionId] = useState<string>("");

  const { data, isLoading } = useProgrammeBaselines(open ? projectId : null);
  const acceptMutation = useAcceptProgrammeBaseline(projectId);
  const baselines = useMemo(
    () => [...(data?.baselines ?? [])].sort((a, b) => b.version - a.version),
    [data]
  );

  const diffQuery = useProgrammeBaselineDiff(
    projectId,
    fromVersionId || null,
    toVersionId || null
  );

  async function handleAccept() {
    try {
      const baseline = await acceptMutation.mutateAsync({ label: label.trim() || undefined });
      toast.success(`Programme baseline v${baseline.version} accepted and sealed`);
      setLabel("");
    } catch {
      toast.error("Failed to accept programme baseline");
    }
  }

  const currentBaseline = baselines.find((b) => b.is_current);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setOpen(true)}>
        <History className="h-3.5 w-3.5" />
        {currentBaseline ? `Baseline v${currentBaseline.version}` : "Accept Baseline"}
      </Button>

      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Programme Baseline</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Accept a new baseline */}
          <div className="space-y-2 border border-border rounded-lg p-4">
            <div className="text-sm font-medium text-foreground">Accept current programme</div>
            <p className="text-xs text-muted-foreground">
              Freezes every phase's dates as the agreed plan. This never overwrites a previous
              baseline — it's sealed and recorded as a new version, so slippage can always be
              measured against it later.
            </p>
            <div className="flex items-end gap-2 pt-1">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="baseline-label">Label (optional)</Label>
                <Input
                  id="baseline-label"
                  placeholder="e.g. Re-baseline after site handover delay"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <Button onClick={handleAccept} disabled={acceptMutation.isPending}>
                {acceptMutation.isPending ? "Sealing..." : "Accept & Seal"}
              </Button>
            </div>
          </div>

          {/* Version history */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Version history</div>
            {isLoading && (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
            )}
            {!isLoading && baselines.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                No baseline accepted yet.
              </div>
            )}
            {!isLoading && baselines.length > 0 && (
              <div className="space-y-2">
                {baselines.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card">
                    <span className="text-sm font-medium text-foreground w-12 shrink-0">
                      v{b.version}
                    </span>
                    <span className="flex-1 text-sm text-muted-foreground truncate">
                      {b.label || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground w-40 shrink-0">
                      {formatDateTime(b.sealed_at)}
                    </span>
                    {b.integrity_verified ? (
                      <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" aria-label="Integrity verified" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" aria-label="Integrity check failed" />
                    )}
                    {b.is_current && (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-700 bg-green-50 border-green-200 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compare two versions */}
          {baselines.length >= 2 && (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="text-sm font-medium text-foreground">Compare versions</div>
              <div className="flex items-center gap-2">
                <Select value={fromVersionId} onValueChange={setFromVersionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="From version" />
                  </SelectTrigger>
                  <SelectContent>
                    {baselines.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        v{b.version} {b.label ? `— ${b.label}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground shrink-0">to</span>
                <Select value={toVersionId} onValueChange={setToVersionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="To version" />
                  </SelectTrigger>
                  <SelectContent>
                    {baselines.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        v{b.version} {b.label ? `— ${b.label}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {fromVersionId && toVersionId && (
                <div className="pt-2">
                  {diffQuery.isLoading && (
                    <div className="text-sm text-muted-foreground py-2">Comparing...</div>
                  )}
                  {!diffQuery.isLoading && diffQuery.data && (
                    <div className="space-y-2">
                      {diffQuery.data.milestones.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-2">
                          No differences between these versions.
                        </div>
                      ) : (
                        diffQuery.data.milestones.map((m, i) => (
                          <div
                            key={`${m.milestone_id ?? m.milestone_name}-${i}`}
                            className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm">
                            <div className="font-medium text-foreground">
                              {m.milestone_name}
                              {m.added && <span className="text-green-700 ml-2">(added)</span>}
                              {m.removed && <span className="text-red-700 ml-2">(removed)</span>}
                            </div>
                            {Object.entries(m.changes).map(([field, change]) => (
                              <div key={field} className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">{field}</span>:{" "}
                                {String(change.from ?? "—")} → {String(change.to ?? "—")}
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
