import { FileText, Shield, TrendingUp, CheckCircle2, Zap, Clock } from "lucide-react";
import { StatusHeader, sectionClass } from "./SharedComponents";
import { Badge } from "@/components/ui/badge";

export const SIAnalysis = ({ data, visibleSections }: { data: any, visibleSections: number }) => {
  return (
    <div className="space-y-6">
      <StatusHeader
        status={data.overall_status}
        risk={data.risk_level}
        id={data.si_id}
        visibleSections={visibleSections}
      />

      <div className={sectionClass(visibleSections, 1)}>
        <div className="p-6 bg-sidebar rounded-xl">
          <h4 className="text-base text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />Instruction Summary
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {data.procedural_compliance && (
        <div className={sectionClass(visibleSections, 2)}>
          <div className="p-6 bg-white border border-border rounded-xl">
            <h4 className="text-base text-foreground mb-5 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />Procedural Validity
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.procedural_compliance).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-sidebar rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key.replace(/_/g, " ")}</span>
                    <Badge variant="outline" className={`${value.status === "COMPLIANT" || value.status === "JUSTIFIED"
                      ? "text-green_dark border-green-200"
                      : "text-warning border-warning/30"
                      }`}>
                      {value.status || value.urgency_level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">{value.finding}</p>
                  {value.clause_reference && (
                    <p className="text-xs text-gray-500">Ref: Clause {value.clause_reference}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.scope_assessment && (
        <div className={sectionClass(visibleSections, 3)}>
          <div className="p-6 bg-white border border-border rounded-xl">
            <h4 className="text-base text-foreground mb-5 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />Scope & Cost Assessment
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Within Contract Scope</p>
                <Badge variant="outline" className={`${data.scope_assessment.within_contract_scope.in_scope ? 'text-green_dark' : 'text-destructive'}`}>
                  {data.scope_assessment.within_contract_scope.in_scope ? 'IN SCOPE' : 'OUT OF SCOPE'}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2 italic">"{data.scope_assessment.within_contract_scope.assessment}"</p>
                <p className="text-xs text-gray-400 mt-1">Ref: {data.scope_assessment.within_contract_scope.clause_text}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-sidebar rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">VO Triggers</p>
                  <p className="text-sm font-medium">{data.scope_assessment.vo_implications.triggers_variation ? 'VARIATION REQUIRED' : 'NO VARIATION'}</p>
                  {data.scope_assessment.vo_implications.clause_reference && (
                    <p className="text-xs text-primary mb-1">Ref: {data.scope_assessment.vo_implications.clause_reference}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{data.scope_assessment.vo_implications.assessment}</p>
                </div>
                <div className="p-4 bg-sidebar rounded-lg border-l-2 border-warning">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Estimated Cost Impact</p>
                  <p className="text-sm font-medium text-warning">{data.scope_assessment.cost_impact_assessment.estimated_impact}</p>
                  {data.scope_assessment.cost_impact_assessment.clause_reference && (
                    <p className="text-xs text-warning mb-1">Ref: {data.scope_assessment.cost_impact_assessment.clause_reference}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 italic">"{data.scope_assessment.cost_impact_assessment.assessment}"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {data.safety_and_quality && (
        <div className={sectionClass(visibleSections, 4)}>
          <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 border border-green-100 rounded-xl">
            <h4 className="text-base text-green-900 mb-5 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />Safety & Quality Controls
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-green-100">
                <p className="text-xs font-medium text-green-700 uppercase mb-2">Requirements</p>
                <p className="text-sm text-green-900 font-medium">{data.safety_and_quality.quality_requirements.assessment}</p>
                <p className="text-xs text-green-600 mt-1 italic">Ref: {data.safety_and_quality.quality_requirements.clause_reference}</p>
                <p className="text-xs text-gray-500 mt-1">{data.safety_and_quality.quality_requirements.finding}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-green-100">
                <p className="text-xs font-medium text-green-700 uppercase mb-2">Inspections</p>
                <p className="text-sm text-green-900 font-medium">{data.safety_and_quality.inspection_needs.inspection_type}</p>
                <p className="text-xs text-green-600 mt-1">{data.safety_and_quality.inspection_needs.finding}</p>
                <Badge variant="outline" className="mt-2 text-green-700 border-green-200">REQUIRED</Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {data.time_impact && (
        <div className={sectionClass(visibleSections, 5)}>
          <div className="p-6 bg-white border border-border rounded-xl">
            <h4 className="text-base text-foreground mb-5 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />Time & Urgency
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Programme Effect</p>
                <p className={`text-sm font-medium ${data.time_impact.programme_effect.affects_programme ? 'text-destructive' : 'text-green_dark'}`}>
                  {data.time_impact.programme_effect.affects_programme ? 'AFFECTS SCHED' : 'NO IMPACT'}
                </p>
              </div>
              <div className="p-4 bg-sidebar rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Due Date</p>
                <p className="text-sm font-medium text-primary">{data.time_impact.due_date_compliance.due_date}</p>
                <p className="text-xs text-gray-400">Achievable: {data.time_impact.due_date_compliance.achievable ? 'YES' : 'NO'}</p>
              </div>
              <div className="p-4 bg-sidebar rounded-lg border-r-2 border-primary/20">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Urgency</p>
                <p className="text-sm font-medium">{data.time_impact.urgency_assessment.assessment}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
