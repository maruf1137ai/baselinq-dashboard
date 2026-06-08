import { FileText, Shield, Scale, Clock, AlertTriangle, Package, Cloud } from "lucide-react";
import { StatusHeader, sectionClass } from "./SharedComponents";
import { Badge } from "@/components/ui/badge";

export const VOAnalysis = ({ data, visibleSections }: { data: any, visibleSections: number }) => {
  const deadlineStatus = data.deadline_status;
  const isOverdue = deadlineStatus?.is_overdue === true;
  const requiredItems: any[] = Array.isArray(data.required_items_analysis) ? data.required_items_analysis : [];
  const statssaRef: string | null = data.statssa_reference ?? null;
  const weather = data.weather_context as {
    today?: { description?: string; temp?: number; humidity?: number; wind_speed?: number };
    ai_summary?: string;
    coverage_note?: string;
    forecast?: Array<{ date?: string; description?: string; temp_min?: number; temp_max?: number; pop?: number }>;
  } | null | undefined;

  return (
    <div className="space-y-6">
      <StatusHeader
        status={data.overall_status}
        risk={data.risk_level}
        time={data.processing_time_seconds}
        id={data.vo_id}
        visibleSections={visibleSections}
      />

      {/* Overdue warning banner — rendered inside section 1 timing */}
      {isOverdue && (
        <div className={sectionClass(visibleSections, 1)}>
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Task Overdue</p>
              <p className="text-xs text-red-600 mt-0.5">
                {deadlineStatus.message || `This task is ${deadlineStatus.days_overdue} day(s) overdue (due: ${deadlineStatus.due_date}). Immediate action required.`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={sectionClass(visibleSections, 1)}>
        <div className="p-6 bg-sidebar rounded-xl">
          <h4 className="text-base text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />Summary
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
          {statssaRef && (
            <p className="text-xs text-gray-400 mt-3 border-t border-border pt-2">
              Market prices sourced from Stats SA {statssaRef}
            </p>
          )}

          {/* Weather card — shows current conditions if available */}
          {weather?.today && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Cloud className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-xs font-medium text-blue-700">Site Weather</span>
              </div>
              <p className="text-xs text-blue-600">
                {weather.today.description && (
                  <span className="capitalize">{weather.today.description}</span>
                )}
                {weather.today.temp != null && `, ${weather.today.temp}°C`}
                {weather.today.humidity != null && ` · ${weather.today.humidity}% humidity`}
                {weather.today.wind_speed != null && ` · ${weather.today.wind_speed} m/s wind`}
              </p>
              {weather.ai_summary && (
                <p className="text-xs text-blue-700 mt-1 italic">{weather.ai_summary}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Required items analysis — materials/labour needed to execute the VO */}
      {requiredItems.length > 0 && (
        <div className={sectionClass(visibleSections, 2)}>
          <div className="p-6 bg-white border border-border rounded-xl">
            <h4 className="text-base text-foreground mb-5 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />Required Items &amp; SA Market Costs
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-4 normal-case">Item / Material</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-4 normal-case">Est. Unit Rate (ZAR)</th>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-4 normal-case">Unit</th>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 pl-4 normal-case">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {requiredItems.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{item.item}</p>
                        {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">
                        {item.estimated_unit_rate_zar != null
                          ? `R ${Number(item.estimated_unit_rate_zar).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{item.unit || "—"}</td>
                      <td className="py-3 pl-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.source?.includes("Stats SA") ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {item.source || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {data.procedural_compliance && (
        <div className={sectionClass(visibleSections, 3)}>
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
        <div className={sectionClass(visibleSections, 4)}>
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
        <div className={sectionClass(visibleSections, 5)}>
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
