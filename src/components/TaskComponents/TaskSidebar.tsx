import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  UserPlus,
  Zap,
  Calendar,
  Circle,
  FileText,
} from "lucide-react";
import { TaskAttachments } from "./TaskAttachments";
import { cn } from "@/lib/utils";

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

const displayStatus = (status: string): string => {
  if (!status) return '';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const groupLogsByDate = (logs: any[]) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups: { label: string; logs: any[] }[] = [];
  const seen: Record<string, number> = {};
  logs.forEach((log) => {
    const d = new Date(log.created_at || log.createdAt); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (seen[label] === undefined) { seen[label] = groups.length; groups.push({ label, logs: [] }); }
    groups[seen[label]].logs.push(log);
  });
  return groups;
};

const getLogIconConfig = (log: any): { icon: React.ReactNode; bg: string } => {
  const a = (log.action || '').toLowerCase();
  if (a === 'task_created') return { icon: <Circle className="w-3 h-3 text-[#F59E0B]" />, bg: '#FEF3C7' };
  if (a.endsWith('_created')) return { icon: <Circle className="w-3 h-3 text-[#8081F6]" />, bg: '#EEF2FF' };
  if (a === 'created') return { icon: <Circle className="w-3 h-3 text-[#F59E0B]" />, bg: '#FEF3C7' };
  if (a === 'approved') return { icon: <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />, bg: '#E9F7EC' };
  if (a === 'rejected') return { icon: <XCircle className="w-3 h-3 text-[#DC2626]" />, bg: '#FEF2F2' };
  if (a === 'task_assigned') return { icon: <UserPlus className="w-3 h-3 text-[#0284c7]" />, bg: '#E0F2FE' };
  if (a === 'request_info') return { icon: <FileText className="w-3 h-3 text-[#9333ea]" />, bg: '#FDF4FF' };
  if (a === 'response_added') return { icon: <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />, bg: '#E9F7EC' };
  if (a === 'status_updated') {
    const raw = (log.newValue || log.new_value || log.to || log.value || log.description || '').toLowerCase();
    if (raw.includes('done') || raw.includes('approved') || raw.includes('completed'))
      return { icon: <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />, bg: '#E9F7EC' };
    if (raw.includes('rejected') || raw.includes('declined'))
      return { icon: <XCircle className="w-3 h-3 text-[#DC2626]" />, bg: '#FEF2F2' };
    return { icon: <Clock className="w-3 h-3 text-[#8081F6]" />, bg: '#EEF2FF' };
  }
  return { icon: <Circle className="w-3 h-3 text-muted-foreground" />, bg: '#F3F4F6' };
};

const getStatusBadgeColor = (status: string) => {
  const s = (status || '').toLowerCase().replace(/_/g, ' ');
  if (['done', 'approved', 'completed', 'verified', 'closed', 'eot awarded', 'acknowledged'].includes(s))
    return 'bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]';
  if (['in progress', 'in review', 'review', 'issued', 'submitted', 'actioned', 'under review',
    'priced', 'sent for review', 'notice issued', 'under assessment', 'distributed',
    'further info required', 'response provided', 'determination made', 'on track / at risk',
    'scheduled'].includes(s))
    return 'bg-primary/10 text-[#8081F6] border border-[#C7D2FE]';
  if (['rejected', 'declined'].includes(s))
    return 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]';
  return 'bg-muted text-muted-foreground border border-border';
};

const ENTITY_LABELS: Record<string, string> = {
  variationorder: 'Variation Order',
  requestforinformation: 'Request for Information',
  siteinstruction: 'Site Instruction',
  delaycertificate: 'Delay Certificate',
  criticalpathitem: 'Critical Path Item',
  generalinstruction: 'General Instruction',
};

