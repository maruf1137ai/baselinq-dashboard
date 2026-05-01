import { AlertTriangle, Shield, Sparkles, TrendingDown } from "lucide-react";
import React, { useState } from "react";
import Timeline from "./timeline";
import Milestone from "./milestone";

const tabs = ["Schedule", "Milestones", "Risk Forecast"];

const Window = () => {
  const [activeTab, setActiveTab] = useState("Schedule");

  return (
    <div className="space-y-0">
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
        {activeTab === "Schedule" && <Timeline />}
        {activeTab === "Milestones" && <Milestone />}
        {activeTab === "Risk Forecast" && <RiskForecast />}
      </div>
    </div>
  );
};

// Risk Forecast — the differentiator
function RiskForecast() {
  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <div className="p-4 border border-border rounded-lg">
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">AI Programme Analysis</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          AI analysis will appear here once programme data and tasks are added to the project.
        </p>
      </div>

      {/* Delay Risks */}
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          Delay Risks
        </h2>
        <p className="text-sm text-muted-foreground text-center py-6">No delay risks identified</p>
      </div>

      {/* Financial Impact */}
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Financial Impact
        </h2>
        <p className="text-sm text-muted-foreground text-center py-6">No financial risks identified</p>
      </div>

      {/* Compliance Gates */}
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Compliance Gates
        </h2>
        <p className="text-sm text-muted-foreground text-center py-6">No compliance gates pending</p>
      </div>

      {/* Recommendations */}
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Recommended Actions
        </h2>
        <p className="text-sm text-muted-foreground text-center py-6">No recommendations yet</p>
      </div>
    </div>
  );
}

export default Window;
