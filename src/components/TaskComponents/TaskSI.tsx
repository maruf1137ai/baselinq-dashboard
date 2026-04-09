import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { postData } from "@/lib/Api";
import { useQueryClient } from "@tanstack/react-query";

interface TaskSIProps {
  formFields: any;
  task?: any;
  onRefresh?: () => void;
}

export const TaskSI: React.FC<TaskSIProps> = ({ formFields, task, onRefresh }) => {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Acknowledgment state
  const [receiptChecked, setReceiptChecked] = useState(false);
  const [variationChecked, setVariationChecked] = useState(false);

  // Feedback state
  const [feedbackText, setFeedbackText] = useState("");

  if (!formFields) return null;

  // Show loading state while user data is being fetched
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading user data...</div>
      </div>
    );
  }

  const decisionTimeline = formFields.decisionTimeline || "Issued";
  const siId = formFields._id;

  // Check if current user is assigned to this task
  const isAssigned = task?.assignedTo?.some((assignee: any) => assignee.userId === user?.id);

  // Check if current user is the SI creator
  const isCreator = formFields.issuedBy?.userId === user?.id;

  // Debug logging (temporary)
  console.log("🔍 SI Debug:", {
    decisionTimeline,
    isAssigned,
    isCreator,
    currentUserId: user?.id,
    assignedUsers: task?.assignedTo?.map((a: any) => a.userId),
    showAcknowledge: decisionTimeline === "Issued" && isAssigned,
  });

  // Handle acknowledge
  const handleAcknowledge = async () => {
    if (!receiptChecked) {
      toast.error("Please acknowledge receipt of the Site Instruction");
      return;
    }

    setLoading(true);
    try {
      await postData(`/tasks/site-instructions/${siId}/acknowledge/`, {
        acknowledgmentCheckboxes: {
          receipt: receiptChecked,
          variation: variationChecked,
        },
      });
      toast.success("Site Instruction acknowledged successfully");
      queryClient.invalidateQueries({ queryKey: ["task"] });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to acknowledge SI");
    } finally {
      setLoading(false);
    }
  };

  // Handle provide feedback
  const handleProvideFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error("Please provide feedback");
      return;
    }

    setLoading(true);
    try {
      await postData(`/tasks/site-instructions/${siId}/provide-feedback/`, {
        feedbackText: feedbackText.trim(),
      });
      toast.success("Feedback submitted successfully");
      setFeedbackText("");
      queryClient.invalidateQueries({ queryKey: ["task"] });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  // Handle verify
  const handleVerify = async () => {
    setLoading(true);
    try {
      await postData(`/tasks/site-instructions/${siId}/verify/`, {});
      toast.success("Site Instruction verified successfully");
      queryClient.invalidateQueries({ queryKey: ["task"] });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to verify SI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-border">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Discipline</label>
          <p className="text-sm text-foreground mt-1">{formFields.discipline}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <p className="text-sm text-foreground mt-1">{formFields.location || "Site Wide"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Instruction Type</label>
          <p className="text-sm text-foreground mt-1">{formFields.instructionType || "General Instruction"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Urgency</label>
          <div className="mt-1">
            <Badge
              variant="outline"
              className={cn(
                "rounded-md px-2 py-0.5 font-normal",
                formFields.urgency === "High" ? "bg-red-50 text-red-600 border-red-100" :
                  formFields.urgency === "Medium" ? "bg-orange-50 text-orange-600 border-orange-100" :
                    "bg-green-50 text-green-600 border-green-100"
              )}>
              {formFields.urgency || "Medium"}
            </Badge>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Variation Link</label>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              formFields.leadsToVariation ? "bg-orange-500" : "bg-gray-300"
            )} />
            <p className="text-sm text-foreground">
              {formFields.leadsToVariation ? "May lead to Variation" : "No Variation expected"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Technical Instruction</label>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 bg-muted p-4 rounded-lg border border-border">
          {formFields.instruction}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-900 mb-1">Safety & Compliance Notes</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              {formFields.safetyNotes || "Standard site safety protocols apply. Ensure all edge protection and PPE requirements are met before actioning this instruction."}
            </p>
          </div>
        </div>
      </div>

      {/* Acknowledgment Section - Show if Issued and user is assigned */}
      {decisionTimeline === "Issued" && isAssigned && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <h3 className="text-sm font-medium text-blue-900">Acknowledgment & Response</h3>
            </div>

            <div className="space-y-3 pl-8">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="receipt"
                  checked={receiptChecked}
                  onCheckedChange={(checked) => setReceiptChecked(checked as boolean)}
                  className="mt-0.5"
                />
                <label htmlFor="receipt" className="text-sm text-blue-800 cursor-pointer leading-relaxed">
                  I formally acknowledge receipt of this Site Instruction
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="variation"
                  checked={variationChecked}
                  onCheckedChange={(checked) => setVariationChecked(checked as boolean)}
                  className="mt-0.5"
                />
                <label htmlFor="variation" className="text-sm text-blue-800 cursor-pointer leading-relaxed">
                  This instruction will lead to a Variation Order request
                </label>
              </div>

              <p className="text-xs text-blue-700 italic mt-2">
                Receipt and potential cost impact must be declared as per contract protocols.
              </p>

              <Button
                onClick={handleAcknowledge}
                disabled={loading || !receiptChecked}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {loading ? "Acknowledging..." : "Acknowledge SI"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Section - Show if Acknowledged and user is assigned */}
      {decisionTimeline === "Acknowledged" && isAssigned && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <h3 className="text-sm font-medium text-green-900">Provide Feedback</h3>
            </div>

            <div className="space-y-3 pl-8">
              <p className="text-sm text-green-800">
                Please provide your feedback on the implementation of this Site Instruction.
              </p>
              <Textarea
                placeholder="Describe the work completed, any challenges faced, or additional notes..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[120px] bg-white border-green-300 focus:border-green-500"
              />
              <Button
                onClick={handleProvideFeedback}
                disabled={loading || !feedbackText.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {loading ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Section - Show if Actioned and user is creator */}
      {decisionTimeline === "Actioned" && isCreator && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
              <h3 className="text-sm font-medium text-purple-900">Verify Completion</h3>
            </div>

            <div className="space-y-3 pl-8">
              <p className="text-sm text-purple-800">
                Review the feedback below and verify that this Site Instruction has been completed satisfactorily.
              </p>

              {formFields.feedbackText && (
                <div className="bg-white border border-purple-300 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-purple-900 uppercase tracking-wide">
                      Implementation Feedback
                    </label>
                    {formFields.feedbackBy && formFields.feedbackAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(formFields.feedbackAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{formFields.feedbackText}</p>
                  {formFields.feedbackBy && (
                    <p className="text-xs text-muted-foreground italic">
                      — {formFields.feedbackBy.name}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleVerify}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                size="lg"
              >
                {loading ? "Verifying..." : "Verify SI Completion"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Show completion status if Verified */}
      {decisionTimeline === "Verified" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-900">Site Instruction Verified</h3>
              <p className="text-sm text-green-800 mt-1">
                This Site Instruction has been completed and verified.
              </p>
              {formFields.verifiedBy && (
                <p className="text-xs text-green-700 mt-2">
                  Verified by: {formFields.verifiedBy.name} on{" "}
                  {formFields.verifiedAt ? new Date(formFields.verifiedAt).toLocaleString() : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