const getActionLabel = (log: any, taskCode?: string): { text: string; oldStatus?: string; newStatus?: string; detail?: string; hideUserName?: boolean; chips?: string[] } => {
  const action = (log.action || '').toLowerCase();
  const desc = (log.description || '') as string;

  if (action === 'status_updated') {
    const causeIdx = desc.indexOf('; cause: ');
    const cleanDesc = causeIdx !== -1 ? desc.slice(0, causeIdx) : desc;
    const cause = causeIdx !== -1 ? desc.slice(causeIdx + 9).trim() : '';
    const detail = cause ? `Action: ${cause}` : undefined;
    const descLower = cleanDesc.toLowerCase();
    const fromIdx = descLower.indexOf('from ');
    const toIdx = descLower.lastIndexOf(' to ');
    if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx + 4) {
      const oldStatus = cleanDesc.slice(fromIdx + 5, toIdx).trim();
      const newStatus = cleanDesc.slice(toIdx + 4).trim();
      if (oldStatus && newStatus) {
        return { text: 'Status Changed From', oldStatus: displayStatus(oldStatus), newStatus: displayStatus(newStatus), detail, hideUserName: true };
      }
    }
    const raw = log.newValue || log.new_value || log.to || log.value || '';
    const oldRaw = log.oldValue || log.old_value || log.from || '';
    if (raw || oldRaw) {
      return { text: 'Status Changed From', oldStatus: oldRaw ? displayStatus(oldRaw) : undefined, newStatus: raw ? displayStatus(raw) : undefined, detail, hideUserName: true };
    }
    return { text: 'Status Updated', detail, hideUserName: true };
  }

  const taskRef = taskCode ? ` ${taskCode}` : '';
  if (action === 'task_created') return { text: `created this task${taskRef}` };
  if (action === 'created') return { text: `created this task${taskRef}` };
  if (action === 'vo_created') return { text: `created a Variation Order${taskRef}` };
  if (action === 'si_created') return { text: `created a Site Instruction${taskRef}` };
  if (action === 'rfi_created') return { text: `created a Request for Information${taskRef}` };
  if (action === 'dc_created') return { text: `created a Delay Certificate${taskRef}` };
  if (action === 'cpi_created') return { text: 'created a Critical Path Item' };
  if (action === 'task_assigned') {
    const names = desc.startsWith('Assigned to: ') ? desc.slice(13).trim() : desc;
    const chips = names ? names.split(',').map((n: string) => n.trim()).filter(Boolean) : [];
    return { text: 'assigned this task to', chips: chips.length > 0 ? chips : undefined };
  }
  if (action === 'request_info') return { text: 'requested additional information', detail: desc || undefined };
  if (action === 'response_added') {
    const namePrefix = (log.createdByName || '').trim();
    let detail = desc;
    if (namePrefix && detail.toLowerCase().startsWith(namePrefix.toLowerCase())) {
      detail = detail.slice(namePrefix.length).trim();
    }
    Object.entries(ENTITY_LABELS).forEach(([key, label]) => {
      detail = detail.replace(new RegExp(key, 'gi'), label);
    });
    return { text: 'submitted a response', detail: detail || undefined };
  }
  if (action === 'comment_added') return { text: 'added a comment' };
  if (action === 'assigned') return { text: 'was assigned to this task' };
  if (action === 'approved') return { text: 'approved this task' };
  if (action === 'rejected') return { text: 'rejected this task' };
  const humanized = action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  return { text: humanized, detail: desc || undefined };
};

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
                          : "bg-white border-border"
                          }`}
                      />
                      <span
                        className={cn(
                          "text-xs mt-3 text-muted-foreground w-full text-center break-words px-1",
                          i === currentStageIndex && "text-foreground font-medium"
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
        {/* <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
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
        </Card> */}

        {/* Claim Details */}
        {/* <Card className="p-4 bg-white shadow-none border border-border rounded-lg">
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
              <p className="text-xs text-muted-foreground mb-1">Discipline</p>
              <p className="text-sm text-foreground">
                {taskData?.discipline || "General Construction"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created By</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-foreground">
                  {taskData?.createdBy || "Mike Wilson"}
                </p>
              </div>
            </div>
          </div>
        </Card> */}

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
            <p className="text-xs text-muted-foreground mb-1">Subject</p>
            <p className="text-sm text-foreground">
              {taskData?.formFields?.subject}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Discipline</p>
            <p className="text-sm text-foreground">
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
            <span className="text-sm text-muted-foreground">Contract Window</span>
            <span className="text-sm text-muted-foreground">
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
            <p className="text-xs text-muted-foreground mb-1">Discipline</p>
            <p className="text-sm text-foreground">
              {taskData?.formFields?.discipline}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Location</p>
            <p className="text-sm text-foreground">
              {taskData?.formFields?.location}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Urgency</p>
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
            <p className="text-xs text-muted-foreground mb-1">Discipline</p>
            <p className="text-sm text-foreground">
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

      {/* Audit Trail */}
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-xs font-normal text-foreground mb-5 pl-2">Audit Trail</h3>
        {auditLogs && auditLogs.length > 0 ? (
          groupLogsByDate(auditLogs.slice(0, 30)).map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-xs font-normal text-muted-foreground mb-3 pl-2">{group.label}</p>
              <div>
                {group.logs.map((log: any, i: number) => {
                  const { bg, icon } = getLogIconConfig(log);
                  const { text, oldStatus, newStatus, detail, hideUserName, chips } = getActionLabel(log);
                  const relTime = getRelativeTime(log.created_at || log.createdAt);
                  const isLast = i === group.logs.length - 1;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10" style={{ backgroundColor: bg }}>
                          {icon}
                        </div>
                        {!isLast && <div className="w-0.5 flex-1 bg-[#e9ecef] mt-1 mb-1" />}
                      </div>
                      <div className={`flex-1 min-w-0 ${isLast ? 'pb-2' : 'pb-4'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {!hideUserName && <span className="text-sm font-normal text-foreground">{log.createdByName || 'System'}</span>}
                            <span className="text-sm text-muted-foreground">{text}</span>
                            {oldStatus && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusBadgeColor(oldStatus)}`}>{oldStatus}</span>
                            )}
                            {oldStatus && newStatus && (
                              <span className="text-sm text-muted-foreground">to</span>
                            )}
                            {newStatus && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusBadgeColor(newStatus)}`}>{newStatus}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">{relTime}</span>
                        </div>
                        {chips && chips.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {chips.map((name, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                                <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                                  {name.charAt(0).toUpperCase()}
                                </span>
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                        {detail && !chips && (() => {
                          const byIdx = detail.lastIndexOf(' by ');
                          if (byIdx !== -1) {
                            const before = detail.slice(0, byIdx + 4);
                            const name = detail.slice(byIdx + 4);
                            return (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {before}<span className="font-medium text-foreground bg-primary/10 px-1 py-0.5 rounded">{name}</span>
                              </p>
                            );
                          }
                          return <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{detail}</p>;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="flex gap-3 items-start pl-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Circle className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground pt-1">No activity recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
