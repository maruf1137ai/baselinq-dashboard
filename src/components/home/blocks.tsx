/**
 * Homepage blocks.
 *
 * ── The container rule ────────────────────────────────────────────────────
 *
 * A section IS a panel. Its heading lives INSIDE the panel, on the card
 * surface — never as bare text on the page background. The previous revision
 * put every heading and its description straight onto `--background` and only
 * wrapped the contents, so six headings floated on grey above sixteen
 * separately-bordered tiles. That is what made the page read as a wireframe
 * next to `/finance` and `/project-health`.
 *
 * The shell below is not invented. It is the finance table shell, copied
 * verbatim from `src/components/finance/VariationOrdersTable.tsx:108` and
 * `paymentCertificateTable.tsx:585`, which is the app's real grammar for
 * "a titled container full of rows":
 *
 *   panel   bg-card border border-border rounded-xl overflow-hidden
 *   header  px-4 py-3            (hero: p-5, per ProjectHealth's hero card)
 *   rows    divide-y divide-border, px-4 py-3, hover:bg-muted/50
 *   footer  px-4 py-3 border-t border-border
 *
 * The icon tiles and their severity classes are ProjectHealth's, unchanged.
 * No colour, radius, type size or spacing appears here that is not already in
 * `src/index.css` / `tailwind.config.ts`.
 *
 * ── The empty rule ────────────────────────────────────────────────────────
 *
 * Most projects on most days are quiet, so the empty treatment IS the page
 * far more often than the full one. An empty section is therefore its panel
 * header and nothing else — the "nothing here" sentence becomes the header's
 * own hint line, roughly 64px total. A 250px dashed `EmptyState` well per
 * section made the emptiest project the loudest screen in the product.
 * `EmptyState` is still the right primitive for a whole empty PAGE (no
 * project, total outage) and is used for exactly that in `Index.tsx`.
 */
import { Link, type LinkProps } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  FileText,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { EmptyState } from "@/components/ui/empty-state";
import { formatZAR } from "@/lib/formatCurrency";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/hooks/useHomeData";

// ── Shared chrome ─────────────────────────────────────────────────────────

/** ProjectHealth's severity tiles, unchanged, plus the neutral it implies. */
const TONE: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-muted text-muted-foreground border-border",
};

type Tone = keyof typeof TONE;

/**
 * A titled container.
 *
 * `size="hero"` is ProjectHealth's hero card (p-5, text-lg, h-5 tile) and is
 * used for exactly one thing on this page — the queue. Everything else is the
 * default, which is the finance table header (px-4 py-3, text-sm, h-4 tile).
 */
