import React from "react";

interface TaskICProps {
  formFields: any;
}

/**
 * Werner rev H — IC (Intention to Claim) body content.
 *
 * Renders the contractor's narrative of the claim event plus the
 * PM-assigned risk pill and the respondent professional (who the claim
 * is held against). Subject / Date Required / From / To / CC are
 * already in the doc meta strip on TaskDetails — this component is
 * just the body of the doc.
 */
export const TaskIC: React.FC<TaskICProps> = ({ formFields }) => {
  if (!formFields) return null;

  const respondent = formFields.respondentUser;
  const respondentName =
    typeof respondent === "object" && respondent !== null
      ? respondent.name || respondent.email
      : respondent;

  const riskLevel = (formFields.riskLevel || "").toLowerCase();
  const riskTone =
    riskLevel === "high"
      ? "bg-red-50 text-red-700 border-red-200"
      : riskLevel === "medium"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : riskLevel === "low"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className="space-y-5">
      {riskLevel && (
        <div>
          <label className="text-xs text-muted-foreground">PM-assessed risk</label>
          <div className="mt-2">
            <span
              className={`inline-flex text-xs px-2.5 py-1 rounded-full border ${riskTone}`}
            >
              {riskLevel[0].toUpperCase() + riskLevel.slice(1)}
            </span>
          </div>
        </div>
      )}

      {respondentName && (
        <div>
          <label className="text-xs text-muted-foreground">Claim held against</label>
          <p className="text-sm text-foreground mt-2">{respondentName}</p>
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground">Description of claim event</label>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mt-2">
          {formFields.description || (
            <span className="text-muted-foreground italic">No description provided.</span>
          )}
        </p>
      </div>
    </div>
  );
};
