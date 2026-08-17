/**
 * Homepage blocks.
 *
 * All three layout directions are built from exactly these components. The
 * directions differ in ARRANGEMENT and PRIORITY only — if two of them can be
 * told apart by their colours, that is a bug, not a variant.
 *
 * The card treatment is copied from `src/pages/ProjectHealth.tsx` and
 * `src/pages/finance.tsx`, the app's cleanest screens:
 *
 *   card   bg-card border border-border rounded-xl p-4   (hero: p-5)
 *   row    flex items-start justify-between gap-3
 *   title  text-sm font-medium text-foreground
 *   meta   text-xs text-muted-foreground mt-0.5
 *
 * No colour, radius, type size or spacing is introduced here that is not
 * already in `src/index.css` / `tailwind.config.ts`.
 */
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  FileWarning,
  Inbox,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { formatZAR } from "@/lib/formatCurrency";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { QueueItem, QueueKind } from "@/lib/homeSignals";
import type { HomeData } from "@/hooks/useHomeData";

// ── Shared chrome ─────────────────────────────────────────────────────────

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
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

const KIND_ICON: Record<QueueKind, typeof Clock> = {
  certificate: Banknote,
  "time-bar": CalendarClock,
  rsvp: CalendarClock,
  "meeting-action": FileText,
  rejected: FileWarning,
  task: Inbox,
};

const KIND_LABEL: Record<QueueKind, string> = {
  certificate: "Certificate",
  "time-bar": "Notice deadline",
  rsvp: "Meeting",
  "meeting-action": "Meeting notes",
  rejected: "Returned",
  task: "Task",
};

