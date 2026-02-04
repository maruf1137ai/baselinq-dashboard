import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Scale,
  BookOpen,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProceduralComplianceItem {
  status: string;
  clause_reference: string;
  finding: string;
  required_days?: number;
  actual_days?: number;
}

interface AnalysisData {
  vo_id: string;
  contract_id: string;
  analysis_timestamp: string;
  overall_status: string;
  risk_level: string;
  summary: string;
  procedural_compliance: Record<string, ProceduralComplianceItem>;
  valuation_assessment: {
    applicable_method: {
      method: string;
      clause_reference: string;
      finding: string;
    };
    rate_analysis: {
      rates_compliant: boolean;
      variance_percentage: number;
      finding: string;
    };
  };
  time_impact: {
    critical_path_affected: boolean;
    days_claimed: number;
    days_assessment: string;
    notice_requirement: {
      days_required: number;
      compliant: boolean;
      clause_reference: string;
    };
  };
  risk_flags: string[];
  contract_citations: {
    clause_number: string;
    clause_title: string;
    quoted_text: string;
    relevance: string;
  }[];
  recommendations: {
    for_employer: string[];
    for_contractor: string[];
    immediate_actions: string[];
  };
  processing_time_seconds: number;
}

interface AIAnalysisModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  analysisData: AnalysisData | null;
}

