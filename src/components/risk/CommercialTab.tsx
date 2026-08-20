/**
 * Project Health → Commercial position.
 *
 * The client's "Financial Overview" and "Payment Certificate Summary" blocks,
 * built in this app's own grammar rather than his.
 *
 * ── His content, not his chrome ───────────────────────────────────────────
 *
 * The mock is dark-blue chrome on white with its own type scale. None of that
 * is reproduced. The shell below is the finance table shell already used by
 * `VariationOrdersTable.tsx` and `paymentCertificateTable.tsx` and copied into
 * `components/home/blocks.tsx` — `bg-card border border-border rounded-xl`,
 * a `px-4 py-3` header, `divide-y divide-border` rows at `px-4 py-2.5`. No
 * colour, radius, type size or spacing appears here that is not already in
 * `src/index.css` / `tailwind.config.ts`, and there is not an arbitrary hex
 * value in the file.
 *
 * ── Colour means state ────────────────────────────────────────────────────
 *
 * Nothing in this tab is coloured. Not one figure here has breached anything:
 * a contract sum, a variation total and a retention balance are facts, and
 * painting them would be the decoration the rest of this change is removing.
 * The one figure that CAN carry colour is the adjustments line, and only when
 * it reduces what is payable.
 *
 * ── What is deliberately not here ─────────────────────────────────────────
 *
 * The mock's two gauges ("70% Spent", "65% Complete") and its "Program
 * Progress" line. Baselinq holds no measure of physical completion — see the
 * header of `src/lib/projectPosition.ts`.
 */
import { AlertTriangle, Banknote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatZAR } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { certificateAdjustments, financialOverview } from "@/lib/projectPosition";
import type { ProjectCommercials } from "@/hooks/useProjectCommercials";

export function Panel({
  title,
  lead,
  action,
  children,
}: {
  title: string;
  lead?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-baseline gap-3 flex-wrap min-w-0">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {lead && <span className="text-xs text-muted-foreground tabular-nums">{lead}</span>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="border-t border-border divide-y divide-border">{children}</div>
    </section>
  );
}

/**
 * One label-and-figure row.
 *
 * The two derived rows are set apart by weight and a stated formula, not by a
 * colour or a rule — the client marks them "auto-calculated" and the honest
 * translation of that is showing the reader the sum so they can check it.
 */
export function Row({
  label,
  value,
  note,
  warning,
  strong = false,
  danger = false,
  caveat,
}: {
  label: string;
  value: string | null;
  note?: string;
  /**
   * A known problem with the figure beside it. Rendered VISIBLY, never as a
   * tooltip: a number that may be overstated is not something a reader should
   * have to hover to discover, and a hover reveals nothing on a touch device.
   */
  warning?: string;
  strong?: boolean;
  danger?: boolean;
  caveat?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5" title={caveat}>
      <div className="min-w-0">
        <p className={cn("text-sm", strong ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </p>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
        {warning && (
          /* Full contrast, no hue. This is a correctness warning, not a
             severity — the figure beside it may be wrong. Colour on this page
             is reserved for a breach that has already happened, so the warning
             is made unmissable by being at foreground contrast with an icon
             rather than by taking amber off the severity scale. */
          <p className="flex items-start gap-1.5 text-xs text-foreground mt-1">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
            <span className="leading-relaxed">{warning}</span>
          </p>
        )}
      </div>
      <p
        className={cn(
          "text-sm tabular-nums shrink-0",
          strong && "font-medium",
          danger ? "text-red-700" : "text-foreground",
        )}
      >
        {/* An em dash, never a zero. A figure we could not derive is not R 0,00. */}
        {value ?? "—"}
      </p>
    </div>
  );
}

export default function CommercialTab({ data }: { data: ProjectCommercials }) {
  const { money, currentCertificate: pc } = data;

  // A viewer who reached this tab without finance.view should not be here at
  // all — ProjectHealth does not render the tab for them — but the component
  // refuses independently rather than trusting its caller.
  if (!data.canViewFinance) return null;

  const rows = financialOverview(money, data.certificateBasis);
  const adjustments = certificateAdjustments(pc);

  // Nothing at all to show: no contract sum, no certificate. An empty state,
  // not six em dashes stacked in a panel.
  if (money.contractSum === null && money.certified === null && !pc) {
    return (
      <EmptyState
        icon={Banknote}
        title="No commercial position recorded"
        description="This project has no contract sum and no payment certificates yet. The financial position will appear once either is captured."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      {/* ── Financial Overview ──────────────────────────────────────────── */}
      <Panel
        title="Financial overview"
        action={
          data.variationsTruncated || data.variationsFailed ? (
            <Badge variant="neutral">Variations may be short</Badge>
          ) : undefined
        }
      >
        {rows.map((r) => (
          <Row
            key={r.key}
            label={r.label}
            value={r.value}
            note={r.formula}
            warning={r.warning}
            strong={r.derived}
            caveat={r.caveat}
          />
        ))}
      </Panel>

      {/* ── Current Certificate ─────────────────────────────────────────── */}
      {pc ? (
        <Panel
          title="Current certificate"
          lead={pc.pcNumber || `PC-${pc.id}`}
          action={
            pc.workflowState ? (
              <Badge variant="neutral" className="capitalize">
                {pc.workflowState}
              </Badge>
            ) : undefined
          }
        >
          <Row
            label="This period certified"
            value={pc.claimAmount === undefined ? null : formatZAR(pc.claimAmount)}
            caveat="claim_amount — the value of work certified this period, excluding VAT."
          />

          {/*
            Rendered only where there is something to render. On every
            certificate on the platform today bar one seeded row all four
            components are zero, and "Adjustments R 0,00" would be a line of
            ink saying nothing.

            It sits between the other two because that is where the client put
            it, but the three are NOT a column that sums and are not drawn as
            one — no rule, no total. `claim_amount` already has penalties,
            advance recovery and escalation netted into it, and the gap between
            claim and net is dominated by VAT and retention, which are not
            adjustments. See `certificateAdjustments` for the full derivation.
          */}
          {adjustments && (
            <Row
              label="Adjustments"
              value={formatZAR(adjustments.total)}
              note={adjustments.components
                .map((c) => `${c.label} ${formatZAR(c.amount)}`)
                .join(" · ")}
              // Colour only when it reduces what the contractor is paid. A
              // positive adjustment — a retention release, an escalation — is
              // money going the other way and is not a warning.
              danger={adjustments.total < 0}
              caveat="Penalties and advance recovery reduce the certificate; retention release and escalation add to it. Signs follow tasks/pc_integrity.py::recompute. These three lines are three stated figures, not a sum."
            />
          )}

          <Row
            label="Net amount payable"
            value={pc.netAmount === undefined ? null : formatZAR(pc.netAmount)}
            strong
            caveat="net_amount — the VAT-inclusive amount due."
          />
        </Panel>
      ) : (
        <Panel title="Current certificate">
          <div className="px-4 py-3">
            <p className="text-sm text-muted-foreground">
              No payment certificate has been raised on this project.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}
