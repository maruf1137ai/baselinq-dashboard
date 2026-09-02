import { AlertTriangle, CheckCircle2, Shield, TrendingDown } from "lucide-react";
import { AiMark } from "@/components/icons/AiMark";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Timeline from "./timeline";
import Milestone from "./milestone";
import { AddPhaseDialog } from "./AddPhaseDialog";
import { AcceptBaselineDialog } from "./AcceptBaselineDialog";
import { useRiskForecast, Severity } from "@/hooks/useRiskForecast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { useMilestoneDisciplineAccess } from "@/hooks/useMilestones";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tabs = ["Schedule", "Milestones", "Risk Forecast"];

// Discipline axis — independent of the Schedule/Milestones/Risk Forecast tabs
// above. It picks which discipline's phases/fees the active tab shows.
const DISCIPLINES = [
  { value: "construction", label: "Construction" },
  { value: "architectural", label: "Architectural" },
  { value: "engineering", label: "Engineering" },
  { value: "quantity_surveying", label: "Quantity Surveying" },
  { value: "other", label: "Other" },
] as const;

const Window = () => {
  // ── Deep link: /programme?milestone=<milestoneId> ─────────────────────────
  // Same pattern as Project Health: useSearchParams drives the tab state the
  // page already has, and switching tabs writes back, so the URL stays
  // shareable and survives a reload.
  //
  // A named milestone lives on the Milestones tab, so the parameter opens
  // that tab. It cannot open a tab that does not exist, and it fetches
  // nothing by id — the milestone is only ever highlighted if it is already
  // in the list this viewer's own request returned. An id that is stale, or
  // that belongs to a project this user is not on, opens the Milestones tab
  // with the full, unfiltered list and nothing highlighted: the same page the
  // user would see having clicked the tab themselves, never an error and
  // never an empty list implying the phase was deleted.
  const [searchParams, setSearchParams] = useSearchParams();
  const milestoneParam = searchParams.get("milestone");
  const [tabChoice, setTabChoice] = useState<string | null>(null);
  const activeTab = tabChoice ?? (milestoneParam ? "Milestones" : "Schedule");

  const chooseTab = (next: string) => {
    setTabChoice(next);
    if (next !== "Milestones" && milestoneParam) {
      // Leaving the tab the selection lives on: drop it rather than leave a
      // parameter pointing at a row that is no longer rendered.
      const params = new URLSearchParams(searchParams);
      params.delete("milestone");
      setSearchParams(params, { replace: true });
    }
  };

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const projectId = localStorage.getItem("selectedProjectId");

  const { canViewOtherDisciplines } = usePermissions();
  const [discipline, setDiscipline] = useState(
    () => localStorage.getItem("programmeDiscipline") || "construction"
  );
  useEffect(() => {
    localStorage.setItem("programmeDiscipline", discipline);
  }, [discipline]);

  // Same authorization facts MilestoneListCreateView.post checks server-side
  // — fetched once per project, compared against whichever discipline tab is
  // active, so "Add Phase" never appears somewhere the backend would 403 it.
  // Defaults to false while loading rather than flashing a button that then
  // disappears.
  const { data: disciplineAccess } = useMilestoneDisciplineAccess(projectId);
  const canCreate =
    !!disciplineAccess &&
    (disciplineAccess.fullVisibility || discipline === disciplineAccess.ownDiscipline);

  return (
    <div className="space-y-0">
      {/* Shared "Add Phase" dialog — triggered from any tab */}
      <AddPhaseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        discipline={discipline}
      />

      {/*
        ── The discipline picker rides the tab rail ────────────────────────

        It used to sit on a row of its own: `py-3` around a 32px select, so
        56px of page for one control, directly above a 54px tab strip. The
        chart started 190px down against 80px on Home and Finance.

        The rail is already 54px tall and its right two-thirds are empty, so
        the picker costs nothing there — and the two controls that scope this
        view now sit on one line instead of stacked, which is what they are:
        a discipline axis and a view axis over the same programme.

        A Contractor (no cross-discipline permission) still never mounts the
        Select, so this user can never issue a request for another
        discipline's phases or fees. Only where it is drawn has changed.
      */}
      <div className="flex items-center justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => chooseTab(tab)}
              /* `whitespace-nowrap`: with the picker now sharing the rail,
                 "Risk Forecast" wrapped to two lines and took the rail from
                 54px to 74px — giving back most of what moving the picker
                 saved. */
              className={`text-sm py-3 px-6 border-b-2 -mb-px whitespace-nowrap transition-all ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "text-muted-foreground border-transparent"
              }`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0 pr-1">
          <span className="text-xs text-muted-foreground">Discipline</span>
          {canViewOtherDisciplines ? (
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCIPLINES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-foreground font-medium">Construction</span>
          )}
        </div>
      </div>

      {/* Tab Content — Full Width */}
      <div className="pt-6">
        {activeTab === "Schedule" && (
          <Timeline
            projectId={projectId}
            discipline={discipline}
            canCreate={canCreate}
            onAddMilestone={() => setAddDialogOpen(true)}
          />
        )}
        {activeTab === "Milestones" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <AcceptBaselineDialog projectId={projectId} />
            </div>
            <Milestone
              projectId={projectId}
              discipline={discipline}
              canManage={canCreate}
              onAddMilestone={() => setAddDialogOpen(true)}
              selectedMilestoneId={milestoneParam}
            />
          </div>
        )}
        {activeTab === "Risk Forecast" && <RiskForecast projectId={projectId} />}
      </div>
    </div>
  );
};

