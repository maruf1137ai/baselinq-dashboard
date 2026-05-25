/**
 * Werner spec — single Request Info row with inline response handling.
 *
 * Renders one row of the Action Requests card. When the current user is
 * the recipient AND the request hasn't been answered, shows a Respond
 * button. When answered, shows the response text inline + a Resolved
 * badge.
 *
 * On submit, POSTs to /api/tasks/request-task-info/{id}/respond/, which
 * also advances the parent RFI from "Further Info Required" to
 * "Response Provided" if applicable.
 */
import { useState } from "react";
import { CheckCircle, Reply } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { postData } from "@/lib/Api";

interface ActionRequest {
  id: number | string;
  senderName: string;
  senderId?: number | string;
  recipient: string;                  // joined names string for display
  recipientIds?: Array<string>;       // all recipient user ids (primary + CC)
  recipientList?: Array<{
    userId?: string | number;
    name?: string;
    email?: string;
    isPrimary?: boolean;
  }>;
  task: string;
  date: string | null;
  responseText: string | null;
  respondedBy: { id?: number; name?: string; email?: string } | null;
  respondedAt: string | null;
  status: "Pending" | "Responded";
}

interface Props {
  request: ActionRequest;
  /** Current user id — used to determine if the Respond button should appear. */
  currentUserId?: number | string;
  /** Refresh callbacks. */
  onChanged: () => void | Promise<void>;
}

export function RequestInfoResponseRow({ request, currentUserId, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Werner spec — any user in the recipient list (primary or CC) can
  // respond. First-come-first-served — once one of them answers, the
  // request is resolved for everyone.
  const recipientIds = (request.recipientIds || []).map(String);
  const isRecipient =
    currentUserId !== undefined && recipientIds.includes(String(currentUserId));
  const isResponded = request.status === "Responded";
  const canRespond = isRecipient && !isResponded;
  const canSubmit = responseText.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await postData({
        url: `tasks/request-task-info/${request.id}/respond/`,
        data: { response_text: responseText.trim() },
      });
      toast.success("Response submitted.");
      setResponseText("");
      setOpen(false);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not submit response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 bg-white border rounded-lg">
      <div className="flex items-start gap-4">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {request.senderName
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 text-xs space-y-1">
        <div className="text-xs text-black capitalize">{request.senderName}</div>
        <div className="text-xs text-muted-foreground" title={request.recipient}>
          To: {request.recipient}
        </div>
        <p className="text-xs text-black mt-1">{request.task}</p>
        {request.date && (
          <p className="text-xs text-muted-foreground mt-1">
            Due {new Date(request.date).toLocaleDateString()}
          </p>
        )}

        {/* Werner spec — full-width Respond button under the due date,
            matching the "Request Info" trigger style at the bottom of
            the card. Only shown for recipients of unanswered requests. */}
        

        {/* Response shown inline once submitted. */}
        {isResponded && request.responseText && (
          <div className="mt-3 border-l-2 border-green-500 bg-green-50/40 px-3 py-2 rounded-r">
            <div className="text-[11px] uppercase tracking-wide text-green-700 mb-1">
              Response
            </div>
            <p className="text-xs text-foreground whitespace-pre-wrap">
              {request.responseText}
            </p>
            {request.respondedBy && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Responded by {request.respondedBy.name}
                {request.respondedAt && ` · ${new Date(request.respondedAt).toLocaleString()}`}
              </p>
            )}
          </div>
        )}
      </div>
      

      <div className="flex flex-col items-end gap-2 shrink-0">
        {isResponded ? (
          <Badge className="bg-green-50 text-green-700 py-1.5 px-3 hover:bg-green-50 border-green-200 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        ) : (
          <Badge className="bg-amber-50 text-amber-600 py-1.5 px-3 hover:bg-orange-50 border-amber-200 text-xs">
            Pending
          </Badge>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Request</DialogTitle>
            <DialogDescription>
              Reply directly to <span className="font-medium">{request.senderName}</span>'s
              request. For RFIs, this also moves the doc to{" "}
              <span className="font-medium">Response Provided</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="bg-muted/30 rounded-md p-3 text-sm">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                Their question
              </div>
              <p className="whitespace-pre-wrap text-foreground">{request.task}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Your response
              </label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your response here…"
                rows={5}
                className="resize-none"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-white hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {submitting ? "Sending…" : "Send Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      {canRespond && (
          <Button
            className="w-full bg-transparent text-black border border-border hover:bg-transparent"
            onClick={() => setOpen(true)}
          >
            <Reply className="w-3.5 h-3.5 mr-2" />
            Respond
          </Button>
        )}
    </div>
  );
}
