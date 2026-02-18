import { Search, Zap, Shield, TrendingUp } from "lucide-react";
import { StatusHeader, sectionClass } from "./SharedComponents";
import { Badge } from "@/components/ui/badge";

export const RFIAnalysis = ({ data, visibleSections }: { data: any, visibleSections: number }) => {
  return (
    <div className="space-y-6">
      <StatusHeader
        status={data.overall_assessment || "REVIEW_REQUIRED"}
        risk={data.risk_level || "MEDIUM"}
        id={data.rfi_id}
        visibleSections={visibleSections}
      />

      <div className={sectionClass(visibleSections, 1)}>
        <div className="p-6 bg-sidebar rounded-[14px]">
          <h4 className="text-base text-[#0E1C2E] mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />RFI Summary
          </h4>
          <p className="text-sm text-[#4B5563] leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {data.rfi_categorization && (
        <div className={sectionClass(visibleSections, 2)}>
          <div className="p-6 bg-white border border-border rounded-[14px]">
            <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />Categorization
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.rfi_categorization).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-sidebar rounded-lg">
                  <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-semibold text-[#1B1C1F]">{value}</p>
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
              <Shield className="h-4 w-4 text-primary" />Compliance Check
            </h4>
            <div className="space-y-4">
              {Object.entries(data.contract_compliance).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-sidebar rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
                      {key.replace(/_/g, " ")}
                    </span>
                    <Badge variant="outline" className={`${value.status === "COMPLIANT" || value.status === "CLEAR"
                        ? "text-green_dark border-green-200"
                        : "text-warning border-warning/30"
                      }`}>
                      {value.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#4B5563] font-medium mb-1">{value.finding}</p>
                  {value.clause_reference && (
                    <p className="text-xs text-gray-500">Ref: Clause {value.clause_reference} (Page {value.page_number})</p>
                  )}
                  {value.response_deadline && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      Deadline: {new Date(value.response_deadline).toLocaleString()}
                    </p>
                  )}
                  {value.authorized_party && (
                    <p className="text-xs text-indigo-600 font-medium mt-1 uppercase">Party: {value.authorized_party}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.potential_implications && (
        <div className={sectionClass(visibleSections, 4)}>
          <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-[14px]">
            <h4 className="text-base text-indigo-900 mb-5 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />Potential Impact
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.potential_implications).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-white rounded-lg border border-indigo-100">
                  <p className="text-xs font-medium text-indigo-700 uppercase mb-2">{key.replace(/_/g, " ")}</p>
                  <p className={`text-sm font-bold ${value.likely ? 'text-destructive' : 'text-indigo-900'}`}>
                    {value.likely ? 'LIKELY' : 'UNLIKELY'}
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">{value.assessment}</p>
                  {value.severity && (
                    <Badge variant="outline" className="mt-2 bg-white">{value.severity} SEVERITY</Badge>
                  )}
                  {value.consequences && (
                    <p className="text-[10px] text-gray-500 mt-1 italic">{value.consequences}</p>
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
