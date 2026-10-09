import { AlertTriangle, CheckCircle2, XCircle, DollarSign, Calendar, Pencil, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RFISummaryData {
  schema_type: "rfi_summary";
  risk_level?: string;
  overall_assessment?: string;
  summary?: string;
  attention_count?: number;
  compliance_counts?: {
    compliant?: number;
    pending?: number;
    non_compliant?: number;
  };
  impacts?: Record<string, { likely?: boolean; severity?: string } | null>;
}

function isRFISummary(data: unknown): data is RFISummaryData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).schema_type === "rfi_summary"
  );
}

const riskConfig = (risk: string) => {
  const r = risk?.toUpperCase();
  if (r === "LOW") return { bg: "bg-[#00b894]/10", border: "border-[#00b894]/40", text: "text-[#00b894]", label: "LOW RISK" };
  if (r === "MEDIUM") return { bg: "bg-[#fdcb6e]/10", border: "border-[#e17055]/40", text: "text-[#e17055]", label: "MEDIUM RISK" };
  return { bg: "bg-[#d63031]/10", border: "border-[#d63031]/40", text: "text-[#d63031]", label: "HIGH RISK" };
};

const IMPACT_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  design_change: { label: "Design Change", Icon: Pencil },
  cost_implications: { label: "Cost", Icon: DollarSign },
  programme_impact: { label: "Programme", Icon: Calendar },
  delay_risk: { label: "Delay Risk", Icon: Clock },
};

/** Compact inline RFI analysis summary rendered below the chat welcome bubble. */
export const RFIAnalysisSummary = ({ data }: { data: unknown }) => {
  if (!isRFISummary(data)) return null;

  const risk = riskConfig(data.risk_level || "LOW");
  const counts = data.compliance_counts || {};
  const compliant = counts.compliant ?? 0;
  const pending = counts.pending ?? 0;
  const nonCompliant = counts.non_compliant ?? 0;
  const total = compliant + pending + nonCompliant;

  return (
    <section
      aria-label="RFI analysis summary"
      className={cn("mt-3 rounded-xl border p-3 space-y-2.5", risk.bg, risk.border)}
    >
      {/* Risk badge + overall assessment */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {data.risk_level?.toUpperCase() === "LOW" ? (
            <CheckCircle2 className={cn("h-4 w-4", risk.text)} />
          ) : data.risk_level?.toUpperCase() === "MEDIUM" ? (
            <AlertTriangle className={cn("h-4 w-4", risk.text)} />
          ) : (
            <XCircle className={cn("h-4 w-4", risk.text)} />
          )}
          <span className={cn("text-xs font-medium uppercase tracking-wide border rounded-full px-2 py-0.5", risk.text, risk.border)}>
            {risk.label}
          </span>
        </div>
        {data.overall_assessment && (
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {data.overall_assessment.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* One-line summary */}
      {data.summary && (
        <p className="text-xs text-[#4B5563] leading-relaxed">{data.summary}</p>
      )}

      {/* Compliance dot counts */}
      {total > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Compliance:</span>
          {compliant > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#00b894]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#00b894]" />
              {compliant} compliant
            </span>
          )}
          {pending > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#e17055]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#fdcb6e]" />
              {pending} pending
            </span>
          )}
          {nonCompliant > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#d63031]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#d63031]" />
              {nonCompliant} non-compliant
            </span>
          )}
          {data.attention_count != null && data.attention_count > 0 && (
            <span className="text-xs text-[#e17055] font-medium ml-1">
              · {data.attention_count} need{data.attention_count === 1 ? "s" : ""} attention
            </span>
          )}
        </div>
      )}

      {/* Impact tiles */}
      {data.impacts && Object.keys(data.impacts).length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(data.impacts).map(([key, val]) => {
            const meta = IMPACT_META[key];
            if (!meta || !val) return null;
            const { label, Icon } = meta;
            const likely = val.likely === true;
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col items-center text-center p-2 rounded-lg border text-xs",
                  likely
                    ? "bg-[#d63031]/5 border-[#d63031]/30"
                    : "bg-muted/50 border-border"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 mb-1", likely ? "text-[#d63031]" : "text-[#00b894]")} />
                <span className="text-muted-foreground font-medium leading-tight">{label}</span>
                <span className={cn("font-medium mt-0.5", likely ? "text-[#d63031]" : "text-[#00b894]")}>
                  {likely ? "LIKELY" : "UNLIKELY"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
