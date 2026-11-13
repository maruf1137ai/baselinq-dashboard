/**
 * The posted certificate as a document: open it, copy its link, send it.
 *
 * Posting already files the PDF in Documents and mints the shareable link
 * (tasks/pc_workflow.py); Finance never showed either, so a QS approved a
 * certificate and then had nowhere to open or send it. Sending is a separate,
 * deliberate act — a person names the recipients and presses Send — because it
 * emails people outside the platform (POST …/share/).
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postData } from "@/lib/Api";
import { formatDate } from "@/lib/dateUtils";

export interface CertificateDocumentFields {
  id: number;
  pcNumber: string;
  certificateUrl?: string | null;
  certificateRevoked?: boolean;
  sharedAt?: string | null;
  sharedWith?: string[];
  shareRecipients?: string[];
}

export function CertificateDocumentSection({
  entry,
  canSend,
}: {
  entry: CertificateDocumentFields;
  canSend: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [sending, setSending] = useState(false);

  if (!entry.certificateUrl) {
    // Posted before shareable links existed (or imported): no link yet.
    const createLink = async () => {
      setSending(true);
      try {
        await postData({ url: `tasks/payment-certificates/${entry.id}/certificate-link/`, data: {} });
        toast.success("Shareable link created");
        await queryClient.invalidateQueries({
          predicate: (q) => String(q.queryKey[0] ?? "").startsWith("tasks/payment-certificates"),
        });
      } catch (e) {
        toast.error((e as any)?.response?.data?.error ?? (e instanceof Error ? e.message : "The link could not be created."));
      } finally {
        setSending(false);
      }
    };
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          This certificate was posted before shareable links existed, so it has no link yet.
        </p>
        {canSend && (
          <Button variant="outline" size="sm" onClick={createLink} disabled={sending}>
            {sending ? "Creating…" : "Create shareable link"}
          </Button>
        )}
      </div>
    );
  }

  const fullUrl = `${window.location.origin}${entry.certificateUrl}`;
  const sharedWith = entry.sharedWith ?? [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Certificate link copied");
    } catch {
      toast.error("The link could not be copied. Open the certificate and copy it from the address bar.");
    }
  };

  const send = async () => {
    const list = recipients.split(/[,;\s]+/).map((r) => r.trim()).filter(Boolean);
    if (list.length === 0) {
      toast.error("Name at least one recipient.");
      return;
    }
    setSending(true);
    try {
      const result = await postData({
        url: `tasks/payment-certificates/${entry.id}/share/`,
        data: { recipients: list },
      });
      const sent: string[] = result?.sentTo ?? [];
      const failed: string[] = result?.failed ?? [];
      toast.success(`${entry.pcNumber} sent to ${sent.join(", ")}`);
      if (failed.length) toast.error(`Not sent to ${failed.join(", ")}. Try those again.`);
      await queryClient.invalidateQueries({
        predicate: (q) => String(q.queryKey[0] ?? "").startsWith("tasks/payment-certificates"),
      });
      setOpen(false);
    } catch (e) {
      // postData rethrows the axios error; the server's own reason is on response.data.
      const body = (e as any)?.response?.data;
      toast.error(body?.error ?? (e instanceof Error ? e.message : "The certificate could not be sent."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {entry.certificateRevoked && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="note">
          The shareable link for this certificate has been revoked, so it cannot be opened or sent.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild disabled={entry.certificateRevoked}>
          <a href={entry.certificateUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Open certificate
          </a>
        </Button>
        <Button variant="outline" size="sm" onClick={copy} disabled={entry.certificateRevoked}>
          <Copy className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Copy link
        </Button>
        {canSend && (
          <Button
            size="sm"
            disabled={entry.certificateRevoked}
            onClick={() => {
              setRecipients((entry.shareRecipients ?? []).join(", "));
              setOpen(true);
            }}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Send to the parties…
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {entry.sharedAt
          ? `Sent to ${sharedWith.join(", ")} · last sent ${formatDate(entry.sharedAt)}`
          : "Not sent yet. Certifying sends it to the employer's and contractor's email in Settings → Contract & payment; if either is missing or the email failed, send it here. The PDF is filed in Documents."}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {entry.pcNumber}</DialogTitle>
            <DialogDescription>
              Each person receives an email with a link to this certificate. Pre-filled from the
              employer's and contractor's billing emails in Settings → Contract &amp; payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`pc-share-${entry.id}`}>Recipients</Label>
            <Input
              id={`pc-share-${entry.id}`}
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="employer@example.com, contractor@example.com"
              aria-describedby={`pc-share-${entry.id}-hint`}
            />
            <p id={`pc-share-${entry.id}-hint`} className="text-xs text-muted-foreground">
              Separate addresses with commas. Up to ten.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={send} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
