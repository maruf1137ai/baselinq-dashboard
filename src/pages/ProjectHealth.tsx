/**
 * Project Health — the risk dashboard.
 *
 * Every number on this page is live. Nothing here is mock data: the signals
 * come from the backend risk engine (`/api/projects/{id}/risk-signals/`) and
 * the narrative summary from the existing risk-forecast engine.
 *
 * Layout follows the "one number, one sentence, then the feed" shape: a user
 * arriving at this page should know whether to worry within two seconds, and
 * be able to act on the worst item without scrolling.
 */
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  RefreshCw, ShieldAlert, TrendingUp, Clock, Banknote, FileWarning, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildFigures, getCaveat, getCalculation, getMilestoneBreakdown,
} from "@/lib/riskFormat";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import TimeBarsTab from "@/components/risk/TimeBarsTab";
import EvidenceTab from "@/components/risk/EvidenceTab";
import InsurerTab from "@/components/risk/InsurerTab";

const TABS = ["Risk signals", "Notice deadlines", "Evidence", "Insurer"] as const;
type TabKey = (typeof TABS)[number];

// ── Types (mirror the backend serializer) ─────────────────────────────

interface RiskSignal {
  id: number;
  code: string;
  category: "delay" | "financial" | "compliance" | "claim";
  severity: "green" | "orange" | "red";
  status: "open" | "acknowledged" | "resolved" | "muted";
  title: string;
  detail: Record<string, any>;
  evidence: string;
  source_type: string | null;
  source_id: number | null;
  first_detected_at: string;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  acknowledgement_note: string;
  is_contractual: boolean;
}

interface SignalsResponse {
  signals: RiskSignal[];
  counts: { red: number; orange: number; green: number; total: number };
}

interface RiskForecast {
  overall_severity: string;
  ai_summary: string;
  recommendations: string[];
}

// ── Presentation helpers ──────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const CATEGORY_ICON: Record<string, typeof Clock> = {
  delay: Clock,
  financial: Banknote,
  compliance: FileWarning,
  claim: ShieldAlert,
};

const CATEGORY_LABEL: Record<string, string> = {
  delay: "Programme",
  financial: "Financial",
  compliance: "Compliance",
  claim: "Claim",
};

/** Overall posture derived from the worst live signal. */
function posture(counts: SignalsResponse["counts"]) {
  if (counts.red > 0)
    return { label: "At risk", tone: "red", icon: AlertTriangle };
  if (counts.orange > 0)
    return { label: "Watch", tone: "orange", icon: TrendingUp };
  return { label: "Healthy", tone: "green", icon: CheckCircle2 };
}

// ── Signal row ────────────────────────────────────────────────────────

