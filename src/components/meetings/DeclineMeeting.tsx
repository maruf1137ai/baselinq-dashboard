import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMeetingRsvp } from "@/hooks/useMeetingRsvp";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

/** Same limit as the server (meetings/views.py DECLINE_REASON_MAX). */
const MAX_REASON = 500;

/**
 * Declining a meeting invite, with the reason the organiser will see.
 * The reason is required: a decline used to change one RSVP row and tell
 * nobody why (bug, 19 Nov 2026).
 */
export function DeclineReasonForm({
  meetingId,
  onDone,
  onCancel,
  compact = false,
}: {
  meetingId: number | string;
  onDone?: () => void;
  onCancel: () => void;
  /** Smaller controls, for the notification bell. */
  compact?: boolean;
}) {
  const [reason, setReason] = useState("");
  const { mutate, isPending } = useMeetingRsvp(meetingId);
  const trimmed = reason.trim();

  const submit = () => {
    if (!trimmed) return;
    mutate(
      { status: "declined", reason: trimmed },
      {
        onSuccess: () => {
          toast.success("Meeting declined. The organiser has been told why.");
          onDone?.();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Failed to decline the meeting.")),
      },
    );
  };

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <label htmlFor={`decline-reason-${meetingId}`} className={compact ? "text-xs text-foreground" : "text-sm text-foreground"}>
        Reason for declining *
      </label>
      <Textarea
        id={`decline-reason-${meetingId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
        placeholder="e.g. On site at Block C all day"
        className={compact ? "min-h-[60px] text-xs" : "min-h-[96px]"}
        autoFocus
      />
      <p className="text-xs text-muted-foreground">
        The organiser is notified, and everyone on the meeting can see this. {reason.length}/{MAX_REASON}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" className={compact ? "h-7 text-xs" : undefined} onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className={compact ? "h-7 text-xs" : undefined}
          onClick={submit}
          disabled={!trimmed || isPending}
        >
          {isPending ? "Declining..." : "Decline meeting"}
        </Button>
      </div>
    </div>
  );
}

export function DeclineMeetingDialog({
  meetingId,
  meetingTitle,
  open,
  onOpenChange,
  onDeclined,
}: {
  meetingId: number | string;
  meetingTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeclined?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline {meetingTitle ? `"${meetingTitle}"` : "this meeting"}?</DialogTitle>
        </DialogHeader>
        {open && (
          <DeclineReasonForm
            meetingId={meetingId}
            onCancel={() => onOpenChange(false)}
            onDone={() => {
              onOpenChange(false);
              onDeclined?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
