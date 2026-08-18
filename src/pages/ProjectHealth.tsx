/**
 * Project Health.
 *
 * Every number on this page is live. Nothing here is mock data: the signals
 * come from the backend risk engine (`projects/{id}/risk-signals/`), the
 * narrative sentence from the risk-forecast engine, and the commercial figures
 * from the project, certificate, variation and payment routes — each named
 * against the row it produces in `lib/projectPosition.ts`.
 *
 * ── THE PAGE HAS TWO JOBS ─────────────────────────────────────────────────
 *
 * It was built against an insurance requirements document: it is what an
 * insurer, or a principal agent diagnosing a project, reads to judge whether
 * the contract is being competently administered. It has since been given a
 * second job — carrying the project's commercial position, the six-field
 * financial overview and the current certificate.
 *
 * These are not the same document and were not merged into one. They are
 * layered:
 *
 *   ABOVE the tab strip, shared by both readers: the verdict and the
 *   indicators. "Is this project in trouble" and "what is the position" are
 *   the one question the insurer and the principal agent ask identically, and
 *   the answer belongs to the page rather than to any one tab. This is also
 *   what stops a homepage deep link to `?tab=insurer` landing a reader on a
 *   screen that never tells them the project is at risk.
 *
 *   BELOW it, where the two diverge: five surfaces. The first four are the
 *   insurer's argument in sequence — what the administration found, whether
 *   notice was served in time, whether the record is sealed and verifiable,
 *   what was disclosed and on whose consent. The fifth is the principal
 *   agent's commercial position, appended rather than inserted so it does not
 *   break that sequence in half. See `components/risk/tabs.ts`.
 *
 * ── READING ORDER ─────────────────────────────────────────────────────────
 *
 *   1. Verdict      posture, live count, the engine's own sentence
 *   2. Position     the four key indicators
 *   3. Lens         the tab strip
 *   4. Detail       the selected surface, itself ordered worst-first
 *
 * This is a page you READ, not a queue you scan, so it is not made to fit one
 * screen. It is made so that a reader who stops after the first 200px has the
 * verdict, one who stops after 400px has the position, and one who reads on
 * gets the evidence in decreasing order of seriousness.
 *
 * ── WHAT IS DELIBERATELY NOT BUILT ────────────────────────────────────────
 *
 * The mock's two gauges ("70% Spent", "65% Complete") and its "Program
 * Progress" line. Baselinq records no measure of physical completion — there
 * is no field on any model that says how much of the works has been built. The
 * previous homepage approximated it from elapsed calendar time and that was
 * removed as a fabrication. Not even a placeholder: an `UpcomingFeature` card
 * would promise a figure this platform has no route to, on the one page whose
 * entire claim is that its numbers are real. See the header of
 * `lib/projectPosition.ts`.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import TimeBarsTab from "@/components/risk/TimeBarsTab";
import EvidenceTab from "@/components/risk/EvidenceTab";
import InsurerTab from "@/components/risk/InsurerTab";
import CommercialTab from "@/components/risk/CommercialTab";
import HealthMasthead, { type SignalCounts } from "@/components/risk/HealthMasthead";
import {
  AcknowledgedList, SignalFeed, type RiskSignal,
} from "@/components/risk/SignalFeed";
import { type TabKey, resolveTab, slugFor, tabsFor } from "@/components/risk/tabs";
import { useProjectCommercials } from "@/hooks/useProjectCommercials";
import { buildKeyIndicators } from "@/lib/projectPosition";

interface SignalsResponse {
  signals: RiskSignal[];
  counts: SignalCounts;
}

interface RiskForecast {
  overall_severity: string;
  ai_summary: string;
  recommendations: string[];
}

/** Stable DOM ids so each tab can name the panel it controls, and vice versa. */
const slugId = (t: string) => t.toLowerCase().replace(/[^a-z]+/g, "-");
const tabId = (t: TabKey) => `health-tab-${slugId(t)}`;
const panelId = (t: TabKey) => `health-panel-${slugId(t)}`;

