import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Shield,
  TrendingUp,
  FileText,
  Lightbulb,
  Pencil,
  ExternalLink,
  Download,
  XCircle,
  Info,
  DollarSign,
  Calendar,
  AlertCircle,
  Link2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { sectionClass } from "./SharedComponents";

// ─── Status helpers ───
const statusColor = (status: string) => {
  const s = status?.toUpperCase();
  if (s === "COMPLIANT" || s === "CLEAR") return { bg: "bg-[#00b894]/10", border: "border-[#00b894]", text: "text-[#00b894]", dot: "bg-[#00b894]" };
  if (s === "PENDING" || s === "WARNING") return { bg: "bg-[#fdcb6e]/10", border: "border-[#fdcb6e]", text: "text-[#e17055]", dot: "bg-[#fdcb6e]" };
  if (s === "OVERDUE" || s === "NON_COMPLIANT") return { bg: "bg-[#d63031]/10", border: "border-[#d63031]", text: "text-[#d63031]", dot: "bg-[#d63031]" };
  return { bg: "bg-[#0984e3]/10", border: "border-[#0984e3]", text: "text-[#0984e3]", dot: "bg-[#0984e3]" };
};

const riskConfig = (risk: string) => {
  const r = risk?.toUpperCase();
  if (r === "LOW") return { bg: "bg-[#00b894]/10", border: "border-[#00b894]", text: "text-[#00b894]", label: "LOW RISK" };
  if (r === "MEDIUM") return { bg: "bg-[#fdcb6e]/15", border: "border-[#e17055]", text: "text-[#e17055]", label: "MEDIUM RISK" };
  return { bg: "bg-[#d63031]/10", border: "border-[#d63031]", text: "text-[#d63031]", label: "HIGH RISK" };
};

const isGreenStatus = (status: string) => {
  const s = status?.toUpperCase();
  return s === "COMPLIANT" || s === "CLEAR";
};

// ─── Deadline helpers ───
const getDeadlineInfo = (deadline: string | null) => {
  if (!deadline) return null;
  const due = new Date(deadline);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: "text-[#d63031]", urgent: true };
  if (diffDays === 0) return { text: "Due today", color: "text-[#d63031]", urgent: true };
  if (diffDays <= 3) return { text: `Response due in ${diffDays} days`, color: "text-[#e17055]", urgent: true };
  return { text: `Response due in ${diffDays} days`, color: "text-[#6B7280]", urgent: false };
};

