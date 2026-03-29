import { AlertTriangle, Calendar, ChevronDown, ExternalLink, Shield, Sparkles, TrendingDown } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Timeline from "./timeline";
import Milestone from "./milestone";
import { Badge } from "../ui/badge";

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
        <p className="text-sm text-foreground leading-relaxed">
          Based on current task velocity and open items, the project is tracking 12 days behind the baseline schedule. 
          Two critical path activities are at risk: Roof Structure (M3) and MEP First Fix (M4). 
          If unaddressed, the estimated financial impact is R250,000 in prolongation costs. 
          Three compliance gates are pending that could further delay progress.
        </p>
      </div>

      {/* Delay Risks */}
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          Delay Risks
          <Badge className="bg-red-50 text-red-700 border-0 text-xs px-2 py-0.5 rounded-full">2</Badge>
        </h2>
        <div className="space-y-4">
          <RiskItem
            title="Milestone M3 (Roof Complete) likely delayed by 12 days"
            impact="Critical path affected — pushes handover from Jun 30 to Jul 12"
            confidence={85}
            linkedItems={["RFI-021", "DC-014"]}
            severity="high"
          />
          <RiskItem
            title="MEP First Fix may slip 14 days"
            impact="Dependent on structural steel completion — currently 5 days behind"
            confidence={72}
            linkedItems={["M4", "VO-005"]}
            severity="high"
          />
        </div>
      </div>

      {/* Financial Impact */}
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Financial Impact
          <Badge className="bg-amber-50 text-amber-700 border-0 text-xs px-2 py-0.5 rounded-full">1</Badge>
        </h2>
        <div className="space-y-4">
          <RiskItem
            title="Variation VO-005 may push project over contingency by R250,000"
            impact="Current contingency: R509K / R750K (68% used). If VO-005 approved at full value, remaining buffer drops to R9K."
            confidence={90}
            linkedItems={["VO-005", "CONT-001"]}
            severity="medium"
          />
        </div>
      </div>

      {/* Compliance Gates */}
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Compliance Gates
          <Badge className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5 rounded-full">3</Badge>
        </h2>
        <div className="space-y-4">
          <ComplianceGate
            title="Client Approval for VO-001"
            deadline="Jan 8, 2025"
            status="overdue"
            impact="Blocks payment certificate PC-003"
            linkedItem="COMP-001"
          />
          <ComplianceGate
            title="Environmental Permit"
            deadline="Jan 8, 2025"
            status="overdue"
            impact="Required before foundation pour on Block B"
            linkedItem="COMP-002"
          />
          <ComplianceGate
            title="HSE Induction — Zone C"
            deadline="Feb 1, 2025"
            status="pending"
            impact="Must complete before MEP first fix begins"
            linkedItem="COMP-004"
          />
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-4 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Recommended Actions
        </h2>
        <div className="space-y-2">
          {[
            "Escalate VO-001 client approval — 2 days until penalty clause",
            "Schedule alternative date for concrete pour (Feb 17) as weather backup",
            "Fast-track Environmental Permit — blocking Block B foundation",
            "Review MEP subcontractor programme for acceleration options"
          ].map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <p className="text-sm text-foreground">{action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskItem({ title, impact, confidence, linkedItems, severity }: {
  title: string; impact: string; confidence: number; linkedItems: string[]; severity: string;
}) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm text-foreground font-medium">{title}</p>
        <Badge className={`text-xs px-2 py-0.5 rounded-full border-0 shrink-0 ml-2 ${
          severity === 'high' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {confidence}% likely
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{impact}</p>
      <div className="flex gap-1 mt-2">
        {linkedItems.map((item, i) => (
          <Link key={i} to="#" className="text-primary text-xs py-0.5 px-2 rounded bg-primary/10 flex items-center gap-1">
            {item} <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function ComplianceGate({ title, deadline, status, impact, linkedItem }: {
  title: string; deadline: string; status: string; impact: string; linkedItem: string;
}) {
  return (
    <div className={`p-3 rounded-lg ${status === 'overdue' ? 'bg-red-50/50' : 'bg-muted/30'}`}>
      {/* Row 1: Title + status badge + due date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-foreground font-medium">{title}</p>
          <Badge className={`text-xs px-2 py-0.5 rounded-full border-0 shrink-0 ${
            status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {status === 'overdue' ? 'Overdue' : 'Pending'}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          <Calendar className="h-3 w-3" /> Due: {deadline}
        </span>
      </div>
      {/* Row 2: Impact + linked item */}
      <div className="flex items-center gap-3 mt-1">
        <p className="text-xs text-muted-foreground">{impact}</p>
        <Link to="#" className="text-primary text-xs py-0.5 px-2 rounded bg-primary/10 inline-flex items-center gap-1 shrink-0">
          {linkedItem} <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

export default Window;
