import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapUnderline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import { Badge } from "@/components/ui/badge";
import { AIChatInterface } from "@/components/AIAnalysis/AIChatInterface";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AIAnalysisModal } from "@/components/AIAnalysisModal";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ArrowLeft,
  MoreVertical,
  User,
  Bold,
  Italic,
  Underline,
  Link2,
  Zap,
  UserPlus,
  Check,
  ChevronsUpDown,
  FileText,
  Printer,
  CheckCircle2,
  Circle,
  Clock,
  X,
  XCircle,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Lock as LockIcon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  Copy as CopyIcon,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RequestInfoDialog } from "@/components/commons/RequestInfoDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { postData, patchData, getPresignedUrl, uploadFileToPresignedUrl } from "@/lib/Api";
import { useQueryClient } from "@tanstack/react-query";
import { TaskContentRenderer } from "@/components/TaskComponents/TaskContentRenderer";
import { TaskSidebar } from "@/components/TaskComponents/TaskSidebar";
import { TaskAttachments } from "@/components/TaskComponents/TaskAttachments";
import { WernerTaskActions } from "@/components/TaskComponents/WernerTaskActions";
import { isTaskLocked as computeIsTaskLocked } from "@/lib/taskLock";
import {
  getIntentionAtDisplay,
  getFormalClaimAtDisplay,
  getNoticeGapDays,
} from "@/lib/claimTimestamps";
import { TaskReferences } from "@/components/TaskComponents/TaskReferences";
import { TaskOriginBanner } from "@/components/TaskComponents/TaskOriginBanner";
import { RequestInfoResponseRow } from "@/components/TaskComponents/RequestInfoResponseRow";
import { UserChip } from "@/components/TaskComponents/UserChip";
import { useProject } from "@/hooks/useProjects";
import { VOWorkflowStepper } from "@/components/TaskComponents/VOWorkflowStepper";
import { SIWorkflowStepper } from "@/components/TaskComponents/SIWorkflowStepper";
import { VOApprovalModal } from "@/components/TaskComponents/VOApprovalModal";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { resolvePermissionCode } from "@/lib/roleUtils";

// Role to approval permission mapping per document type
const approvalPermissions: Record<string, string[]> = {
  VO: ["Client", "Owner", "Client Project Manager", "Consultant Quantity Surveyor", "Architect"],
  SI: ["Construction Manager", "Project Manager", "Architect", "Client Project Manager"],
  RFI: ["Architect", "Construction Manager", "Project Manager", "Site Engineer"],
  DC: ["Client", "Owner", "Client Project Manager", "Consultant Planning Engineer", "Contracts Manager"],
  CPI: ["Planning Engineer", "Consultant Planning Engineer", "Project Manager", "Construction Manager"],
  GI: ["Project Manager", "Construction Manager", "Architect"],
};

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

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
  if (a.endsWith('_created')) return { icon: <Circle className="w-3 h-3 text-[#6c5ce7]" />, bg: '#EEF2FF' };
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
    return { icon: <Clock className="w-3 h-3 text-[#6c5ce7]" />, bg: '#EEF2FF' };
  }
  return { icon: <Circle className="w-3 h-3 text-muted-foreground" />, bg: '#F3F4F6' };
};

