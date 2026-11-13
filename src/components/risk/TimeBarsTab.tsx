/**
 * Notice deadlines (contractual time bars).
 *
 * Presentation is deliberately restrained. A time bar is legally consequential
 * — under JBCC/NEC/FIDIC a late notice can forfeit an otherwise good claim —
 * so the UI states the calculation and the date, and never tells the user
 * their claim is lost or instructs them to serve. Where the clause reference
 * could not be verified against the contract corpus we say so, rather than
 * showing a number we guessed.
 *
 * Deadlines are shown by EVENT: what happened, then its clocks, with the JBCC
 * notice for time and notice for money side by side and a warning in the
 * group when only one of the two has been served. Urgency is coloured one way
 * — nearest is loudest (`TONE_VARIANT`) — and closed events sit apart, below.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CalendarClock, Plus, ShieldAlert, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeCountdown, isLiveStatus, TONE_VARIANT } from "@/lib/timeBarCountdown";
import {
  formatDay, groupTimeBars, serverMessage, serviceSummary, todayIso,
  type ContractFormInfo, type TimeBar, type TimeBarGroup,
} from "@/lib/timeBarEvents";
import RecordServiceDialog from "@/components/risk/RecordServiceDialog";

const PAIR_NAME = { time: "Notice for time", money: "Notice for money" } as const;

export default function TimeBarsTab({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, refetch } = useFetch<{
    time_bars: TimeBar[];
    contract_form?: ContractFormInfo;
  }>(`projects/${projectId}/time-bars/`);
  const { mutateAsync: post } = usePost();
  const { canManageTimeBars, canRecordTimeBarService } = usePermissions();

  const bars = data?.time_bars ?? [];
  const groups = groupTimeBars(bars);
  const live = groups.filter((g) => g.live);
  const closed = groups.filter((g) => !g.live);
  const contract = data?.contract_form ?? null;
  const recipient = contract?.notice_recipient ?? null;

  // ── Track a deadline ───────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [awarenessDate, setAwarenessDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (creating) return;
    if (!eventDescription.trim()) {
      toast.error("Say what happened, so the deadlines can be tied to the event");
      return;
    }
    if (!awarenessDate) {
      toast.error("Confirm the date the responsible party became aware");
      return;
    }
    setCreating(true);
    try {
      // No contract form is sent: the server always counts under the
      // project's own form, and has ignored the request's since it stopped
      // choosing the contract.
      const res = (await post({
        url: `projects/${projectId}/time-bars/`,
        data: { awareness_date: awarenessDate, event_description: eventDescription.trim() },
      })) as { created?: unknown[] } | undefined;
      const n = Array.isArray(res?.created) ? res.created.length : 0;
      if (n === 0) {
        toast.warning("No new deadlines were created. Check the list before tracking this event again.");
      } else {
        toast.success(`${n} deadline${n === 1 ? "" : "s"} now tracked`);
      }
      setOpen(false);
      setAwarenessDate("");
      setEventDescription("");
      refetch();
    } catch (e) {
      toast.error(serverMessage(e, "The deadlines could not be created."));
    } finally {
      setCreating(false);
    }
  };

  // ── Record service ─────────────────────────────────────────────────────
  const [serving, setServing] = useState<TimeBar | null>(null);

  // ── Withdraw a mistaken service record ─────────────────────────────────
  const [withdrawing, setWithdrawing] = useState<TimeBar | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const withdraw = async () => {
    if (!withdrawing || !withdrawReason.trim() || withdrawBusy) return;
    setWithdrawBusy(true);
    try {
      await post({ url: `time-bars/${withdrawing.id}/unserve/`, data: { reason: withdrawReason.trim() } });
      toast.success("Service record withdrawn. The deadline is live again.");
      setWithdrawing(null);
      setWithdrawReason("");
      refetch();
    } catch (e) {
      toast.error(serverMessage(e, "The service record could not be withdrawn."));
    } finally {
      setWithdrawBusy(false);
    }
  };

  // Cancelling a deadline is a decision about a claim — "there is no money
  // claim" closes the JBCC notice for money (cl 26.5) that starts with every
  // notice for time — so it says why, and the record keeps the reason.
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const cancel = async () => {
    if (cancelling === null || !cancelReason.trim() || cancelBusy) return;
    setCancelBusy(true);
    try {
      await post({ url: `time-bars/${cancelling}/cancel/`, data: { reason: cancelReason.trim() } });
      toast.success("Deadline cancelled");
      setCancelling(null);
      setCancelReason("");
      refetch();
    } catch (e) {
      toast.error(serverMessage(e, "The deadline could not be cancelled."));
    } finally {
      setCancelBusy(false);
    }
  };

  // "Principal agent" reads "the principal agent" mid-sentence; a defined term
  // written in title case ("Project Manager") keeps its capitals.
  const recipientPhrase = !recipient
    ? "the other party"
    : /[A-Z]/.test(recipient.slice(1))
      ? `the ${recipient}`
      : `the ${recipient.toLowerCase()}`;

  const renderBar = (bar: TimeBar) => {
    const countdown = describeCountdown(bar);
    const liveBar = isLiveStatus(bar.status);
    const service = bar.service ?? null;
    return (
      <div
        key={bar.id}
        className={cn(
          "rounded-lg border border-border p-3",
          liveBar ? "bg-card" : "bg-muted/40",
        )}
        data-testid={`time-bar-${bar.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {bar.pair_role && (
                <span className="text-xs font-medium text-muted-foreground">{PAIR_NAME[bar.pair_role]}</span>
              )}
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
              {formatDay(bar.awareness_date)} → due <strong>{formatDay(bar.deadline_date)}</strong>
              {bar.forfeits === false && <> · No forfeiture of its own on this step</>}
            </p>
          </div>
          <Badge variant={TONE_VARIANT[countdown.tone]} className="whitespace-nowrap shrink-0">
            {countdown.text}
          </Badge>
        </div>

        {bar.status === "served" && (
          <p className="text-xs text-foreground mt-2" data-testid="service-line">
            {serviceSummary(service)}
            {service?.timing && (
              <>
                {" "}
                <span className={cn("font-medium", service.timing.on_time ? "text-green-700" : "text-red-700")}>
                  {service.timing.label}.
                </span>
              </>
            )}
            {service?.reference ? <span className="text-muted-foreground"> {service.reference}</span> : null}
            {service?.document?.visible && service.document.id ? (
              <>
                {" "}
                <a className="underline underline-offset-2" href={`/documents/${service.document.id}`}>
                  {service.document.reference} · {service.document.name}
                </a>
              </>
            ) : service?.document ? (
              <span className="text-muted-foreground"> A document is linked that you cannot open.</span>
            ) : null}
            {service?.recorded_by && (
              <span className="text-muted-foreground"> Recorded by {service.recorded_by}.</span>
            )}
          </p>
        )}

        {bar.status === "cancelled" && (
          <p className="text-xs text-muted-foreground mt-2">
            Cancelled{bar.cancelled_at ? ` on ${formatDay(bar.cancelled_at)}` : ""}
            {bar.cancelled_by ? ` by ${bar.cancelled_by}` : ""}
            {bar.cancellation_reason ? `: ${bar.cancellation_reason}` : "."}
          </p>
        )}

        {bar.status !== "served" && bar.last_withdrawal && (
          <p className="text-xs text-muted-foreground mt-2">
            A service record{bar.last_withdrawal.served_on ? ` (served ${formatDay(bar.last_withdrawal.served_on)})` : ""}{" "}
            was withdrawn on {formatDay(bar.last_withdrawal.at)}
            {bar.last_withdrawal.by ? ` by ${bar.last_withdrawal.by}` : ""}: {bar.last_withdrawal.reason}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap mt-3">
          {liveBar && (
            canRecordTimeBarService ? (
              <Button variant="outline" size="sm" onClick={() => setServing(bar)}>
                Record service…
              </Button>
            ) : (
              // Under JBCC the contractor serves the notice on the principal
              // agent. This viewer holds neither risk.timebar.serve nor
              // manage, so say who serves on whom instead of a button that
              // would 403 — never "awaiting the PA", which inverts the contract.
              <span
                className="text-xs text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-md"
                title="The contractor, the PM or the principal agent can record service."
              >
                The contractor serves this notice on {recipientPhrase}
              </span>
            )
          )}
          {liveBar && canManageTimeBars && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelling(bar.id)}
              className="text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200"
            >
              Cancel deadline…
            </Button>
          )}
          {bar.status === "served" && canRecordTimeBarService && (
            <Button variant="ghost" size="sm" onClick={() => setWithdrawing(bar)}>
              Undo service record…
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderGroup = (g: TimeBarGroup) => (
    <section
      key={g.key}
      className={cn("border border-border rounded-xl p-4 space-y-3", g.live ? "bg-card" : "bg-muted/30")}
      aria-label={g.description || `Event aware ${formatDay(g.awarenessDate)}`}
    >
      <div>
        <p className={cn("text-sm", g.description ? "text-foreground font-medium" : "text-muted-foreground")}>
          {g.description || "No description of the event was recorded."}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Aware {formatDay(g.awarenessDate)}</p>
      </div>

      {g.halfServed && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <p>
            <strong>Served for {g.halfServed.served}, not for {g.halfServed.missing}.</strong>{" "}
            The notice for {g.halfServed.missing}{" "}
            {g.halfServed.open.status === "lapsed" || (g.halfServed.open.days_remaining ?? 0) < 0 ? "was" : "is"} due
            by {formatDay(g.halfServed.open.deadline_date)}
            {g.halfServed.open.days_remaining_label ? ` (${g.halfServed.open.days_remaining_label})` : ""} and is
            not recorded as served. Each notice forfeits on its own. If there is no {g.halfServed.missing} claim,
            {canManageTimeBars ? " cancel" : " the PM or principal agent can cancel"} that notice with the reason.
          </p>
        </div>
      )}

      {g.pair.length > 0 && (
        <div className={cn("grid gap-3", g.pair.length === 2 && "md:grid-cols-2")}>{g.pair.map(renderBar)}</div>
      )}
      {g.others.length > 0 && <div className="space-y-3">{g.others.map(renderBar)}</div>}
    </section>
  );

  const today = todayIso();
  const awarenessInFuture = Boolean(awarenessDate) && awarenessDate > today;

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
        {/* Not permission-gated, by design: logging when someone became aware
            of an event is a contemporaneous fact any project member may record
            (user/migrations/0064). Only service and cancellation are gated. */}
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
        <div className="space-y-6">
          {live.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Live ({live.length})</h3>
              {live.map(renderGroup)}
            </div>
          )}
          {closed.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Served or cancelled ({closed.length})</h3>
              {closed.map(renderGroup)}
            </div>
          )}
        </div>
      )}

      <RecordServiceDialog
        bar={serving}
        projectId={projectId}
        defaultRecipient={recipient}
        onClose={() => setServing(null)}
        onRecorded={() => refetch()}
      />

      <Dialog open={withdrawing !== null} onOpenChange={(v) => !v && !withdrawBusy && setWithdrawing(null)}>
        <DialogContent aria-describedby="withdraw-service-description">
          <DialogHeader>
            <DialogTitle>Undo the service record</DialogTitle>
            <DialogDescription id="withdraw-service-description">
              For a record made in error. The deadline goes back to live, or to deadline passed if its date
              is behind it. The record you withdraw, your name and your reason stay in the history.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="withdraw-reason">Why is it being withdrawn?</Label>
            <Textarea
              id="withdraw-reason"
              className="mt-1.5"
              rows={2}
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="Recorded against the wrong event"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawing(null)} disabled={withdrawBusy}>Keep it</Button>
            <Button variant="destructive" onClick={withdraw} disabled={!withdrawReason.trim() || withdrawBusy}>
              {withdrawBusy ? "Withdrawing…" : "Withdraw record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelling !== null} onOpenChange={(v) => !v && !cancelBusy && setCancelling(null)}>
        <DialogContent aria-describedby="cancel-deadline-description">
          <DialogHeader>
            <DialogTitle>Cancel this deadline</DialogTitle>
            <DialogDescription id="cancel-deadline-description">
              Baselinq stops tracking it and sends no more reminders. A cancelled deadline cannot be reopened;
              track the event again if it is needed.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Say why it is no longer needed — for example, there is no money claim, so the notice for
            expense and loss is not being served. The reason stays on the record.
          </p>
          <div>
            <Label htmlFor="cancel-reason">Reason</Label>
            <Input
              id="cancel-reason"
              className="mt-1.5"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="No money claim"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)} disabled={cancelBusy}>Keep it</Button>
            <Button variant="destructive" onClick={cancel} disabled={!cancelReason.trim() || cancelBusy}>
              {cancelBusy ? "Cancelling…" : "Cancel deadline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => !creating && setOpen(v)}>
        <DialogContent aria-describedby="track-deadline-description">
          <DialogHeader>
            <DialogTitle>Track notice deadlines</DialogTitle>
            <DialogDescription id="track-deadline-description">
              {contract?.form
                ? `Counted under ${contract.form}, the project's contract form.`
                : contract?.error ?? "Counted under the project's contract form."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="time-bar-event">What happened</Label>
              <Textarea
                id="time-bar-event"
                className="mt-1.5"
                rows={3}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Site possession given three weeks late; no access to the east wing"
              />
            </div>
            <div>
              <Label htmlFor="time-bar-awareness">Date of awareness</Label>
              <Input
                id="time-bar-awareness"
                type="date"
                className="mt-1.5"
                max={today}
                value={awarenessDate}
                onChange={(e) => setAwarenessDate(e.target.value)}
                aria-invalid={awarenessInFuture ? true : undefined}
              />
              {awarenessInFuture && (
                <p className="text-xs text-red-700 mt-1.5">The date of awareness cannot be in the future.</p>
              )}
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>Cancel</Button>
            <Button
              onClick={create}
              disabled={
                creating || !eventDescription.trim() || !awarenessDate || awarenessInFuture || Boolean(contract?.error)
              }
            >
              {creating ? "Tracking…" : "Track deadlines"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
