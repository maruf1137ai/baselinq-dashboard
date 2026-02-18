import { Clock, Search, TrendingUp, DollarSign, Shield } from "lucide-react";
import { StatusHeader, sectionClass } from "./SharedComponents";
import { Badge } from "@/components/ui/badge";

export const DCAnalysis = ({ data, visibleSections }: { data: any, visibleSections: number }) => {
  return (
    <div className="space-y-6">
      <StatusHeader
        status={data.overall_status}
        risk={data.risk_level}
        id={data.dc_id}
        visibleSections={visibleSections}
      />

      <div className={sectionClass(visibleSections, 1)}>
        <div className="p-6 bg-sidebar rounded-[14px]">
          <h4 className="text-base text-[#0E1C2E] mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />Claim Summary
          </h4>
          <p className="text-sm text-[#4B5563] leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {data.delay_cause_analysis && (
        <div className={sectionClass(visibleSections, 2)}>
          <div className="p-6 bg-white border border-border rounded-[14px]">
            <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />Causation Analysis
            </h4>
            <div className="space-y-4">
              {Object.entries(data.delay_cause_analysis).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-sidebar rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
                      {key.replace(/_/g, " ")}
                    </span>
                    <Badge variant="outline" className={`${value.contractual_entitlement === "ENTITLED" || value.is_employer_risk === true || value.applicable === true
                      ? "text-green_dark border-green-200"
                      : "text-gray-500 border-gray-200"
                      }`}>
                      {value.category || (value.is_employer_risk ? "EMPLOYER RISK" : value.applicable ? "FORCE MAJEURE" : "CONTRACTOR RISK")}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#4B5563] font-medium mb-1">{value.finding || value.assessment}</p>
                  {value.clause_reference && (
                    <p className="text-xs text-gray-500">Ref: Clause {value.clause_reference} (Page {value.page_number})</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.extension_of_time && (
        <div className={sectionClass(visibleSections, 3)}>
          <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[14px]">
            <h4 className="text-base text-blue-900 mb-5 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />EOT Assessment
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-700 uppercase mb-2">Entitlement</p>
                <Badge className={`${data.extension_of_time.eot_entitlement.entitled === 'yes' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                  {data.extension_of_time.eot_entitlement.entitled.toUpperCase()}
                </Badge>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-semibold text-blue-900">{data.extension_of_time.eot_entitlement.assessed_days} Days Assessed</p>
                  <p className="text-xs text-blue-600 font-medium">{data.extension_of_time.eot_entitlement.requested_days} Days Requested</p>
                  <p className="text-xs text-gray-500 italic">"{data.extension_of_time.eot_entitlement.grounds}"</p>
                  {data.extension_of_time.eot_entitlement.clause_reference && (
                    <p className="text-[10px] text-blue-500 mt-1">Ref: {data.extension_of_time.eot_entitlement.clause_reference}</p>
                  )}
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-700 uppercase mb-2">Notice Requirements</p>
                <Badge className={`${data.extension_of_time.notice_requirements.status === "COMPLIANT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {data.extension_of_time.notice_requirements.status}
                </Badge>
                <p className="text-xs text-blue-600 mt-2 font-semibold">Deadline: {data.extension_of_time.notice_requirements.notice_deadline}</p>
                <p className="text-[10px] text-gray-500 mt-1">{data.extension_of_time.notice_requirements.finding}</p>
                {data.extension_of_time.notice_requirements.clause_reference && (
                  <p className="text-[10px] text-blue-500 mt-1">Ref: Clause {data.extension_of_time.notice_requirements.clause_reference}</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/50 rounded-lg">
                <p className="text-xs font-medium text-blue-700 uppercase mb-1">Concurrent Delay</p>
                <p className="text-xs text-gray-600">{data.extension_of_time.concurrent_delay?.assessment || "None identified"}</p>
              </div>
              <div className="p-3 bg-white/50 rounded-lg">
                <p className="text-xs font-medium text-blue-700 uppercase mb-1">Mitigation Obligations</p>
                <p className="text-xs text-gray-600">{data.extension_of_time.mitigation_obligations?.finding || "Standard obligations apply"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {data.cost_impact_assessment && (
        <div className={sectionClass(visibleSections, 4)}>
          <div className="p-6 bg-white border border-border rounded-[14px]">
            <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />Financial Impact
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-[#6B7280] uppercase mb-1">Cost Entitlement</p>
                <Badge variant="outline" className={`${data.cost_impact_assessment.cost_entitlement.entitled ? 'text-green_dark' : 'text-gray-400'}`}>
                  {data.cost_impact_assessment.cost_entitlement.entitled ? 'YES' : 'NO'}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">{data.cost_impact_assessment.cost_entitlement.estimated_cost_impact || "R 0.00"}</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-tight">{data.cost_impact_assessment.cost_entitlement.assessment}</p>
                {data.cost_impact_assessment.cost_entitlement.clause_reference && (
                  <p className="text-[10px] text-primary mt-1">Ref: {data.cost_impact_assessment.cost_entitlement.clause_reference}</p>
                )}
              </div>
              <div className="p-4 bg-sidebar rounded-lg border-l-2 border-destructive">
                <p className="text-xs font-medium text-destructive uppercase mb-1">LD Exposure</p>
                <p className="text-sm font-bold text-destructive">{data.cost_impact_assessment.liquidated_damages_exposure.daily_rate}/day</p>
                <p className="text-[10px] text-gray-500 mt-1">{data.cost_impact_assessment.liquidated_damages_exposure.assessment}</p>
                <p className="text-[10px] text-gray-400 mt-1 italic">{data.cost_impact_assessment.liquidated_damages_exposure.finding}</p>
                {data.cost_impact_assessment.liquidated_damages_exposure.clause_reference && (
                  <p className="text-[10px] text-destructive mt-1">Ref: Clause {data.cost_impact_assessment.liquidated_damages_exposure.clause_reference}</p>
                )}
              </div>
              <div className="p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-[#6B7280] uppercase mb-1">Prolongation</p>
                <Badge variant="outline" className={`${data.cost_impact_assessment.prolongation_costs.applicable ? 'text-green_dark' : 'text-gray-400'}`}>
                  {data.cost_impact_assessment.prolongation_costs.applicable ? 'YES' : 'NO'}
                </Badge>
                <p className="text-[10px] text-gray-500 mt-1">{data.cost_impact_assessment.prolongation_costs.finding}</p>
                {data.cost_impact_assessment.prolongation_costs.clause_reference && (
                  <p className="text-[10px] text-gray-400 mt-1">Ref: {data.cost_impact_assessment.prolongation_costs.clause_reference}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {data.procedural_compliance && (
        <div className={sectionClass(visibleSections, 5)}>
          <div className="p-6 bg-white border border-border rounded-[14px]">
            <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />Procedural Integrity
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(data.procedural_compliance).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-sidebar rounded-lg">
                  <p className="text-xs font-medium text-[#6B7280] uppercase mb-1">{key.replace(/_/g, " ")}</p>
                  <Badge variant="outline" className={`${value.status === "COMPLIANT" ? "text-green_dark" : "text-amber-600"}`}>
                    {value.status || "N/A"}
                  </Badge>
                  <p className="text-[10px] text-gray-600 mt-2">{value.finding}</p>
                  {value.clause_reference && (
                    <p className="text-[10px] text-gray-400 mt-1">Ref: {value.clause_reference}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
