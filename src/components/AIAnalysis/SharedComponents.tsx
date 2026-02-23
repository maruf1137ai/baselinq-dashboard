import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export const sectionClass = (visibleSections: number, index: number) =>
  cn(
    "transition-all duration-500 ease-out",
    visibleSections > index
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-4"
  );

export const StatusHeader = ({
  status,
  risk,
  time,
  id,
  visibleSections,
  index = 0
}: {
  status: string,
  risk: string,
  time?: number,
  id?: string,
  visibleSections: number,
  index?: number
}) => (
  <div className={sectionClass(visibleSections, index)}>
    <div className={`flex items-center justify-between p-4 rounded-lg border ${status === "COMPLIANT" || status === "SUCCESS" || status === "CLEAR" || status === "ROUTINE"
        ? "bg-green-50 border-green-200"
        : status === "AT_RISK" || status === "REVIEW_REQUIRED" || status === "WARNING" || status === "PARTIALLY_ENTITLED" || status === "PENDING"
          ? "bg-amber-50 border-amber-200"
          : "bg-red-50 border-red-200"
      }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${status === "COMPLIANT" || status === "SUCCESS" || status === "CLEAR" || status === "ROUTINE"
            ? "bg-green_light/50"
            : status === "AT_RISK" || status === "REVIEW_REQUIRED" || status === "WARNING" || status === "PARTIALLY_ENTITLED" || status === "PENDING"
              ? "bg-orenge_light/50"
              : "bg-red_light/50"
          }`}>
          {status === "COMPLIANT" || status === "SUCCESS" || status === "CLEAR" || status === "ROUTINE" ? (
            <CheckCircle2 className="h-6 w-6 text-green_dark" />
          ) : status === "AT_RISK" || status === "REVIEW_REQUIRED" || status === "WARNING" || status === "PARTIALLY_ENTITLED" || status === "PENDING" ? (
            <AlertTriangle className="h-6 w-6 text-warning" />
          ) : (
            <XCircle className="h-6 w-6 text-destructive" />
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Overall Status {id && `(${id})`}</p>
          <p className={`text-xl font-medium ${status === "COMPLIANT" || status === "SUCCESS" || status === "CLEAR" || status === "ROUTINE"
              ? "text-green_dark"
              : status === "AT_RISK" || status === "WARNING" || status === "PARTIALLY_ENTITLED" || status === "PENDING" || status === "REVIEW_REQUIRED"
                ? "text-warning"
                : "text-destructive"
            }`}>
            {status?.replace(/_/g, " ")}
          </p>
        </div>
      </div>
      <div className="text-right">
        <Badge className={`${risk === "LOW" ? "bg-green_light text-green-800" : risk === "MEDIUM" ? "bg-orenge_light text-orange-800" : "bg-red_light text-red-800"}`}>
          {risk} RISK
        </Badge>
        {time && <p className="text-xs text-[#6B7280] mt-1">Analyzed in {time.toFixed(1)}s</p>}
      </div>
    </div>
  </div>
);

export const CommonSections = ({ data, visibleSections, startSelector }: { data: any, visibleSections: number, startSelector: number }) => {
  return (
    <div className="mt-8 space-y-6">
      {data.recommendations && (
        <div className={sectionClass(visibleSections, startSelector)}>
          <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-[14px] border border-indigo-200">
            <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Recommendations</h4>
            <div className="grid grid-cols-2 gap-6">
              {data.recommendations.for_employer && (
                <div>
                  <p className="text-xs font-medium text-indigo-700 uppercase mb-3">For Employer</p>
                  <ul className="space-y-2">
                    {data.recommendations.for_employer.map((rec: string, i: number) => (
                      <li key={i} className="text-sm text-[#4B5563] flex items-start gap-2">
                        <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.recommendations.for_contractor && (
                <div>
                  <p className="text-xs font-medium text-purple-700 uppercase mb-3">For Contractor</p>
                  <ul className="space-y-2">
                    {data.recommendations.for_contractor.map((rec: string, i: number) => (
                      <li key={i} className="text-sm text-[#4B5563] flex items-start gap-2">
                        <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {data.risk_flags && data.risk_flags.length > 0 && (
        <div className={sectionClass(visibleSections, startSelector + 1)}>
          <div className="p-6 bg-red-50 rounded-[14px] border border-red-200">
            <h4 className="text-base text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />Risk Flags
            </h4>
            <div className="space-y-3">
              {data.risk_flags.map((flag: any, i: number) => (
                <div key={i} className="p-4 bg-white rounded-[10px] border border-red-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{flag.title || flag}</span>
                    {flag.severity && (
                      <Badge className={`${flag.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {flag.severity}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{flag.description}</p>
                  {flag.recommended_action && (
                    <div className="mt-2 text-xs text-primary font-medium">
                      Action: {flag.recommended_action}
                    </div>
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