export function AIAnalysisModal({
  isOpen,
  onOpenChange,
  isLoading,
  analysisData,
}: AIAnalysisModalProps) {
  const [visibleSections, setVisibleSections] = useState<number>(0);
  const totalSections = 8; // Status, Summary, Procedural, Valuation, Time, Citations, Recommendations, Risk Flags

  // Reset and start streaming when loading completes and data is available
  useEffect(() => {
    if (!isLoading && isOpen && analysisData) {
      setVisibleSections(0);
      const interval = setInterval(() => {
        setVisibleSections((prev) => {
          if (prev >= totalSections) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 300); // Show each section 300ms apart

      return () => clearInterval(interval);
    }
  }, [isLoading, isOpen, analysisData]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVisibleSections(0);
    }
  }, [isOpen]);

  const data = analysisData?.analysis || analysisData;

  const sectionClass = (index: number) =>
    cn(
      "transition-all duration-500 ease-out",
      visibleSections > index
        ? "opacity-100 translate-y-0"
        : "opacity-0 translate-y-4"
    );


  // console.log({ data, isLoading })

  if (!data && !isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#8081F6]" />
            AI Contract Analysis
          </DialogTitle>
          <DialogDescription>
            Intelligent compliance analysis {data?.vo_id ? `for ${data.vo_id}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="ai-orb-loader">
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Header - Section 0 */}
              <div className={sectionClass(0)}>
                <div className={`flex items-center justify-between p-4 rounded-lg border ${data.overall_status === "COMPLIANT"
                  ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                  : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING"
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                    : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${data.overall_status === "COMPLIANT"
                      ? "bg-green-100"
                      : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING"
                        ? "bg-yellow-100"
                        : "bg-red-100"
                      }`}>
                      {data.overall_status === "COMPLIANT" ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING" ? (
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${data.overall_status === "COMPLIANT"
                        ? "text-green-800"
                        : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING"
                          ? "text-yellow-800"
                          : "text-red-800"
                        }`}>
                        Overall Status
                      </p>
                      <p className={`text-lg font-semibold ${data.overall_status === "COMPLIANT"
                        ? "text-green-700"
                        : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING"
                          ? "text-yellow-700"
                          : "text-red-700"
                        }`}>
                        {data.overall_status?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={`${data.risk_level === "LOW"
                        ? "bg-green-100 text-green-700 border-green-300"
                        : data.risk_level === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : "bg-red-100 text-red-700 border-red-300"
                        }`}
                    >
                      {data.risk_level} RISK
                    </Badge>
                    {data.processing_time_seconds && (
                      <p className="text-xs text-gray-500 mt-1">
                        Analyzed in {data.processing_time_seconds?.toFixed(1)}s
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary - Section 1 */}
              <div className={sectionClass(1)}>
                <div className="p-4 bg-[#F3F2F0] rounded-lg">
                  <h4 className="text-sm font-medium text-[#1B1C1F] mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#8081F6]" />
                    Summary
                  </h4>
                  <p className="text-sm text-[#6B7280] leading-relaxed">
                    {data.summary}
                  </p>
                </div>
              </div>

              {/* Procedural Compliance - Section 2 */}
              {data.procedural_compliance && (
                <div className={sectionClass(2)}>
                  <div className="p-4 bg-white border border-[#E7E9EB] rounded-lg">
                    <h4 className="text-sm font-medium text-[#1B1C1F] mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#8081F6]" />
                      Procedural Compliance
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(data.procedural_compliance).map(
                        ([key, value]: [string, any]) => (
                          <div key={key} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-700 capitalize">
                                {key.replace(/_/g, " ")}
                              </span>
                              <div className="flex items-center gap-1">
                                {value.status === "COMPLIANT" ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : value.status === "WARNING" ? (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span
                                  className={`text-xs font-medium ${value.status === "COMPLIANT" ? "text-green-600" : value.status === "WARNING" ? "text-yellow-600" : "text-red-600"}`}
                                >
                                  {value.status?.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              {value.clause_reference}
                            </p>
                            {value.clause_text && (
                              <p className="text-xs text-gray-400 italic mt-1 line-clamp-2">
                                "{value.clause_text}"
                              </p>
                            )}
                            <p className="text-xs text-gray-600 mt-1 line-clamp-3">
                              {value.finding}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Valuation Assessment - Section 3 */}
              {data.valuation_assessment && (
                <div className={sectionClass(3)}>
                  <div className="p-4 bg-white border border-[#E7E9EB] rounded-lg">
                    <h4 className="text-sm font-medium text-[#1B1C1F] mb-3 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-[#8081F6]" />
                      Valuation Assessment
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          Method
                        </p>
                        <p className="text-sm font-medium text-[#1B1C1F]">
                          {data.valuation_assessment.applicable_method?.method}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {data.valuation_assessment.applicable_method?.clause_reference}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          Rate Analysis
                        </p>
                        <div className="flex items-center gap-2">
                          {data.valuation_assessment.rate_analysis?.rates_compliant ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-700">
                            {data.valuation_assessment.rate_analysis?.rates_compliant
                              ? "Rates Compliant"
                              : "Rates Non-Compliant"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Variance: {data.valuation_assessment.rate_analysis?.variance_percentage ?? 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Impact - Section 4 */}
              {data.time_impact && (
                <div className={sectionClass(4)}>
                  <div className="p-4 bg-white border border-[#E7E9EB] rounded-lg">
                    <h4 className="text-sm font-medium text-[#1B1C1F] mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#8081F6]" />
                      Time Impact
                    </h4>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-[#8081F6]">
                          {data.time_impact.days_claimed ?? 0}
                        </p>
                        <p className="text-xs text-gray-500">Days Claimed</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <div className="flex items-center justify-center">
                          {data.time_impact.critical_path_affected ? (
                            <AlertTriangle className="h-6 w-6 text-yellow-500" />
                          ) : (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Critical Path{" "}
                          {data.time_impact.critical_path_affected
                            ? "Affected"
                            : "Not Affected"}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <div className="flex items-center justify-center">
                          {data.time_impact.notice_requirement?.compliant ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : data.time_impact.notice_requirement?.compliant === false ? (
                            <XCircle className="h-6 w-6 text-red-500" />
                          ) : (
                            <Clock className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Notice (
                          {data.time_impact.notice_requirement?.days_required ?? 0}{" "}
                          days req.)
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {data.time_impact.days_assessment}
                    </p>
                  </div>
                </div>
              )}

              {/* Contract Citations - Section 5 */}
              {data.contract_citations && data.contract_citations.length > 0 && (
                <div className={sectionClass(5)}>
                  <div className="p-4 bg-white border border-[#E7E9EB] rounded-lg">
                    <h4 className="text-sm font-medium text-[#1B1C1F] mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#8081F6]" />
                      Contract Citations
                    </h4>
                    <div className="space-y-2">
                      {data.contract_citations.map((citation: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 rounded-lg border-l-4 border-[#8081F6]"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {citation.clause_number}
                            </Badge>
                            <span className="text-sm font-medium text-gray-800">
                              {citation.clause_title}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 italic mb-1">
                            "{citation.quoted_text}"
                          </p>
                          <p className="text-xs text-gray-500">{citation.relevance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations - Section 6 */}
              {data.recommendations && (
                <div className={sectionClass(6)}>
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <h4 className="text-sm font-medium text-[#1B1C1F] mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-[#8081F6]" />
                      Recommendations
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {data.recommendations.for_employer && data.recommendations.for_employer.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-indigo-700 mb-2">
                            For Employer
                          </p>
                          <ul className="space-y-1">
                            {data.recommendations.for_employer.map(
                              (rec: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-xs text-gray-600 flex items-start gap-2"
                                >
                                  <span className="text-indigo-500 mt-0.5">•</span>
                                  {rec}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                      {data.recommendations.for_contractor && data.recommendations.for_contractor.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-purple-700 mb-2">
                            For Contractor
                          </p>
                          <ul className="space-y-1">
                            {data.recommendations.for_contractor.map(
                              (rec: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-xs text-gray-600 flex items-start gap-2"
                                >
                                  <span className="text-purple-500 mt-0.5">•</span>
                                  {rec}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    {/* Immediate Actions */}
                    {data.recommendations.immediate_actions && data.recommendations.immediate_actions.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-indigo-200">
                        <p className="text-xs font-medium text-red-700 mb-2">
                          Immediate Actions Required
                        </p>
                        <div className="space-y-2">
                          {data.recommendations.immediate_actions.map(
                            (action: any, index: number) => (
                              <div key={index} className="p-2 bg-white rounded border border-red-200">
                                <p className="text-xs text-gray-700 font-medium">
                                  {typeof action === 'string' ? action : action.action}
                                </p>
                                {typeof action === 'object' && (
                                  <div className="flex gap-4 mt-1">
                                    {action.deadline && (
                                      <span className="text-xs text-gray-500">
                                        Deadline: <span className="text-red-600 font-medium">{action.deadline}</span>
                                      </span>
                                    )}
                                    {action.responsible_party && (
                                      <span className="text-xs text-gray-500">
                                        Responsible: <span className="font-medium">{action.responsible_party}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk Flags */}
              {data.risk_flags && data.risk_flags.length > 0 && (
                <div className={sectionClass(7)}>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Risk Flags
                    </h4>
                    <div className="space-y-3">
                      {data.risk_flags.map((flag: any, index: number) => (
                        <div key={index} className="p-3 bg-white rounded-lg border border-red-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-red-800">
                              {typeof flag === 'string' ? flag : flag.title}
                            </span>
                            {typeof flag === 'object' && flag.severity && (
                              <Badge className={`text-xs ${flag.severity === 'HIGH'
                                ? 'bg-red-100 text-red-700 border-red-300'
                                : flag.severity === 'MEDIUM'
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                  : 'bg-green-100 text-green-700 border-green-300'
                                }`}>
                                {flag.severity}
                              </Badge>
                            )}
                          </div>
                          {typeof flag === 'object' && (
                            <>
                              {flag.description && (
                                <p className="text-xs text-gray-600 mb-2">{flag.description}</p>
                              )}
                              {flag.clause_reference && (
                                <p className="text-xs text-gray-500 mb-1">
                                  Reference: {flag.clause_reference}
                                </p>
                              )}
                              {flag.recommended_action && (
                                <p className="text-xs text-red-600 font-medium">
                                  Action: {flag.recommended_action}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
