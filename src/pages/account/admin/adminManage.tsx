/**
 * Building blocks for the admin panel's management pages (Users, Projects):
 * sortable headers, a pager, an action confirmation that asks for a reason
 * where the server requires one, and the small display pieces they share.
 */
import React, { useEffect, useState } from "react";
import { ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TH } from "./adminUi";

/** `value`, settled for `ms` — for search boxes that query the server. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

/** A column header that sorts the list. The server decides the direction. */
export function SortTh({ label, sortKey, sort, onSort, className = TH }: {
  label: string; sortKey?: string; sort: string; onSort: (key: string) => void; className?: string;
}) {
  if (!sortKey) return <th className={className}>{label}</th>;
  const active = sort === sortKey;
  return (
    <th className={className} aria-sort={active ? "descending" : "none"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground" : ""}`}
      >
        {label}
        <ArrowDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
      </button>
    </th>
  );
}

export function Pager({ page, pages, count, pageSize, onPage }: {
  page: number; pages: number; count: number; pageSize: number; onPage: (page: number) => void;
}) {
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border text-xs text-muted-foreground">
      <span className="tabular-nums">{from}–{to} of {count.toLocaleString()}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums px-1">Page {page} of {pages}</span>
        <Button variant="ghost" size="xs" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Initials({ name, className = "" }: { name: string; className?: string }) {
  const letters = name.split(/\s+|@/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary ${className}`}>
      {letters || "?"}
    </span>
  );
}

/** A labelled figure inside a detail drawer. */
export function DetailStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground tabular-nums">{value}</p>
    </div>
  );
}

export function DrawerSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-muted-foreground tracking-wider uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export interface PendingAction {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  /** The server refuses this action without one. */
  reasonRequired?: boolean;
  run: (reason: string) => Promise<void>;
}

/** Confirm a consequential action, collecting the reason the audit log keeps. */
export function ConfirmActionDialog({ action, onClose }: { action: PendingAction | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setReason(""), [action]);

  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    try {
      await action.run(reason.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!action} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        {action && (
          <>
            <DialogHeader>
              <DialogTitle>{action.title}</DialogTitle>
              <DialogDescription>{action.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Reason{action.reasonRequired ? "" : " (optional)"} — kept in the audit log
              </label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Back</Button>
              <Button
                size="sm"
                variant={action.destructive ? "destructive" : "default"}
                disabled={busy || (action.reasonRequired && !reason.trim())}
                onClick={confirm}
              >
                {busy ? "Working…" : action.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** What an admin audit entry did, in words. Unknown codes show as written. */
const AUDIT_ACTION: Record<string, string> = {
  "billing.terms.update": "changed billing terms for",
  "billing.settings.update": "changed",
  "billing.month_end.run": "ran month end for",
  "billing.invoice.build": "built",
  "billing.invoice.issue": "issued",
  "billing.invoice.settle": "marked paid",
  "billing.invoice.cancel": "cancelled",
  "billing.charge.reverse": "reversed the fee on",
  "user.deactivate": "deactivated",
  "user.reactivate": "reactivated",
  "user.unlock": "unlocked",
  "user.grant_staff": "made staff:",
  "user.revoke_staff": "removed staff access from",
  "user.grant_superuser": "made superuser:",
  "user.revoke_superuser": "removed superuser access from",
  "user.move_company": "moved to another company:",
  "invitation.resend": "resent the invitation to",
  "invitation.cancel": "cancelled the invitation to",
  "project.status": "changed the status of",
  "company.update": "edited",
  "company.status": "changed the status of",
};

export function describeAuditAction(action: string): string {
  return AUDIT_ACTION[action] ?? action.replace(/[._]/g, " ");
}

/** The detail worth a line: a from → to, and the reason. */
export function auditDetailLine(detail: Record<string, unknown> | undefined): string {
  if (!detail) return "";
  const parts: string[] = [];
  if (detail.from !== undefined && detail.to !== undefined) parts.push(`${String(detail.from ?? "none")} → ${String(detail.to ?? "none")}`);
  const rate = detail.rate as { from?: string; to?: string } | undefined;
  if (rate?.from) parts.push(`rate ${rate.from} → ${rate.to}`);
  if (typeof detail.reason === "string" && detail.reason) parts.push(`“${detail.reason}”`);
  return parts.join(" · ");
}