const getStatusBadgeColor = (status: string) => {
  const s = (status || '').toLowerCase().replace(/_/g, ' ');
  // Final/positive stages - green
  if (['done', 'approved', 'completed', 'verified', 'closed', 'eot awarded', 'acknowledged'].includes(s))
    return 'bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]';
  // In-progress stages - blue
  if (['in progress', 'in review', 'review', 'issued', 'submitted', 'actioned', 'under review',
    'priced', 'recommended', 'sent for review', 'notice issued', 'under assessment', 'distributed',
    'further info required', 'response provided', 'determination made', 'on track / at risk',
    'scheduled'].includes(s))
    return 'bg-primary/10 text-[#6c5ce7] border border-[#C7D2FE]';
  // Negative stages - red
  if (['rejected', 'declined'].includes(s))
    return 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]';
  // Default (Draft, Todo, Delay Identified, etc.) - gray
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
    // Parse cause if present: "Status changed from X to Y; cause: Z"
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
        return { text: 'Status changed from', oldStatus: displayStatus(oldStatus), newStatus: displayStatus(newStatus), detail, hideUserName: true };
      }
    }
    const raw = log.newValue || log.new_value || log.to || log.value || '';
    const oldRaw = log.oldValue || log.old_value || log.from || '';
    if (raw || oldRaw) {
      return { text: 'Status changed from', oldStatus: oldRaw ? displayStatus(oldRaw) : undefined, newStatus: raw ? displayStatus(raw) : undefined, detail, hideUserName: true };
    }
    return { text: 'Status updated', detail, hideUserName: true };
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
    const chips = names ? names.split(',').map(n => n.trim()).filter(Boolean) : [];
    return { text: 'assigned this task to', chips: chips.length > 0 ? chips : undefined };
  }

  if (action === 'request_info') {
    return { text: 'requested additional information', detail: desc || undefined };
  }

  if (action === 'response_added') {
    // desc = "Maruf submitted a response on VARIATIONORDER — Approved"
    // Strip the leading user name from description to avoid duplication
    const namePrefix = (log.createdByName || '').trim();
    let detail = desc;
    if (namePrefix && detail.toLowerCase().startsWith(namePrefix.toLowerCase())) {
      detail = detail.slice(namePrefix.length).trim();
    }
    // Humanise entity type in the detail
    const lower = detail.toLowerCase();
    Object.entries(ENTITY_LABELS).forEach(([key, label]) => {
      detail = detail.replace(new RegExp(key, 'gi'), label);
    });
    return { text: 'submitted a response', detail: detail || undefined };
  }

  if (action === 'comment_added') return { text: 'added a comment' };
  if (action === 'assigned') return { text: 'was assigned to this task' };
  if (action === 'approved') return { text: 'approved this task' };
  if (action === 'rejected') return { text: 'rejected this task' };

  // Generic fallback — humanise snake_case
  const humanized = action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  return { text: humanized, detail: desc || undefined };
};

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const projectId = localStorage.getItem("selectedProjectId");
  // Fetch task details from new Django API
  const { data: taskDetailsResponse, isLoading, refetch: refetchTask } = useFetch(
    projectId && taskId ? `tasks/tasks/${taskId}/` : "",
    // projectId && taskId ? `projects/${projectId}/tasks/${taskId}/` : "",
    { enabled: !!taskId && !!projectId }
  );

  // Werner spec rev H — implementation note (May 8 2026):
  //   The Werner spec PDF is a UX/workflow spec for what FIELDS, BUTTONS
  //   and AUTO-REFERENCES each task doc must have. It is NOT a visual
  //   redesign — Werner explicitly said "keep the current design look
  //   and feel, just implement my requests". The earlier v2 pages
  //   (src/pages/werner/*) implemented a custom gray-card layout from
  //   the spec PDF; that was wrong. We're now adding Werner's required
  //   features directly into THIS existing TaskDetails component so the
  //   look-and-feel users are accustomed to remains untouched.
  const taskType = (taskDetailsResponse as any)?.taskType;
  const tdr = taskDetailsResponse as any;
  const entityId =
    tdr?.task?.task?.objectId
    ?? tdr?.task?.objectId
    ?? tdr?.objectId
    ?? tdr?.object_id
    ?? tdr?.task?.id;

  // Werner spec rev H — project context for subtitle line + notification
  // payload. Pulls name + number from the existing /projects/<id>/
  // endpoint via the shared useProject hook. Cached so this is cheap.
  const { data: currentProject } = useProject(projectId || undefined);
  const projectNumber = (tdr?.task as any)?.project?.project_number || (currentProject as any)?.projectNumber || (currentProject as any)?.project_number || (currentProject as any)?.number || "";
  const projectName = (currentProject as any)?.name || "";

  const { data: user } = useCurrentUser();
  const { userRole } = useUserRoleStore();
  const queryClient = useQueryClient();
  const updateTask = async (data: any) => {
    try {
      if (!taskId) return;
      const payload = { ...data };
      if (payload.status) {
        // Mirror backend TERMINAL_STATUSES (tasks/views.py). Werner SI flow:
        // Draft → Issued → Acknowledged → Actioned → Verified — so
        // "Acknowledged" is mid-flow, NOT terminal. Only the final state
        // of each workflow lands in the Done column on the task board.
        const lowerStatus = payload.status.toLowerCase();
        const DONE_STATUSES = [
          'approved', 'rejected', 'closed', 'completed',
          'eot awarded', 'verified', 'answered',
        ];
        const TODO_STATUSES = [
          'todo', 'draft', 'pending', 'not started', 'delay identified',
        ];
        if (DONE_STATUSES.includes(lowerStatus)) {
          payload.taskStatus = 'done';
        } else if (TODO_STATUSES.includes(lowerStatus)) {
          payload.taskStatus = 'todo';
        } else {
          payload.taskStatus = 'in review';
        }
      }

      const updatedTask = await patchData({
        url: `tasks/tasks/${taskId}/update-entity/`,
        data: payload
      });
      if (updatedTask) setCurrentTask(updatedTask);
      refetchAuditLogs();
      // Werner rev H — invalidate the board query so the card in /tasks
      // reflects status change without a manual reload. Applies to every
      // status-update path that goes through updateTask (DC, RFI reply,
      // VO pricing decision, etc.).
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      }
    } catch (err) {
      console.error("Update task error:", err);
      throw err;
    }
  };
  const [currentTask, setCurrentTask] = useState<any>(null);

  // console.log(userRole)

  // Fetch request info for action requests
  const { data: requestInfoResponse, refetch: refetchRequestInfo } = useFetch(
    currentTask
      ? `tasks/request-task-info/?taskType=${currentTask.taskType}&taskId=${currentTask.taskId || currentTask.id || currentTask._id}`
      : null,
    { enabled: !!currentTask }
  );
  // Fetch audit logs
  const { data: auditLogs, refetch: refetchAuditLogs } = useFetch<any[]>(
    taskId ? `tasks/tasks/${taskId}/audits/` : "",
    { enabled: !!taskId }
  );

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    link: false,
    bulletList: false,
  });
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isReplySubmitLoading, setIsReplySubmitLoading] = useState(false);
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

  // Assign user modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignUsers, setSelectedAssignUsers] = useState<any[]>([]);

  // Werner spec rev H — reply meta state. Pickers are wired to existing
  // production services: project team members (user picker), TaskAttachment
  // upload, document search.
  const [replyRecipients, setReplyRecipients] = useState<any[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [replyRefs, setReplyRefs] = useState<{ id: string | number; label: string; target_type: string; target_id: number }[]>([]);
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
  const [referencePopoverOpen, setReferencePopoverOpen] = useState(false);
  const [assignUserPopoverOpen, setAssignUserPopoverOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // VO Structured Pricing Response state
  const [recommendedAmount, setRecommendedAmount] = useState<string>("");
  const [pricingDecision, setPricingDecision] = useState<string>("");
  const [pricingConditions, setPricingConditions] = useState<string>("");
  const [voTimeImpact, setVoTimeImpact] = useState<string>("");
  interface VOLineItem { id: string; description: string; qty: string; rate: string; }
  const [voLineItems, setVoLineItems] = useState<VOLineItem[]>([{ id: crypto.randomUUID(), description: "", qty: "", rate: "" }]);
  const voSubtotal = voLineItems.reduce((sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0), 0);
  const voVat = voSubtotal * 0.15;
  const voTotal = voSubtotal + voVat;
  const formatVOCurrency = (n: number) => `R ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const updateVoItem = (id: string, field: keyof VOLineItem, value: string) => setVoLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeVoItem = (id: string) => setVoLineItems(prev => prev.filter(item => item.id !== id));

  // DC (Delay Claim) Response state
  const [dcExtensionGranted, setDcExtensionGranted] = useState<string>("");
  const [dcNewCompletionDate, setDcNewCompletionDate] = useState<string>("");

  // CPI (Critical Path) Response state
  const [cpiProgress, setCpiProgress] = useState<number>(0);
  const [cpiForecastDate, setCpiForecastDate] = useState<string>("");
  const [cpiRecoveryPlan, setCpiRecoveryPlan] = useState<string>("");
  const [cpiRiskLevel, setCpiRiskLevel] = useState<string>("");
  const [cpiMilestoneImpact, setCpiMilestoneImpact] = useState<string>("");

  // RFI (Status) state
  const [rfiResponseStatus, setRfiResponseStatus] = useState<string>("");

  // SI (Site Instruction) state — Werner rev H page 5-6 TIME / COST.
  const [siTimeImpact, setSiTimeImpact] = useState<boolean>(false);
  const [siCostImpact, setSiCostImpact] = useState<boolean>(false);
  const [showAiChat, setShowAiChat] = useState<boolean>(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showPricingResponse, setShowPricingResponse] = useState(false);


  // Fetch project team members for assign modal
  const { data: projectTeamData } = useFetch<any>(
    projectId ? `projects/${projectId}/team-members/` : "",
    { enabled: !!projectId }
  );
  const projectMembers = projectTeamData?.teamMembers || [];

  // Flat shape used by the reply form's recipient picker (name/email
  // are nested under m.user in the raw API). Keeps `projectMembers`
  // intact for the Assign modal which already reads camelCase fields.
  const recipientOptions = projectMembers.map((m: any) => ({
    userId: m.userId || m.user_id || m.user?.id,
    name: m.user?.name || m.user?.email || m.name || "",
    email: m.user?.email || m.email || "",
    role:
      m.roleName ||
      m.orgRoleName ||
      m.orgRoleInfo?.name ||
      m.user?.role?.name ||
      "",
  }));

  // ── Reference picker — load all linkable docs on this project ─────────
  // Reply.references supports any Werner entity (RFI/SI/VO/IC/Claim/GI).
  // CPI replies aren't routed through /tasks/replies/ so they're skipped.
  const { data: projectTasksData } = useFetch<{ tasks?: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : "",
    { enabled: !!projectId },
  );
  // Map frontend doc-type → backend entity_type (the /tasks/replies/
  // endpoint speaks "rfi" / "si" / "vo" / "ic" / "claim" / "gi").
  const TASK_TYPE_TO_ENTITY: Record<string, string> = {
    RFI: "rfi", SI: "si", VO: "vo", IC: "ic",
    DC: "claim", CLAIM: "claim", GI: "gi",
  };
  const referenceOptions = (projectTasksData?.tasks || [])
    .map((t: any) => {
      const rawType = String(t.type || t.taskType || "").toUpperCase();
      const entityType = TASK_TYPE_TO_ENTITY[rawType];
      const tid = t.objectId ?? t.object_id ?? t.entityId ?? t.id;
      const code = t.task_code || t.taskCode || `${rawType}-${tid}`;
      const subject = t.subject || t.title || t.summary || "";
      return entityType && tid
        ? {
            id: `${entityType}:${tid}`,
            target_type: entityType,
            target_id: Number(tid),
            label: subject ? `${code} — ${subject}` : code,
          }
        : null;
    })
    .filter(Boolean)
    // Drop the task we're currently viewing (can't reference itself).
    .filter((r: any) =>
      !(taskType && String(r.target_type).toLowerCase() ===
          (TASK_TYPE_TO_ENTITY[String(taskType).toUpperCase()] || String(taskType).toLowerCase())
        && String(r.target_id) === String(entityId)),
    );

  const handleAnalyzeWithAi = async () => {
    setIsAnalyzeModalOpen(true);
    setIsAnalyzeLoading(true);
    setAnalysisData(null);

    const endpointMap: Record<string, string> = {
      VO: "ai_analysis/vo/",
      RFI: "ai_analysis/rfi/",
      CPI: "ai_analysis/cpi/",
      SI: "ai_analysis/si/",
      DC: "ai_analysis/dc/",
    };

    const endpoint = endpointMap[displayTask?.type];
    if (!endpoint) {
      toast.error(`AI analysis not available for type: ${displayTask?.type}`);
      setIsAnalyzeLoading(false);
      return;
    }

    try {
      const response = await postData({
        url: endpoint,
        data: { task_id: taskId },
      });
      setAnalysisData(response);
    } catch (error) {
      console.error("Error fetching AI analysis:", error);
      toast.error("Failed to analyze. Please try again.");
      setIsAnalyzeModalOpen(false);
    } finally {
      setIsAnalyzeLoading(false);
    }
  };

  const fetchAIResponse = async () => {
    if (!currentTask) {
      toast.error("No task selected");
      return;
    }

    setIsLoadingAI(true);
    if (editor) {
      editor.commands.setContent("");
    }

    try {
      const dummyResponse = "AI response generation is currently unavailable.";
      setIsLoadingAI(false);
      setAiResponse(dummyResponse);
      if (editor) {
        editor.commands.setContent(dummyResponse);
      }
    } catch (error) {
      console.error("Error fetching AI response:", error);
      toast.error("Failed to generate AI response");
      setIsLoadingAI(false);
    }
  };

  // Werner rev H — handleSIApprove removed. Werner page 5-6 does not
  // have a separate "Acknowledge receipt" gate on the contractor's
  // reply. The act of submitting a reply with optional TIME / COST
  // tickboxes IS the acknowledgement. Submit Reply (handleSubmitReply
  // below) is the single action; status flips to Acknowledged.

  const handleSubmitReply = async () => {
    if (!editor || !currentTask) return;

    const content = editor.getHTML();
    if (content.replace(/<[^>]*>/g, "").trim() === "") {
      toast.error("Please provide a response");
      return;
    }

    const userName =
      user?.name ||
      user?.email?.split("@")[0] ||
      "User";

    const getStructuredData = () => {
      if (displayTask.type === "VO") {
        return {
          recommendedAmount,
          pricingDecision,
          pricingConditions,
          voTimeImpact,
          lineItems: voLineItems.filter(i => i.description.trim()).map(i => ({
            description: i.description,
            quantity: parseFloat(i.qty) || 0,
            unitRate: parseFloat(i.rate) || 0,
            total: (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0),
          })),
          subTotal: voSubtotal,
          tax: { type: "VAT", rate: 15, amount: voVat },
          grandTotal: voTotal,
        };
      }
      if (displayTask.type === "RFI") {
        return { rfiResponseStatus };
      }
      if (displayTask.type === "DC") {
        return { dcExtensionGranted, dcNewCompletionDate };
      }
      if (displayTask.type === "CPI") {
        return {
          cpiProgress,
          cpiForecastDate,
          cpiRecoveryPlan,
          cpiRiskLevel,
          cpiMilestoneImpact
        };
      }
      if (displayTask.type === "SI") {
        return { siTimeImpact, siCostImpact };
      }
      if (displayTask.type === "GI") {
        return {};
      }
      return null;
    };
    // test

    const newResponse = {
      id: crypto.randomUUID(),
      content: editor?.getHTML() || "",
      sender: user?.name || user?.email || "Unknown User",
      senderId: user?.id,
      role: user?.role?.name || "User",
      date: new Date().toISOString(),
      structuredData: getStructuredData()
    };

    const currentResponses =
      currentTask.responses && Array.isArray(currentTask.responses)
        ? currentTask.responses
        : [];

    const updatedResponses = [...currentResponses, newResponse];

    try {
      const updateData: any = {
        responses: updatedResponses,
      };

      // VO Decision Timeline: automatic status transitions
      if (displayTask.type === "VO") {
        const isCreator = String(displayTask.creator?.id) === String(user?.id);
        const currentStatusNorm = (displayTask.timeline?.current || '').toLowerCase().replace(/\s+/g, '');
        const creatorName = user?.name || user?.email?.split("@")[0] || "Unknown";

        if (['draft', 'open', 'todo', '', 'pending', 'submitted'].includes(currentStatusNorm) && !isCreator) {
          // Builder submits pricing → Priced
          updateData.status = "Priced";
          updateData.statusCause = "VO Priced by Builder";
        } else if (isCreator && currentStatusNorm === 'priced') {
          // Creator submits counter-response while Priced → Under Review
          updateData.status = "Under Review";
          updateData.statusCause = `VO reviewed/countered by ${creatorName}`;
        }
      }

      // RFI Decision Timeline: automatic status transitions
      if (displayTask.type === "RFI") {
        const isCreator = String(displayTask.creator?.id) === String(user?.id);
        const currentStatusNorm = (displayTask.timeline?.current || '').toLowerCase().replace(/\s+/g, '');
        if (['draft', 'open', '', 'pending'].includes(currentStatusNorm)) {
          // Any user submits first response → Sent for Review
          updateData.status = "Sent for Review";
          updateData.statusCause = "Response submitted";
        } else if (isCreator && currentStatusNorm === 'furtherinforequired') {
          // Creator submits counter-response → Response Provided
          updateData.status = "Response Provided";
          const creatorName = user?.name || user?.email?.split("@")[0] || "Unknown";
          updateData.statusCause = `Response provided by ${creatorName}`;
        }
      }

      if (displayTask.type === "DC") {
        const isCreator = String(displayTask.creator?.id) === String(user?.id);
        const currentStatusNorm = (displayTask.timeline?.current || '').toLowerCase().replace(/\s+/g, '');
        const creatorName = user?.name || user?.email?.split("@")[0] || "Unknown";

        if (['delayidentified', 'draft', 'submitted', '', 'pending'].includes(currentStatusNorm) && !isCreator) {
          // Assignee submits the formal delay notice
          updateData.status = "Notice Issued";
          updateData.statusCause = "Delay notice submitted";
        } else if (isCreator && ['noticeissued', 'delayidentified', 'draft', 'submitted', '', 'pending'].includes(currentStatusNorm)) {
          // Creator acknowledges the notice and begins review
          updateData.status = "Under Assessment";
          updateData.statusCause = `Claim under assessment by ${creatorName}`;
        } else if (isCreator && ['underassessment', 'determinationmade'].includes(currentStatusNorm)) {
          // Creator submits their determination
          if (dcExtensionGranted) {
            updateData.status = "EOT Awarded";
            updateData.statusCause = `EOT of ${dcExtensionGranted} days granted by ${creatorName}`;
          } else {
            updateData.status = "Determination Made";
            updateData.statusCause = `Determination submitted by ${creatorName}`;
          }
        } else if (dcExtensionGranted) {
          // Fallback: if extension is granted at any other stage, award EOT
          updateData.status = "EOT Awarded";
          updateData.statusCause = `EOT of ${dcExtensionGranted} days granted by ${creatorName}`;
        }
      }

      if (displayTask.type === "CPI") {
        const currentStatusNorm = (displayTask.timeline?.current || '').toLowerCase().replace(/\s+/g, '');
        // Move to "In Review" for any status that isn't already at or past that stage
        const progressedStates = ['inreview', 'approved', 'closed'];
        if (!progressedStates.includes(currentStatusNorm)) {
          updateData.status = "In Review";
          updateData.statusCause = "Response submitted";
        }
      }

      if (displayTask.type === "SI") {
        // Werner page 5/6 — contractor's reply moves SI to Acknowledged.
        // The act of replying IS the acknowledgement.
        updateData.status = "Acknowledged";
      }

      if (displayTask.type === "GI") {
        // Werner page 10 — no formal acknowledge gate. Reply moves the
        // GI to Replied; close-out is a separate originator action.
        // (Previously sent "Distributed" which isn't in the GI enum
        // — Draft / Sent / Replied / Closed.)
        updateData.status = "Replied";
      }

      if (displayTask.type === "IC") {
        // Werner page 13-14 — any reply on an IC means someone in the
        // org has engaged with the early-warning notice. Move
        // Sent → Acknowledged so the timeline advances. The contractor
        // still has to explicitly escalate (→ Claim) or close it out.
        // We only set this when the current status is Sent so we don't
        // downgrade Acknowledged → Acknowledged spuriously or stomp on
        // Escalated to Claim / Closed.
        const cur = (displayTask.timeline?.current || "").toLowerCase();
        if (cur === "sent" || cur === "draft" || cur === "") {
          updateData.status = "Acknowledged";
        }
      }

      // Sync pricing and response fields to update the underlying entity
      if (displayTask.type === "VO") {
        if (recommendedAmount) updateData.recommendedAmount = parseFloat(recommendedAmount) || 0;
        if (pricingDecision) updateData.pricingDecision = pricingDecision;
        if (pricingConditions) updateData.pricingConditions = pricingConditions;
        // Use 0 if empty to avoid backend ValueError for IntegerField
        updateData.agreedTimeConsequence = voTimeImpact === "" ? 0 : parseInt(voTimeImpact) || 0;

        const validItems = voLineItems.filter(i => i.description.trim());
        if (validItems.length > 0) {
          updateData.lineItems = validItems.map(i => ({
            description: i.description,
            quantity: parseFloat(i.qty) || 0,
            unitRate: parseFloat(i.rate) || 0,
          }));
        }
      }

      if (displayTask.type === "SI") {
        // Werner rev H — TIME or COST ticked flags this as a VO request.
        updateData.leadsToVariation = siTimeImpact || siCostImpact;
        updateData.isAcknowledged = true;
      }

      if (displayTask.type === "DC") {
        updateData.extensionGranted = parseInt(dcExtensionGranted) || null;
        updateData.newCompletionDate = dcNewCompletionDate || null;
      }



      await updateTask(updateData);

      // Werner rev H — fire the Reply endpoint for every supported doc
      // type so the recipient / CC / attachment / reference metadata
      // entered on the reply form actually persists. The legacy PATCH
      // above (responses[] mutation) only updates the response timeline
      // for backward-compat display; the Werner-spec behaviour
      // (notifications, ball-passing, references, attachments) lives in
      // /tasks/replies/.
      const REPLY_ENTITY_TYPE: Record<string, string> = {
        RFI: "rfi", SI: "si", VO: "vo", IC: "ic",
        DC: "claim", CLAIM: "claim", GI: "gi",
      };
      const replyEntityType = REPLY_ENTITY_TYPE[displayTask.type];
      const replyEntityId = entityId
        ?? displayTask.task?._id
        ?? (currentTask as any)?.task?._id;
      if (replyEntityType && replyEntityId) {
        try {
          // Upload reply attachments to S3 first (sequential is fine —
          // these are usually a small number of files per reply).
          const attachmentKeys: { file_name: string; s3_key: string }[] = [];
          for (const f of replyAttachments) {
            const { upload_url, key } = await getPresignedUrl({
              filename: f.name,
              content_type: f.type || "application/octet-stream",
              folder: "task-replies/pending",
            });
            await uploadFileToPresignedUrl(
              upload_url,
              f,
              f.type || "application/octet-stream",
            );
            attachmentKeys.push({ file_name: f.name, s3_key: key });
          }

          const replyPayload: any = {
            entity_type: replyEntityType,
            entity_id: Number(replyEntityId),
            body: editor.getHTML(),
            sent_to_ids: replyRecipients.map((u: any) => u.userId || u.id).filter(Boolean),
            cc_ids: [], // CC isn't part of this form — recipients are the only addressees
            attachment_keys: attachmentKeys,
            reference_targets: replyRefs.map((r) => ({
              target_type: r.target_type,
              target_id: r.target_id,
            })),
          };
          // SI-only TIME / COST flags — harmless on other types but the
          // serializer only declares them on Reply.time_impact / cost_impact.
          if (displayTask.type === "SI") {
            replyPayload.time_impact = siTimeImpact;
            replyPayload.cost_impact = siCostImpact;
          }
          await postData({ url: "tasks/replies/", data: replyPayload });
        } catch (err) {
          // Soft-fail: the legacy responses[] PATCH above already wrote
          // the reply body to the task wrapper, so the timeline still
          // shows the reply. Only the Werner side-effects (notify,
          // attach, link) are lost. Log so the user sees feedback.
          console.warn("Werner reply submit failed:", err);
          toast.error("Reply saved, but notifications / attachments may not have been persisted.");
        }
      }

      toast.success("Reply submitted successfully");
      editor.commands.setContent("");

      // Reset Fields
      setRecommendedAmount("");
      setPricingDecision("");
      setPricingConditions("");
      setVoTimeImpact("");
      setRfiResponseStatus("");
      setDcExtensionGranted("");
      setDcNewCompletionDate("");
      setCpiProgress(0);
      setCpiForecastDate("");
      setCpiRecoveryPlan("");
      setCpiRiskLevel("");
      setCpiMilestoneImpact("");
      setSiTimeImpact(false);
      setSiCostImpact(false);
      // Reset reply meta fields (recipient / attachment / reference).
      setReplyRecipients([]);
      setReplyAttachments([]);
      setReplyRefs([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit reply");
    }
  };


  // Check whether the VO has at least one response with line items and a recommended amount
  const hasPricedResponse = () => {
    const responses: any[] = displayTask?.responses || [];
    return responses.some((r) => {
      const sd = r?.structuredData || {};
      const lineItems: any[] = sd.lineItems || [];
      const amount = Number(sd.recommendedAmount || sd.grandTotal || 0);
      return lineItems.length > 0 && amount > 0;
    });
  };

  // Called when the Approve button is clicked — gate-checks before opening modal
  const handleVOApproveClick = () => {
    if (!hasPricedResponse()) {
      toast.error("A priced response with line items and amount is required before approving this Variation Order.");
      return;
    }
    setShowApproveModal(true);
  };

  const handleApproveTask = async (status: string) => {
    if (!currentTask || !taskId) return;

    const stages = displayTask?.timeline?.stages || [];
    const firstStage = stages[0];
    const lastStage = stages[stages.length - 1];

    // For VO: if we are setting it to 'Approved', but it's already 'Recommended', this might be the Client approval
    const isClientApproval = displayTask.type === "VO" && displayTask.status === "Recommended";

    const taskStatus = status === firstStage ? "Todo" :
      (status === lastStage || status == 'Completed' || status == 'Approved') ? "Done" : "In Review";

    try {
      const payload: any = { status, taskStatus, project: Number(projectId) };

      if (displayTask.type === "VO") {
        payload.isClientApproved = isClientApproval;
        if (status === "Approved") {
          payload.pricingDecision = "Approved";
        }
      }

      const updatedTask = await patchData({
        url: `tasks/tasks/${taskId}/update-entity/`,
        data: payload,
      });

      const voSuccessMsg = status === "Recommended"
        ? "Variation Order recommended for Client approval"
        : isClientApproval
          ? "Variation Order signed by Client"
          : "Variation Order approved successfully";
      toast.success(displayTask.type === "VO" ? voSuccessMsg : "Task approved successfully");

      if (updatedTask) {
        setCurrentTask(updatedTask);
      }

      await refetchTask();
      await refetchAuditLogs();
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve task");
    }
  };

  // console.log("selectedAssignUsers", taskDetailsResponse)
  const handleAssignUser = async () => {
    if (selectedAssignUsers.length === 0 || !taskId) return;

    // console.log("selectedAssignUsers", selectedAssignUsers);
    setIsAssigning(true);
    try {
      const uniqueUserIds = [...new Set(selectedAssignUsers.map((u) => u.userId))];
      await postData({
        url: `tasks/tasks/${taskId}/assign/`,
        data: { userIds: uniqueUserIds },
      });

      toast.success("User(s) assigned successfully");
      setShowAssignModal(false);
      setSelectedAssignUsers([]);
      await refetchTask();
      await refetchAuditLogs();
    } catch (error: any) {
      console.error("Error assigning user:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to assign user. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    if (isLoading || !taskDetailsResponse) return;
    setCurrentTask(taskDetailsResponse);
  }, [taskId, taskDetailsResponse, isLoading]);


  // useEffect(() => {
  //   console.log(isAnalyzeModalOpen, isAnalyzeLoading)
  // }, [isAnalyzeModalOpen, isAnalyzeLoading]);

  // console.log("data", currentTask);

  // Helper function to transform API response based on task type
  const transformTaskData = (apiResponse: any, actionRequestsData?: any[]) => {
    if (!apiResponse) return null;

    const taskType = apiResponse.taskType;
    const task = apiResponse.task || {};
    const assignedBy = apiResponse.assignedBy;
    const assignedTo = apiResponse.assignedTo || [];

    // Map action requests if data is provided
    const mappedActionRequests = actionRequestsData?.map(req => {
      // Werner spec — surface the response payload so the UI can render
      // the answer inline + show "Resolved" badge when answered.
      const responseText = req.response_text ?? req.responseText ?? null;
      const respondedBy = req.responded_by ?? req.respondedBy ?? null;
      const respondedAt = req.responded_at ?? req.respondedAt ?? null;

      // Werner spec — combined recipient list (primary + additional CC).
      // Falls back to just the primary if backend hasn't been upgraded.
      const recipientsList =
        req.recipients
        ?? (req.recipient ? [{ userId: req.recipient.userId, name: req.recipient.name, email: req.recipient.email, isPrimary: true }] : []);
      const recipientIds = recipientsList.map((r: any) => String(r.userId ?? r.id));
      const recipientNames = recipientsList.map((r: any) => r.name).filter(Boolean).join(", ");

      return {
        id: req.id ?? req._id,
        senderName: req.requestedBy?.name || req.requested_by?.name || "User",
        senderId: req.requestedBy?.id || req.requested_by?.id,
        recipient: recipientNames || req.recipient?.name || "Recipient",
        recipientIds,                           // array of all recipient ids
        recipientList: recipientsList,           // full list (objects)
        role: req.requestedBy?.role || "User",
        task: req.requestDetails ?? req.request_details,
        date: req.dueDate ?? req.due_date,
        responseText,
        respondedBy,
        respondedAt,
        status: responseText ? "Responded" : "Pending",
      };
    }) || apiResponse.request_info || [];

    // Common fields
    const baseData = {
      id: apiResponse.taskId || task._id,
      type: taskType === "CRITICALPATHITEM" ? "CPI" : taskType,
      creator: {
        badge: taskType === "CRITICALPATHITEM" ? "CPI" : taskType,
        id: assignedBy?.userId || task.createdBy?.userId || task.issuedBy?.userId,
        name: assignedBy?.name || task.issuedBy?.name || task.createdBy?.name || task.raisedBy?.name || task.submittedBy?.name || "",
        role: assignedBy?.role || task.issuedBy?.role || task.createdBy?.role || "",
      },
      watcher: {
        name: assignedTo[0]?.name || "Watcher",
        role: assignedTo[0]?.role || "Watcher",
      },
      assignedTo: assignedTo,
      ccUsers: apiResponse.responseBy || apiResponse.response_by || apiResponse.ccUsers || apiResponse.cc_users || [],
      actionRequests: mappedActionRequests,
      responses: apiResponse.responses || [],
      status: task.status || apiResponse.status || "Pending",
      timeline: {
        current: task.status || apiResponse.status || "Pending",
        stages: ["Pending", "In Review", "Approved", "Closed"],
      },
      impact: {
        time: "N/A",
        cost: "R 0",
        riskScore: 0,
        riskMax: 100,
      },
      attachments: (task.attachments || []).map((attachment: any) => ({
        id: attachment.id,
        type: 'document',
        name: attachment.fileName || attachment.file_name || 'Unknown File',
        url: attachment.streamUrl || attachment.stream_url || attachment.url || attachment.fileUrl || '',
        fileType: attachment.fileType || attachment.file_type || '',
        uploadedAt: attachment.uploadedAt || attachment.uploaded_at
      })),
      audit: [
        {
          action: `${taskType} created by ${task.createdBy?.name || task.raisedBy?.name || task.issuedBy?.name || task.submittedBy?.name || "User"}`,
          date: new Date(task.createdAt || apiResponse.created_at).toLocaleDateString(),
          isAI: false,
        },
      ],
    };

    // Type-specific transformations
    switch (taskType) {
      case "VO":
        return {
          ...baseData,
          displayId: `#${task.voNumber || `VO-${task._id}`}`,
          title: task.title,
          task_code: task.voNumber,
          dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date",
          formFields: {
            title: task.title,
            discipline: task.discipline,
            description: task.description,
            currency: task.currency || "ZAR",
            subTotal: task.subTotal || 0,
            grandTotal: task.grandTotal || 0,
            tax: task.tax || { type: "VAT", rate: 15, amount: 0 },
            lineItems: task.lineItems || [],
            voTimeImpact: task.voTimeImpact
              ?? apiResponse.responses?.slice(-1)?.[0]?.structuredData?.voTimeImpact,
          },
          question: {
            text: task.description || "",
            tags: [],
          },
          deadlines: {
            replyDue: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A",
            contractWindow: "21 days",
          },
          timeline: {
            current: task.status || apiResponse.status || "Draft",
            stages: ["Draft", "Priced", "Under Review", "Recommended", "Approved"],
          },
          impact: {
            time: "0 days",
            cost: task.grandTotal ? `R ${Number(task.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "R 0.00",
            riskScore: 35,
            riskMax: 100,
          },
          isWithinMandate: task.isWithinMandate,
        };

      case "RFI":
        return {
          ...baseData,
          displayId: `#${task.rfiNumber || `RFI-${task._id}`}`,
          title: task.subject,
          task_code: task.rfiNumber,
          dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date",
          formFields: {
            subject: task.subject,
            discipline: task.discipline,
            question: task.question,
            description: task.description,
            priority: task.priority,
          },
          question: {
            text: task.question || "",
            tags: [],
          },
          deadlines: {
            replyDue: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A",
            contractWindow: "14 days",
          },
          timeline: {
            current: task.status || apiResponse.status || "Draft",
            stages: ["Draft", "Sent for Review", "Further Info Required", "Response Provided", "Closed"],
          },
          impact: {
            time: "5 days",
            cost: "R 0",
            riskScore: 50,
            riskMax: 100,
          },
        };

      case "SI":
        return {
          ...baseData,
          displayId: `#${task.siNumber || `SI-${task._id}`}`,
          title: task.title,
          task_code: task.siNumber,
          dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date",
          formFields: {
            title: task.title,
            discipline: task.discipline,
            instruction: task.instruction,
            location: task.location,
            urgency: task.urgency,
            dueDate: task.dueDate,
            voReference: task.voReference,
            description: task.description,
          },
          question: {
            text: task.instruction || "",
            tags: task.urgency ? [task.urgency] : [],
          },
          deadlines: {
            replyDue: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A",
            contractWindow: "7 days",
          },
          timeline: {
            current: task.status || apiResponse.status || "Draft",
            stages: ["Draft", "Issued", "Acknowledged", "Actioned", "Verified"],
          },
          impact: {
            time: "3 days",
            cost: "R 0",
            riskScore: 40,
            riskMax: 100,
          },
        };

      case "DC":
        return {
          ...baseData,
          // Werner rev H — use the canonical doc number (C-001, dc_number
          // = "C-001"). Falls back to the entity PK only if no number.
          displayId: `#${task.dcNumber || task.dc_number || `DC-${task._id}`}`,
          title: task.title,
          task_code: task.dcNumber || task.dc_number || `DC-${task._id}`,
          dueDate: "No Date",
          formFields: {
            title: task.title,
            causeCategory: task.causeCategory,
            costImpact: task.estimatedCostImpact?.amount
              ? `R ${Number(task.estimatedCostImpact.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "",
            description: task.description,
            requestedExtension: task.requestedExtensionDays?.toString() || "",
          },
          question: {
            text: task.description || "",
            tags: task.causeCategory ? [task.causeCategory] : [],
          },
          deadlines: {
            replyDue: "N/A",
            contractWindow: "28 days",
          },
          // Werner spec — Claim has its own contractual progression.
          // Previously this collapsed into a generic RFI-looking flow
          // (Draft → Sent for Review → Further Info Required → …) which
          // hid the actual claim workflow from the user. Now we surface
          // the real model enum so "Determination Made" reads as a
          // contractual ruling, not a routine reply.
          //
          // The review endpoint (PM's approve/reject/re-evaluate) sets
          // statuses outside the model enum — we map those onto the
          // closest stage. Approved → EOT Awarded (terminal-with-grant),
          // Rejected / Closed → Determination Made (terminal-no-grant).
          // EOT-vs-Approved ambiguity is flagged in need-to-know item 2.
          timeline: {
            current: (() => {
              const s = task.status || apiResponse.status || "Delay Identified";
              const legacyMap: Record<string, string> = {
                "Draft": "Delay Identified",
                "Submitted": "Notice Issued",
                "Sent for Review": "Notice Issued",
                "In Review": "Under Assessment",
                "Further Info Required": "Under Assessment",
                "Re-evaluate": "Under Assessment",
                "Response Provided": "Determination Made",
                "Rejected": "Determination Made",
                "Closed": "Determination Made",
                "Approved": "EOT Awarded",
              };
              return legacyMap[s] ?? s;
            })(),
            stages: ["Delay Identified", "Notice Issued", "Under Assessment", "Determination Made", "EOT Awarded"],
          },
          impact: {
            time: task.requestedExtensionDays ? `${task.requestedExtensionDays} days` : "N/A",
            cost: task.estimatedCostImpact?.amount
              ? `R ${Number(task.estimatedCostImpact.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "R 0.00",
            riskScore: 75,
            riskMax: 100,
          },
        };

      case "CPI":
      case "CRITICALPATHITEM":
        return {
          ...baseData,
          displayId: `#CPI-${task._id}`,
          title: task.taskActivityName,
          task_code: `CPI-${task._id}`,
          dueDate: task.finishDate ? new Date(task.finishDate).toLocaleDateString() : "No Date",
          formFields: {
            title: task.taskActivityName,
            description: task.description,
            duration: task.duration,
            startDate: task.startDate,
            finishDate: task.finishDate,
            predecessors: task.predecessors,
            successors: task.successors,
            resources: task.resources,
          },
          question: {
            text: task.description || "",
            tags: ["Critical Path"],
          },
          deadlines: {
            replyDue: task.finishDate ? new Date(task.finishDate).toLocaleDateString() : "N/A",
            contractWindow: "7 days",
          },
          timeline: {
            current: task.status || apiResponse.status || "Pending",
            stages: ["Pending", "In Review", "Approved", "Closed"],
          },
          impact: {
            time: task.duration ? `${task.duration} days` : "N/A",
            cost: "R 0",
            riskScore: 80,
            riskMax: 100,
          },
        };



      case "GI": {
        // Werner spec: GI has subject + description (not title/instruction).
        // Workflow is Draft → Sent → Replied → Closed.
        const giDate = task.dateRequired || task.date_required || task.dueDate;
        return {
          ...baseData,
          displayId: `#${task.giNumber || task.gi_number || `GI-${task._id}`}`,
          title: task.subject || "Untitled GI",
          task_code: task.giNumber || task.gi_number,
          dueDate: giDate ? new Date(giDate).toLocaleDateString() : "No Date",
          formFields: {
            subject: task.subject,
            discipline: task.discipline,
            description: task.description,
            direction: task.direction,
            dateRequired: giDate,
          },
          question: {
            text: task.description || "",
            tags: task.discipline ? [task.discipline] : [],
          },
          deadlines: {
            replyDue: giDate ? new Date(giDate).toLocaleDateString() : "N/A",
            contractWindow: "—",
          },
          timeline: {
            current: task.status || apiResponse.status || "Draft",
            stages: ["Draft", "Sent", "Replied", "Closed"],
          },
          impact: {
            time: "—",
            cost: "—",
            riskScore: 0,
            riskMax: 100,
          },
        };
      }

      case "IC": {
        // Werner spec: Contractor → PM. Two-stage claim flow (IC then DC).
        // intentionAt is stamped at submission; riskLevel set by PM.
        const icDate = task.dateRequired || task.date_required || task.dueDate;
        return {
          ...baseData,
          displayId: `#${task.icNumber || task.ic_number || `IC-${task._id}`}`,
          title: task.subject || "Untitled IC",
          task_code: task.icNumber || task.ic_number,
          dueDate: icDate ? new Date(icDate).toLocaleDateString() : "No Date",
          formFields: {
            subject: task.subject,
            description: task.description,
            riskLevel: task.riskLevel || task.risk_level,
            dateRequired: icDate,
            respondentUser: task.respondentUser || task.respondent_user,
          },
          question: {
            text: task.description || "",
            tags: task.riskLevel ? [`Risk: ${task.riskLevel}`] : [],
          },
          deadlines: {
            replyDue: icDate ? new Date(icDate).toLocaleDateString() : "N/A",
            contractWindow: "—",
          },
          timeline: {
            current: task.status || apiResponse.status || "Draft",
            stages: ["Draft", "Sent", "Acknowledged", "Escalated to Claim", "Closed"],
          },
          impact: {
            time: "—",
            cost: "—",
            riskScore: 0,
            riskMax: 100,
          },
        };
      }

      default:
        return {
          ...baseData,
          responses: apiResponse?.responses || [],
          displayId: `#${taskType}-${task._id}`,
          title: task.title || task.subject || task.taskActivityName || "Unknown",
          task_code: task._id,
          dueDate: "No Date",
          formFields: {
            title: task.title,
            description: task.description,
          },
          question: {
            text: task.description || "",
            tags: [],
          },
          deadlines: {
            replyDue: "N/A",
            contractWindow: "14 days",
          },
        };
    }
  };

  // Normalize task data for display
  const displayTask = currentTask
    ? (transformTaskData(currentTask, requestInfoResponse?.results) as any)
    : null;


  // Map API statuses that don't directly match timeline stage names
  const statusToStageMap: Record<string, string> = {
    "Completed": "Approved",
  };

  // Werner spec — task statuses that mean "terminated beyond the normal
  // workflow" — e.g. SI auto-closed when escalated to a VO, RFI cancelled,
  // IC's "Escalated to Claim". These don't appear in the per-type stages
  // array, so we treat them as "every stage complete" rather than
  // letting indexOf(-1) fall through to 0 (Draft).
  const TERMINAL_BEYOND_STAGES = new Set([
    "closed", "cancelled", "superseded", "escalated to claim",
  ]);

  const currentStageIndex = displayTask
    ? (() => {
      const current = displayTask.timeline.current;
      const mapped = statusToStageMap[current] || current;
      const idx = displayTask.timeline.stages.indexOf(mapped);
      if (idx !== -1) return idx;
      // Unknown status — if it's a "beyond stages" terminal, mark every
      // stage as complete by pointing past the last index.
      if (TERMINAL_BEYOND_STAGES.has((current || "").toLowerCase().trim())) {
        return displayTask.timeline.stages.length;
      }
      return 0;
    })()
    : 0;

  // Truthy when the task is in a terminal-beyond-stages state — used by
  // the right-panel Decision Timeline to show a "Closed / Superseded"
  // indicator instead of an "In progress" label.
  const isTerminalBeyondStages = displayTask
    ? TERMINAL_BEYOND_STAGES.has(
        (displayTask.timeline?.current || "").toLowerCase().trim(),
      )
    : false;

  const canApprove = !!user && !!displayTask && (() => {
    if (displayTask.type === "VO") {
      const userCode = resolvePermissionCode(user.role?.name || userRole || "");
      // Mirrors backend SIGNING_ROLES["vo"] in views_signing.py — only the
      // PM / Principal Agent roles may approve & sign a VO (it's a contract
      // amendment). Architect / QS / CQS were here previously but the
      // backend 403s them, so the button died on click. Hide it instead.
      const paRoles = ["PM", "CPM", "PRINCIPAL_PM", "PRINCIPAL_AGENT", "PA"];
      // Client final sign-off when status = Recommended (over-mandate VOs).
      const clientRoles = ["CLIENT", "CPM"];
      if (displayTask.status === "Priced" && paRoles.includes(userCode)) return true;
      if (displayTask.status === "Recommended" && clientRoles.includes(userCode)) return true;
      return false;
    }

    // Non-VO doc types: keep the legacy creator-can-approve shortcut.
    const isCreator = String(displayTask.creator?.id) === String(user?.id);
    return isCreator;
  })();

  // Werner spec — VO/SI lock on signed_at; other task types fall back to
  // the last-timeline-stage rule. Logic in @/lib/taskLock for testability.
  const isTaskLocked = computeIsTaskLocked(displayTask, tdr?.task);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      BulletList,
      ListItem,
      TiptapUnderline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-indigo-600 underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder: "Provide your formal response here...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  useEffect(() => {
    if (!editor) return;

    const updateActive = () => {
      setActiveFormats({
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        link: editor.isActive("link"),
        bulletList: editor.isActive("bulletList"),
      });
    };

    editor.on("selectionUpdate", updateActive);
    editor.on("transaction", updateActive);

    updateActive();

    return () => {
      editor.off("selectionUpdate", updateActive);
      editor.off("transaction", updateActive);
    };
  }, [editor]);

  // console.log(displayTask?.timeline.stages)

  if (isLoading && !currentTask) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <AwesomeLoader message="Processing Task Intelligence" />
        </div>
      </DashboardLayout>
    );
  }

  if (!displayTask) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-muted-foreground">Task not found</div>
      </DashboardLayout>
    );
  }

  // console.log(displayTask)

  return (
    <DashboardLayout padding="p-0">

      {/* ── VO Approve Confirmation Modal ── */}
      {displayTask?.type === "VO" && (
        <VOApprovalModal
          open={showApproveModal}
          onOpenChange={setShowApproveModal}
          mode={displayTask.isWithinMandate || displayTask.status === "Recommended" ? "approve" : "recommend"}
          vo={{
            voNumber: displayTask.task_code || displayTask.displayId || "",
            title: displayTask.title,
            description: displayTask.formFields?.description,
            discipline: displayTask.formFields?.discipline,
            submittedBy: displayTask.creator?.name || "Unknown",
            recommendedBy: (auditLogs || []).find((l: any) =>
              (l.description || "").toLowerCase().includes("recommended"))?.createdBy?.name,
            // Werner spec — when a VO reply submits new pricing (line
            // items + VAT) we want the Approve & Sign dialog to reflect
            // it. The VO entity's own sub_total/tax_amount/grand_total
            // fields aren't always pushed by the reply flow, so we
            // prefer the latest reply's structured pricing data and
            // fall back to the VO's own fields when there's no reply.
            ...(() => {
              const latestPricing = (() => {
                const resps: any[] = displayTask.responses || [];
                for (let i = resps.length - 1; i >= 0; i--) {
                  const sd = resps[i]?.structuredData || {};
                  if (sd.subTotal != null || sd.grandTotal != null || sd.tax?.amount != null) {
                    return sd;
                  }
                }
                return null;
              })();
              const taxAmountFromReply = Number(latestPricing?.tax?.amount ?? 0);
              const subTotalFromReply = Number(latestPricing?.subTotal ?? 0);
              const grandTotalFromReply = Number(latestPricing?.grandTotal ?? 0);
              return {
                subTotal: subTotalFromReply > 0
                  ? subTotalFromReply
                  : (displayTask.formFields?.subTotal ?? 0),
                taxAmount: taxAmountFromReply > 0
                  ? taxAmountFromReply
                  : (displayTask.formFields?.tax?.amount ?? 0),
                grandTotal: grandTotalFromReply > 0
                  ? grandTotalFromReply
                  : (displayTask.formFields?.grandTotal ?? 0),
              };
            })(),
            currency: displayTask.formFields?.currency || "ZAR",
            timeExtensionDays: (() => {
              const sd = displayTask.responses?.slice(-1)?.[0]?.structuredData || {};
              const v = Number(sd.voTimeImpact ?? 0);
              return v > 0 ? v : undefined;
            })(),
          }}
          onConfirm={async (auth) => {
            setShowApproveModal(false);
            const mode = (displayTask.isWithinMandate || displayTask.status === "Recommended")
              ? "approve"
              : "recommend";

            // "Recommend" mode is a status bump — no signing yet. Keep
            // the existing update-task path.
            if (mode === "recommend") {
              await handleApproveTask("Recommended");
              return;
            }

            // "Approve" mode is the legal sign. Route through the
            // sign-and-issue endpoint so the same flow as Sign & Issue
            // applies: PIN/role gate, signed_at, certificate_token,
            // contract value update, Task → done. Werner spec — VO
            // approval is the highest-stakes action and must run through
            // the same gate as any other contract certificate.
            const payload: any = {
              entity_type: "vo",
              entity_id: entityId,
            };
            if (auth && "pin" in auth) payload.pin = auth.pin;

            try {
              await postData({ url: "tasks/sign-and-issue/", data: payload });
              toast.success("Variation Order approved and signed.");
              await refetchTask();
              await refetchAuditLogs?.();
              // Invalidate the projects query — contract_value /
              // contract_end_date moved when the VO was signed.
              queryClient.invalidateQueries({ queryKey: ["projects"] });
            } catch (err: any) {
              toast.error(err?.response?.data?.error || "Approve & Sign failed.");
            }
          }}
        />
      )}

      <div className="min-h-screen">
        <div className="">
          <div className="grid grid-cols-3 gap-4 max-w-[1600px] mx-auto p-6">
            {/* Left Column - Main Content */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div className="flex items-center gap-2">
                  {/* Workflow help — plain-English guide to who can do
                      what on this task type. Anchored to the section
                      for the current task type. */}
                  <Link
                    to={`/help/tasks#${(currentTask.taskType || "").toLowerCase()}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm text-foreground hover:bg-muted/50 transition-all shadow-sm"
                    title={`Workflow reference for ${currentTask.taskType}`}
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    Task help
                  </Link>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm text-foreground hover:bg-muted/50 transition-all shadow-sm">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    Print / Export
                  </button>
                </div>
              </div>

              {/* Werner spec — origin banner: when this doc was auto-
                  created via escalation (e.g. SI → VO), surface that at
                  the top so users immediately see the linkage instead of
                  having to find it in the right sidebar. */}
              {entityId && (taskType || displayTask.type) && (
                <TaskOriginBanner
                  entityType={(taskType || displayTask.type || "").toLowerCase()}
                  entityId={entityId}
                />
              )}

              {/* Werner spec rev H — single merged doc card.
                  WHITE card on grey page (production pattern). Title row
                  has visible status + priority pills. Inner sections use
                  subtle grey blocks for visual depth where it adds value. */}
              <Card className="p-0 bg-white shadow-none rounded-lg border-border overflow-hidden">
                {/* ─── Title strip — light grey banner with title, type tag,
                       status + priority pills + 3-dot menu ─── */}
                <div className="bg-sidebar/50 px-6 py-4 border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        {/* Type chip — small uppercase letter pill */}
                        <Badge className="bg-amber-50 border-amber-200 text-amber-700 text-[10px] uppercase tracking-wide font-medium px-2 py-0.5">
                          {currentTask.taskType}
                        </Badge>
                        <h1 className="text-base font-medium text-foreground truncate">
                          {displayTask.title}
                        </h1>
                        <span className="text-muted-foreground text-sm whitespace-nowrap">
                          {`#${currentTask.taskType}-${String(currentTask.taskId).padStart(3, '0')}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(projectName || projectNumber) && (
                          <span className="text-xs text-muted-foreground">
                            {projectName}
                            {projectNumber && <span> · #{projectNumber}</span>}
                          </span>
                        )}
                        {displayTask.timeline?.current && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5 h-5 bg-white">
                              {displayTask.timeline.current}
                            </Badge>
                          </>
                        )}
                        {displayTask.priority && displayTask.priority !== "Normal" && (
                          <Badge
                            className={cn(
                              "text-[10px] font-normal py-0 px-1.5 h-5 border",
                              displayTask.priority === "Urgent" && "bg-red-50 text-red-700 border-red-200",
                              displayTask.priority === "High"   && "bg-orange-50 text-orange-700 border-orange-200",
                              displayTask.priority === "Low"    && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            )}
                          >
                            {displayTask.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {displayTask.dueDate && displayTask.dueDate !== "No Date" && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-50 rounded-full px-3 py-1 text-amber-700 border-amber-200 text-xs">
                          Due {displayTask.dueDate}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-white">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
                          <DropdownMenuItem
                            onClick={() => {
                              const assignedTo = currentTask?.assignedTo || [];
                              const preSelected = projectMembers.filter((m: any) =>
                                assignedTo.some((a: any) => String(a.userId) === String(m.userId))
                              );
                              setSelectedAssignUsers(preSelected);
                              setShowAssignModal(true);
                            }}
                            className="cursor-pointer"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* ─── Doc body (white, with sectioned dl content) ─── */}
                <div className="px-6 py-5">

                {/* 2. Divider */}
                <div className="-mx-6 border-t border-border my-5" />

                {/* 3. Project block */}
                {(projectName || projectNumber || (currentProject as any)?.location) && (
                  <>
                    <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Project name:</dt>
                      <dd className="text-foreground">{projectName || "—"}</dd>

                      <dt className="text-muted-foreground">Project address:</dt>
                      <dd className="text-foreground">{(currentProject as any)?.location || "—"}</dd>

                      <dt className="text-muted-foreground">Project No:</dt>
                      <dd className="text-foreground">{projectNumber ? `#${projectNumber}` : "—"}</dd>

                      <dt className="text-muted-foreground">Employer:</dt>
                      <dd className="text-foreground">
                        {(tdr?.task as any)?.project?.employer
                         || (currentProject as any)?.clientDetails?.company_name
                         || (currentProject as any)?.clientDetails?.name
                         || (currentProject as any)?.client_details?.company_name
                         || "—"}
                      </dd>
                    </dl>
                    {/* 4. Divider */}
                    <div className="-mx-6 border-t border-border my-5" />
                  </>
                )}

                {/* 5. Meta block — Werner page 3 field order:
                       Date Issued, Discipline, From, To, CC, Subject, Date Required */}
                <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                  {/* Werner page 3 — Date Issued (submitted_at, falls back
                      to created_at when the doc hasn't been sent yet). */}
                  <dt className="text-muted-foreground">Date Issued:</dt>
                  <dd className="text-foreground">
                    {(() => {
                      const submittedAt = (tdr?.task as any)?.submittedAt
                                       ?? (tdr?.task as any)?.submitted_at;
                      const iso = submittedAt || (tdr?.task as any)?.createdAt || displayTask.createdAt;
                      if (!iso) return <span className="text-muted-foreground">—</span>;
                      try {
                        const d = new Date(iso);
                        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        return (
                          <>
                            {d.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}
                            {' '}{d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            {' '}<span className="text-muted-foreground">({tz})</span>
                          </>
                        );
                      } catch {
                        return iso;
                      }
                    })()}
                  </dd>

                  {displayTask.formFields?.discipline && (
                    <>
                      <dt className="text-muted-foreground">Discipline:</dt>
                      <dd className="text-foreground">{displayTask.formFields.discipline}</dd>
                    </>
                  )}

                  {/* Werner spec — "Originated from" row: when this doc
                      was auto-created via escalation (RFI→SI, SI→VO,
                      IC→Claim), surface the source ref in the meta
                      strip too. Reuses the same entity-references
                      endpoint as the OriginBanner (React Query caches,
                      so this doesn't add a network call). */}
                  {entityId && (taskType || displayTask.type) && (
                    <OriginMetaRow
                      entityType={(taskType || displayTask.type || "").toLowerCase()}
                      entityId={entityId}
                    />
                  )}

                  {/* Werner spec — claim submission timestamps. Shown on IC
                      and DC types only. Pair them on the DC view to expose
                      the notice gap, which is the legally significant data
                      point in delay-claim disputes. */}
                  {(displayTask.type === "IC" || displayTask.type === "DC") && (() => {
                    const intentionRaw =
                      (displayTask as any)?.intentionAt
                      ?? (tdr?.task as any)?.intentionAt
                      ?? (tdr?.task as any)?.intention_at
                      ?? (tdr?.task as any)?.intentionRef?.intentionAt
                      ?? (tdr?.task as any)?.intentionRef?.intention_at;
                    const formalRaw =
                      (displayTask as any)?.formalClaimAt
                      ?? (tdr?.task as any)?.formalClaimAt
                      ?? (tdr?.task as any)?.formal_claim_at;
                    const intentionLabel = getIntentionAtDisplay({ intentionAt: intentionRaw });
                    const formalLabel = getFormalClaimAtDisplay({ formalClaimAt: formalRaw });
                    const gap = getNoticeGapDays(intentionRaw, formalRaw);
                    return (
                      <>
                        {intentionLabel && (
                          <>
                            <dt className="text-muted-foreground">Intention lodged:</dt>
                            <dd className="text-foreground">{intentionLabel}</dd>
                          </>
                        )}
                        {formalLabel && (
                          <>
                            <dt className="text-muted-foreground">Formal claim submitted:</dt>
                            <dd className="text-foreground">
                              {formalLabel}
                              {gap !== null && (
                                <span className="ml-2 text-muted-foreground">
                                  ({gap} day{gap === 1 ? "" : "s"} after intention)
                                </span>
                              )}
                            </dd>
                          </>
                        )}
                      </>
                    );
                  })()}

                  <dt className="text-muted-foreground">From:</dt>
                  <dd>
                    {displayTask.creator?.name ? (
                      <UserChip name={displayTask.creator.name} role={displayTask.creator.role} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>

                  <dt className="text-muted-foreground">To:</dt>
                  <dd>
                    {(displayTask.assignedTo || []).length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {displayTask.assignedTo.map((u: any, i: number) => (
                          <UserChip key={i} name={u.name || "—"} role={u.role} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>

                  <dt className="text-muted-foreground">CC:</dt>
                  <dd>
                    {(displayTask.cc || displayTask.ccUsers || []).length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {(displayTask.cc || displayTask.ccUsers).map((u: any, i: number) => (
                          <UserChip key={i} name={u.name || "—"} role={u.role} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>

                  <dt className="text-muted-foreground">Subject:</dt>
                  <dd className="text-foreground">
                    {displayTask.formFields?.subject || displayTask.title || "—"}
                  </dd>

                  <dt className="text-muted-foreground">Date required:</dt>
                  <dd className="text-foreground">
                    {displayTask.dueDate && displayTask.dueDate !== "No Date"
                      ? <>
                          {displayTask.dueDate}
                          {displayTask.priority === "Urgent" && (
                            <span className="ml-2 text-red-600 font-medium">(urgent)</span>
                          )}
                        </>
                      : <span className="text-muted-foreground">—</span>}
                  </dd>
                </dl>

                {/* 6. Divider before description */}
                <div className="-mx-6 border-t border-border my-5" />

                <TaskContentRenderer
                  displayTask={displayTask}
                  task={currentTask}
                  onRefresh={() => refetchTask()}
                />

                {/* Decision Timeline Workflow Steppers */}
                {displayTask.type === "VO" && displayTask.formFields?.status && (
                  <VOWorkflowStepper currentStatus={displayTask.formFields.status} />
                )}
                {displayTask.type === "SI" && displayTask.formFields?.decisionTimeline && (
                  <SIWorkflowStepper currentDecisionTimeline={displayTask.formFields.decisionTimeline} />
                )}

                {/* <div className="flex gap-2 mt-4 pt-4 border-t">
                  {displayTask.question.tags &&
                    displayTask.question.tags.map((tag: any, i: any) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-muted border-border text-muted-foreground text-xs px-2.5 py-1.5 rounded-md font-normal">
                        {tag}
                      </Badge>
                    ))}
                </div> */}
                </div>{/* end .px-6.py-5 doc body */}
              </Card>

              {/* Locked banner — shown when task is at final stage */}
              {isTaskLocked && (
                <Card className="p-6 shadow-none bg-white rounded-lg border-border">
                  <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <LockIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-normal text-foreground">Task Locked</p>
                      <p className="text-xs text-muted-foreground mt-1">This task has been approved and is now closed. No further responses or edits are allowed.</p>
                    </div>
                    {/* Werner spec — shareable URL certificate (replaces PDF).
                        Shown once the doc has a certificate_token. Anyone with
                        the link can view the read-only certificate page.
                        UI: one primary "Open" button (opens in new tab), no
                        raw URL on screen — keep the locked card clean. */}
                    {(() => {
                      const certToken =
                        (tdr?.task as any)?.certificateToken
                        ?? (tdr?.task as any)?.certificate_token
                        ?? (displayTask as any)?.certificateToken
                        ?? (displayTask as any)?.certificate_token;
                      if (!certToken) return null;
                      const typeLower = (displayTask.type || "").toLowerCase();
                      const apiType = typeLower === "dc" ? "claim" : typeLower;
                      const certUrl = `${window.location.origin}/certificates/${apiType}/${certToken}`;
                      return (
                        <div className="mt-2 flex items-center gap-2">
                          <a
                            href={certUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs text-foreground hover:bg-slate-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open Certificate
                          </a>
                          <button
                            type="button"
                            title="Copy certificate link"
                            aria-label="Copy certificate link"
                            onClick={() => {
                              navigator.clipboard?.writeText(certUrl).then(
                                () => toast.success("Certificate link copied"),
                                () => toast.error("Could not copy link"),
                              );
                            }}
                            className="inline-flex items-center justify-center rounded-md border border-border bg-white p-1.5 hover:bg-slate-50"
                          >
                            <CopyIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              )}

              {/* Creator status — compact inline notice. Single line so it
                  doesn't dominate the page. Werner spec rev H — minimise
                  vertical space, surface state without wasting room. */}
              {!isTaskLocked && canApprove && !(displayTask.responses?.length > 0) && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50/70 border border-amber-200 px-3 py-2 rounded-md">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>Awaiting response from the assigned member.</span>
                </div>
              )}

              {/* Werner rev H — Sign & Issue nudge for the SI originator.
                  When an SI is still in Draft and the current user is the
                  professional who raised it, surface a clear hint that
                  the next step is to click "Sign & Issue" in the action
                  bar above. Without this nudge the originator typically
                  clicks Submit Reply by mistake (which moves the SI to
                  Acknowledged but doesn't actually issue it). */}
              {displayTask.type === "SI"
                && (displayTask.timeline?.current || displayTask.status || "").toString().toLowerCase() === "draft"
                && String(displayTask.creator?.id) === String(user?.id) && (
                <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 px-3 py-2 rounded-md">
                  <span className="text-base leading-none">🛡️</span>
                  <span>
                    This Site Instruction is still in <strong>Draft</strong>.
                    Click <strong>Sign &amp; Issue</strong> in the action bar above to issue it to the contractor.
                  </span>
                </div>
              )}

              {/* Replies — Werner rev H: existing replies render ABOVE
                  the reply form so the page reads chronologically (doc →
                  reply 1 → reply 2 → … → input form at the bottom).
                  Each reply is its own gray-header / white-body card. */}
              {displayTask.type !== "VO" && displayTask.responses && displayTask.responses.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-sm font-normal text-foreground">
                        Replies
                      </h2>
                      <span className="text-[10px] bg-primary/10 text-[#6c5ce7] px-2 py-0.5 rounded-full font-normal">
                        {displayTask.responses.length} Total
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Werner rev H — chronological order: oldest reply
                          first, newest closest to the input form below.
                          Previously .reverse() flipped this so the newest
                          reply appeared at the top, contradicting the
                          comment block above and making the conversation
                          read backwards in production. */}
                      {displayTask.responses
                        .slice().map((resp: any) => (
                          <Card
                            key={resp.id}
                            className="p-0 bg-white border border-border rounded-lg overflow-hidden shadow-none"
                          >
                            <div className="bg-sidebar/50 px-5 py-3 border-b border-border flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-7 w-7 border border-primary/20">
                                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                                    {resp.sender
                                      ?.split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-foreground">
                                  {resp.sender}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(resp.date).toLocaleString()}
                              </span>
                            </div>
                            <div className="px-5 py-4">
                              <p className="text-xs text-muted-foreground mb-1">Reply:</p>
                              <div
                                className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: resp.content }}
                              />
                              {resp.structuredData && Object.keys(resp.structuredData).some(k => resp.structuredData[k]) && (
                                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                                  {Object.entries(resp.structuredData).map(([key, value]) => {
                                    if (value === null || value === undefined || value === "" || value === false || value === 0) return null;

                                    // Strip task-type prefix (si/vo/rfi/dc/cpi) and humanise camelCase.
                                    const label = key
                                      .replace(/^(si|vo|rfi|dc|cpi)(?=[A-Z])/, "")
                                      .replace(/([A-Z])/g, " $1")
                                      .trim()
                                      .replace(/^./, c => c.toUpperCase());

                                    // Booleans render as a flag chip — no ": true" noise. Amber tone
                                    // for impact flags so they stand out for the PM/QS reviewer.
                                    if (typeof value === "boolean") {
                                      const isImpact = /impact|acknowledged|leadsto/i.test(key);
                                      const tone = isImpact
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-muted text-muted-foreground border-border";
                                      return (
                                        <span key={key} className={`text-[10px] px-2 py-0.5 rounded-md border ${tone}`}>
                                          {label}
                                        </span>
                                      );
                                    }

                                    // Arrays / objects — show a friendly count or amount.
                                    let display: string;
                                    if (Array.isArray(value)) {
                                      display = `${value.length} item${value.length === 1 ? "" : "s"}`;
                                    } else if (typeof value === "object") {
                                      display = (value as any).amount !== undefined ? String((value as any).amount) : "—";
                                    } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
                                      // ISO date → friendly local date.
                                      const d = new Date(value);
                                      display = isNaN(d.getTime()) ? value : d.toLocaleDateString();
                                    } else if (typeof value === "string") {
                                      // Title-case enum-ish values (e.g. "approved" → "Approved").
                                      display = value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                                    } else {
                                      display = String(value);
                                    }

                                    return (
                                      <span key={key} className="text-[10px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground border border-border">
                                        {label}: {display}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}


              {/* Response Form — hidden only when the task is locked.
                  Werner spec rev H: gray title strip + white body, matches
                  the pattern used by the doc card and the right-panel
                  cards. Heading uses Werner's wording "Add a reply" so
                  the form is consistent across all task types. */}
              {!isTaskLocked && <Card className="p-0 shadow-none bg-white rounded-lg border-border overflow-hidden">
                <div className="bg-sidebar/50 px-6 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user?.name && (
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
                        {user.name.split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase() || "").join("")}
                      </span>
                    )}
                    <div>
                      <h2 className="text-sm text-foreground leading-tight">
                        {displayTask.type === "VO"
                          ? "Pricing response"
                          : displayTask.type === "SI"
                            ? "Acknowledge and reply"
                            : displayTask.type === "DC"
                              ? "Comments & updates"
                              : "Add a reply"}
                      </h2>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Replying as {user?.name || "you"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-5">

                {/* Structured Pricing Response Fields */}
                {displayTask.type === "VO" && (
                  <div className="mb-6 pb-6 border-b border-border">
                    {(displayTask.responses?.length > 0) && (
                      <button
                        type="button"
                        onClick={() => setShowPricingResponse(!showPricingResponse)}
                        className="w-full flex items-center justify-between py-2 text-sm font-normal text-primary hover:text-primary/80 transition-colors"
                      >
                        <span>{showPricingResponse ? "Hide Pricing Response" : "Add Pricing Response"}</span>
                        {showPricingResponse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}

                    {(!displayTask.responses?.length || showPricingResponse) && (
                      <div className="space-y-4 mt-3">

                        {/* Line Items */}
                        <div>
                          <label className="text-xs font-normal text-muted-foreground block mb-2">Line Items</label>

                          {/* Desktop table — hidden on mobile */}
                          <div className="hidden sm:block border border-border rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-muted border-b border-border">
                                <tr>
                                  <th className="text-left text-xs font-normal text-muted-foreground px-3 py-2 w-6">#</th>
                                  <th className="text-left text-xs font-normal text-muted-foreground px-3 py-2">Description</th>
                                  <th className="text-right text-xs font-normal text-muted-foreground px-3 py-2 w-24">Qty</th>
                                  <th className="text-right text-xs font-normal text-muted-foreground px-3 py-2 w-24">Rate (R)</th>
                                  <th className="text-right text-xs font-normal text-muted-foreground px-3 py-2 w-24">Amount</th>
                                  <th className="w-8 px-2 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {voLineItems.map((item, idx) => {
                                  const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                                  return (
                                    <tr key={item.id} className="border-b border-border last:border-0">
                                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{idx + 1}</td>
                                      <td className="px-2 py-1">
                                        <input className="w-full text-sm px-2 py-1.5 rounded border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-transparent" placeholder="Item description" value={item.description} onChange={e => updateVoItem(item.id, "description", e.target.value)} />
                                      </td>
                                      <td className="px-2 py-1">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          pattern="[0-9]*\.?[0-9]*"
                                          className="w-full text-sm px-3 py-2 rounded border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-transparent text-right"
                                          placeholder="0"
                                          value={item.qty}
                                          onChange={e => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && updateVoItem(item.id, "qty", e.target.value)}
                                        />
                                      </td>
                                      <td className="px-2 py-1">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          pattern="[0-9]*\.?[0-9]*"
                                          className="w-full text-sm px-2 py-1.5 rounded border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-transparent text-right"
                                          placeholder="0.00"
                                          value={item.rate}
                                          onChange={e => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && updateVoItem(item.id, "rate", e.target.value)}
                                        />
                                      </td>
                                      <td className="px-3 py-1.5 text-sm text-right text-foreground font-normal whitespace-nowrap">{formatVOCurrency(amount)}</td>
                                      <td className="px-2 py-1.5">
                                        {voLineItems.length > 1 && (
                                          <button type="button" onClick={() => removeVoItem(item.id)} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-muted/50 border-t border-border">
                                  <td colSpan={4} className="px-3 py-2 text-xs text-muted-foreground text-right">Subtotal</td>
                                  <td className="px-3 py-2 text-sm text-right text-foreground font-normal">{formatVOCurrency(voSubtotal)}</td>
                                  <td />
                                </tr>
                                <tr className="bg-muted/50">
                                  <td colSpan={4} className="px-3 py-2 text-xs text-muted-foreground text-right">VAT (15%)</td>
                                  <td className="px-3 py-2 text-sm text-right text-foreground font-normal">{formatVOCurrency(voVat)}</td>
                                  <td />
                                </tr>
                                <tr className="bg-[#1B1C1F]">
                                  <td colSpan={4} className="px-3 py-2 text-xs font-normal text-white text-right">Total</td>
                                  <td className="px-3 py-2 text-sm text-right text-white font-normal">{formatVOCurrency(voTotal)}</td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Mobile cards — shown only on small screens */}
                          <div className="sm:hidden border border-border rounded-lg overflow-hidden divide-y divide-border">
                            {voLineItems.map((item, idx) => {
                              const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                              return (
                                <div key={item.id} className="p-3 bg-white">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[11px] text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                                    <input
                                      className="flex-1 text-sm px-2 py-1.5 rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                      placeholder="Item description"
                                      value={item.description}
                                      onChange={e => updateVoItem(item.id, "description", e.target.value)}
                                    />
                                    {voLineItems.length > 1 && (
                                      <button type="button" onClick={() => removeVoItem(item.id)} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 pl-6">
                                    <div className="flex-1">
                                      <p className="text-[10px] text-muted-foreground mb-1">Qty</p>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\.?[0-9]*"
                                        className="w-full text-sm px-3 py-2 rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-right"
                                        placeholder="0"
                                        value={item.qty}
                                        onChange={e => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && updateVoItem(item.id, "qty", e.target.value)}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-[10px] text-muted-foreground mb-1">Rate (R)</p>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\.?[0-9]*"
                                        className="w-full text-sm px-2 py-1.5 rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-right"
                                        placeholder="0.00"
                                        value={item.rate}
                                        onChange={e => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && updateVoItem(item.id, "rate", e.target.value)}
                                      />
                                    </div>
                                    <div className="flex-1 text-right">
                                      <p className="text-[10px] text-muted-foreground mb-1">Amount</p>
                                      <p className="text-sm font-normal text-foreground py-1.5">{formatVOCurrency(amount)}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="flex justify-between items-center px-4 py-2 bg-muted/50">
                              <span className="text-xs text-muted-foreground">Subtotal</span>
                              <span className="text-sm text-foreground">{formatVOCurrency(voSubtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2 bg-muted/50">
                              <span className="text-xs text-muted-foreground">VAT (15%)</span>
                              <span className="text-sm text-foreground">{formatVOCurrency(voVat)}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2.5 bg-[#1B1C1F]">
                              <span className="text-xs font-normal text-white">Total</span>
                              <span className="text-sm font-normal text-white">{formatVOCurrency(voTotal)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setVoLineItems(prev => [...prev, { id: crypto.randomUUID(), description: "", qty: "", rate: "" }])}
                            className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add line item
                          </button>
                        </div>

                        {/* Conditions */}
                        <div>
                          <label className="text-xs font-normal text-muted-foreground block mb-2">Conditions / Caveats</label>
                          <textarea
                            value={pricingConditions}
                            onChange={(e) => setPricingConditions(e.target.value)}
                            placeholder="Any conditions or caveats on your approval/rejection..."
                            rows={2}
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          />
                        </div>

                        {/* Time Impact */}
                        <div>
                          <label className="text-xs font-normal text-muted-foreground block mb-2">Time Impact (Days)</label>
                          <input
                            type="number"
                            value={voTimeImpact}
                            onChange={(e) => setVoTimeImpact(e.target.value)}
                            placeholder="0"
                            min="0"
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Werner spec rev H — Response Status dropdown removed.
                    Verified not in Werner's PDF (rev H) or May 8 meeting
                    transcript. The Decision Timeline pill bar on the
                    right panel already conveys doc-level status. Per-reply
                    categorisation (Clarification Provided / Instruction
                    Follows / Work as per Drawing) was a production-only
                    field that Werner doesn't ask for. Field is hidden
                    here; the rfiResponseStatus state remains so any
                    legacy data still serialises correctly. */}

                {/* Structured DC Response Fields */}
                {displayTask.type === "DC" && (
                  <div className="space-y-4 mb-6 pb-6 border-b border-border">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-normal text-muted-foreground block mb-2">
                          Extension Granted (Days)
                        </label>
                        <input
                          type="number"
                          value={dcExtensionGranted}
                          onChange={(e) => setDcExtensionGranted(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-normal text-muted-foreground block mb-2">
                          New Completion Date
                        </label>
                        <input
                          type="date"
                          value={dcNewCompletionDate}
                          onChange={(e) => setDcNewCompletionDate(e.target.value)}
                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Structured CPI Response Fields */}
                {displayTask.type === "CPI" && (
                  <div className="mb-6 pb-6 border-b border-border space-y-5">
                    {/* Progress */}
                    <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-normal text-muted-foreground">Current Progress</Label>
                        <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${cpiProgress === 100 ? 'bg-green-100 text-green-700' :
                          cpiProgress >= 60 ? 'bg-blue-100 text-blue-700' :
                            cpiProgress >= 30 ? 'bg-amber-100 text-amber-700' :
                              'bg-muted text-muted-foreground'
                          }`}>{cpiProgress}%</span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[cpiProgress]}
                        onValueChange={([val]) => setCpiProgress(val)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                      </div>
                    </div>

                    {/* Date + Risk row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-muted-foreground">Expected Finish Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={cn(
                              "w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm bg-background hover:bg-muted/50 transition text-left",
                              !cpiForecastDate && "text-muted-foreground"
                            )}>
                              <span>{cpiForecastDate ? new Date(cpiForecastDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "Pick a date"}</span>
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={cpiForecastDate ? new Date(cpiForecastDate) : undefined}
                              onSelect={(date) => setCpiForecastDate(date ? date.toISOString().split('T')[0] : '')}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-muted-foreground">Risk Assessment</Label>
                        <Select value={cpiRiskLevel} onValueChange={setCpiRiskLevel}>
                          <SelectTrigger className="w-full text-sm font-normal">
                            <SelectValue placeholder="Select risk level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                Low Risk — On Track
                              </div>
                            </SelectItem>
                            <SelectItem value="Medium">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                Medium Risk — Monitoring
                              </div>
                            </SelectItem>
                            <SelectItem value="High">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                High Risk — At Risk
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Milestone Impact */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-normal text-muted-foreground">Milestone Impact</Label>
                      <Select value={cpiMilestoneImpact} onValueChange={setCpiMilestoneImpact}>
                        <SelectTrigger className="w-full text-sm font-normal">
                          <SelectValue placeholder="Select affected milestone..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Practical Completion">Impacts Practical Completion</SelectItem>
                          <SelectItem value="Roof Wet">Impacts Roof Wet Milestone</SelectItem>
                          <SelectItem value="Handover">Impacts Handover</SelectItem>
                          <SelectItem value="None">None / Internal Buffer Used</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Recovery Plan */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-normal text-muted-foreground">Recovery Strategy / Plan</Label>
                      <Textarea
                        value={cpiRecoveryPlan}
                        onChange={(e) => setCpiRecoveryPlan(e.target.value)}
                        placeholder="What steps are being taken to recover the schedule?"
                        rows={3}
                        className="resize-none text-sm font-normal"
                      />
                    </div>
                  </div>
                )}

                {/* Werner rev H page 5-6 — SI contractor reply tickboxes.
                    TIME and COST are the only structured fields on a
                    Werner SI reply. Either ticked → the reply pulls
                    PM + QS into the conversation and triggers a VO
                    request. The act of clicking Submit Reply IS the
                    acknowledgement (Werner does not have a separate
                    "I formally acknowledge receipt" gate). */}
                {displayTask.type === "SI" && (
                  <div className="space-y-3 mb-6 pb-6 border-b border-border bg-primary/5 p-4 rounded-lg border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      Tick if this instruction has a time and/or cost impact.
                      Either box ticked notifies the PM and QS so a Variation
                      Order can be issued.
                    </p>
                    <div className="flex items-center gap-8">
                      <label htmlFor="siTimeImpact" className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          id="siTimeImpact"
                          checked={siTimeImpact}
                          onChange={(e) => setSiTimeImpact(e.target.checked)}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">TIME</span>
                      </label>
                      <label htmlFor="siCostImpact" className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          id="siCostImpact"
                          checked={siCostImpact}
                          onChange={(e) => setSiCostImpact(e.target.checked)}
                          className="w-4 h-4 text-orange-600 border-border rounded focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-foreground">COST</span>
                      </label>
                    </div>
                    {(siTimeImpact || siCostImpact) && (
                      <p className="text-xs text-orange-700 font-medium">
                        ⚠ PM &amp; QS will be added to the recipients and notified that a VO request is incoming.
                      </p>
                    )}
                  </div>
                )}

                {/* Werner rev H page 10 — GI has no formal acknowledge
                    gate. The reply is text-only; closing out the GI
                    is a separate action on the action bar (only the
                    originator can close). */}
                {/* Toolbar */}
                <div className="flex items-center gap-1 mb-4 pb-4 border-b">
                  <button
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`p-2 hover:bg-muted rounded ${editor?.isActive("bold") ? "bg-muted" : ""}`}>
                    <Bold className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`p-2 hover:bg-muted rounded ${editor?.isActive("italic") ? "bg-muted" : ""}`}>
                    <Italic className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() =>
                      editor?.chain().focus().toggleUnderline().run()
                    }
                    className={`p-2 hover:bg-muted rounded ${editor?.isActive("underline") ? "bg-muted" : ""}`}>
                    <Underline className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={setLink}
                    className={`p-2 hover:bg-muted rounded ${editor?.isActive("link") ? "bg-muted" : ""}`}>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {/* <button
                    onClick={() =>
                      editor?.chain().focus().toggleBulletList().run()
                    }
                    className={`p-2 hover:bg-muted rounded ${editor?.isActive("bulletList") ? "bg-muted" : ""}`}>
                    <List className="h-4 w-4 text-muted-foreground" />
                  </button> */}
                  {/* <Separator orientation="vertical" className="h-6 mx-2" /> */}
                  {/* <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded text-sm">
                    <Zap className="h-4 w-4 text-[#6c5ce7]" />
                    <span className="text-foreground">Smart Actions</span>
                  </button> */}
                </div>

                {/* Editor */}
                <div className="bg-muted rounded-lg border-border focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent relative">
                  {isLoadingAI && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50 rounded-lg">
                      <div className="ai-orb-loader">
                        <div className="ai-orb-wave" />
                        <div className="ai-orb-wave" />
                        <div className="ai-orb-wave" />
                      </div>
                    </div>
                  )}
                  <EditorContent
                    editor={editor}
                    className="text-sm text-muted-foreground"
                  />
                </div>

                {/* Werner spec rev H — reply meta with WIRED pickers.
                    Recipient → project team members (Command picker, uses
                                existing projectMembers from the Assign modal)
                    Attachment → native file input (uploads via the existing
                                  TaskAttachment endpoint on submit)
                    Reference → picker of this project's RFIs/SIs/VOs/IC/Claim
                    Selected items show as removable chips. */}
                <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 mt-3 text-sm">
                  {/* Recipient row */}
                  <div className="text-xs text-muted-foreground self-center">Recipient:</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {replyRecipients.map((u) => (
                      <span key={u.userId || u.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {u.name}
                        <button
                          type="button"
                          onClick={() => setReplyRecipients(r => r.filter(x => (x.userId || x.id) !== (u.userId || u.id)))}
                          className="hover:bg-primary/20 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <Popover open={recipientPopoverOpen} onOpenChange={setRecipientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <UserPlus className="h-3 w-3" />
                          {replyRecipients.length === 0 ? "Add user" : "Add more"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search team members…" />
                          <CommandList>
                            <CommandEmpty>No members found</CommandEmpty>
                            <CommandGroup>
                              {recipientOptions
                                .filter((m: any) => !!m.userId)
                                .filter((m: any) => String(m.userId) !== String(user?.id))
                                // Skip current assignees — they're already on
                                // the auto-notify list as `task.assigned_to`,
                                // and the post-reply reassignment will put the
                                // parent's original author back on the task
                                // anyway, so listing them as a Recipient is
                                // duplicate noise.
                                .filter((m: any) =>
                                  !(displayTask?.assignedTo || []).some(
                                    (a: any) => String(a.userId || a.id) === String(m.userId),
                                  ),
                                )
                                .filter((m: any) => !replyRecipients.some(r => String(r.userId || r.id) === String(m.userId)))
                                .map((m: any) => (
                                  <CommandItem
                                    key={m.userId}
                                    value={`${m.name} ${m.email} ${m.role}`}
                                    onSelect={() => {
                                      setReplyRecipients(r => [...r, m]);
                                      setRecipientPopoverOpen(false);
                                    }}
                                  >
                                    {m.name || m.email}
                                    {m.role && <span className="ml-1 text-xs text-muted-foreground">— {m.role}</span>}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Attachment row */}
                  <div className="text-xs text-muted-foreground self-center">Attachment:</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {replyAttachments.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-foreground border border-border">
                        <FileText className="h-3 w-3" />
                        {f.name}
                        <button
                          type="button"
                          onClick={() => setReplyAttachments(arr => arr.filter((_, idx) => idx !== i))}
                          className="hover:bg-border rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <label className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                      <FileText className="h-3 w-3" />
                      {replyAttachments.length === 0 ? "Attach file" : "Add more"}
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setReplyAttachments(arr => [...arr, ...files]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {/* Reference row */}
                  <div className="text-xs text-muted-foreground self-center">Reference:</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {replyRefs.map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-foreground border border-border">
                        <Link2 className="h-3 w-3" />
                        {r.label}
                        <button
                          type="button"
                          onClick={() => setReplyRefs(arr => arr.filter(x => x.id !== r.id))}
                          className="hover:bg-border rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <Popover open={referencePopoverOpen} onOpenChange={setReferencePopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Link2 className="h-3 w-3" />
                          {replyRefs.length === 0 ? "Link doc" : "Add more"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search project tasks…" />
                          <CommandList>
                            <CommandEmpty>No tasks found</CommandEmpty>
                            <CommandGroup>
                              {referenceOptions
                                .filter((r: any) => !replyRefs.some(x => x.id === r.id))
                                .map((r: any) => (
                                  <CommandItem
                                    key={r.id}
                                    value={r.label}
                                    onSelect={() => {
                                      setReplyRefs(arr => [...arr, { id: r.id, label: r.label, target_type: r.target_type, target_id: r.target_id }]);
                                      setReferencePopoverOpen(false);
                                    }}
                                  >
                                    {r.label}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end mt-4">
                  {/* <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Powered by Baseline Intelligence</span>
                  </div> */}
                  <div className="flex items-center gap-3">
                    {displayTask.type === "VO" ? (
                      canApprove && displayTask.status !== "Approved" && (
                        <Button className="font-normal" onClick={handleVOApproveClick}>
                          {(displayTask.isWithinMandate || displayTask.status === "Recommended")
                            ? "Approve & Sign"
                            : "Recommend for Approval"}
                        </Button>
                      )
                    ) : (
                      // Werner spec rev H — legacy 'Close' button hidden by
                      // default. Werner's spec replaces this with explicit
                      // 'Close out' actions gated by role (RFI=contractor,
                      // SI=professional, VO=PM, GI=initiator, Claim=contractor)
                      // that fire after a response has been submitted. That
                      // logic lives in WernerTaskActions / the future
                      // Close-out button addition. The legacy button is kept
                      // here only when the task is at its final stage so the
                      // status label still surfaces (e.g. 'Approved').
                      canApprove
                      && displayTask.timeline?.current === displayTask.timeline?.stages?.[displayTask.timeline.stages.length - 1]
                      && (
                        <Button
                          variant="outline"
                          className="font-normal"
                          disabled
                        >
                          {displayTask.timeline.current}
                        </Button>
                      )
                    )}

                    {/* Werner spec rev H — Analyze with AI uses purple
                        border + light primary-tint bg (was solid black). */}
                    <button
                      onClick={() => setShowAiChat(!showAiChat)}
                      disabled={isAnalyzeLoading}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm font-normal disabled:opacity-50 disabled:cursor-not-allowed",
                        showAiChat
                          ? "bg-primary text-white border-primary hover:bg-primary/90"
                          : "bg-primary/5 text-primary border-primary/30 hover:bg-primary/10",
                      )}>
                      <Zap className={cn("h-4 w-4", showAiChat && "animate-pulse")} />
                      {showAiChat ? "Close AI Analysis" : "Analyze with AI"}
                    </button>

                    {/* Werner spec rev H — additive task actions:
                        + Action (escalation), Sign & Issue, Risk pills.
                        Renders nothing if not applicable to this task type. */}
                    {entityId && (
                      <WernerTaskActions
                        taskType={taskType || displayTask.type}
                        taskId={taskId || displayTask.id}
                        entityId={entityId}
                        riskLevel={(tdr?.task as any)?.riskLevel ?? (tdr?.task as any)?.risk_level ?? null}
                        isSigned={!!((tdr?.task as any)?.signedAt ?? (tdr?.task as any)?.signed_at)}
                        // Werner — needed to show Close-out for the originator.
                        // displayTask.creator.id mirrors task.assigned_by which
                        // is set to the user who created the entity.
                        originatorId={displayTask.creator?.id ?? null}
                        currentStatus={displayTask.timeline?.current ?? displayTask.status ?? null}
                        // IC-only: respondent ID lets the "Resend broker
                        // email" button show for the respondent themselves.
                        // brokerNotified controls whether the button is
                        // surfaced at all (false → broker never got emailed).
                        respondentId={
                          (tdr?.task as any)?.respondentUser?.userId
                          ?? (tdr?.task as any)?.respondentUser
                          ?? (tdr?.task as any)?.respondent_user
                          ?? null
                        }
                        brokerNotified={
                          (tdr?.task as any)?.brokerNotified
                          ?? (tdr?.task as any)?.broker_notified
                          ?? false
                        }
                        // Werner spec — SI doesn't lock on signed_at; it
                        // locks at Verified. Escalation (e.g. SI → VO if
                        // cost/time impact surfaces mid-flow) must stay
                        // available until then. For VO/Claim, isTaskLocked
                        // matches signed_at so the behaviour is unchanged.
                        isLocked={isTaskLocked}
                        // Werner rev H — after any Werner action (escalate,
                        // sign & issue, risk-set) refetch the task, audit
                        // log, and invalidate every dependent query so
                        // the page state matches the backend without a
                        // manual reload: doc header status, Audit Trail
                        // Card, References Card, and the /tasks board.
                        onChanged={async () => {
                          await refetchTask();
                          await refetchAuditLogs();
                          if (projectId) {
                            queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
                          }
                          // A signed VO mutates project.contract_value and
                          // project.contract_end_date. Invalidate the projects
                          // query so the project detail page reflects the new
                          // values without a manual reload.
                          queryClient.invalidateQueries({ queryKey: ["projects"] });
                          // References sub-panel reads /entity-references/
                          // via its own useFetch; invalidate so it refreshes.
                          if (entityId && taskType) {
                            queryClient.invalidateQueries({
                              queryKey: [`tasks/entity-references/?entity_type=${taskType.toLowerCase()}&entity_id=${entityId}`]
                            });
                          }
                        }}
                      />
                    )}

                    {/* Werner spec rev H — Submit Reply is GREEN per page 3 */}
                    <Button
                      className="font-normal bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleSubmitReply}
                    >
                      Submit Reply
                    </Button>
                  </div>
                </div>
                </div>{/* end .px-6.py-5 form body */}
              </Card>}

              {/* VO Rounds Section */}
              {displayTask.type === "VO" && currentTask.rounds && currentTask.rounds.length > 0 && (
                <div className="space-y-4 mb-4 mt-6">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-normal text-foreground">
                      Negotiation Rounds
                    </h2>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal">
                      {currentTask.rounds.length} {currentTask.rounds.length === 1 ? 'Round' : 'Rounds'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {currentTask.rounds.map((round: any, idx: number) => (
                      <Card
                        key={idx}
                        className="overflow-hidden border-border bg-white shadow-sm hover:border-primary/50 transition-all cursor-pointer"
                        onClick={() => {
                          const isCreator = String(displayTask.creator?.id) === String(user?.id);
                          const currentStatusNorm = (displayTask.timeline?.current || '').toLowerCase().replace(/\s+/g, '');
                          if (isCreator && (currentStatusNorm === 'submitted' || currentStatusNorm === 'priced')) {
                            const creatorName = user?.name || user?.email?.split("@")[0] || "Unknown";
                            updateTask({ status: "Under Review", statusCause: `Response reviewed by ${creatorName}` });
                          }
                          setSelectedResponse(round);
                          setIsResponseModalOpen(true);
                        }}
                      >
                        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-normal">
                              {round.roundNumber}
                            </div>
                            <div>
                              <p className="text-sm font-normal text-foreground">{round.sender}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{round.role} • {new Date(round.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          {round.timeConsequence > 0 && (
                            <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50">
                              +{round.timeConsequence} Days EOT
                            </Badge>
                          )}
                        </div>
                        <div className="p-4 pt-1">
                          {round.message && (
                            <div
                              className="text-xs text-muted-foreground mb-4 prose-sm max-w-none line-clamp-2 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: round.message }}
                            />
                          )}

                          {round.financials?.grandTotal > 0 && (
                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground">Round Total:</span>
                                <span className="text-sm font-normal text-foreground">{formatVOCurrency(round.financials.grandTotal)}</span>
                              </div>
                              <span className="text-[10px] text-primary flex items-center gap-0.5 font-normal">
                                View breakdown <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Chatbot Block — Werner spec rev H: appears ABOVE the
                  reply thread when triggered, so the order reads:
                  doc → AI panel (when open) → replies → reply form. */}
              <AnimatePresence>
                {showAiChat && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: "auto", opacity: 1, marginBottom: 16 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <AIChatInterface
                      taskType={displayTask.type}
                      data={displayTask}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Replies block moved ABOVE the reply form (Werner rev H —
                  chronological reading order: doc → existing replies →
                  input form at the bottom). See the block earlier in
                  this component for the actual render. */}

              {/* Action Requests — Werner spec rev H: hidden on the new
                  task types (SI/VO/GI/IC/Claim) since Werner's spec
                  doesn't reference this feature. The formal prof-to-prof
                  asking pattern is now GI; informal team asks belong in
                  Channels (Communications page). Kept available for:
                    • Legacy CPI tasks
                    • RFI in "Sent for Review" — used to fire the
                      "Further Info Required" transition. The existing
                      onSuccess hook on the dialog already updates the
                      RFI status when the user submits a recipient +
                      message + due date. */}
              {(() => {
                // Werner spec — Action Requests card visibility:
                //   - Always shown on legacy CPI / non-Werner types (legacy behaviour).
                //   - Hidden on SI / VO / GI / IC / DC / Claim (Werner spec
                //     doesn't reference this feature for those).
                //   - On RFI: shown if (a) there are existing requests to
                //     display (so architects can see + respond), OR (b)
                //     the current user is the contractor in Sent for
                //     Review status (so they have an entry point to
                //     create the first one). Hidden otherwise — no empty
                //     "Action Requests" card with nothing in it.
                const t = displayTask.type;
                const requests = displayTask.actionRequests || [];
                const isCreator = String(displayTask.creator?.id) === String(user?.id);
                const currentStatus = (displayTask.timeline?.current || displayTask.status || "").toLowerCase().trim();

                const isLegacyType = !["RFI", "SI", "VO", "GI", "IC", "DC", "CLAIM"].includes(t);
                if (isLegacyType) return true;

                if (t === "RFI") {
                  if (requests.length > 0) return true;
                  if (isCreator && currentStatus === "sent for review") return true;
                  return false;
                }

                return false;
              })() &&
              <Card className="p-6 shadow-none pt-5 bg-white rounded-lg border-border">
                <h2 className="text-sm  text-foreground mb-5">
                  Action Requests
                </h2>
                <div className="space-y-3">
                  {displayTask.actionRequests &&
                    displayTask.actionRequests.map((request: any) => (
                      <RequestInfoResponseRow
                        key={request.id}
                        request={request}
                        currentUserId={user?.id}
                        onChanged={async () => {
                          await refetchTask();
                          await refetchRequestInfo();
                          await refetchAuditLogs();
                        }}
                      />
                    ))}

                  {/* "+ Request Info" button — visibility rules:
                        • RFI: only the original raiser (the contractor)
                          can create new info requests. The architect's
                          role is to RESPOND to existing rows, not to
                          create more questions. Hide for everyone else.
                        • CPI (legacy): keep open to all (no Werner spec
                          for this type — pre-existing behaviour). */}
                  {(() => {
                    if (displayTask.type === "RFI") {
                      const isCreator = String(displayTask.creator?.id) === String(user?.id);
                      if (!isCreator) return null;
                    }
                    return (
                      <RequestInfoDialog
                        wFull={true}
                        taskType={displayTask.type}
                        taskId={taskId || ''}
                        assignedTo={currentTask?.assignedTo || []}
                        onSuccess={async () => {
                          // RFI: requesting info → Further Info Required
                          if (displayTask.type === "RFI") {
                            const currentStatusNorm = (displayTask.timeline?.current || '').toLowerCase().replace(/\s+/g, '');
                            if (currentStatusNorm === 'sentforreview') {
                              await updateTask({ status: "Further Info Required", statusCause: "Additional information requested" });
                            }
                          }
                          refetchTask(); refetchRequestInfo(); refetchAuditLogs();
                        }}
                      />
                    );
                  })()}
                </div>
              </Card>}
            </div>

            {/* Right Column - Sidebar
                Werner rev H — every task type uses the same inline right
                column (Decision Timeline → Audit Trail → References).
                The legacy DC-only TaskSidebar branch (with its bespoke
                green Approve button and Actions card) is removed so the
                Claim page is visually consistent with RFI/SI/VO/GI/IC. */}
            {false ? null : (
              <div className="space-y-4">
                {/* Decision Timeline — world-class visual:
                    larger dots, ring halo around current step, gradient
                    connectors, hover transitions. Wrapped in a white
                    Card to match the rest of the production right panel. */}
                {/* Decision Timeline — VERTICAL layout. Each step is a row
                    with the dot on the left, label on the right, and a
                    connector line dropping straight down to the next dot.
                    Reads naturally top→bottom, fits a narrow side panel,
                    and the line geometry is unambiguous (connector is
                    centred under the dot, not floating below it). */}
                <Card className="p-0 bg-white shadow-none border border-border rounded-lg overflow-hidden">
                  <div className="bg-sidebar/50 px-4 py-2.5 border-b border-border">
                    <h3 className="text-xs font-medium text-foreground">Decision Timeline</h3>
                  </div>
                  <div className="px-4 py-4">
                    <ol className="space-y-0">
                      {displayTask.timeline.stages.map((stage: any, i: any) => {
                        const isComplete = i < currentStageIndex;
                        const isCurrent = i === currentStageIndex;
                        const isLast = i === displayTask.timeline.stages.length - 1;
                        return (
                          <li key={stage} className="relative flex items-start gap-3">
                            {/* Dot column with vertical connector */}
                            <div className="relative flex flex-col items-center shrink-0">
                              {/* Dot */}
                              <button
                                type="button"
                                disabled={!canApprove}
                                onClick={() => {
                                  if (!canApprove) return;
                                  if (displayTask.type === "VO" && (stage === "Approved" || stage === "Recommended")) {
                                    handleVOApproveClick();
                                  } else {
                                    handleApproveTask(stage);
                                  }
                                }}
                                className={cn(
                                  "relative z-10 w-3.5 h-3.5 rounded-full transition-all duration-300 mt-1",
                                  isComplete && "bg-[#6c5ce7] shadow-sm",
                                  isCurrent && "bg-[#6c5ce7] ring-4 ring-[#6c5ce7]/20",
                                  !isComplete && !isCurrent && "bg-white border-2 border-border",
                                  canApprove && "cursor-pointer hover:scale-110",
                                  !canApprove && "cursor-default",
                                )}
                              >
                                {isComplete && (
                                  <Check className="absolute inset-0 m-auto h-2 w-2 text-white" strokeWidth={4} />
                                )}
                              </button>
                              {/* Connector to next dot — only between, never past last */}
                              {!isLast && (
                                <div
                                  className={cn(
                                    "w-[2px] flex-1 min-h-[28px] my-1 transition-colors",
                                    isComplete ? "bg-[#6c5ce7]" : "bg-border",
                                  )}
                                />
                              )}
                            </div>

                            {/* Label */}
                            <div className={cn("flex-1 pb-5 pt-0.5", isLast && "pb-0")}>
                              <p
                                className={cn(
                                  "text-sm leading-tight transition-colors",
                                  isCurrent
                                    ? "text-foreground font-medium"
                                    : isComplete
                                      ? "text-foreground"
                                      : "text-muted-foreground",
                                )}
                              >
                                {stage}
                              </p>
                              {isCurrent && (
                                <p className="text-[11px] text-[#6c5ce7] mt-0.5">In progress</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    {/* Werner spec — when a task ends outside the normal
                        stage flow (SI auto-closed by VO escalation, RFI
                        cancelled, etc.), surface a small subtitle so the
                        timeline doesn't pretend it just finished the
                        verified path. */}
                    {isTerminalBeyondStages && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>
                          {displayTask.timeline?.current || "Closed"} — this task ended outside the normal stage flow.
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Deadlines */}
                {/* <Card className="p-[17px] shadow-none rounded-lg bg-sidebar border-0">
                  <h3 className="text-xs font-normal text-muted-foreground mb-3">
                    Deadlines
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground">Reply due</span>
                      <span className="text-sm  text-[#6c5ce7]">
                        {displayTask.deadlines.replyDue}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Contract window
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {displayTask.deadlines.contractWindow}
                      </span>
                    </div>
                  </div>
                </Card> */}


                {/* Impact */}
                {/* <Card className="p-[17px] rounded-lg text-muted-foreground bg-white shadow-none border-border">
                  <h3 className="text-xs  text-muted-foreground mb-3">
                    Impact
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm ">Time impact</span>
                      <span className="text-sm  text-foreground">
                        {displayTask.impact.time}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm ">Cost impact</span>
                      <span className="text-sm  text-foreground">
                        {displayTask.impact.cost}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm ">Risk score</span>
                        <span className="text-sm  text-[#DC2626]">
                          {displayTask.impact.riskScore}/
                          {displayTask.impact.riskMax}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#6c5ce7] rounded-full"
                          style={{
                            width: `${(displayTask.impact.riskScore / displayTask.impact.riskMax) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card> */}

                {/* Attachments */}
                <TaskAttachments attachments={displayTask?.attachments} />

                {/* Linked Documents - Phase 3 enhancement */}
                {/* <Card className="p-[17px] mt-4 rounded-lg bg-white shadow-none border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-normal text-muted-foreground">
                      Linked Documents
                    </h3>
                    <Button variant="ghost" className="h-6 w-6 p-0 text-[#6c5ce7] hover:bg-transparent">
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 border border-border rounded-md hover:bg-muted/50 cursor-pointer">
                      <div className="bg-blue-50 p-1.5 rounded text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-normal text-foreground truncate">SI-042: Slab Revision</p>
                        <p className="text-xs text-muted-foreground">Originating Instruction</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 border border-border rounded-md hover:bg-muted/50 cursor-pointer">
                      <div className="bg-green-50 p-1.5 rounded text-green-600">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-normal text-foreground truncate">RFI-105: Rebar Spec</p>
                        <p className="text-xs text-muted-foreground">Technical Clarification</p>
                      </div>
                    </div>
                  </div>
                </Card> */}

                {/* Audit Trail — grey header strip + white body. */}
                <Card className="p-0 bg-white shadow-none border border-border rounded-lg overflow-hidden">
                  <div className="bg-sidebar/50 px-4 py-2.5 border-b border-border">
                    <h3 className="text-xs font-medium text-foreground">Audit Trail</h3>
                  </div>
                  <div className="px-4 py-4">
                  {auditLogs && auditLogs.length > 0 ? (
                    groupLogsByDate(auditLogs.slice(0, 30)).map((group) => (
                      <div key={group.label} className="mb-5">
                        <p className="text-xs font-normal text-muted-foreground mb-3 pl-2">{group.label}</p>
                        <div>
                          {group.logs.map((log: any, i: number) => {
                            const { bg, icon } = getLogIconConfig(log);
                            const taskNumber = currentTask ? `#${currentTask.taskType}-${String(currentTask.taskId).padStart(3, '0')}` : displayTask?.displayId;
                            const { text, oldStatus, newStatus, detail, hideUserName, chips } = getActionLabel(log, taskNumber);
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
                                        <span key={idx} className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-normal">
                                          <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-normal shrink-0">
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
                                          {before}<span className="font-normal text-foreground bg-primary/10 px-1 py-0.5 rounded">{name}</span>
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
                </Card>

                {/* References — own Card, matches the panels above. */}
                {entityId && taskType && (
                  <TaskReferences
                    entityType={taskType}
                    entityId={entityId}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analyze with AI Modal */}
      <AIAnalysisModal
        isOpen={isAnalyzeModalOpen}
        onOpenChange={setIsAnalyzeModalOpen}
        isLoading={isAnalyzeLoading}
        analysisData={analysisData}
        taskType={displayTask.type}
        taskId={taskId}
      />

      {/* Assign User Modal */}
      <Dialog open={showAssignModal} onOpenChange={(open) => {
        setShowAssignModal(open);
        if (!open) {
          setSelectedAssignUsers([]);
          setAssignUserPopoverOpen(false);
        }
      }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Assign User</DialogTitle>
            <DialogDescription>
              Select project members to assign to this task.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-normal">Select Users</label>
              <Popover open={assignUserPopoverOpen} onOpenChange={setAssignUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assignUserPopoverOpen}
                    className="w-full justify-between font-normal min-h-[40px] h-auto"
                  >
                    {selectedAssignUsers.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {selectedAssignUsers.map((u) => (
                          <span
                            key={u._id}
                            className="inline-flex items-center gap-1 bg-primary/10 text-[#6c5ce7] text-xs px-2 py-1 rounded-md"
                          >
                            {u.user?.name || u.name || "User"}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select users...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found</CommandEmpty>
                      <CommandGroup>
                        {projectMembers.map((member: any) => {
                          const memberName = member.user?.name || member.name || member.user?.email || "";
                          const memberEmail = member.user?.email || member.email || "";
                          const isSelected = selectedAssignUsers.some((u) => u._id === member._id);
                          return (
                            <CommandItem
                              key={member._id}
                              value={memberName || memberEmail}
                              onSelect={() => {
                                setSelectedAssignUsers((prev) =>
                                  isSelected
                                    ? prev.filter((u) => u._id !== member._id)
                                    : [...prev, member]
                                );
                              }}
                              className="cursor-pointer aria-selected:bg-transparent"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-[#6c5ce7] text-white flex items-center justify-center text-sm font-normal">
                                    {(memberName || memberEmail).charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-normal">{memberName || memberEmail}</span>
                                    {memberEmail && memberName && (
                                      <span className="text-xs text-muted-foreground">{memberEmail}</span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                    isSelected ? "border-[#6c5ce7] bg-[#6c5ce7]" : "border-border bg-white"
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-border rounded-lg text-sm text-foreground bg-white hover:bg-muted/50">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleAssignUser}
              disabled={selectedAssignUsers.length === 0 || isAssigning}
              className="px-4 py-2 border border-transparent rounded-lg text-sm text-white bg-[#6c5ce7] hover:bg-[#6c6de0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssigning ? "Assigning..." : "Submit"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          {selectedResponse && (
            <div className="flex flex-col h-full max-h-[85vh]">
              {/* Header */}
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary font-normal text-lg">
                      {selectedResponse.sender?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-normal text-foreground">
                        {selectedResponse.sender}
                      </h3>
                      {selectedResponse.timeConsequence > 0 ? (
                        <Badge variant="outline" className="text-xs border-amber-200 text-amber-600 bg-amber-50 gap-1.5 font-normal">
                          <Clock className="w-3 h-3" />
                          +{selectedResponse.timeConsequence} Days EOT
                        </Badge>
                      ) : selectedResponse.timeConsequence === 0 ? (
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground bg-muted/50 gap-1.5 font-normal">
                          <Clock className="w-3 h-3" />
                          No Time Impact
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{selectedResponse.role}</span>
                      <span>•</span>
                      <span>{new Date(selectedResponse.timestamp || selectedResponse.date).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Structured Data Section */}
                {selectedResponse.structuredData && Object.keys(selectedResponse.structuredData).some(k => selectedResponse.structuredData[k]) && (
                  <div className="grid grid-cols-2 gap-4 bg-primary/5 rounded-xl p-4 border border-primary/10">
                    {Object.entries(selectedResponse.structuredData).map(([key, value]) => {
                      if (value === undefined || value === null || value === "") return null;
                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={key} className="space-y-1">
                          <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
                            {label}
                          </span>
                          <p className="text-sm font-normal text-foreground">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                              (typeof value === 'object' && value !== null) ?
                                (Array.isArray(value) ? `${value.length} items` : ((value as any).amount !== undefined ? (value as any).amount : '...')) :
                                String(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Content Section */}
                <div className="space-y-3 mb-8">
                  <h4 className="text-xs font-normal text-muted-foreground uppercase tracking-wider">Response Message</h4>
                  <div className="prose prose-sm max-w-none prose-slate">
                    <div
                      className="text-sm text-foreground leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/50"
                      dangerouslySetInnerHTML={{ __html: selectedResponse.content || selectedResponse.message || '<p class="text-muted-foreground italic">No message provided.</p>' }}
                    />
                  </div>
                </div>

                {/* VO Breakdown Section */}
                {selectedResponse.lineItems && selectedResponse.lineItems.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-normal text-muted-foreground uppercase tracking-wider">Price Breakdown</h4>
                    <div className="rounded-xl border border-border overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                          <tr>
                            <th className="text-left px-4 py-2 font-normal">Description</th>
                            <th className="text-right px-4 py-2 font-normal">Qty</th>
                            <th className="text-right px-4 py-2 font-normal">Rate</th>
                            <th className="text-right px-4 py-2 font-normal">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {selectedResponse.lineItems.map((li: any, lIdx: number) => (
                            <tr key={lIdx} className="hover:bg-muted/5 transition-colors">
                              <td className="px-4 py-2.5 text-foreground">{li.description}</td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground">{li.quantity}</td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">{formatVOCurrency(li.unitRate)}</td>
                              <td className="px-4 py-2.5 text-right font-normal text-foreground font-mono">{formatVOCurrency(li.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          {/* Werner spec rev H — full price breakdown.
                              Bug fix: previously this tfoot only rendered
                              "Total Amount", dropping Subtotal and VAT
                              rows that the user entered during pricing.
                              VAT appeared to "disappear" after submit. */}
                          {/* Werner spec rev H — financials shape from
                              backend (tasks/serializers.py:1534) is:
                                financials: {
                                  subTotal, tax: {type, rate, amount}, grandTotal
                                }
                              Earlier fix read selectedResponse.financials.taxAmount /
                              .taxRate which don't exist → VAT defaulted to 0
                              and "VAT (15%)" was the only thing rendered. Read the
                              correct nested .tax.amount / .tax.rate path. */}
                          <tr className="bg-muted/50 border-t border-border">
                            <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground">Subtotal</td>
                            <td className="px-4 py-2 text-right font-mono text-foreground">{formatVOCurrency(selectedResponse.financials?.subTotal ?? 0)}</td>
                          </tr>
                          <tr className="bg-muted/50">
                            <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground">
                              VAT ({selectedResponse.financials?.tax?.rate ?? 15}%)
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-foreground">{formatVOCurrency(selectedResponse.financials?.tax?.amount ?? 0)}</td>
                          </tr>
                          <tr className="bg-[#1B1C1F] text-white">
                            <td colSpan={3} className="px-4 py-2 text-right opacity-70">Total Amount</td>
                            <td className="px-4 py-2 text-right font-normal font-mono">{formatVOCurrency(selectedResponse.financials?.grandTotal ?? 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions — only visible to task creator, but disabled for VOs */}
              {canApprove && displayTask.type !== "VO" && (
                <div className="p-4 border-t bg-muted/20 flex gap-3">
                  {displayTask.type === "CPI" ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all font-normal gap-2"
                        onClick={async () => {
                          setSelectedResponse(null);
                          setIsResponseModalOpen(false);
                          await handleApproveTask('Approved');
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-normal gap-2"
                        onClick={async () => {
                          setSelectedResponse(null);
                          setIsResponseModalOpen(false);
                          await handleApproveTask('Closed');
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        Close
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all font-normal gap-2"
                        onClick={async () => {
                          setSelectedResponse(null);
                          setIsResponseModalOpen(false);
                          await handleApproveTask(displayTask.timeline.stages[displayTask.timeline.stages.length - 1]);
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Close Proposal
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-normal gap-2"
                        onClick={async () => {
                          setSelectedResponse(null);
                          setIsResponseModalOpen(false);
                          await handleApproveTask('Rejected');
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Proposal
                      </Button>
                    </>
                  )}
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ── Origin meta row ─────────────────────────────────────────────────────────
//
// Renders an extra <dt>/<dd> pair inside the doc meta grid when this doc
// was auto-attached to a parent via escalation. Same data source as the
// TaskOriginBanner above the card; React Query caches the response so
// there's only one network call total.

type RefRow = {
  display: string;
  target_type: string;
  target_id: number;
  auto: boolean;
};

function OriginMetaRow({ entityType, entityId }: { entityType: string; entityId: number | string }) {
  const url = entityType && entityId
    ? `tasks/entity-references/?entity_type=${entityType.toLowerCase()}&entity_id=${entityId}`
    : "";
  const { data } = useFetch<{ outgoing: RefRow[] }>(url);
  const origin = (data?.outgoing || []).find((r) => r.auto);
  if (!origin) return null;
  return (
    <>
      <dt className="text-muted-foreground">From source:</dt>
      <dd className="text-foreground">{origin.display}</dd>
    </>
  );
}