export function Panel({
  title,
  lead,
  hint,
  icon: Icon,
  tone = "neutral",
  action,
  size = "default",
  footer,
  children,
}: {
  title: string;
  /** Short quantitative line beside the title — "7 open, 3 past a deadline". */
  lead?: string;
  /** A sentence under the title. Carries the empty message when there are no rows. */
  hint?: string;
  icon?: typeof Clock;
  tone?: Tone;
  action?: React.ReactNode;
  size?: "default" | "hero";
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hero = size === "hero";
  // An empty array is still truthy, and rendering it would draw a 1px divider
  // strip under the header with nothing beneath it.
  const hasBody =
    children !== undefined &&
    children !== null &&
    children !== false &&
    !(Array.isArray(children) && children.length === 0);

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <header className={cn("flex items-start justify-between gap-3", hero ? "p-5" : "px-4 py-3")}>
        <div className={cn("flex items-start min-w-0", hero ? "gap-4" : "gap-3")}>
          {Icon && (
            <div
              className={cn(
                "border shrink-0",
                hero ? "p-2.5 rounded-lg" : "p-1.5 rounded-md",
                TONE[tone],
              )}
            >
              <Icon className={hero ? "h-5 w-5" : "h-4 w-4"} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2
                className={cn(
                  "text-foreground",
                  hero ? "text-lg font-medium" : "text-sm font-medium",
                )}
              >
                {title}
              </h2>
              {lead && (
                <span
                  className={cn(
                    "text-muted-foreground tabular-nums",
                    hero ? "text-sm" : "text-xs",
                  )}
                >
                  {lead}
                </span>
              )}
            </div>
            {hint && (
              <p
                className={cn(
                  "text-muted-foreground leading-relaxed",
                  hero ? "text-sm mt-1" : "text-xs mt-0.5",
                )}
              >
                {hint}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      {/* No body at all when there is nothing to list: an empty section is its
          header, and the hint above has already said so. */}
      {hasBody && <div className="border-t border-border divide-y divide-border">{children}</div>}

      {footer && <div className="px-4 py-3 border-t border-border">{footer}</div>}
    </section>
  );
}

/** Row hit-area. `ring-inset` because the panel clips an offset ring. */
const ROW =
  "block w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

function RowLink({ className, ...props }: LinkProps) {
  return <Link className={cn(ROW, className)} {...props} />;
}

function RowButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn(ROW, className)} {...props} />;
}

/** Icon tile + title + meta + right-hand slot. The wide-column row. */
function RowContent({
  icon: Icon,
  tone = "neutral",
  title,
  meta,
  right,
}: {
  icon?: typeof Clock;
  tone?: Tone;
  title: string;
  meta?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={cn("p-1.5 rounded-md border shrink-0", TONE[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {meta && <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/**
 * The narrow-column row, for the three supporting panels that sit 3-up.
 * No icon tile and the badge drops below the meta line — at ~370px a tile
 * plus a right-aligned badge leaves nothing for the title.
 */
function StackedRowContent({
  title,
  meta,
  badge,
}: {
  title: string;
  meta?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{title}</p>
      {meta && <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>}
      {badge && <div className="mt-1.5">{badge}</div>}
    </div>
  );
}

function ViewAll({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

/** Value + label. Renders an em dash when the API gave us nothing. */
function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground tabular-nums mt-0.5 truncate">{value ?? "—"}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Action queue ──────────────────────────────────────────────────────────
//
// The queue is the page's reason to exist and lives in its own file, next to
// the pure ranking it renders. Re-exported here so every call site keeps
// importing blocks.
export { ActionQueueBlock, QueueRow } from "./ActionQueue";

// ── Risk strip ────────────────────────────────────────────────────────────

export function RiskStripBlock({ data }: { data: HomeData }) {
  const { riskSignals, riskCounts, riskUnavailable } = data;

  // An outage must never read as "healthy". ProjectHealth makes the same call
  // for the same reason: posture() reports Healthy for all-zero counts, which
  // is indistinguishable from "we could not read the risk engine".
  if (riskUnavailable) {
    return (
      <Panel
        title="Risk"
        icon={ShieldQuestion}
        hint="The risk engine did not respond, so this project's risk posture is unknown — treat it as unknown, not as clear."
      />
    );
  }

  if (riskSignals.length === 0) return null;

  return (
    <Panel
      title="Risk"
      icon={AlertTriangle}
      tone={riskCounts.red > 0 ? "red" : "orange"}
      lead={`${riskCounts.red} red, ${riskCounts.orange} amber`}
      action={<ViewAll to="/project-health">Project health</ViewAll>}
    >
      {riskSignals.slice(0, 6).map((s) => (
        <RowLink key={s.id} to="/project-health">
          <RowContent
            icon={AlertTriangle}
            tone={s.severity as Tone}
            title={s.title}
            meta={`${s.is_contractual ? "Contractual breach" : "Commercial guide"} · rule ${s.code}`}
          />
        </RowLink>
      ))}
    </Panel>
  );
}

// ── Money ─────────────────────────────────────────────────────────────────
//
// Gated on `finance.view` at every call site. The figures are contract sum,
// approved variations, certified to date, retention held and balance — all
// read from real responses. There is deliberately no physical % complete, no
// cash-flow forecast, no payment-received and no cost-to-complete: Baselinq
// holds none of those, and the previous page's progress bars were elapsed
// calendar time wearing their clothes.

function moneyFigures(data: HomeData) {
  const { money } = data;
  return [
    { label: "Contract sum", value: money.contractSum === null ? null : formatZAR(money.contractSum) },
    {
      label: "Approved variations",
      value: money.variations === null ? null : formatZAR(money.variations),
      hint: money.variationCount > 0 ? `${money.variationCount} approved` : undefined,
    },
    { label: "Certified to date", value: money.certified === null ? null : formatZAR(money.certified) },
    { label: "Retention held", value: money.retentionHeld === null ? null : formatZAR(money.retentionHeld) },
    { label: "Balance of contract sum", value: money.balance === null ? null : formatZAR(money.balance) },
  ];
}

/** The whole commercial position on one line. */
export function MoneyLineBlock({ data }: { data: HomeData }) {
  if (!data.canViewFinance) return null;
  const { money } = data;

  return (
    <Panel
      title="Commercial position"
      icon={Banknote}
      hint={
        money.certifiedPct === null
          ? "Certified value against contract sum"
          : `${money.certifiedPct}% of the contract sum has been certified — a commercial measure, not physical progress`
      }
      action={<ViewAll to="/finance">Finance</ViewAll>}
    >
      <div className="px-4 py-3 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {moneyFigures(data).map((f) => (
          <Figure key={f.label} label={f.label} value={f.value} hint={f.hint} />
        ))}
      </div>
    </Panel>
  );
}

// ── Current certificate ───────────────────────────────────────────────────

const WORKFLOW_BADGE: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  draft: { variant: "neutral", label: "Draft" },
  submitted: { variant: "warning", label: "Submitted" },
  approved: { variant: "warning", label: "Approved" },
  posted: { variant: "success", label: "Posted" },
  rejected: { variant: "danger", label: "Rejected" },
  cancelled: { variant: "neutral", label: "Cancelled" },
};

/** Names the move the certificate is waiting for, not the state it is in. */
function certificateHeadline(state: string | undefined, canApprove: boolean): string {
  switch (state) {
    case "submitted":
      return canApprove
        ? "Submitted for certification — it is waiting on you"
        : "Submitted for certification, waiting on the principal agent";
    case "approved":
      return "Certified — post it to release payment";
    case "rejected":
      return "Returned — it needs reworking before it can be certified again";
    case "posted":
      return "Posted. Nothing further is required on this certificate";
    case "draft":
      return "Still a draft — it has not been submitted for certification";
    default:
      return "No workflow state recorded against this certificate";
  }
}

export function CurrentCertificateBlock({ data }: { data: HomeData }) {
  if (!data.canViewFinance) return null;
  const cert = data.currentCertificate;

  if (!cert) {
    return (
      <Panel
        title="Current certificate"
        icon={Banknote}
        hint="No payment certificate raised yet. A certificate appears here once a payment claim is assessed, showing the amount certified, the retention held and who it is waiting on."
      />
    );
  }

  const badge = WORKFLOW_BADGE[cert.workflowState ?? "draft"] ?? WORKFLOW_BADGE.draft;
  const amount = cert.totalPayable ?? cert.netAmount ?? null;

  return (
    <Panel
      title="Current certificate"
      icon={Banknote}
      lead={cert.pcNumber || `PC-${cert.id}`}
      hint={certificateHeadline(cert.workflowState, data.canApprovePayment)}
      action={
        <div className="flex items-center gap-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <ViewAll to="/finance">Finance</ViewAll>
        </div>
      }
      footer={
        data.canApprovePayment && cert.workflowState === "submitted" ? (
          <Button size="xs" asChild>
            <Link to="/finance">Open it to certify</Link>
          </Button>
        ) : undefined
      }
    >
      <div className="px-4 py-3 grid gap-4 grid-cols-2 md:grid-cols-3">
        <Figure label="Amount payable" value={amount === null ? null : formatZAR(amount)} />
        <Figure
          label="Retention held"
          value={cert.retentionAmount === undefined ? null : formatZAR(cert.retentionAmount)}
        />
        <Figure
          label="Last updated"
          value={cert.updatedAt ? formatDateUk(cert.updatedAt, "short", "—") : null}
        />
      </div>
    </Panel>
  );
}

// ── Meetings ──────────────────────────────────────────────────────────────

export function MeetingsBlock({ data, limit = 4 }: { data: HomeData; limit?: number }) {
  const { upcomingMeetings, meetingsWithActions } = data;

  // "Notes ready" is a status. The job is the actions the notes proposed —
  // and those are already in the queue, so this block only counts them.
  const pendingActions = meetingsWithActions.reduce(
    (n, m) =>
      n +
      m.action_items.filter((i) => !i.approved_at && !i.declined_at && i.state !== "approved" && i.state !== "declined")
        .length,
    0,
  );

  return (
    <Panel
      title="Meetings"
      hint={
        upcomingMeetings.length === 0
          ? "No meetings scheduled. Site and progress meetings appear here once scheduled, with their notes and the actions they raise attached afterwards."
          : pendingActions > 0
            ? `${pendingActions} action${pendingActions === 1 ? "" : "s"} proposed in recent notes still need a decision`
            : undefined
      }
      action={<ViewAll to="/meetings">All meetings</ViewAll>}
    >
      {upcomingMeetings.length === 0
        ? undefined
        : upcomingMeetings.slice(0, limit).map((m) => {
            const attendees = m.attendees ?? [];
            return (
              <RowLink key={m.id} to={`/meetings/${m.id}`}>
                <StackedRowContent
                  title={m.title}
                  meta={`${m.date_time || m.date || "No date recorded"}${
                    m.location ? ` · ${m.location}` : ""
                  }${
                    attendees.length > 0
                      ? ` · ${attendees.length + (m.extra_attendees ?? 0)} invited`
                      : ""
                  }`}
                  badge={
                    m.my_rsvp === "invited" ? (
                      <Badge variant="warning">You have not replied</Badge>
                    ) : undefined
                  }
                />
              </RowLink>
            );
          })}
    </Panel>
  );
}

// ── Milestones ────────────────────────────────────────────────────────────

const MILESTONE_BADGE: Record<string, "neutral" | "info" | "success" | "danger"> = {
  planned: "neutral",
  in_progress: "info",
  completed: "success",
  delayed: "danger",
};

export function MilestonesBlock({ data, limit = 4 }: { data: HomeData; limit?: number }) {
  const { milestoneRows } = data;

  // This used to `return null` when empty. It no longer does, because it is
  // now the middle cell of a three-up band and vanishing left the band ragged
  // — and an empty panel here is one 76px header, cheaper than the hole was.
  // Risk still returns null when empty: an absent Risk section is silence,
  // whereas an empty Programme section is a true and useful "none outstanding".
  return (
    <Panel
      title="Programme"
      hint={
        milestoneRows.length === 0
          ? "No milestones outstanding. Milestones appear here with their dates, and their slip against baseline once one has been accepted."
          : "Dates against baseline where one has been accepted"
      }
      action={<ViewAll to="/programme">Programme</ViewAll>}
    >
      {milestoneRows.length === 0
        ? undefined
        : milestoneRows.slice(0, limit).map((m) => {
            // Slip is only stated where a baseline actually exists. Without one
            // there is nothing to slip against, and no bar is drawn: the old
            // page's bar was elapsed calendar time, which said a phase was 50%
            // done at its halfway date whether or not anything had been built.
            const hasBaseline = !!m.baselineEnd;
            const slipDays = hasBaseline
              ? Math.round(
                  (new Date(m.actualEnd || m.endDate).getTime() -
                    new Date(m.baselineEnd as string).getTime()) /
                    86_400_000,
                )
              : null;

            return (
              <RowLink key={m._id} to="/programme">
                <StackedRowContent
                  title={m.name}
                  meta={`${formatDateUk(m.startDate, "short", "—")} – ${formatDateUk(
                    m.endDate,
                    "short",
                    "—",
                  )}${
                    slipDays === null
                      ? " · no baseline accepted"
                      : slipDays > 0
                        ? ` · ${slipDays} days later than baseline`
                        : slipDays < 0
                          ? ` · ${Math.abs(slipDays)} days ahead of baseline`
                          : " · on baseline"
                  }${
                    m.percentComplete !== null && m.percentComplete !== undefined
                      ? ` · ${m.percentComplete}% recorded complete`
                      : ""
                  }`}
                  badge={
                    <Badge variant={MILESTONE_BADGE[m.status] ?? "neutral"}>
                      {m.status.replace("_", " ")}
                    </Badge>
                  }
                />
              </RowLink>
            );
          })}
    </Panel>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────

export function DocumentsBlock({
  data,
  onOpen,
  limit = 4,
}: {
  data: HomeData;
  onOpen: (doc: any) => void;
  limit?: number;
}) {
  const docs = data.documents.slice(0, limit);

  return (
    <Panel
      title="Documents"
      hint={
        docs.length === 0
          ? "No documents uploaded yet. Contracts, drawings and specifications appear here. Obligations are extracted from them, so an empty list means nothing is being tracked against this project's contract."
          : undefined
      }
      action={<ViewAll to="/documents">All documents</ViewAll>}
    >
      {docs.length === 0
        ? undefined
        : docs.map((doc: any, i: number) => (
            <RowButton key={doc.id || doc._id || i} onClick={() => onOpen(doc)}>
              <StackedRowContent
                title={doc.name || doc.file_name || doc.fileName || "Document"}
                meta={
                  doc.uploaded_at || doc.uploadedAt
                    ? formatDateUk(doc.uploaded_at || doc.uploadedAt, "short", "—")
                    : "No upload date recorded"
                }
              />
            </RowButton>
          ))}
    </Panel>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────

/**
 * Project setup as ONE line, at the very top of the page.
 *
 * It was seven full-width rows, and then a card stranded in the middle of the
 * page below the money. It is a precondition for everything else on the
 * screen working, so it belongs first — but it is a precondition, not the
 * work, so it gets a single hairline strip and nothing more. `py-2.5` rather
 * than a card's `p-4`: this must not out-weigh the queue beneath it.
 */
export function SetupLineBlock({
  data,
  onOpen,
  onOpenSection,
}: {
  data: HomeData;
  onOpen: () => void;
  onOpenSection: (section: string) => void;
}) {
  const { projectStats, canEditProject } = data;
  if (!projectStats || projectStats.percentage === 100) return null;

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-foreground shrink-0">
          Project setup {projectStats.filledCount} of {projectStats.totalCount}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {projectStats.missing.map((item) =>
            canEditProject ? (
              <button
                key={item}
                onClick={() => onOpenSection(item)}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item}
              </button>
            ) : (
              <span
                key={item}
                className="text-xs text-muted-foreground border border-border rounded-md px-2 py-0.5"
              >
                {item}
              </span>
            ),
          )}
        </div>
      </div>
      {canEditProject && (
        <Button size="xs" variant="outline" className="shrink-0" onClick={onOpen}>
          Complete setup
        </Button>
      )}
    </div>
  );
}

// ── Load banner ───────────────────────────────────────────────────────────

/** One line, one action. Never three stacked permanent banners. */
export function LoadIssueBanner({ data }: { data: HomeData }) {
  if (data.loadIssue.level !== "partial") return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">{data.loadIssue.message}</p>
      </div>
      <Button variant="outline" size="xs" className="shrink-0" onClick={data.retryFailed}>
        Try again
      </Button>
    </div>
  );
}