function QueueRow({ item }: { item: QueueItem }) {
  const Icon = KIND_ICON[item.kind];
  return (
    <Link
      to={item.href}
      className="block bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "p-1.5 rounded-md border shrink-0",
              item.overdue
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{item.headline}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {KIND_LABEL[item.kind]}
              {item.detail ? ` · ${item.detail}` : ""}
            </p>
          </div>
        </div>
        {item.overdue && (
          <Badge variant="danger" className="shrink-0">
            Overdue
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function ActionQueueBlock({
  data,
  limit,
  title = "What needs you",
}: {
  data: HomeData;
  limit?: number;
  title?: string;
}) {
  const { queue, isLoading, loadIssue } = data;
  const shown = limit ? queue.slice(0, limit) : queue;
  const overdue = queue.filter((i) => i.overdue).length;

  return (
    <Section
      title={title}
      hint={
        queue.length === 0
          ? undefined
          : overdue > 0
            ? `${queue.length} open, ${overdue} already past a deadline`
            : `${queue.length} open, worst first`
      }
    >
      {isLoading ? (
        <AwesomeLoader message="Working out what needs you" />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing is waiting on you"
          description={
            loadIssue.level === "partial"
              ? "Nothing outstanding in the sources that answered. Some could not be read — see above."
              : "Certificates to certify, notices inside their deadline window, invitations to answer and instructions assigned to you all appear here, worst first."
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((item) => (
            <QueueRow key={item.key} item={item} />
          ))}
          {limit && queue.length > limit && (
            <p className="text-xs text-muted-foreground">
              {queue.length - limit} more further down the queue.
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

// ── Risk strip ────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function RiskStripBlock({ data }: { data: HomeData }) {
  const { riskSignals, riskCounts, riskUnavailable } = data;

  // An outage must never read as "healthy". ProjectHealth makes the same call
  // for the same reason: posture() reports Healthy for all-zero counts, which
  // is indistinguishable from "we could not read the risk engine".
  if (riskUnavailable) {
    return (
      <Section title="Risk">
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
          <ShieldQuestion className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            The risk engine did not respond, so this project's risk posture is unknown — treat it
            as unknown, not as clear.
          </p>
        </div>
      </Section>
    );
  }

  if (riskSignals.length === 0) return null;

  return (
    <Section
      title="Risk"
      hint={`${riskCounts.red} red, ${riskCounts.orange} amber`}
      action={<ViewAll to="/project-health">Project health</ViewAll>}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {riskSignals.slice(0, 6).map((s) => (
          <Link
            key={s.id}
            to="/project-health"
            className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn("p-1.5 rounded-md border shrink-0", SEVERITY_STYLE[s.severity])}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.is_contractual ? "Contractual breach" : "Commercial guide"} · rule {s.code}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Section>
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

/** The whole commercial position on one line. Direction A and C. */
export function MoneyLineBlock({ data }: { data: HomeData }) {
  if (!data.canViewFinance) return null;
  const { money } = data;

  return (
    <Section
      title="Commercial position"
      hint={
        money.certifiedPct === null
          ? "Certified value against contract sum"
          : `${money.certifiedPct}% of the contract sum has been certified — a commercial measure, not physical progress`
      }
      action={<ViewAll to="/finance">Finance</ViewAll>}
    >
      <div className="bg-card border border-border rounded-xl p-4 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {moneyFigures(data).map((f) => (
          <Figure key={f.label} label={f.label} value={f.value} hint={f.hint} />
        ))}
      </div>
    </Section>
  );
}

/** The same figures stacked for a narrow column. Direction B. */
export function MoneyPanelBlock({ data }: { data: HomeData }) {
  if (!data.canViewFinance) return null;
  const { money } = data;

  return (
    <Section title="Financial overview" action={<ViewAll to="/finance">Finance</ViewAll>}>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {moneyFigures(data).map((f, i) => (
          <div
            key={f.label}
            className={cn(
              "flex items-baseline justify-between gap-3",
              i > 0 && "pt-3 border-t border-border",
            )}
          >
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="text-sm text-foreground tabular-nums">{f.value ?? "—"}</span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-3 border-t border-border leading-relaxed">
          {money.certifiedPct === null
            ? "A contract sum has not been recorded, so the certified share cannot be stated."
            : `${money.certifiedPct}% of the contract sum has been certified. This is certified value, not physical progress — Baselinq holds no measure of work built.`}
        </p>
      </div>
    </Section>
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
      <Section title="Current certificate">
        <EmptyState
          variant="bordered"
          size="sm"
          icon={Banknote}
          title="No payment certificate raised yet"
          description="A certificate appears here once a payment claim is assessed, showing the amount certified, the retention held and who it is waiting on."
        />
      </Section>
    );
  }

  const badge = WORKFLOW_BADGE[cert.workflowState ?? "draft"] ?? WORKFLOW_BADGE.draft;
  const amount = cert.totalPayable ?? cert.netAmount ?? null;

  return (
    <Section title="Current certificate" action={<ViewAll to="/finance">Finance</ViewAll>}>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-lg font-medium text-foreground">
                {cert.pcNumber || `PC-${cert.id}`}
              </span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {certificateHeadline(cert.workflowState, data.canApprovePayment)}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border grid gap-4 grid-cols-2 md:grid-cols-3">
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

        {data.canApprovePayment && cert.workflowState === "submitted" && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button size="sm" asChild>
              <Link to="/finance">Open it to certify</Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}

// ── Key indicators ────────────────────────────────────────────────────────
//
// Counts only, every one traceable to a list this page already holds. No
// gauges: a gauge implies a target, and none of these have one.

export function KeyIndicatorsBlock({ data }: { data: HomeData }) {
  const navigate = useNavigate();
  const { queue, riskCounts, upcomingMeetings, milestoneRows, riskUnavailable } = data;

  const tiles = [
    {
      label: "Waiting on you",
      value: String(queue.length),
      to: "/tasks",
      tone: queue.some((i) => i.overdue) ? "red" : "neutral",
    },
    {
      label: "Past a deadline",
      value: String(queue.filter((i) => i.overdue).length),
      to: "/project-health",
      tone: queue.some((i) => i.overdue) ? "red" : "neutral",
    },
    {
      label: "Open risk signals",
      value: riskUnavailable ? "—" : String(riskCounts.total),
      to: "/project-health",
      tone: riskCounts.red > 0 ? "red" : riskCounts.orange > 0 ? "orange" : "neutral",
    },
    {
      label: "Meetings ahead",
      value: String(upcomingMeetings.length),
      to: "/meetings",
      tone: "neutral",
    },
    {
      label: "Milestones not yet complete",
      value: String(milestoneRows.length),
      to: "/programme",
      tone: "neutral",
    },
  ];

  return (
    <Section title="Key indicators" hint="Every tile opens the list behind it">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={() => navigate(t.to)}
            className="text-left bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <p
              className={cn(
                "text-2xl font-normal tabular-nums",
                t.tone === "red"
                  ? "text-red-700"
                  : t.tone === "orange"
                    ? "text-amber-700"
                    : "text-foreground",
              )}
            >
              {t.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.label}</p>
          </button>
        ))}
      </div>
    </Section>
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
    <Section
      title="Meetings"
      hint={
        pendingActions > 0
          ? `${pendingActions} action${pendingActions === 1 ? "" : "s"} proposed in recent notes still need a decision`
          : undefined
      }
      action={<ViewAll to="/meetings">All meetings</ViewAll>}
    >
      {upcomingMeetings.length === 0 ? (
        <EmptyState
          variant="bordered"
          size="sm"
          icon={CalendarClock}
          title="No meetings scheduled"
          description="Site and progress meetings appear here once scheduled, with their notes and the actions they raise attached afterwards."
        />
      ) : (
        <div className="space-y-3">
          {upcomingMeetings.slice(0, limit).map((m) => {
            const attendees = m.attendees ?? [];
            return (
              <Link
                key={m.id}
                to={`/meetings/${m.id}`}
                className="block bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.date_time || m.date || "No date recorded"}
                      {m.location ? ` · ${m.location}` : ""}
                      {attendees.length > 0
                        ? ` · ${attendees.length + (m.extra_attendees ?? 0)} invited`
                        : ""}
                    </p>
                  </div>
                  {m.my_rsvp === "invited" && (
                    <Badge variant="warning" className="shrink-0">
                      You have not replied
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
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
  if (milestoneRows.length === 0) return null;

  return (
    <Section
      title="Programme"
      hint="Dates against baseline where one has been accepted"
      action={<ViewAll to="/programme">Programme</ViewAll>}
    >
      <div className="space-y-3">
        {milestoneRows.slice(0, limit).map((m) => {
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
            <Link
              key={m._id}
              to="/programme"
              className="block bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateUk(m.startDate, "short", "—")} – {formatDateUk(m.endDate, "short", "—")}
                    {slipDays === null
                      ? " · no baseline accepted"
                      : slipDays > 0
                        ? ` · ${slipDays} days later than baseline`
                        : slipDays < 0
                          ? ` · ${Math.abs(slipDays)} days ahead of baseline`
                          : " · on baseline"}
                    {m.percentComplete !== null && m.percentComplete !== undefined
                      ? ` · ${m.percentComplete}% recorded complete`
                      : ""}
                  </p>
                </div>
                <Badge variant={MILESTONE_BADGE[m.status] ?? "neutral"} className="shrink-0">
                  {m.status.replace("_", " ")}
                </Badge>
              </div>
            </Link>
          );
        })}
      </div>
    </Section>
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
    <Section title="Documents" action={<ViewAll to="/documents">All documents</ViewAll>}>
      {docs.length === 0 ? (
        <EmptyState
          variant="bordered"
          size="sm"
          icon={FileText}
          title="No documents uploaded yet"
          description="Contracts, drawings and specifications appear here. Obligations are extracted from them, so an empty list means nothing is being tracked against this project's contract."
        />
      ) : (
        <div className="space-y-3">
          {docs.map((doc: any, i: number) => (
            <button
              key={doc.id || doc._id || i}
              onClick={() => onOpen(doc)}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1.5 rounded-md border border-border bg-muted text-muted-foreground shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {doc.name || doc.file_name || doc.fileName || "Document"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.uploaded_at || doc.uploadedAt
                        ? formatDateUk(doc.uploaded_at || doc.uploadedAt, "short", "—")
                        : "No upload date recorded"}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────

/**
 * Project setup as ONE line.
 *
 * It was seven full-width rows — roughly 480px of chrome above the user's
 * actual work, on a page whose entire job is telling them what needs doing.
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
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
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
    <div className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">{data.loadIssue.message}</p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" onClick={data.retryFailed}>
        Try again
      </Button>
    </div>
  );
}
