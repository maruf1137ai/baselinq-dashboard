import { FileText, Shield, Scale, Clock, AlertTriangle } from "lucide-react";
import { StatusHeader, sectionClass } from "./SharedComponents";
import { Badge } from "@/components/ui/badge";

export const VOAnalysis = ({ data, visibleSections }: { data: any, visibleSections: number }) => {
  return (
    <div className="space-y-6">
      <StatusHeader
        status={data.overall_status}
        risk={data.risk_level}
        time={data.processing_time_seconds}
        id={data.vo_id}
        visibleSections={visibleSections}
      />

      <div className={sectionClass(visibleSections, 1)}>
        <div className="p-6 bg-sidebar rounded-xl">
          <h4 className="text-base text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />Summary
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {data.procedural_compliance && (
        <div className={sectionClass(visibleSections, 2)}>
          <div className="p-6 bg-white border border-border rounded-xl">
            <h4 className="text-base text-foreground mb-5 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />Procedural Compliance
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.procedural_compliance).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-sidebar rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground normal-case">
                      {key.replace(/_/g, " ")}
                    </span>
                    <Badge variant="outline" className={`${value.status === "COMPLIANT" ? "text-green_dark border-green-200" : "text-warning border-warning/30"}`}>
                      {value.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">{value.finding}</p>
                  {value.clause_reference && (
                    <p className="text-xs text-gray-500">Ref: {value.clause_reference} {value.page_number ? `(Page ${value.page_number})` : ""}</p>
                  )}
                  {value.deadline_date && (
                    <p className="text-xs text-destructive mt-1 font-medium">Deadline: {value.deadline_date}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.valuation_assessment && (
        <div className={sectionClass(visibleSections, 3)}>
          <div className="p-6 bg-white border border-border rounded-xl">
            <h4 className="text-base text-foreground mb-5 flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />Valuation Assessment
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-sidebar rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground normal-case mb-2">Applicable Method</p>
                  <p className="text-sm font-medium">{data.valuation_assessment.applicable_method?.method}</p>
                  {data.valuation_assessment.applicable_method?.clause_reference && (
                    <p className="text-xs text-primary mb-1">Ref: {data.valuation_assessment.applicable_method.clause_reference}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{data.valuation_assessment.applicable_method?.finding}</p>
                </div>
                <div className="p-4 bg-sidebar rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground normal-case mb-2">Rate Analysis</p>
                  <Badge className={`${data.valuation_assessment.rate_analysis?.rates_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {data.valuation_assessment.rate_analysis?.rates_compliant ? "COMPLIANT" : "NON-COMPLIANT"}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-2">{data.valuation_assessment.rate_analysis?.finding}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {data.valuation_assessment.new_rates_permitted && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <p className="text-xs font-medium text-indigo-700 normal-case mb-2">New Rates Permitted</p>
                    <p className="text-sm font-medium">{data.valuation_assessment.new_rates_permitted.permitted ? "YES" : "NO"}</p>
                    {data.valuation_assessment.new_rates_permitted.clause_reference && (
                      <p className="text-xs text-indigo-500">Ref: {data.valuation_assessment.new_rates_permitted.clause_reference}</p>
                    )}
                    <p className="text-xs text-indigo-600 mt-1 italic">{data.valuation_assessment.new_rates_permitted.conditions}</p>
                  </div>
                )}
                {data.valuation_assessment.threshold_triggered && (
                  <div className={`p-4 rounded-lg border ${data.valuation_assessment.threshold_triggered.triggered ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"}`}>
                    <p className="text-xs font-medium normal-case mb-2">Threshold Triggers</p>
                    <p className="text-sm font-medium">{data.valuation_assessment.threshold_triggered.triggered ? "TRIGGERED" : "NONE"}</p>
                    {data.valuation_assessment.threshold_triggered.threshold_details && (
                      <p className="text-xs mt-1 text-amber-700">{data.valuation_assessment.threshold_triggered.threshold_details}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {data.time_impact && (
        <div className={sectionClass(visibleSections, 4)}>
          <div className="p-6 bg-white border border-border rounded-xl">
            <h4 className="text-base text-foreground mb-5 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />Time & Schedule Impact
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-muted-foreground normal-case mb-1">Critical Path</p>
                <Badge variant="outline" className={`${data.time_impact.critical_path_affected ? 'text-destructive border-destructive/30' : 'text-green_dark border-green-200'}`}>
                  {data.time_impact.critical_path_affected ? 'AFFECTED' : 'CLEAR'}
                </Badge>
              </div>
              <div className="p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-muted-foreground normal-case mb-1">Days Claimed</p>
                <p className="text-lg font-medium">{data.time_impact.days_claimed} Days</p>
                <p className="text-xs text-gray-500">{data.time_impact.days_assessment}</p>
              </div>
              <div className="p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-muted-foreground normal-case mb-1">Notice Compliance</p>
                <Badge variant="outline" className={`${data.time_impact.notice_requirement?.compliant ? 'text-green_dark' : 'text-warning'}`}>
                  {data.time_impact.notice_requirement?.compliant ? 'COMPLIANT' : 'AT RISK'}
                </Badge>
              </div>
            </div>

            {data.time_impact.eot_entitlement && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs font-medium text-blue-700 normal-case mb-2">EOT Entitlement</p>
                <p className="text-sm font-medium italic">"{data.time_impact.eot_entitlement.clause_text || data.time_impact.eot_entitlement}"</p>
                {data.time_impact.eot_entitlement.clause_reference && (
                  <p className="text-xs text-blue-500 mt-2">Ref: {data.time_impact.eot_entitlement.clause_reference}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
