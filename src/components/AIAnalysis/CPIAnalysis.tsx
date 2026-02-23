import { FileText, TrendingUp, Shield, Clock, AlertTriangle, Zap } from "lucide-react";
import { StatusHeader, sectionClass } from "./SharedComponents";
import { Badge } from "@/components/ui/badge";

export const CPIAnalysis = ({ data, visibleSections }: { data: any, visibleSections: number }) => {
  return (
    <div className="space-y-6">
      <StatusHeader
        status={data.overall_status || data.overall_assessment}
        risk={data.risk_level}
        time={data.processing_time_seconds}
        id={data.cpi_id}
        visibleSections={visibleSections}
      />

      <div className={sectionClass(visibleSections, 1)}>
        <div className="p-6 bg-sidebar rounded-[14px]">
          <h4 className="text-base text-[#0E1C2E] mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />Critical Path Summary
          </h4>
          <p className="text-sm text-[#4B5563] leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {data.cpi_categorization && (
        <div className={sectionClass(visibleSections, 2)}>
          <div className="p-6 bg-white border border-border rounded-[14px]">
            <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Programme Categorization
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.cpi_categorization).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-sidebar rounded-lg">
                  <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className={`text-sm font-medium ${value === 'HIGH' || value === 'On Critical Path' || value === 'None'
                    ? 'text-destructive'
                    : 'text-[#1B1C1F]'
                    }`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.contract_compliance && (
        <div className={sectionClass(visibleSections, 3)}>
          <div className="p-6 bg-white border border-border rounded-[14px]">
            <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />Programme Compliance
            </h4>
            <div className="space-y-4">
              {Object.entries(data.contract_compliance).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-sidebar rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">{key.replace(/_/g, " ")}</span>
                    <Badge variant="outline" className={`${value.status === "COMPLIANT" ? "text-green_dark border-green-200" : "text-warning border-warning/30"}`}>{value.status}</Badge>
                  </div>
                  <p className="text-sm text-[#4B5563] font-medium mb-1">{value.finding}</p>
                  {value.clause_reference && (
                    <p className="text-xs text-gray-500">Ref: Clause {value.clause_reference} (Page {value.page_number})</p>
                  )}
                  {value.completion_date && (
                    <p className="text-xs text-destructive font-medium mt-1 uppercase">Target: {value.completion_date}</p>
                  )}
                  {value.owner && (
                    <p className="text-xs text-indigo-600 font-medium mt-1 uppercase">Owner: {value.owner}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.extension_of_time_analysis && (
        <div className={sectionClass(visibleSections, 4)}>
          <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-[14px]">
            <h4 className="text-base text-indigo-900 mb-5 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />EOT & Delay Assessment
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-indigo-100">
                <p className="text-xs font-medium text-indigo-700 uppercase mb-2">Entitlement</p>
                <Badge className={`${data.extension_of_time_analysis.eot_entitlement.entitled === 'yes' ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}>
                  {data.extension_of_time_analysis.eot_entitlement.entitled.toUpperCase()}
                </Badge>
                {data.extension_of_time_analysis.eot_entitlement.clause_reference && (
                  <p className="text-[10px] text-indigo-500 mt-1">Ref: {data.extension_of_time_analysis.eot_entitlement.clause_reference}</p>
                )}
                <p className="text-xs text-indigo-600 mt-2 font-medium">{data.extension_of_time_analysis.eot_entitlement.grounds}</p>
                <p className="text-xs text-gray-500 mt-1 italic">{data.extension_of_time_analysis.eot_entitlement.finding}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-indigo-100">
                <p className="text-xs font-medium text-indigo-700 uppercase mb-2">Notice Requirements</p>
                <p className="text-sm font-medium text-destructive">{data.extension_of_time_analysis.notice_requirements.notice_deadline}</p>
                {data.extension_of_time_analysis.notice_requirements.clause_reference && (
                  <p className="text-[10px] text-indigo-500">Ref: Clause {data.extension_of_time_analysis.notice_requirements.clause_reference}</p>
                )}
                <p className="text-xs text-indigo-600 mt-1">{data.extension_of_time_analysis.notice_requirements.procedure}</p>
                <p className="text-xs text-gray-500 mt-1">{data.extension_of_time_analysis.notice_requirements.finding}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {data.potential_implications && (
        <div className={sectionClass(visibleSections, 5)}>
          <div className="p-6 bg-white border border-border rounded-[14px]">
            <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />Potential Implications
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs font-medium text-red-700 uppercase mb-2">LD Exposure</p>
                <Badge className="bg-red-600 text-white mb-2">{data.potential_implications.liquidated_damages.exposure ? 'YES' : 'NO'}</Badge>
                {data.potential_implications.liquidated_damages.clause_reference && (
                  <p className="text-[10px] text-red-500">Ref: Clause {data.potential_implications.liquidated_damages.clause_reference}</p>
                )}
                <p className="text-xs text-red-600">{data.potential_implications.liquidated_damages.assessment}</p>
              </div>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-xs font-medium text-indigo-700 uppercase mb-2">Acceleration</p>
                <Badge className="bg-indigo-600 text-white mb-2">{data.potential_implications.acceleration.applicable ? 'APPLICABLE' : 'N/A'}</Badge>
                <p className="text-xs text-indigo-600">{data.potential_implications.acceleration.assessment}</p>
              </div>
            </div>

            {data.potential_implications.resource_implications && (
              <div className="mt-4 p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-[#6B7280] uppercase mb-2">Resource Needs</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {data.potential_implications.resource_implications.key_resources.map((res: string, i: number) => (
                    <Badge key={i} variant="secondary">{res}</Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-600">{data.potential_implications.resource_implications.assessment}</p>
              </div>
            )}

            {data.potential_implications.knock_on_effects && (
              <div className="mt-4 p-4 border border-warning/20 bg-amber-50/30 rounded-lg">
                <p className="text-xs font-medium text-warning uppercase mb-2">Knock-on Effects</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {data.potential_implications.knock_on_effects.successor_activities_affected.map((act: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="h-1 w-1 bg-warning rounded-full" />
                      {act}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm font-medium text-gray-700">{data.potential_implications.knock_on_effects.total_downstream_impact}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