function SignalRow({
  signal,
  onAcknowledge,
}: {
  signal: RiskSignal;
  onAcknowledge: (s: RiskSignal) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICON[signal.category] ?? FileWarning;
  const isAcknowledged = signal.status === "acknowledged";

  // Detail is formatted for humans rather than rendered raw — see
  // lib/riskFormat.ts for the field metadata driving labels and units.
  const figures = useMemo(() => buildFigures(signal.detail), [signal.detail]);
  const caveat = getCaveat(signal.detail);
  const calculation = getCalculation(signal.detail);
  const milestoneRows = getMilestoneBreakdown(signal.detail);

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 transition-colors",
        isAcknowledged && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 p-1.5 rounded-md border", SEVERITY_STYLES[signal.severity])}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{signal.title}</p>
              {/* The evidence line is the whole credibility of the row: it
                  shows the user the numbers behind the claim. */}
              {signal.evidence && (
                <p className="text-xs text-muted-foreground mt-0.5">{signal.evidence}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABEL[signal.category] ?? signal.category}
              </Badge>
              {/* Distinguishing a real contractual breach from a commercial
                  heuristic matters — see the risk rules' legal notes. */}
              {signal.is_contractual && (
                <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                  Contractual
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Why this fired
            </button>

            {!isAcknowledged ? (
              <button
                onClick={() => onAcknowledge(signal)}
                className="text-xs text-primary hover:underline"
              >
                Acknowledge
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Acknowledged{signal.acknowledged_by_name ? ` by ${signal.acknowledged_by_name}` : ""}
              </span>
            )}
          </div>

          {/* The detail panel is a recessed well, not a second bordered card:
              a bordered box inside a bordered card double-lines the edge. */}
          {expanded && (
            <div className="mt-3 rounded-xl bg-muted/50 overflow-hidden">
              {/* Figures — the numbers behind the finding, formatted for a
                  construction professional rather than dumped as raw keys. */}
              {figures.length > 0 && (
                <div className="flex flex-wrap gap-x-8 gap-y-4 p-4">
                  {figures.map(f => (
                    <div key={f.key}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className={cn(
                        "text-sm mt-0.5 tabular-nums",
                        f.emphasis ? "font-semibold text-foreground" : "text-foreground"
                      )}>
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Plain-English calculation, where the rule provides one. */}
              {calculation && (
                <div className="px-4 pb-4 -mt-1">
                  <p className="text-xs text-muted-foreground leading-relaxed">{calculation}</p>
                </div>
              )}

              {/* Milestone breakdown for certification divergence. */}
              {milestoneRows && (
                <div className="px-4 pb-4 -mt-1 space-y-1">
                  {milestoneRows.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{m.milestone}</span>
                      <span className="text-foreground tabular-nums">
                        {m.percent_complete !== null && m.percent_complete !== undefined
                          ? `${m.percent_complete}% complete`
                          : "progress not tracked"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* The legal caveat. Given real visual weight because several
                  rules report things that look contractual but are not — that
                  distinction must survive all the way to the screen. */}
              {caveat && (
                <div className="flex gap-2.5 px-4 py-3 bg-amber-50/60 border-t border-amber-100">
                  <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-900">
                      {signal.is_contractual
                        ? "Contractual breach"
                        : "Commercial guide — not a contract breach"}
                    </p>
                    <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">{caveat}</p>
                  </div>
                </div>
              )}

              <div className="px-4 py-2 border-t border-border">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Rule {signal.code}
                </p>
              </div>

              {signal.acknowledgement_note && (
                <p className="text-xs text-foreground px-4 py-3 border-t border-border">
                  <span className="text-muted-foreground">
                    Note from {signal.acknowledged_by_name || "team"}:{" "}
                  </span>
                  {signal.acknowledgement_note}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ProjectHealth() {
  const projectId = localStorage.getItem("selectedProjectId");
  const [ackTarget, setAckTarget] = useState<RiskSignal | null>(null);
  const [ackNote, setAckNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("Risk signals");

  const { data, isLoading, isError, refetch } = useFetch<SignalsResponse>(
    projectId ? `projects/${projectId}/risk-signals/?refresh=true` : null
  );

  // The narrative summary reuses the pre-existing risk-forecast engine.
  const { data: forecast } = useFetch<RiskForecast>(
    projectId ? `projects/${projectId}/risk-forecast/?ai=false` : null
  );

  const { mutateAsync: post } = usePost();

  const counts = data?.counts ?? { red: 0, orange: 0, green: 0, total: 0 };
  const signals = data?.signals ?? [];
  const state = posture(counts);
  const StateIcon = state.icon;

  const { live, acknowledged } = useMemo(() => ({
    live: signals.filter(s => s.status === "open"),
    acknowledged: signals.filter(s => s.status === "acknowledged"),
  }), [signals]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const submitAcknowledge = async () => {
    if (!ackTarget) return;
    try {
      await post({
        url: `risk-signals/${ackTarget.id}/acknowledge/`,
        data: { note: ackNote },
      });
      toast.success("Risk acknowledged");
      setAckTarget(null);
      setAckNote("");
      refetch();
    } catch {
      toast.error("Could not acknowledge this risk");
    }
  };

  if (!projectId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Project Health" />
          <EmptyState
            icon={ShieldAlert}
            title="No project selected"
            description="Select a project to view its risk posture."
          />
        </div>
      </DashboardLayout>
    );
  }

  // The risk engine is a separate backend app. If it is absent or erroring,
  // say so — never fall through to posture(), which reports "Healthy" for
  // all-zero counts and would tell a user there are no risks when we simply
  // could not read them. Sits above the tab dispatch so it also covers the
  // deadlines, evidence and insurer tabs.
  if (isError) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Project Health" />
          <EmptyState
            icon={ShieldAlert}
            title="Risk data unavailable"
            description="The risk service did not respond. This page cannot confirm the project's risk posture — treat it as unknown, not as healthy."
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* No padding or max-width here: DashboardLayout already applies p-6,
          and every other page runs full width with a plain space-y-6 wrapper.
          Adding either double-pads the page and leaves a dead gutter on the
          right that no other screen has. */}
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Project Health"
          description="Live risk signals across programme, financial and contractual data."
          actions={
            tab === "Risk signals" ? (
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
            ) : undefined
          }
        />

        {/* Tabs */}
        {/* Same tab strip as Finance and Programme: text-sm py-4 px-6,
            border-b-2 underline pulled onto the container's own hairline. */}
        <div className="flex items-center gap-2 border-b border-border" role="tablist">
          {TABS.map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "text-sm py-4 px-6 border-b-2 -mb-px transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
              {t === "Risk signals" && counts.total > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{counts.total}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "Notice deadlines" && <TimeBarsTab projectId={projectId} />}
        {tab === "Evidence" && <EvidenceTab projectId={projectId} />}
        {tab === "Insurer" && <InsurerTab projectId={projectId} />}

        {tab === "Risk signals" && (isLoading ? (
          <AwesomeLoader message="Evaluating project risk" />
        ) : (
          <>
            {/* Hero: one posture, one sentence */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className={cn("p-2.5 rounded-lg border", SEVERITY_STYLES[state.tone])}>
                  <StateIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-lg font-medium text-foreground">{state.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {counts.total} live signal{counts.total === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {forecast?.ai_summary ||
                      (counts.total === 0
                        ? "No risks detected. Programme, payments and variations are within tolerance."
                        : "Review the signals below.")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                {(["red", "orange", "green"] as const).map(tone => (
                  <div
                    key={tone}
                    className={cn(
                      "px-2.5 py-1 rounded-md border text-xs font-medium",
                      SEVERITY_STYLES[tone]
                    )}
                  >
                    {counts[tone]} {tone === "red" ? "critical" : tone === "orange" ? "warning" : "clear"}
                  </div>
                ))}
              </div>
            </div>

            {/* Signal feed */}
            {live.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-foreground">Needs attention</h2>
                <div className="space-y-3">
                  {live.map(s => (
                    <SignalRow key={s.id} signal={s} onAcknowledge={setAckTarget} />
                  ))}
                </div>
              </section>
            )}

            {acknowledged.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Acknowledged ({acknowledged.length})
                </h2>
                <div className="space-y-3">
                  {acknowledged.map(s => (
                    <SignalRow key={s.id} signal={s} onAcknowledge={setAckTarget} />
                  ))}
                </div>
              </section>
            )}

            {counts.total === 0 && (
              <EmptyState
                icon={CheckCircle2}
                title="No live risk signals"
                description="Milestones, payment certificates and variation orders are all within their configured tolerances."
              />
            )}
          </>
        ))}
      </div>

      {/* Acknowledge dialog — the note becomes part of the contemporaneous record */}
      <Dialog open={!!ackTarget} onOpenChange={open => !open && setAckTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge risk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-foreground">{ackTarget?.title}</p>
            {ackTarget?.evidence && (
              <p className="text-xs text-muted-foreground">{ackTarget.evidence}</p>
            )}
            <Textarea
              placeholder="What action is being taken? (recorded against this risk)"
              value={ackNote}
              onChange={e => setAckNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckTarget(null)}>Cancel</Button>
            <Button onClick={submitAcknowledge}>Acknowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
