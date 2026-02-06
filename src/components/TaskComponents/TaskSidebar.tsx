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

interface TaskSidebarProps {
  taskType: string;
  taskData: any;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestInfo?: () => void;
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
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "rejected":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

export const TaskSidebar: React.FC<TaskSidebarProps> = ({
  taskType,
  taskData,
  onApprove,
  onReject,
  onRequestInfo,
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
  const renderDCContent = () => (
    <>
      {/* Impact Summary */}
      <Card className="p-4 bg-white shadow-none border border-[#E7E9EB] rounded-[10px]">
        <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-4">
          Impact Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">
                Requested
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
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
            <div className="text-2xl font-bold text-green-900">
              {taskData?.approvedDays || "0"}
              <span className="text-sm font-normal">d</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Claim Details */}
      <Card className="p-4 bg-white shadow-none border border-[#E7E9EB] rounded-[10px]">
        <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-4">
          Claim Details
        </h3>
        <div className="space-y-5">
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Number</p>
            <p className="text-sm font-medium text-[#1B1C1F]">
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
      <Card className="p-4 bg-white shadow-none border border-[#E7E9EB] rounded-[10px]">
        <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-4">
          Status & Actions
        </h3>
        <div className="space-y-3">
          <Badge
            className={`${getStatusColor(taskData?.status || "Under Review")} border px-3 py-1.5 text-xs font-medium w-full justify-center`}>
            {taskData?.status || "Under Review"}
          </Badge>

          {/* {(taskData?.status === "Under Review" ||
            taskData?.status === "Pending") && (
          )} */}
          <div className="space-y-2">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="sm"
              onClick={onApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={onReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
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

  // RFI specific content
  const renderRFIContent = () => (
    <>
      <Card className="p-4 bg-white shadow-none border border-[#E7E9EB] rounded-[10px]">
        <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-4">
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

      <Card className="p-4 bg-white shadow-none border border-[#E7E9EB] rounded-[10px]">
        <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-4">
          Response Status
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6B7280]">Reply Due</span>
            <span className="text-sm font-medium text-[#8081F6]">
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
      <Card className="p-4 bg-white shadow-none border border-[#E7E9EB] rounded-[10px]">
        <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-4">
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
      <Card className="p-4 bg-white shadow-none border border-[#E7E9EB] rounded-[10px]">
        <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-4">
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
            <p className="text-xl font-bold text-blue-900">
              {taskData?.impact?.cost || "R 0"}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700 mb-1">Time Impact</p>
            <p className="text-xl font-bold text-amber-900">
              {taskData?.impact?.time || "0 days"}
            </p>
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <div className="space-y-4 px-[25px] py-[45px] border-l">
      {/* Task-specific content */}
      {renderTaskSpecificContent()}

      {/* Audit Section (Always shown) */}
      <Card className="pt-4 bg-white shadow-none border-0">
        <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">
          Audit
        </h3>
        <div className="space-y-3">
          {taskData?.audit?.map((entry: any, i: number) => (
            <div
              key={i}
              className={`p-3 border rounded-[10px] ${entry.isAI
                  ? "bg-indigo-50 border-[#8081F6B0]"
                  : "bg-white border-[#E7E9EB]"
                }`}>
              <p className="text-sm text-gray-900 flex items-center gap-2">
                {entry.isAI && <Zap className="h-3.5 w-3.5 text-indigo-600" />}
                {entry.action}
              </p>
              <p className="text-xs text-[#6B7280] mt-1">{entry.date}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