// ─── Collapsible Compliance Item ───
function ComplianceItem({ label, item, defaultOpen }: { label: string; item: any; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const sc = statusColor(item.status);
  const isGreen = isGreenStatus(item.status);

  return (
    <div
      className="border rounded-[12px] overflow-hidden transition-all duration-200 border-[#e9ecef]"
      style={{ borderLeftWidth: "4px", borderLeftColor: isGreen ? "#00b894" : item.status?.toUpperCase() === "PENDING" ? "#fdcb6e" : "#d63031" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f8f9fa] transition-colors"
      >
        {isGreen ? (
          <CheckCircle2 className="h-4 w-4 text-[#00b894] shrink-0" />
        ) : item.status?.toUpperCase() === "PENDING" ? (
          <Clock className="h-4 w-4 text-[#e17055] shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-[#d63031] shrink-0" />
        )}

        <span className="text-[11px] font-normal uppercase tracking-[0.05em] text-[#1a1a1a] flex-1">
          {label}
        </span>

        <span className={cn("text-[11px] font-normal uppercase tracking-[0.05em] border rounded-full px-2.5 py-0.5", sc.text, sc.border)}>
          {item.status}
        </span>

        {item.clause_reference && (
          <span className="text-[10px] text-[#9CA3AF] ml-1">Cl. {item.clause_reference}</span>
        )}

        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
        )}
      </button>

      <div className={cn(
        "overflow-hidden transition-all duration-200",
        open ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-4 pb-3 pt-0 space-y-1.5 border-t border-[#f0f0f0]">
          <p className="text-sm text-[#4B5563] leading-relaxed pt-2.5">{item.finding}</p>
          {item.clause_reference && (
            <p className="text-[11px] text-[#9CA3AF]">
              Ref: Clause {item.clause_reference} {item.page_number ? `(Page ${item.page_number})` : ""}
            </p>
          )}
          {item.response_deadline && (
            <p className="text-[11px] font-medium text-[#d63031]">
              Deadline: {formatDate(item.response_deadline)}
            </p>
          )}
          {item.authorized_party && (
            <p className="text-[11px] text-[#6c5ce7] font-medium">
              Responsible: {item.authorized_party}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Impact Indicator ───
function ImpactIndicator({ label, item, icon: Icon, defaultOpen }: { label: string; item: any; icon: any; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isLikely = item.likely === true;
  const color = isLikely ? "text-[#d63031]" : "text-[#00b894]";
  const bgColor = isLikely ? "bg-[#d63031]/5" : "bg-[#f8f9fa]";

  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn("flex flex-col items-center text-center p-3 rounded-[12px] border border-[#e9ecef] transition-all duration-200 hover:border-[#dee2e6] cursor-pointer w-full", bgColor)}
    >
      <Icon className={cn("h-4 w-4 mb-1.5", color)} />
      <span className="text-[10px] text-[#6B7280] uppercase tracking-[0.05em] font-medium">{label}</span>
      <span className={cn("text-[12px] font-normal mt-0.5", color)}>
        {isLikely ? "LIKELY" : "UNLIKELY"}
      </span>
      {item.severity && (
        <span className="text-[9px] mt-1 border rounded-full px-2 py-0.5 border-[#e9ecef] text-[#6B7280]">
          {item.severity} SEVERITY
        </span>
      )}
      {open && (item.assessment || item.consequences) && (
        <p className="text-[11px] text-[#6B7280] mt-2 leading-relaxed text-left w-full">
          {item.assessment || item.consequences}
        </p>
      )}
    </button>
  );
}

// ─── Main RFI Analysis Component ───
export const RFIAnalysis = ({ data, visibleSections }: { data: any; visibleSections: number }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "compliance" | "impact">("overview");

  const risk = riskConfig(data.risk_level || "LOW");
  const complianceEntries = data.contract_compliance ? Object.entries(data.contract_compliance) : [];
  const implications = data.potential_implications ? Object.entries(data.potential_implications) : [];

  // Calculate compliance summary
  const complianceCount = complianceEntries.length;
  const compliantCount = complianceEntries.filter(([, v]: any) => v.status?.toUpperCase() === "COMPLIANT").length;
  const pendingCount = complianceEntries.filter(([, v]: any) => v.status?.toUpperCase() === "PENDING").length;
  const clearCount = complianceEntries.filter(([, v]: any) => v.status?.toUpperCase() === "CLEAR").length;

  // Items needing attention (non-green)
  const attentionItems = complianceEntries.filter(([, v]: any) => !isGreenStatus(v.status));

  // Deadline info
  const responseTimeline = data.contract_compliance?.response_timeline;
  const deadlineInfo = responseTimeline?.response_deadline ? getDeadlineInfo(responseTimeline.response_deadline) : null;

  // Recommendations
  const recs = data.recommendations || {};
  const employerRecs = [...(recs.for_employer || []), ...(recs.for_responding_party || [])];
  const contractorRecs = recs.for_contractor || [];

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "compliance" as const, label: "Compliance" },
    { id: "impact" as const, label: "Impact & Actions" },
  ];

  return (
    <div className="space-y-0">
      {/* ─── Verdict Banner ─── */}
      <div className={sectionClass(visibleSections, 0)}>
        <div className={cn("flex items-center justify-between p-4 rounded-t-[12px] border", risk.bg, risk.border)}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-full shrink-0", risk.bg)}>
              {data.risk_level?.toUpperCase() === "LOW" ? (
                <CheckCircle2 className={cn("h-5 w-5", risk.text)} />
              ) : data.risk_level?.toUpperCase() === "MEDIUM" ? (
                <AlertTriangle className={cn("h-5 w-5", risk.text)} />
              ) : (
                <XCircle className={cn("h-5 w-5", risk.text)} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[11px] font-normal uppercase tracking-[0.05em] border rounded-full px-2.5 py-0.5", risk.text, risk.border)}>
                  {risk.label}
                </span>
                <span className="text-[11px] font-normal uppercase tracking-[0.05em] text-[#6B7280]">
                  {data.overall_assessment?.replace(/_/g, " ") || "ROUTINE"}
                </span>
                {data.rfi_id && (
                  <span className="text-[11px] text-[#9CA3AF]">{data.rfi_id}</span>
                )}
              </div>
              <p className="text-sm text-[#4B5563] mt-1 leading-relaxed line-clamp-2">{data.summary}</p>
            </div>
          </div>

          {deadlineInfo && (
            <div className="text-right shrink-0 ml-4">
              <p className={cn("text-[12px] font-medium whitespace-nowrap", deadlineInfo.color)}>
                {deadlineInfo.urgent && <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />}
                {deadlineInfo.text}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className={sectionClass(visibleSections, 1)}>
        <div className="flex border border-t-0 border-[#e9ecef] rounded-b-[12px] bg-white overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 text-[12px] font-medium tracking-wide transition-colors",
                activeTab === tab.id
                  ? "text-[#6c5ce7] border-b-2 border-[#6c5ce7] bg-[#f8f9fa]"
                  : "text-[#6B7280] hover:text-[#4B5563] hover:bg-[#f8f9fa]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeTab === "overview" && (
        <div className="space-y-4 pt-4">
          {/* Needs Attention */}
          <div className={sectionClass(visibleSections, 2)}>
            {attentionItems.length > 0 ? (
              <div className="rounded-[12px] border border-[#fdcb6e]/40 bg-[#fdcb6e]/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-[#e17055]" />
                  <span className="text-[13px] font-medium text-[#1a1a1a]">Requires Attention</span>
                  <span className="text-[10px] bg-[#e17055] text-white rounded-full px-2 py-0.5 font-medium">{attentionItems.length}</span>
                </div>
                <div className="space-y-2">
                  {attentionItems.map(([key, value]: any) => {
                    const sc = statusColor(value.status);
                    const dl = value.response_deadline ? getDeadlineInfo(value.response_deadline) : null;
                    return (
                      <div key={key} className="flex items-center gap-3 p-2.5 rounded-[8px] bg-white" style={{ borderLeft: `4px solid ${value.status?.toUpperCase() === "PENDING" ? "#fdcb6e" : "#d63031"}` }}>
                        <Clock className={cn("h-3.5 w-3.5 shrink-0", sc.text)} />
                        <span className="text-[12px] text-[#1a1a1a] font-medium flex-1">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                        <span className={cn("text-[10px] font-normal uppercase tracking-[0.05em] border rounded-full px-2 py-0.5", sc.text, sc.border)}>
                          {value.status}
                        </span>
                        {dl && (
                          <span className={cn("text-[10px] font-medium", dl.color)}>
                            {dl.text}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-[12px] bg-[#00b894]/5 border border-[#00b894]/20">
                <CheckCircle2 className="h-4 w-4 text-[#00b894]" />
                <span className="text-[13px] font-medium text-[#00b894]">All compliance checks passed</span>
              </div>
            )}
          </div>

          {/* Quick Info Grid */}
          <div className={sectionClass(visibleSections, 3)}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "INFORMATION TYPE", value: data.rfi_categorization?.information_type || "—", icon: Info },
                { label: "DISCIPLINE", value: data.rfi_categorization?.discipline_relevance || "—", icon: Shield },
                { label: "URGENCY", value: data.rfi_categorization?.urgency_level || "—", icon: AlertCircle },
                { label: "RESPONSIBLE PARTY", value: data.contract_compliance?.authority_to_respond?.authorized_party || "—", icon: FileText },
              ].map((card) => (
                <div key={card.label} className="p-3 rounded-[12px] bg-[#f8f9fa] border border-[#e9ecef]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <card.icon className="h-3 w-3 text-[#9CA3AF]" />
                    <span className="text-[10px] font-normal uppercase tracking-[0.05em] text-[#9CA3AF]">{card.label}</span>
                  </div>
                  <p className="text-[13px] font-medium text-[#1a1a1a]">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className={sectionClass(visibleSections, 4)}>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] bg-[#6c5ce7] text-white text-[13px] font-medium hover:bg-[#5f4dd0] transition-colors">
                <Pencil className="h-3.5 w-3.5" />
                Draft Response
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] border border-[#e9ecef] text-[#4B5563] text-[13px] font-medium hover:bg-[#f8f9fa] transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />
                View Document
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] border border-[#e9ecef] text-[#4B5563] text-[13px] font-medium hover:bg-[#f8f9fa] transition-colors">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: COMPLIANCE ─── */}
      {activeTab === "compliance" && (
        <div className="space-y-4 pt-4">
          {/* Scorecard */}
          <div className={sectionClass(visibleSections, 2)}>
            <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#f8f9fa] border border-[#e9ecef]">
              <span className="text-[12px] text-[#4B5563]">
                <span className="font-medium text-[#1a1a1a]">{complianceCount} checks:</span>{" "}
                {compliantCount > 0 && <span className="text-[#00b894]">{compliantCount} Compliant</span>}
                {clearCount > 0 && <>{compliantCount > 0 && ", "}<span className="text-[#0984e3]">{clearCount} Clear</span></>}
                {pendingCount > 0 && <>{(compliantCount > 0 || clearCount > 0) && ", "}<span className="text-[#e17055]">{pendingCount} Pending</span></>}
              </span>
              <div className="flex items-center gap-1.5">
                {complianceEntries.map(([key, value]: any) => (
                  <div
                    key={key}
                    className={cn("h-2.5 w-2.5 rounded-full", statusColor(value.status).dot)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible Checklist */}
          <div className={sectionClass(visibleSections, 3)}>
            <div className="space-y-2">
              {complianceEntries.map(([key, value]: any) => (
                <ComplianceItem
                  key={key}
                  label={key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  item={value}
                  defaultOpen={!isGreenStatus(value.status)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: IMPACT & ACTIONS ─── */}
      {activeTab === "impact" && (
        <div className="space-y-4 pt-4">
          {/* Impact Assessment Row */}
          {implications.length > 0 && (
            <div className={sectionClass(visibleSections, 2)}>
              <div className="grid grid-cols-4 gap-2">
                {implications.map(([key, value]: any) => {
                  const icons: Record<string, any> = {
                    design_change: Pencil,
                    cost_implications: DollarSign,
                    programme_impact: Calendar,
                    delay_risk: Clock,
                  };
                  const IconComp = icons[key] || TrendingUp;
                  return (
                    <ImpactIndicator
                      key={key}
                      label={key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      item={value}
                      icon={IconComp}
                      defaultOpen={value.likely === true}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {(employerRecs.length > 0 || contractorRecs.length > 0) && (
            <div className={sectionClass(visibleSections, 3)}>
              <h4 className="text-[13px] font-medium text-[#1a1a1a] mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-[#6c5ce7]" />
                Recommendations
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {employerRecs.length > 0 && (
                  <div className="p-4 rounded-[12px] border border-[#e9ecef] bg-[#f8f9fa]">
                    <p className="text-[10px] font-normal uppercase tracking-[0.05em] text-[#6c5ce7] mb-2">For Employer</p>
                    <ul className="space-y-2">
                      {employerRecs.map((rec: string, i: number) => (
                        <li key={i} className="text-[12px] text-[#4B5563] flex items-start gap-2 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#6c5ce7] mt-1.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {contractorRecs.length > 0 && (
                  <div className="p-4 rounded-[12px] border border-[#e9ecef] bg-[#f8f9fa]">
                    <p className="text-[10px] font-normal uppercase tracking-[0.05em] text-[#9CA3AF] mb-2">For Contractor</p>
                    <ul className="space-y-2">
                      {contractorRecs.map((rec: string, i: number) => (
                        <li key={i} className="text-[12px] text-[#4B5563] flex items-start gap-2 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF] mt-1.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Linked References */}
          {data.contract_citations && data.contract_citations.length > 0 && (
            <div className={sectionClass(visibleSections, 4)}>
              <h4 className="text-[13px] font-medium text-[#1a1a1a] mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#0984e3]" />
                Linked References
              </h4>
              <div className="space-y-1.5">
                {data.contract_citations.map((cite: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-[8px] border border-[#e9ecef] hover:bg-[#f8f9fa] transition-colors">
                    <FileText className="h-3.5 w-3.5 text-[#0984e3] shrink-0" />
                    <span className="text-[12px] text-[#1a1a1a] font-medium">
                      Clause {cite.clause_number}, {cite.clause_title}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">Page {cite.page_number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Flags */}
          {data.risk_flags && data.risk_flags.length > 0 && (
            <div className={sectionClass(visibleSections, 5)}>
              <h4 className="text-[13px] font-medium text-[#d63031] mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Flags
              </h4>
              <div className="space-y-2">
                {data.risk_flags.map((flag: any, i: number) => (
                  <div key={i} className="p-3 rounded-[12px] border border-[#d63031]/20 bg-[#d63031]/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-[#1a1a1a]">{flag.title || flag}</span>
                      {flag.severity && (
                        <span className={cn(
                          "text-[10px] font-normal uppercase border rounded-full px-2 py-0.5",
                          flag.severity === "HIGH" ? "text-[#d63031] border-[#d63031]" : "text-[#e17055] border-[#e17055]"
                        )}>
                          {flag.severity}
                        </span>
                      )}
                    </div>
                    {flag.description && <p className="text-[11px] text-[#6B7280]">{flag.description}</p>}
                    {flag.recommended_action && (
                      <p className="text-[11px] text-[#6c5ce7] font-medium mt-1">Action: {flag.recommended_action}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
