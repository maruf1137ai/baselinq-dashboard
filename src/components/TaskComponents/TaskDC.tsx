import React, { useState } from "react";
import { ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { postData } from "@/lib/Api";

interface TaskDCProps {
  formFields: any;
  onRefresh?: () => void;
}

/**
 * Werner rev H — DC (Claim) body content.
 *
 * Matches the approved RFI body pattern exactly: bare label + paragraph,
 * no coloured backgrounds, no gridded header. Identity fields (cause
 * category, extension days, cost impact) live in the doc meta strip on
 * TaskDetails alongside From / To / CC / Date Required — so this
 * component only renders the prose body.
 */
export const TaskDC: React.FC<TaskDCProps> = ({ formFields, onRefresh }) => {
  const [noticeDateInput, setNoticeDateInput] = useState("");
  const [issuingNotice, setIssuingNotice] = useState(false);

  if (!formFields) return null;

  const handleIssueNotice = async () => {
    if (!noticeDateInput) {
      toast.error("Pick the date notice was given");
      return;
    }
    if (!formFields.entityId) {
      toast.error("Claim ID not found. Please refresh and try again.");
      return;
    }
    setIssuingNotice(true);
    try {
      await postData({
        url: `tasks/claims/${formFields.entityId}/issue-notice/`,
        data: { notice_date: noticeDateInput },
      });
      toast.success("Notice recorded");
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.notice_date || error?.response?.data?.error || "Failed to record notice");
    } finally {
      setIssuingNotice(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs text-muted-foreground">Description</label>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mt-2">
          {formFields.description}
        </p>
      </div>

      {formFields.mitigationStrategy && (
        <div>
          <label className="text-xs text-muted-foreground">Mitigation Strategy</label>
          <p className="text-sm text-foreground italic leading-relaxed whitespace-pre-line mt-2">
            {formFields.mitigationStrategy}
          </p>
        </div>
      )}

      {/* Programme Phase 2 — the notice date is a question of fact and must
          be confirmed by a user; it is never inferred. Any project member
          may record it, matching the backend's permission rule. */}
      <div>
        <label className="text-xs text-muted-foreground">Notice of Delay</label>
        {formFields.noticeDate ? (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-sm text-foreground">
              Notice given on {formFields.noticeDate}
            </span>
            {formFields.clauseReferenceVerified ? (
              <Badge variant="outline" className="text-xs">
                {formFields.clauseReference}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground gap-1"
                title="Clause could not be verified against the contract corpus"
              >
                <ShieldQuestion className="h-3 w-3" />
                clause unverified
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-2 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dc-notice-date" className="text-xs">Date notice was given</Label>
              <Input
                id="dc-notice-date"
                type="date"
                value={noticeDateInput}
                onChange={(e) => setNoticeDateInput(e.target.value)}
                className="w-48"
              />
            </div>
            <Button size="sm" onClick={handleIssueNotice} disabled={issuingNotice}>
              {issuingNotice ? "Recording..." : "Issue Notice"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
