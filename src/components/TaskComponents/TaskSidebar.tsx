import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Zap,
  Calendar,
} from "lucide-react";
import { TaskAttachments } from "./TaskAttachments";
import { cn, formatDate } from "@/lib/utils";

interface TaskSidebarProps {
  taskType: string;
  taskData: any;
  canApprove?: boolean;
  currentStageIndex?: number;
  auditLogs?: any[];
  onApprove?: () => void;
  onReject?: () => void;
  onRequestInfo?: () => void;
  onStageClick?: (stage: string) => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
    case "closed":
      return "default";
    case "pending":
      return "secondary";
    case "in review":
    case "under review":
      return "outline";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
    case "closed":
      return "text-green-600 bg-green-50 border-green-200";
    case "pending":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "in review":
    case "under review":
      return "text-primary bg-blue-50 border-blue-200";
    case "rejected":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
};

export const TaskSidebar: React.FC<TaskSidebarProps> = ({
  taskType,
  taskData,
  canApprove = true,
  currentStageIndex = 0,
  auditLogs,
  onApprove,
  onReject,
  onRequestInfo,
  onStageClick,
}) => {
  const renderTaskSpecificContent = () => {
    switch (taskType.toUpperCase()) {
      case "DC":
        return renderDCContent();
      case "RFI":
        return renderRFIContent();
      case "SI":
        return renderSIContent();
      case "VO":
        return renderVOContent();
      default:
        return null;
    }
  };

  // Delay Claim (DC) specific content
  const renderDCContent = () => {
    const stages = taskData?.timeline?.stages || [];
    const stageCount = stages.length;

    return (
      <>
        {/* Decision Timeline */}
        {stageCount > 0 && (
          <div>
            <h3 className="text-xs text-muted-foreground mb-5">
              Decision Timeline
            </h3>
            <div className="relative">
              <div className="relative w-full max-w-3xl mx-auto px-1">
                {/* Line */}
                <div className="absolute top-2 left-0 right-0 h-[2px] bg-muted">
                  <div
                    className="h-[2px] bg-[#8081F6] transition-all duration-500"
                    style={{
                      width: `${(currentStageIndex / (stageCount - 1)) * 100}%`,
                    }}
                  />
                </div>

                {/* Steps */}
                <div className="flex justify-between relative z-10">
                  {stages.map((stage: string, i: number) => (
                    <button
                      key={stage}
                      onClick={() => onStageClick?.(stage)}
                      className="relative flex flex-col items-center flex-1 cursor-pointer">
                      <div
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${i <= currentStageIndex
                          ? "bg-[#8081F6] border-[#8081F6]"
                          : "bg-white border-[#E7E9EB]"
                          }`}
                      />
                      <span
                        className={cn(
                          "text-[10px] mt-3 text-[#6B7280] w-full text-center break-words px-1",
                          i === currentStageIndex && "text-[#1B1C1F] font-medium"
                        )}>
                        {stage}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Impact Summary */}
        <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
          <h3 className="text-xs font-medium text-muted-foreground mb-4">
            Impact Summary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-blue-700 font-medium">
                  Requested
                </span>
              </div>
              <div className="text-2xl font-medium text-blue-900">
                {taskData?.daysRequested || "5"}
                <span className="text-sm font-normal">d</span>
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-green-700 font-medium">
                  Approved
                </span>
              </div>
              <div className="text-2xl font-medium text-green-900">
                {taskData?.approvedDays || "0"}
                <span className="text-sm font-normal">d</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Claim Details */}
        <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
          <h3 className="text-xs font-medium text-muted-foreground mb-4">
            Claim Details
          </h3>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Number</p>
              <p className="text-sm font-normal text-foreground">
                {taskData?.number || "DC-001"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] mb-1">Discipline</p>
              <p className="text-sm text-[#1B1C1F]">
                {taskData?.discipline || "General Construction"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] mb-1">Created By</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#6B7280]" />
                <p className="text-sm text-[#1B1C1F]">
                  {taskData?.createdBy || "Mike Wilson"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Status & Actions */}
        <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
          <h3 className="text-xs font-medium text-muted-foreground mb-4">
            Actions
          </h3>
          <div className="space-y-3">
            {/* <Badge
            className={`${getStatusColor(taskData?.status || "Under Review")} border px-3 py-1.5 text-xs font-medium w-full justify-center`}>
            {taskData?.status || "Under Review"}
          </Badge> */}

            {/* {(taskData?.status === "Under Review" ||
            taskData?.status === "Pending") && (
          )} */}
            <div className="space-y-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
                disabled={!canApprove}
                onClick={onApprove}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              {/* <Button
              className="w-full"
              variant="outline"
              size="sm"
              disabled={!canApprove}
              onClick={onReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button> */}
              {/* <Button
              className="w-full"
              variant="secondary"
              size="sm"
              onClick={onRequestInfo}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Request Info
            </Button> */}
            </div>
          </div>
        </Card>

        {/* Attachments */}
        <TaskAttachments attachments={taskData?.attachments} />
      </>
    );
  };

  // RFI specific content
  const renderRFIContent = () => (
    <>
      <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
        <h3 className="text-xs font-medium text-muted-foreground mb-4">
          RFI Information
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Subject</p>
            <p className="text-sm text-[#1B1C1F]">
              {taskData?.formFields?.subject}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Discipline</p>
            <p className="text-sm text-[#1B1C1F]">
              {taskData?.formFields?.discipline}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
        <h3 className="text-xs font-medium text-muted-foreground mb-4">
          Response Status
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reply Due</span>
            <span className="text-sm font-normal text-[#8081F6]">
              {taskData?.deadlines?.replyDue}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6B7280]">Contract Window</span>
            <span className="text-sm text-[#6B7280]">
              {taskData?.deadlines?.contractWindow}
            </span>
          </div>
        </div>
      </Card>
    </>
  );

  // SI specific content
  const renderSIContent = () => (
    <>
      <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
        <h3 className="text-xs font-medium text-muted-foreground mb-4">
          Instruction Details
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Discipline</p>
            <p className="text-sm text-[#1B1C1F]">
              {taskData?.formFields?.discipline}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Location</p>
            <p className="text-sm text-[#1B1C1F]">
              {taskData?.formFields?.location}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Urgency</p>
            <Badge
              className={`${taskData?.formFields?.urgency === "high"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
                } border text-xs`}>
              {taskData?.formFields?.urgency}
            </Badge>
          </div>
        </div>
      </Card>
    </>
  );

  // VO specific content
  const renderVOContent = () => (
    <>
      <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
        <h3 className="text-xs font-medium text-muted-foreground mb-4">
          Variation Order Summary
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Discipline</p>
            <p className="text-sm text-[#1B1C1F]">
              {taskData?.formFields?.discipline}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 mb-1">Cost Impact</p>
            <p className="text-xl font-medium text-blue-900">
              {taskData?.impact?.cost || "R 0"}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700 mb-1">Time Impact</p>
            <p className="text-xl font-medium text-amber-900">
              {taskData?.impact?.time || "0 days"}
            </p>
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <div className="space-y-4 px-6 py-[45px] border-l">
      {/* Task-specific content */}
      {renderTaskSpecificContent()}

      {/* Activity Timeline */}
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-xs font-medium text-foreground mb-6 pl-2">Activity Timeline</h3>
        <div className="relative border-l-2 border-border ml-4 space-y-8 pb-4">
          {auditLogs && auditLogs.length > 0 ? (
            auditLogs.slice(0, 10).map((log: any, i: number) => (
              <div key={i} className="relative pl-8">
                <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-2 border-blue-600 rounded-full z-10" />
                <div>
                  <p className="text-xs font-normal text-foreground">{log.action || "Status Change"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(log.created_at || log.createdAt).toLocaleDateString()} &middot; {log.createdByName || "System"}
                  </p>
                  {log.description && log.description !== log.action && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {log.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="relative pl-8">
              <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-2 border-border rounded-full z-10" />
              <p className="text-xs text-muted-foreground">No activity recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
