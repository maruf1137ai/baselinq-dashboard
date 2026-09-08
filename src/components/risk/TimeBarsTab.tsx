/**
 * Notice deadlines (contractual time bars).
 *
 * Presentation is deliberately restrained. A time bar is legally consequential
 * — under JBCC/NEC/FIDIC a late notice can forfeit an otherwise good claim —
 * so the UI states the calculation and the date, and never tells the user
 * their claim is lost or instructs them to serve. Where the clause reference
 * could not be verified against the contract corpus we say so, rather than
 * showing a number we guessed.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Plus, ShieldAlert, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeCountdown, TONE_CLASS, type Countdown } from "@/lib/timeBarCountdown";

// A time bar is drawn ONLY once its deadline has passed (PR#56's rule).
// describeCountdown's tone still distinguishes urgent/soon at the lib
// level — other consumers may want that gradient — but this tab
// deliberately renders both as neutral so nothing is coloured before the
// breach has actually happened; a notice period with days left has not
// been missed.
const badgeClass = (tone: Countdown["tone"]) =>
  tone === "urgent" || tone === "soon" ? TONE_CLASS.closed : TONE_CLASS[tone];

interface TimeBar {
  id: number;
  label: string;
  clock_type: string;
  contract_form: string;
  clause_ref: string;
  clause_verified: boolean;
  awareness_date: string;
  duration: number;
  unit: string;
  deadline_date: string;
  /**
   * Counted in `days_remaining_unit` — for every JBCC clock that is WORKING
   * days, on the South African working-day calendar including the builders'
   * annual shutdown. Nullable in the type because a countdown we did not
   * receive must be handled, not assumed.
   */
  days_remaining: number | null;
  /** "working" | "calendar". Always travels with `days_remaining`. */
  days_remaining_unit?: string | null;
  /**
   * The countdown as a finished sentence — "12 working days remaining",
   * "3 working days overdue", "due today". Published by the backend
   * (`TimeBarClock.days_remaining_label`) expressly so that no client ever
   * pairs the number with a unit itself. Rendered verbatim below.
   */
  days_remaining_label?: string | null;
  status: string;
  notes: string;
}

export default function TimeBarsTab({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [awarenessDate, setAwarenessDate] = useState("");
  const [contractForm, setContractForm] = useState("JBCC");

  const { data, isLoading, isError, refetch } = useFetch<{ time_bars: TimeBar[] }>(
    `projects/${projectId}/time-bars/`
  );
  const { mutateAsync: post } = usePost();
  const { canManageTimeBars } = usePermissions();

  const bars = data?.time_bars ?? [];

  const create = async () => {
    if (!awarenessDate) {
      toast.error("Confirm the date the responsible party became aware");
      return;
    }
    try {
      const res: any = await post({
        url: `projects/${projectId}/time-bars/`,
        data: { awareness_date: awarenessDate, contract_form: contractForm },
      });
      toast.success(`${res?.created?.length ?? 0} deadline(s) now being tracked`);
      setOpen(false);
      setAwarenessDate("");
      refetch();
    } catch {
      toast.error("Could not create the deadlines");
    }
  };

  const serve = async (id: number) => {
    try {
      await post({ url: `time-bars/${id}/serve/`, data: {} });
      toast.success("Recorded as served");
      refetch();
    } catch {
      toast.error("Could not update");
    }
  };

  const cancel = async (id: number) => {
    try {
      await post({ url: `time-bars/${id}/cancel/`, data: {} });
      toast.success("Deadline cancelled");
      refetch();
    } catch {
      toast.error("Could not update");
    }
  };

  return (
    <div className="space-y-4">
      {/* The explanation sits on a surface of its own rather than floating on
          the page background — it is a standing caveat, not a caption. */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Contractual notice deadlines. Under JBCC, NEC and FIDIC certain notices are
          conditions precedent — served late, the claim can be lost regardless of merit.
          Baselinq tracks the dates; it does not serve notices or determine entitlement.
        </p>
        <Button size="sm" className="shrink-0" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Track deadline
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading notice deadlines</span>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : isError ? (
        /* An outage must never render as the empty state. "No deadlines
           tracked" and "we could not load your deadlines" are opposite
           statements, and on a page about forfeiture the wrong one costs a
           claim. */
        <EmptyState
          icon={ShieldAlert}
          title="Notice deadlines could not be loaded"
          description="The deadlines could not be read. Nothing below has been checked."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : bars.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No deadlines tracked"
          description="Add one when an event occurs that may lead to a claim."
        />
      ) : (
        <div className="space-y-3">
          {bars.map(bar => {
            const countdown = describeCountdown(bar);
            return (
            <div key={bar.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{bar.label}</p>
                    {bar.clause_verified ? (
                      <Badge variant="outline" className="text-xs">
                        {bar.contract_form} {bar.clause_ref}
                      </Badge>
                    ) : (
                      // Never show a guessed clause number.
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground gap-1"
                        title="Clause could not be verified against the contract corpus"
                      >
                        <ShieldQuestion className="h-3 w-3" />
                        {bar.contract_form} · clause unverified
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bar.duration} {bar.unit} days from confirmed awareness on{" "}
                    {bar.awareness_date} → due <strong>{bar.deadline_date}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap",
                    badgeClass(countdown.tone)
                  )}>
                    {countdown.text}
                  </span>
                  {bar.status === "open" && (
                    canManageTimeBars ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => serve(bar.id)}>
                          Mark served
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancel(bar.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      // Backend says this viewer can't serve/cancel a notice
                      // clock (risk.timebar.manage). Name who can act instead
                      // of showing a button that would 403.
                      <span
                        className="text-xs text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full"
                        title="Only the PM or Principal Agent can mark this served or cancel it."
                      >
                        Awaiting PM / Principal Agent
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track notice deadlines</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-foreground">Contract form</label>
              <Select value={contractForm} onValueChange={setContractForm}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JBCC">JBCC</SelectItem>
                  <SelectItem value="NEC4">NEC4</SelectItem>
                  <SelectItem value="FIDIC">FIDIC</SelectItem>
                  <SelectItem value="GCC">GCC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-foreground">Date of awareness</label>
              <Input
                type="date"
                className="mt-1.5"
                value={awarenessDate}
                onChange={e => setAwarenessDate(e.target.value)}
              />
              {/* "Becoming aware" is a question of fact — the user must own it. */}
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                The date the responsible party became, or ought reasonably to have
                become, aware of the event. This is a question of fact — confirm it
                with your contract administrator. Baselinq calculates from the date
                you enter; it does not infer it.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Track deadlines</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
