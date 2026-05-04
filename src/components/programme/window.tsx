import { AlertTriangle, CheckCircle2, Shield, Sparkles, TrendingDown } from "lucide-react";
import React, { useState } from "react";
import Timeline from "./timeline";
import Milestone from "./milestone";
import { AddPhaseDialog } from "./AddPhaseDialog";
import { useRiskForecast, Severity } from "@/hooks/useRiskForecast";
import { Skeleton } from "@/components/ui/skeleton";

const tabs = ["Schedule", "Milestones", "Risk Forecast"];

const Window = () => {
  const [activeTab, setActiveTab] = useState("Schedule");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const projectId = localStorage.getItem("selectedProjectId");

  return (
    <div className="space-y-0">
      {/* Shared "Add Phase" dialog — triggered from any tab */}
      <AddPhaseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-base py-4 px-6 border-b-2 transition-all ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "text-muted-foreground border-transparent"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content — Full Width */}
      <div className="pt-6">
        {activeTab === "Schedule" && (
          <Timeline
            projectId={projectId}
            onAddMilestone={() => setAddDialogOpen(true)}
          />
        )}
        {activeTab === "Milestones" && (
          <Milestone projectId={projectId} onAddMilestone={() => setAddDialogOpen(true)} />
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
      <div className="p-4 border border-border rounded-lg">
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
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
      <div className="p-4 border border-border rounded-lg">
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
      <div className="p-4 border border-border rounded-lg">
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
      <div className="p-4 border border-border rounded-lg">
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
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Recommended Actions
        </h2>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-4/5" /></div>
        ) : data?.recommendations?.length ? (
          <ol className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
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
