import React, { useState, useEffect } from "react";
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

  const decisionTimeline = formFields.decisionTimeline || "Draft";
  const siId = formFields._id;

  // Get task ID - try from task prop first, then from formFields.task
  const taskId = task?.id || formFields.task?.id;

  // Check if current user is assigned to this task
  const isAssigned = task?.assignedTo?.some((assignee: any) => assignee.userId === user?.id);

  // Check if current user is the SI creator
  const isCreator = formFields.issuedBy?.userId === user?.id;

  // Debug logging (temporary)
  // console.log("🔍 SI Debug:", {
  //   decisionTimeline,
  //   isAssigned,
  //   isCreator,
  //   currentUserId: user?.id,
  //   taskId,
  //   siId,
  //   task,
  //   formFields,
  //   assignedUsers: task?.assignedTo?.map((a: any) => a.userId),
  //   showAcknowledge: decisionTimeline === "Issued" && isAssigned,
  // });

  // Auto-transition from Draft to Issued when assignee opens the SI
  useEffect(() => {
    const autoTransitionToIssued = async () => {
      // Only trigger if:
      // 1. Current status is "Draft"
      // 2. User is assigned to this task (not the creator)
      // 3. User is not the creator
      // 4. Task ID is available
      if (decisionTimeline === "Draft" && isAssigned && !isCreator && taskId) {
        try {
          await postData(`/tasks/tasks/${taskId}/update-entity/`, {
            status: "Issued",
          });
          // Silently update - no toast notification for auto-transition
          queryClient.invalidateQueries({ queryKey: ["task"] });
          if (onRefresh) onRefresh();
        } catch (error) {
          // Silent fail - don't show error to user for auto-transition
          console.error("Auto-transition to Issued failed:", error);
        }
      }
    };

    autoTransitionToIssued();
  }, [decisionTimeline, isAssigned, isCreator, taskId]);

  // Handle acknowledge - updates status to "Acknowledged"
  const handleAcknowledge = async () => {
    if (!receiptChecked) {
      toast.error("Please acknowledge receipt of the Site Instruction");
      return;
    }

    if (!taskId) {
      toast.error("Task ID not found. Please refresh and try again.");
      console.error("Task object:", task);
      console.error("FormFields:", formFields);
      return;
    }

    setLoading(true);
    try {
      console.log("Acknowledging SI with task ID:", taskId);
      console.log("Payload:", {
        status: "Acknowledged",
        isAcknowledged: true,
        leadsToVariation: variationChecked,
      });

      // Use update-entity endpoint to update SI status to "Acknowledged"
      await postData(`/tasks/tasks/${taskId}/update-entity/`, {
        status: "Acknowledged",
        isAcknowledged: true,
        leadsToVariation: variationChecked,
      });

      toast.success("Site Instruction acknowledged successfully");
      queryClient.invalidateQueries({ queryKey: ["task"] });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error("Acknowledge error:", error);
      console.error("Error response:", error?.response?.data);
      toast.error(error?.response?.data?.error || error?.message || "Failed to acknowledge SI");
    } finally {
      setLoading(false);
    }
  };

  // Handle provide feedback - updates status to "Actioned" and adds response
  const handleProvideFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error("Please provide feedback");
      return;
    }

    if (!taskId) {
      toast.error("Task ID not found. Please refresh and try again.");
      return;
    }

    setLoading(true);
    try {
      // Create response object
      const newResponse = {
        id: Date.now().toString(),
        content: feedbackText.trim(),
        sender: user?.name || user?.email || "Unknown",
        date: new Date().toISOString(),
        structuredData: {},
      };

      // Get existing responses and add new one
      const existingResponses = task?.responses || [];
      const updatedResponses = [...existingResponses, newResponse];

      // Use update-entity endpoint to update SI status to "Actioned" and add response
      await postData(`/tasks/tasks/${taskId}/update-entity/`, {
        status: "Actioned",
        responses: updatedResponses,
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

  // Handle verify - updates status to "Verified"
  const handleVerify = async () => {
    if (!taskId) {
      toast.error("Task ID not found. Please refresh and try again.");
      return;
    }

    setLoading(true);
    try {
      // Use update-entity endpoint to update SI status to "Verified"
      await postData(`/tasks/tasks/${taskId}/update-entity/`, {
        status: "Verified",
      });
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

      {/* Acknowledgment section removed - now handled in TaskDetails.tsx page */}

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