const SEVERITY_DOT: Record<Severity, string> = {
  green: "bg-green-500",
  orange: "bg-amber-500",
  red: "bg-red-500",
};

const SEVERITY_BADGE: Record<Severity, string> = {
  green: "text-green-700 bg-green-50 border-green-200",
  orange: "text-amber-700 bg-amber-50 border-amber-200",
  red: "text-red-700 bg-red-50 border-red-200",
};

function SeverityDot({ severity }: { severity: Severity }) {
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[severity]}`} />;
}

function SignalRow({ severity, detail }: { severity: Severity; detail: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_BADGE[severity]}`}>
      <SeverityDot severity={severity} />
      <span className="text-sm leading-snug">{detail}</span>
    </div>
  );
}

// Risk Forecast — the differentiator
function RiskForecast({ projectId }: { projectId: string | null }) {
  const { data, isLoading } = useRiskForecast(projectId);

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <div className="p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-1.5 mb-3">
          <AiMark className="text-primary" />
          <h2 className="text-sm font-medium text-foreground">AI Programme Analysis</h2>
          {data && (
            <span className={`ml-auto inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${SEVERITY_BADGE[data.overall_severity]}`}>
              <SeverityDot severity={data.overall_severity} />
              {data.overall_severity === "green" ? "On Track" : data.overall_severity === "orange" ? "Attention Needed" : "At Risk"}
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : data?.ai_summary ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{data.ai_summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Add programme phases and tasks to generate an AI analysis of this project.
          </p>
        )}
      </div>

      {/* Delay Risks */}
      <div className="p-4 bg-card border border-border rounded-xl">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          Delay Risks
        </h2>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : data?.delay_risks?.length ? (
          <div className="space-y-2">
            {data.delay_risks.map((r, i) => (
              <SignalRow key={i} severity={r.severity} detail={r.detail} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600 py-4 justify-center">
            <CheckCircle2 className="h-4 w-4" />
            No delay risks identified
          </div>
        )}
      </div>

      {/* Financial Impact */}
      <div className="p-4 bg-card border border-border rounded-xl">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Financial Impact
        </h2>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12 w-full" /></div>
        ) : data?.financial_impacts?.length ? (
          <div className="space-y-2">
            {data.financial_impacts.map((f, i) => (
              <SignalRow key={i} severity={f.severity} detail={f.detail} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600 py-4 justify-center">
            <CheckCircle2 className="h-4 w-4" />
            No financial risks identified
          </div>
        )}
      </div>

      {/* Compliance Gates */}
      <div className="p-4 bg-card border border-border rounded-xl">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Compliance Gates
        </h2>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12 w-full" /></div>
        ) : data?.compliance_gates?.length ? (
          <div className="space-y-2">
            {data.compliance_gates.map((g, i) => (
              <SignalRow key={i} severity={g.severity} detail={g.detail} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600 py-4 justify-center">
            <CheckCircle2 className="h-4 w-4" />
            No compliance gates pending
          </div>
        )}
      </div>

      {/* Recommended Actions */}
      <div className="p-4 bg-card border border-border rounded-xl">
        <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <AiMark className="text-primary" />
          Recommended Actions
        </h2>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-4/5" /></div>
        ) : data?.recommendations?.length ? (
          <ol className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                <span className="shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600 py-4 justify-center">
            <CheckCircle2 className="h-4 w-4" />
            No actions required — project looks healthy
          </div>
        )}
      </div>
    </div>
  );
}

export default Window;