export default function ProjectHealth() {
  const projectId = localStorage.getItem("selectedProjectId");
  const [ackTarget, setAckTarget] = useState<RiskSignal | null>(null);
  const [ackNote, setAckNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const { data, isLoading, isError, refetch } = useFetch<SignalsResponse>(
    projectId ? `projects/${projectId}/risk-signals/?refresh=true` : null
  );

  // The narrative sentence reuses the pre-existing risk-forecast engine.
  const { data: forecast } = useFetch<RiskForecast>(
    projectId ? `projects/${projectId}/risk-forecast/?ai=false` : null
  );

  const { mutateAsync: post } = usePost();

  // The commercial position. Fetches NOTHING without finance.view — see the
  // header of useProjectCommercials — so a contractor's browser never holds
  // the contract sum, the certified value or the retention balance.
  const commercials = useProjectCommercials(projectId ?? undefined);
  const visibleTabs = tabsFor(commercials.canViewFinance);

  // Deep-link behaviour is unchanged and must stay so: `?tab=` on this route
  // is consumed by homepage links. `resolveTab` is the same rule as before —
  // slug to tab, falling back to the first tab when the slug is unknown or the
  // viewer may not see that tab — moved into `components/risk/tabs.ts` where
  // it can be tested without mounting the page.
  const [tab, setTab] = useState<TabKey>(() =>
    resolveTab(searchParams.get("tab"), true),
  );
  const activeTab = visibleTabs.includes(tab) ? tab : "Risk signals";

  // Keep the URL in step so the tab is shareable and survives a reload.
  const chooseTab = (next: TabKey) => {
    setTab(next);
    const slug = slugFor(next);
    const params = new URLSearchParams(searchParams);
    if (slug) params.set("tab", slug);
    setSearchParams(params, { replace: true });
  };

  /**
   * Arrow-key navigation across the strip, per the WAI-ARIA tabs pattern.
   *
   * `role="tablist"` is a promise that left/right move between tabs and that
   * the strip is a single tab stop. It was declared without either, so a
   * keyboard user was told to press an arrow key that did nothing.
   */
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();

    const i = visibleTabs.indexOf(activeTab);
    const last = visibleTabs.length - 1;
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? last
      : e.key === "ArrowLeft" ? (i <= 0 ? last : i - 1)
      : (i >= last ? 0 : i + 1);

    chooseTab(visibleTabs[next]);
    // Selection follows focus, so focus has to follow selection back.
    document.getElementById(tabId(visibleTabs[next]))?.focus();
  };

  const counts: SignalCounts = data?.counts ?? { red: 0, orange: 0, green: 0, total: 0 };
  const signals = data?.signals ?? [];

  /**
   * The four Key Indicators.
   *
   * `counts` is the risk engine's own count for a viewer who holds
   * `compliance.view` — which everybody on this page does, it is the route's
   * gate — and the three financial indicators are built only when
   * `canViewFinance` is true. `isError` is passed through as `riskUnavailable`
   * so an outage can never be drawn as a clear project.
   */
  const indicators = useMemo(
    () =>
      buildKeyIndicators({
        variations: commercials.variations,
        paymentDelay: commercials.paymentDelay,
        paymentsAnswered: commercials.paymentsAnswered,
        retention: commercials.retention,
        riskCounts: isError ? null : counts,
        riskUnavailable: isError,
        canViewFinance: commercials.canViewFinance,
      }),
    [
      commercials.variations,
      commercials.paymentDelay,
      commercials.paymentsAnswered,
      commercials.retention,
      commercials.canViewFinance,
      counts,
      isError,
    ],
  );

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
      // No permission check, on either side of the wire. See the note at the
      // Acknowledge button in `components/risk/SignalFeed.tsx`.
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
  // could not read them. Sits above everything else so it also covers the
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
          and every other page runs full width with a plain space-y-6 wrapper. */}
      <div className="space-y-6">
        {/* ── 1. Header ─────────────────────────────────────────────────── */}
        {/* Refresh is a page action, not a tab action. It refetches the
            signals that feed the masthead, and the masthead is on every tab —
            so the button no longer appears and disappears as the reader moves
            across the strip. */}
        {/* No `description`. The page-top rule (see `PageHeader`) is that
            nothing sits between the page title and the tab strip, and that
            the title band is one line high everywhere. The sentence that used
            to sit here — "live risk signals across programme, financial and
            contractual data" — is the masthead's job, and the masthead says
            it with the actual figures rather than in the abstract.

            Refresh is `h-8`, the header-action height Documents and Meetings
            use, so the strip below lands on the same 80px line as Finance's
            and Programme's. */}
        <PageHeader
          title="Project Health"
          actions={
            <Button
              variant="outline"
              className="h-8 text-xs rounded-lg"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          }
        />

        {/* ── 2. Lens ───────────────────────────────────────────────────── */}
        {/* Same tab strip as Finance and Programme: text-sm py-4 px-6,
            border-b-2 underline pulled onto the container's own hairline.

            The strip SCROLLS. Five tabs at px-6 are ~190px wider than `main`
            at 390px and ~67px wider at 768px, and without an overflow
            container that surplus does not clip — it widens the flex parent
            and drags the whole page sideways, so every panel below inherits a
            horizontal scroll it did not ask for. `overflow-x-auto` with
            `min-w-max` inside keeps the overflow inside the strip. */}
        <div className="overflow-x-auto border-b border-border">
          <div
            className="flex items-center gap-2 min-w-max"
            role="tablist"
            aria-label="Project Health views"
            onKeyDown={onTabKeyDown}
          >
            {visibleTabs.map(t => (
              <button
                key={t}
                id={tabId(t)}
                role="tab"
                type="button"
                aria-selected={activeTab === t}
                aria-controls={panelId(t)}
                // Roving tabindex: the strip is one tab stop and the arrow
                // keys move within it, which is what `role="tablist"` promises
                // a screen-reader user and what this strip did not deliver.
                tabIndex={activeTab === t ? 0 : -1}
                onClick={() => chooseTab(t)}
                className={cn(
                  "text-sm py-4 px-6 border-b-2 -mb-px transition-colors outline-none whitespace-nowrap",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
                  activeTab === t
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
                {t === "Risk signals" && counts.total > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                    {counts.total}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. Verdict and position ───────────────────────────────────── */}
        {/* BELOW the strip, not above it.

            It stays a page-level band rather than moving inside a tab, for
            the reason it was lifted out of "Risk signals" in the first place:
            it is the one element all five tabs share, and a reader who
            follows a deep link to `?tab=commercial` or `?tab=insurer` still
            has to be told whether the project is in trouble. Putting it in
            the Risk signals tab alone would take the posture verdict and the
            payment-delay figure away from four of the five tabs.

            What changes is only its position relative to the strip. It was
            ~200px of card between the title and the tabs, which put this
            page's tab strip 210px below Finance's and Programme's — the one
            thing no amount of padding could reconcile. Under the strip it
            keeps every reader it had, and the strip lands on the same line as
            every other tabbed page's. */}
        {isLoading ? (
          <AwesomeLoader message="Evaluating project risk" />
        ) : (
          <HealthMasthead
            counts={counts}
            summary={forecast?.ai_summary}
            indicators={indicators}
          />
        )}

        {/* ── 4. Detail ─────────────────────────────────────────────────── */}
        {/* One tabpanel per tab, named by the tab that controls it. The strip
            declared `role="tablist"` with nothing on the other end of it. */}
        <div
          role="tabpanel"
          id={panelId(activeTab)}
          aria-labelledby={tabId(activeTab)}
          tabIndex={-1}
          className="space-y-6"
        >
          {activeTab === "Notice deadlines" && <TimeBarsTab projectId={projectId} />}
          {activeTab === "Evidence" && <EvidenceTab projectId={projectId} />}
          {activeTab === "Insurer" && <InsurerTab projectId={projectId} />}

          {activeTab === "Commercial position" &&
            (commercials.isLoading ? (
              <AwesomeLoader message="Reading the commercial position" />
            ) : (
              <CommercialTab data={commercials} />
            ))}

          {activeTab === "Risk signals" && !isLoading && (
            <>
              <SignalFeed signals={live} onAcknowledge={setAckTarget} />
              <AcknowledgedList signals={acknowledged} onAcknowledge={setAckTarget} />

              {counts.total === 0 && (
                <EmptyState
                  icon={CheckCircle2}
                  title="No live risk signals"
                  // Not "everything is within tolerance". A rule with no
                  // milestones, no certificates and no variations to read
                  // produces this same empty list.
                  description="No rule fired against this project. That is not the same as a clear project — a rule with nothing to read reports nothing."
                />
              )}
            </>
          )}
        </div>
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
