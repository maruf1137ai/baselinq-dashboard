/**
 * Platform invoices — the screen that lets Baselinq actually get paid.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The billing engine has been complete and tested for some time: a FeeCharge
 * accrues automatically when a payment certificate is posted or a variation
 * order is signed-and-issued, charges de-duplicate so a rand of variation work
 * is billed exactly once, and `build_invoice` rolls a period's charges into one
 * `PlatformInvoice` with a draft → issued → settled lifecycle.
 *
 * None of it had a user interface. Not one file in this app called
 * `projects/<id>/invoices/`, and Settings → Billing was a "coming soon"
 * placeholder. So the company could accrue revenue and could not ask for it.
 * That — not the engine — was the blocker on onboarding a paying project.
 *
 * ── What this screen is responsible for ──────────────────────────────────
 *
 *  1. Saying what has been earned and never billed. `uninvoiced` is the
 *     platform's own aged debtors line and is deliberately unbounded by
 *     period: constraining it to a month would hide an old unbilled charge,
 *     which is the one you most need to see.
 *  2. Building a draft for a period, and showing every line before anyone
 *     commits to it.
 *  3. Issuing — the point of no return. The invoice number is burned on
 *     issue, the lines freeze, and correction after that is by credit note,
 *     not by editing. The confirm step says so in those words.
 *  4. Recording settlement against a bank reference.
 *
 * ── What it deliberately does NOT do ─────────────────────────────────────
 *
 * It does not collect money. Settlement here is a human recording that a
 * transfer arrived, which is exactly the weakness that makes automated
 * collection (DebiCheck mandate at project onboarding) the next piece of
 * work. This screen is what makes manual collection possible at all; it is
 * not the destination.
 *
 * ── Who can do what ──────────────────────────────────────────────────────
 *
 * Reading is gated on the project's finance view. Build / issue / settle /
 * cancel are Baselinq staff actions and the server enforces that — a project
 * user cannot issue or settle their own invoice. The UI hides those controls
 * when the server says the user is not staff, but the gate that matters is
 * the server's.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  FileText,
  Plus,
  ReceiptText,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { fetchData, postData } from "@/lib/Api";
import { formatDate } from "@/lib/dateUtils";
import useFetch from "@/hooks/useFetch";
import { usePermission } from "@/hooks/usePermission";

// ── Shapes, as the server sends them ──────────────────────────────────────
// Mirrors billing/invoicing.py::serialize_invoice. Amounts arrive as STRINGS
// and are kept as strings: these are money, and parsing them into a JS number
// to render is how a cent goes missing on a figure a quantity surveyor is
// about to audit. They are parsed only where arithmetic is unavoidable.

interface InvoiceLine {
  id: number;
  feeChargeId: number | null;
  isCredit: boolean;
  isLive: boolean;
  description: string;
  sourceRef: string;
  baseAmount: string;
  feeRatePct: string;
  feeAmount: string;
  vatRatePct: string;
  vatAmount: string;
  totalAmount: string;
}

type InvoiceStatus = "draft" | "issued" | "settled" | "cancelled";

interface Invoice {
  id: number;
  projectId: number;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  isSettled: boolean;
  isOutstanding: boolean;
  periodStart: string;
  periodEnd: string;
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  billingContactName: string;
  billingContactEmail: string;
  notes: string;
  issuedAt: string | null;
  settledAt: string | null;
  settledOn: string | null;
  settledReference: string;
  cancelledAt: string | null;
  cancellationReason: string;
  createdAt: string;
  lines?: InvoiceLine[];
}

interface Uninvoiced {
  projectId: number;
  uninvoicedChargeCount: number;
  uninvoicedFee: string;
  uninvoicedVat: string;
  uninvoicedTotal: string;
  earliestUninvoicedOn: string | null;
}

interface InvoiceListResponse {
  projectId: number;
  invoices: Invoice[];
  uninvoiced: Uninvoiced;
}

/** Rand, grouped, from a string the server already rounded. */
function money(raw: string | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return `R ${n.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Status, as a badge on the page's existing 50/200/700 ramp.
 *
 * `issued` is the only one that takes `warning`: it is the state where money
 * is owed to Baselinq and nobody has paid it yet, which is the state a person
 * opening this screen is looking for.
 */
const STATUS: Record<InvoiceStatus, { label: string; variant: "success" | "warning" | "neutral" | "danger" }> = {
  draft: { label: "Draft", variant: "neutral" },
  issued: { label: "Issued", variant: "warning" },
  settled: { label: "Settled", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

/** The first day of the current month, and today, as yyyy-mm-dd. */
function defaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(first), end: iso(now) };
}

export default function PlatformInvoices() {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const numericProjectId = projectId ? Number(projectId) : undefined;
  const canView = usePermission("finance.approve_payment", numericProjectId);
  const qc = useQueryClient();

  const [open, setOpen] = useState<Invoice | null>(null);
  const [buildOpen, setBuildOpen] = useState(false);
  const [period, setPeriod] = useState(defaultPeriod);
  const [settleFor, setSettleFor] = useState<Invoice | null>(null);
  const [reference, setReference] = useState("");
  const [settledOn, setSettledOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const key = projectId && canView ? `billing/projects/${projectId}/invoices/` : "";
  const { data, isLoading, isError } = useFetch<InvoiceListResponse>(key, {
    enabled: !!projectId && canView,
  });

  const invoices = useMemo(() => data?.invoices ?? [], [data]);
  const uninvoiced = data?.uninvoiced;

  const refresh = () => qc.invalidateQueries({ queryKey: [key] });

  /**
   * Every action posts and then refetches rather than patching the cache.
   * An invoice's status, number and totals are all server-derived, and an
   * optimistic guess at an invoice number is the kind of thing that ends up
   * in front of a client.
   */
  const act = async (invoice: Invoice, action: string, body: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await postData({ url: `billing/invoices/${invoice.id}/${action}/`, data: body });
      toast.success(
        action === "issue"
          ? "Invoice issued"
          : action === "settle"
            ? "Settlement recorded"
            : "Invoice cancelled",
      );
      refresh();
      setOpen(null);
      setSettleFor(null);
      setReference("");
    } catch (e: any) {
      // Never silent: the server refuses with a stable code and a reason, and
      // the person needs to see which, not a generic failure.
      toast.error(e?.response?.data?.detail || e?.message || `Could not ${action} the invoice`);
    } finally {
      setBusy(false);
    }
  };

  const build = async () => {
    if (period.start > period.end) {
      toast.error("The period starts after it ends");
      return;
    }
    setBusy(true);
    try {
      await postData({
        url: `billing/projects/${projectId}/invoices/`,
        data: { periodStart: period.start, periodEnd: period.end },
      });
      toast.success("Draft invoice built");
      refresh();
      setBuildOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Nothing to invoice for that period");
    } finally {
      setBusy(false);
    }
  };

  /** Open a single invoice WITH its lines — the list omits them. */
  const openInvoice = async (row: Invoice) => {
    setOpen(row);
    try {
      const full = await fetchData(`billing/invoices/${row.id}/`);
      setOpen(full as Invoice);
    } catch {
      // The row we already have is a true summary; it just has no lines.
      toast.error("Could not load the invoice lines");
    }
  };

  if (!canView) return null;
  if (isLoading) return <AwesomeLoader message="Loading invoices" />;

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Invoices could not be loaded"
        description="This is not a statement that there are none."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/*
        What we have earned and not asked for. This leads the screen because
        it is the number the business acts on — an invoice already issued is
        somebody else's move, an unbilled charge is ours.
      */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Earned, not yet invoiced</p>
          <p className="text-2xl font-normal tracking-tight text-foreground tabular-nums">
            {money(uninvoiced?.uninvoicedTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {uninvoiced?.uninvoicedChargeCount ?? 0} charge
            {uninvoiced?.uninvoicedChargeCount === 1 ? "" : "s"}
            {uninvoiced?.earliestUninvoicedOn
              ? ` · oldest ${formatDate(uninvoiced.earliestUninvoicedOn, "long")}`
              : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setBuildOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Build draft invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No invoices yet"
          description="Build a draft for a period to bill what has accrued."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {invoices.map((inv) => {
            const s = STATUS[inv.status];
            return (
              <button
                key={inv.id}
                onClick={() => openInvoice(inv)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {inv.invoiceNumber || "Draft — not yet numbered"}
                    </span>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(inv.periodStart, "long")} – {formatDate(inv.periodEnd, "long")}
                    {inv.billingContactName ? ` · ${inv.billingContactName}` : ""}
                  </p>
                </div>
                <span className="text-sm tabular-nums text-foreground shrink-0">
                  {money(inv.totalAmount)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Build a draft ─────────────────────────────────────────────── */}
      <Dialog open={buildOpen} onOpenChange={setBuildOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Build a draft invoice</DialogTitle>
            <DialogDescription>
              Every charge in this period that is not already on a live invoice.
              Nothing is sent and no number is assigned.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Period start</label>
              <Input
                type="date"
                value={period.start}
                onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Period end</label>
              <Input
                type="date"
                value={period.end}
                onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBuildOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={build} disabled={busy}>
              {busy ? "Building…" : "Build draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── One invoice, with its lines ───────────────────────────────── */}
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {open.invoiceNumber || "Draft invoice"}
                  <Badge variant={STATUS[open.status].variant}>
                    {STATUS[open.status].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {formatDate(open.periodStart, "long")} – {formatDate(open.periodEnd, "long")}
                  {open.billingContactName ? ` · billed to ${open.billingContactName}` : ""}
                  {open.billingContactEmail ? ` (${open.billingContactEmail})` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[320px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {(open.lines ?? []).length === 0 ? (
                  <EmptyState
                    variant="plain"
                    icon={FileText}
                    title="No lines on this invoice"
                    description="Nothing accrued in this period."
                  />
                ) : (
                  (open.lines ?? []).map((l) => (
                    <div key={l.id} className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">
                          {l.description || l.sourceRef || "Platform fee"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                          {money(l.baseAmount)} × {l.feeRatePct}%
                          {l.isCredit ? " · credit" : ""}
                        </p>
                      </div>
                      <span
                        className={`text-sm tabular-nums shrink-0 ${
                          l.isCredit ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {money(l.totalAmount)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-1 text-sm tabular-nums">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{money(open.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT</span>
                  <span>{money(open.vatAmount)}</span>
                </div>
                <div className="flex justify-between font-medium text-foreground pt-1 border-t border-border">
                  <span>Total</span>
                  <span>{money(open.totalAmount)}</span>
                </div>
              </div>

              {open.status === "settled" && (
                <p className="text-xs text-muted-foreground">
                  Settled {open.settledOn ? formatDate(open.settledOn, "long") : ""}
                  {open.settledReference ? ` · reference ${open.settledReference}` : ""}
                </p>
              )}
              {open.status === "cancelled" && open.cancellationReason && (
                <p className="text-xs text-muted-foreground">
                  Cancelled — {open.cancellationReason}
                </p>
              )}

              <DialogFooter>
                {open.status === "draft" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        const reason = window.prompt("Why is this draft being cancelled?");
                        if (reason) act(open, "cancel", { reason });
                      }}
                    >
                      <Ban className="h-4 w-4 mr-1.5" />
                      Cancel draft
                    </Button>
                    {/* Issue is the point of no return and says so. */}
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Issuing assigns the invoice number and freezes these lines. " +
                              "After this, corrections are by credit note — not by editing. Continue?",
                          )
                        ) {
                          act(open, "issue");
                        }
                      }}
                    >
                      Issue invoice
                    </Button>
                  </>
                )}
                {open.status === "issued" && (
                  <Button size="sm" disabled={busy} onClick={() => setSettleFor(open)}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Record settlement
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Record a settlement ───────────────────────────────────────── */}
      <Dialog open={!!settleFor} onOpenChange={(v) => !v && setSettleFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record settlement</DialogTitle>
            <DialogDescription>
              {settleFor?.invoiceNumber} · {money(settleFor?.totalAmount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Bank reference</label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. FNB 4417829"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Date received</label>
              <Input
                type="date"
                value={settledOn}
                onChange={(e) => setSettledOn(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSettleFor(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => settleFor && act(settleFor, "settle", { reference, settledOn })}
            >
              {busy ? "Recording…" : "Record settlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
