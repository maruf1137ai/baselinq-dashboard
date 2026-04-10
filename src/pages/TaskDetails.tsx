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
  XCircle,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";
import { RequestInfoDialog } from "@/components/commons/RequestInfoDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { postData, patchData } from "@/lib/Api";
import { useQueryClient } from "@tanstack/react-query";
import { TaskContentRenderer } from "@/components/TaskComponents/TaskContentRenderer";
import { TaskSidebar } from "@/components/TaskComponents/TaskSidebar";
import { TaskAttachments } from "@/components/TaskComponents/TaskAttachments";
import { VOWorkflowStepper } from "@/components/TaskComponents/VOWorkflowStepper";
import { SIWorkflowStepper } from "@/components/TaskComponents/SIWorkflowStepper";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";

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
  // Final/positive stages - green
  if (['done', 'approved', 'completed', 'verified', 'closed', 'eot awarded', 'acknowledged'].includes(s))
    return 'bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]';
  // In-progress stages - blue
  if (['in progress', 'in review', 'review', 'issued', 'submitted', 'actioned', 'under review',
    'priced', 'sent for review', 'notice issued', 'under assessment', 'distributed',
    'further info required', 'response provided', 'determination made', 'on track / at risk',
    'scheduled'].includes(s))
    return 'bg-primary/10 text-[#8081F6] border border-[#C7D2FE]';
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

  const { data: user } = useCurrentUser();
  const { userRole } = useUserRoleStore();
  const updateTask = async (data: any) => {
    try {
      if (!taskId) return;
      const payload = { ...data };
      if (payload.status) {
        const lowerStatus = payload.status.toLowerCase();
        if (['approved', 'rejected', 'closed', 'completed', 'eot awarded', 'acknowledged'].includes(lowerStatus)) {
          payload.taskStatus = 'done';
        } else if (lowerStatus === 'todo') {
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
    } catch (err) {
      console.error("Update task error:", err);
      throw err;
    }
  };
  const queryClient = useQueryClient();
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
  const [assignUserPopoverOpen, setAssignUserPopoverOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // VO Structured Pricing Response state
  const [recommendedAmount, setRecommendedAmount] = useState<string>("");
  const [pricingDecision, setPricingDecision] = useState<string>("");
  const [pricingConditions, setPricingConditions] = useState<string>("");
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

  // SI (Site Instruction) state
  const [siAcknowledgeReceipt, setSiAcknowledgeReceipt] = useState<boolean>(false);
  const [siLeadsToVariationResponse, setSiLeadsToVariationResponse] = useState<boolean>(false);
  const [giAcknowledgeReceipt, setGiAcknowledgeReceipt] = useState<boolean>(false);
  const [showAiChat, setShowAiChat] = useState<boolean>(false);


  // Fetch project team members for assign modal
  const { data: projectTeamData } = useFetch<any>(
    projectId ? `projects/${projectId}/team-members/` : "",
    { enabled: !!projectId }
  );
  const projectMembers = projectTeamData?.teamMembers || [];

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

  // Handle SI Approve - updates status to "Acknowledged"
  const handleSIApprove = async () => {
    if (!siAcknowledgeReceipt) {
      toast.error("Please acknowledge receipt of the Site Instruction");
      return;
    }

    if (!currentTask?.taskId) {
      toast.error("Task ID not found. Please refresh and try again.");
      return;
    }

    setIsReplySubmitLoading(true);
    try {
      // Use update-entity endpoint to update SI status to "Acknowledged"
      await patchData({
        url: `/tasks/tasks/${currentTask.taskId}/update-entity/`,
        data: {
          status: "Acknowledged",
          isAcknowledged: true,
          leadsToVariation: siLeadsToVariationResponse,
        },
      });

      toast.success("Site Instruction acknowledged successfully");

      // Refresh task data
      await refetchTask();

      // Reset checkbox states
      setSiAcknowledgeReceipt(false);
      setSiLeadsToVariationResponse(false);
    } catch (error: any) {
      console.error("SI Approve error:", error);
      toast.error(error?.response?.data?.error || error?.message || "Failed to acknowledge SI");
    } finally {
      setIsReplySubmitLoading(false);
    }
  };

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
        return { siAcknowledgeReceipt, siLeadsToVariationResponse };
      }
      if (displayTask.type === "GI") {
        return { giAcknowledgeReceipt };
      }
      return null;
    };
    // test

    const newResponse = {
      id: crypto.randomUUID(),
      content: editor?.getHTML() || "",
      sender: user?.name || user?.email || "Unknown User",
      senderId: user?.id,
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
        if (['draft', 'open', 'todo', '', 'pending'].includes(currentStatusNorm)) {
          // Any user submits first response → Submitted
          updateData.status = "Submitted";
          updateData.statusCause = "Response submitted";
        } else if (isCreator && currentStatusNorm === 'underreview') {
          // Creator submits counter-response while Under Review → Priced
          updateData.status = "Priced";
          updateData.statusCause = `Counter-response submitted by ${creatorName}`;
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
        if (siAcknowledgeReceipt) {
          updateData.status = "Acknowledged";
        } else {
          updateData.status = "Actioned";
        }
      }

      if (displayTask.type === "GI") {
        if (giAcknowledgeReceipt) {
          updateData.status = "Acknowledged";
          updateData.isAcknowledged = true;
        } else {
          updateData.status = "Distributed";
        }
      }

      // Sync pricing and response fields to update the underlying entity
      if (displayTask.type === "VO") {
        updateData.recommendedAmount = recommendedAmount;
        updateData.pricingDecision = pricingDecision;
        updateData.pricingConditions = pricingConditions;
        updateData.lineItems = voLineItems.filter(i => i.description.trim()).map(i => ({
          description: i.description,
          quantity: parseFloat(i.qty) || 0,
          unitRate: parseFloat(i.rate) || 0,
        }));
      }

      if (displayTask.type === "SI") {
        updateData.leadsToVariation = siLeadsToVariationResponse;
        updateData.isAcknowledged = siAcknowledgeReceipt;
      }

      if (displayTask.type === "DC") {
        updateData.extensionGranted = parseInt(dcExtensionGranted) || null;
        updateData.newCompletionDate = dcNewCompletionDate || null;
      }



      await updateTask(updateData);
      toast.success("Reply submitted successfully");
      editor.commands.setContent("");

      // Reset Fields
      setRecommendedAmount("");
      setPricingDecision("");
      setPricingConditions("");
      setRfiResponseStatus("");
      setDcExtensionGranted("");
      setDcNewCompletionDate("");
      setCpiProgress(0);
      setCpiForecastDate("");
      setCpiRecoveryPlan("");
      setCpiRiskLevel("");
      setCpiMilestoneImpact("");
      setSiAcknowledgeReceipt(false);
      setSiLeadsToVariationResponse(false);
      setGiAcknowledgeReceipt(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit reply");
    }
  };


  const handleApproveTask = async (status: string) => {
    if (!currentTask || !taskId) return;

    const stages = displayTask?.timeline?.stages || [];
    const firstStage = stages[0];
    const lastStage = stages[stages.length - 1];
    const taskStatus = status === firstStage ? "Todo" : status === lastStage || status == 'Completed' || status == 'Approved' ? "Done" : "In Review";

    // console.log({ status, firstStage, lastStage, taskStatus })

    try {
      const updatedTask = await patchData({
        url: `tasks/tasks/${taskId}/update-entity/`,
        data: { status, taskStatus, project: Number(projectId) },
      });
      toast.success("Task approved successfully");
      // Use the response directly — it has the freshly saved entity status
      if (updatedTask) {
        setCurrentTask(updatedTask);
      } else {
        setCurrentTask((prev: any) => prev ? { ...prev, task: { ...(prev.task || {}), status }, status } : prev);
      }
      await refetchTask();
      await refetchAuditLogs();
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === 'string' && query.queryKey[0].includes('cost-ledger') });
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
    const mappedActionRequests = actionRequestsData?.map(req => ({
      id: req._id,
      senderName: req.requestedBy?.name || "User",
      recipient: req.recipient?.name || "Recipient",
      role: req.requestedBy?.role || "Team Member",
      task: req.requestDetails,
      date: req.dueDate,
      status: "Pending"
    })) || apiResponse.request_info || [];

    // Common fields
    const baseData = {
      id: apiResponse.taskId || task._id,
      type: taskType === "CRITICALPATHITEM" ? "CPI" : taskType,
      creator: {
        badge: taskType === "CRITICALPATHITEM" ? "CPI" : taskType,
        id: assignedBy?.userId
      },
      watcher: {
        name: assignedTo[0]?.name || "Watcher",
        role: assignedTo[0]?.role || "Watcher",
      },
      assignedTo: assignedTo,
      actionRequests: mappedActionRequests,
      responses: apiResponse.responses || [],
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
            stages: ["Draft", "Submitted", "Under Review", "Priced", "Approved"],
          },
          impact: {
            time: "0 days",
            cost: task.grandTotal ? `R ${Number(task.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "R 0.00",
            riskScore: 35,
            riskMax: 100,
          },
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
          displayId: `#DC-${task._id}`,
          title: task.title,
          task_code: `DC-${task._id}`,
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
          timeline: {
            current: (() => {
              const s = task.status || apiResponse.status || "Delay Identified";
              const legacyMap: Record<string, string> = {
                "Draft": "Delay Identified",
                "Submitted": "Notice Issued",
                "In Review": "Under Assessment",
                "Approved": "EOT Awarded",
                "Rejected": "Determination Made",
                "Closed": "EOT Awarded",
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



      case "GI":
        return {
          ...baseData,
          displayId: `#${task.giNumber || `GI-${task._id}`}`,
          title: task.title,
          task_code: task.giNumber,
          dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date",
          formFields: {
            title: task.title,
            discipline: task.discipline,
            instruction: task.instruction,
            effectiveDate: task.effectiveDate,
            applicableTo: task.applicableTo,
            complianceRequired: task.complianceRequired,
            description: task.description,
          },
          question: {
            text: task.instruction || "",
            tags: [],
          },
          deadlines: {
            replyDue: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A",
            contractWindow: "14 days",
          },
          timeline: {
            current: task.status || apiResponse.status || "Draft",
            stages: ["Draft", "Issued", "Distributed", "Acknowledged"],
          },
          impact: {
            time: "0 days",
            cost: "R 0",
            riskScore: 20,
            riskMax: 100,
          },
        };

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

  const currentStageIndex = displayTask
    ? (() => {
      const current = displayTask.timeline.current;
      const mapped = statusToStageMap[current] || current;
      const idx = displayTask.timeline.stages.indexOf(mapped);
      return idx !== -1 ? idx : 0;
    })()
    : 0;

  const canApprove = !!user && !!displayTask && String(displayTask.creator?.id) === String(user?.id);

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
      <div className="min-h-screen">
        <div className="">
          <div className="grid grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="col-span-2 space-y-4 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm text-foreground hover:bg-muted/50 transition-all shadow-sm">
                  <Printer className="h-4 w-4 text-muted-foreground" />
                  Print / Export
                </button>
              </div>

              {/* Header Card */}
              <Card className="p-6 bg-sidebar shadow-none rounded-lg px-6 py-4 border-border">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h1 className="text-sm  text-foreground">
                        {displayTask.title}
                      </h1>
                      {/* <p className="text-muted-foreground text-sm">{displayTask.displayId || displayTask.id}</p> */}
                      <p className="text-muted-foreground text-sm">{`#${currentTask.taskType}-${String(currentTask.taskId).padStart(3, '0')}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {displayTask.dueDate && displayTask.dueDate !== "No Date" && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-50 rounded-full px-3 py-2 text-amber-600 border-amber-200 text-xs">
                        Due: {displayTask.dueDate}
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white">
                        <DropdownMenuItem
                          onClick={() => {
                            const assignedTo = currentTask?.assignedTo || [];
                            const preSelected = projectMembers.filter((m: any) =>
                              assignedTo.some((a: any) => a.userId === m.userId)
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

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-50 border-amber-200 capitalize text-amber-600 py-1.5 px-3  text-xs">
                      {displayTask.creator.badge}
                    </Badge>
                    <div className="border border-border flex items-center bg-white px-3 rounded-lg gap-2 py-1.5">
                      <User className="h-[14px] w-[14px] text-muted-foreground" />
                      <span className="text-sm text-foreground ">
                        {displayTask.creator.name}{" "}
                        <span className="text-sm text-muted-foreground">
                          ({displayTask.creator.role})
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="border border-border flex items-center bg-white px-3 rounded-lg gap-2 py-1.5">
                      <User className="h-[14px] w-[14px] text-muted-foreground" />
                      <span className="text-sm text-foreground ">
                        {displayTask.watcher.name}{" "}
                        <span className="text-sm text-muted-foreground">
                          ({displayTask.watcher.role})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* assignees */}
                  {displayTask.assignedTo && displayTask.assignedTo.length > 0 && (
                    <div className="flex items-center gap-2">
                      <TooltipProvider delayDuration={0}>
                        <div className="flex items-center">
                          {displayTask.assignedTo.map((assignee: any, index: number) => (
                            <Tooltip key={assignee.userId || index}>
                              <TooltipTrigger asChild>
                                <div
                                  className="h-8 w-8 rounded-full bg-[#8081F6] border-2 border-white flex items-center justify-center text-white text-xs font-medium cursor-pointer"
                                  style={{ marginLeft: index > 0 ? "-8px" : "0" }}
                                >
                                  {assignee.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{assignee.name || "Unknown"}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              </Card>


              {/* Question & Context */}
              <Card className="p-6 shadow-none pt-5 bg-white rounded-lg border-border">
                <h2 className="text-sm  text-foreground mb-5">
                  {displayTask.type === "RFI"
                    ? "Question & Context"
                    : displayTask.type === "SI"
                      ? "Instruction Details"
                      : displayTask.type === "VO"
                        ? "Variation Order Details"
                        : displayTask.type === "DC"
                          ? "Delay Reason & Impact"
                          : displayTask.type === "CPI"
                            ? "Critical Path Details"
                            : displayTask.type === "CPI"
                              ? "Critical Path Details"
                              : displayTask.type === "GI"
                                ? "General Instruction Details"
                                : "Details"}
                </h2>

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
              </Card>

              {/* Response Form */}
              <Card className="p-6 shadow-none pt-5 bg-white rounded-lg border-border">
                <h2 className="text-sm  text-foreground mb-5">
                  {displayTask.type === "RFI"
                    ? "Response"
                    : displayTask.type === "SI"
                      ? "Acknowledgment & Response"
                      : displayTask.type === "VO"
                        ? "Pricing Response"
                        : displayTask.type === "DC"
                          ? "Comments & Updates"
                          : displayTask.type === "CPI"
                            ? "Response"
                            : displayTask.type === "CPI"
                              ? "Response"
                              : displayTask.type === "GI"
                                ? "Response"
                                : "Response"}
                </h2>

                {/* Structured Pricing Response Fields - Only for VO */}
                {displayTask.type === "VO" && (
                  <div className="space-y-4 mb-6 pb-6 border-b border-border">

                    {/* Line Items */}
                    <div>
                      <label className="text-xs font-normal text-muted-foreground block mb-2">Line Items</label>

                      {/* Desktop table — hidden on mobile */}
                      <div className="hidden sm:block border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted border-b border-border">
                            <tr>
                              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-6">#</th>
                              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Description</th>
                              <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-24">Qty</th>
                              <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-24">Rate (R)</th>
                              <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-24">Amount</th>
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
                                    <input type="number" className="w-full text-sm px-3 py-2 rounded border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-transparent text-right" placeholder="0" value={item.qty} onChange={e => updateVoItem(item.id, "qty", e.target.value)} />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input type="number" className="w-full text-sm px-2 py-1.5 rounded border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-transparent text-right" placeholder="0.00" value={item.rate} onChange={e => updateVoItem(item.id, "rate", e.target.value)} />
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
                              <td colSpan={4} className="px-3 py-2 text-xs font-medium text-white text-right">Total</td>
                              <td className="px-3 py-2 text-sm text-right text-white font-medium">{formatVOCurrency(voTotal)}</td>
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
                                  <input type="number" className="w-full text-sm px-3 py-2 rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-right" placeholder="0" value={item.qty} onChange={e => updateVoItem(item.id, "qty", e.target.value)} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-[10px] text-muted-foreground mb-1">Rate (R)</p>
                                  <input type="number" className="w-full text-sm px-2 py-1.5 rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-right" placeholder="0.00" value={item.rate} onChange={e => updateVoItem(item.id, "rate", e.target.value)} />
                                </div>
                                <div className="flex-1 text-right">
                                  <p className="text-[10px] text-muted-foreground mb-1">Amount</p>
                                  <p className="text-sm font-medium text-foreground py-1.5">{formatVOCurrency(amount)}</p>
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
                          <span className="text-xs font-medium text-white">Total</span>
                          <span className="text-sm font-medium text-white">{formatVOCurrency(voTotal)}</span>
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
                  </div>
                )}

                {/* Structured RFI Response Fields */}
                {displayTask.type === "RFI" && (
                  <div className="space-y-4 mb-6 pb-6 border-b border-border">
                    <div>
                      <label className="text-xs font-normal text-muted-foreground block mb-2">
                        Response Status
                      </label>
                      <select
                        value={rfiResponseStatus}
                        onChange={(e) => setRfiResponseStatus(e.target.value)}
                        className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Select status...</option>
                        <option value="clarification_provided">Clarification Provided</option>
                        <option value="further_info_required">Instruction Follows</option>
                        <option value="as_per_drawing">Work as per Drawing</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Formal classification of this RFI response</p>
                    </div>
                  </div>
                )}

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
                        <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                          cpiProgress === 100 ? 'bg-green-100 text-green-700' :
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

                {/* Structured SI Response Fields */}
                {displayTask.type === "SI" && (
                  <div className="space-y-4 mb-6 pb-6 border-b border-border bg-primary/5 p-4 rounded-lg border-primary/20">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="siAcknowledge"
                          checked={siAcknowledgeReceipt}
                          onChange={(e) => setSiAcknowledgeReceipt(e.target.checked)}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <label htmlFor="siAcknowledge" className="text-sm font-normal text-foreground cursor-pointer">
                          I formally acknowledge receipt of this Site Instruction
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="siVariation"
                          checked={siLeadsToVariationResponse}
                          onChange={(e) => setSiLeadsToVariationResponse(e.target.checked)}
                          className="w-4 h-4 text-orange-600 border-border rounded focus:ring-orange-500"
                        />
                        <label htmlFor="siVariation" className="text-sm font-normal text-foreground cursor-pointer">
                          This instruction will lead to a Variation Order request
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic">Receipt and potential cost impact must be declared as per contract protocols.</p>

                    {/* Approve Button - Bottom Right */}
                    <div className="flex justify-end items-center pt-3 border-t border-border mt-4">
                      <Button
                        onClick={handleSIApprove}
                        disabled={isReplySubmitLoading || !siAcknowledgeReceipt}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-sm"
                        size="lg"
                      >
                        {isReplySubmitLoading ? "Approving..." : "Approve"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Structured GI Response Fields */}
                {displayTask.type === "GI" && (
                  <div className="space-y-4 mb-6 pb-6 border-b border-border bg-purple-50/30 p-4 rounded-lg border-purple-100">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="giAcknowledge"
                        checked={giAcknowledgeReceipt}
                        onChange={(e) => setGiAcknowledgeReceipt(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-border rounded focus:ring-purple-500"
                      />
                      <label htmlFor="giAcknowledge" className="text-sm font-normal text-foreground cursor-pointer">
                        I formally acknowledge receipt of this General Instruction
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground italic">General instructions must be distributed and acknowledged by all relevant lead stakeholders.</p>
                  </div>
                )}
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
                    <Zap className="h-4 w-4 text-[#8081F6]" />
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

                {/* Action Buttons */}
                <div className="flex items-center justify-end mt-4">
                  {/* <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Powered by Baseline Intelligence</span>
                  </div> */}
                  <div className="flex items-center gap-3">
                    {canApprove && (
                      <Button
                        className="font-normal"
                        onClick={() => handleApproveTask(displayTask.timeline.stages[displayTask.timeline.stages.length - 1])}
                        disabled={displayTask.timeline.current === displayTask.timeline.stages[displayTask.timeline.stages.length - 1]}>
                        {displayTask.timeline.current === displayTask.timeline.stages[displayTask.timeline.stages.length - 1] ? displayTask.timeline.stages[displayTask.timeline.stages.length - 1] : "Close"}
                      </Button>
                    )}

                    <button
                      onClick={() => setShowAiChat(!showAiChat)}
                      disabled={isAnalyzeLoading}
                      className={cn(
                        "flex items-center gap-1 px-3 py-2.5 rounded-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                        showAiChat
                          ? "bg-primary text-white hover:bg-primary/90"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      )}>
                      <Zap className={cn("h-4 w-4", showAiChat && "animate-pulse")} />
                      {showAiChat ? "Close AI Analysis" : "Analyze with AI"}
                    </button>

                    <Button className="font-normal" onClick={handleSubmitReply}>
                      Submit Reply
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Recent Responses Section */}
              {displayTask.responses && displayTask.responses.some((resp: any) =>
                String(resp.senderId) === String(user?.id) ||
                String(displayTask.creator.id) === String(user?.id)
              ) && (
                  <div className="space-y-3 mb-4 mt-6">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-sm font-normal text-foreground">
                        Recent Responses
                      </h2>
                      <span className="text-[10px] bg-primary/10 text-[#8081F6] px-2 py-0.5 rounded-full font-normal">
                        {displayTask.responses.length} Total
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {displayTask.responses
                        .filter((resp: any) =>
                          String(resp.senderId) === String(user?.id) ||
                          String(displayTask.creator.id) === String(user?.id)
                        )
                        .slice().reverse().map((resp: any) => (
                          <Card
                            key={resp.id}
                            onClick={() => {
                              setSelectedResponse(resp);
                              setIsResponseModalOpen(true);
                              // VO: Creator clicking a response while Submitted → Under Review
                              if (displayTask?.type === "VO") {
                                const isCreator = String(displayTask.creator?.id) === String(user?.id);
                                const currentStatusNorm = (displayTask.timeline?.current || '').toLowerCase().replace(/\s+/g, '');
                                if (isCreator && currentStatusNorm === 'submitted') {
                                  const creatorName = user?.name || user?.email?.split("@")[0] || "Unknown";
                                  updateTask({ status: "Under Review", statusCause: `Response reviewed by ${creatorName}` });
                                }
                              }
                            }}
                            className="p-4 bg-white border border-border hover:border-[#8081F6] hover:shadow-md transition-all cursor-pointer group rounded-xl"
                          >
                            <div className="flex items-start gap-4">
                              <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-border">
                                <AvatarFallback className="bg-primary/5 text-[#8081F6] text-xs font-normal">
                                  {resp.sender
                                    ?.split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-sm font-normal text-foreground truncate">
                                    {resp.sender}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(resp.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <div
                                  className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2"
                                  dangerouslySetInnerHTML={{ __html: resp.content }}
                                />
                                {resp.structuredData && Object.keys(resp.structuredData).some(k => resp.structuredData[k]) && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {Object.entries(resp.structuredData).slice(0, 2).map(([key, value]) => {
                                      if (!value) return null;
                                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                      return (
                                        <span key={key} className="text-[9px] bg-muted/50 px-2 py-0.5 rounded-md text-muted-foreground border border-border/50">
                                          {label}: {
                                            typeof value === 'object' && value !== null
                                              ? (Array.isArray(value) ? `${value.length} items` : ((value as any).amount !== undefined ? (value as any).amount : '...'))
                                              : String(value)
                                          }
                                        </span>
                                      )
                                    })}
                                    {Object.keys(resp.structuredData).length > 2 && (
                                      <span className="text-[9px] text-[#8081F6] font-normal">+ more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}

              {/* AI Chatbot Block */}
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

              {/* Action request */}
              <Card className="p-6 shadow-none pt-5 bg-white rounded-lg border-border">
                <h2 className="text-sm  text-foreground mb-5">
                  Action Requests
                </h2>
                <div className="space-y-3">
                  {displayTask.actionRequests &&
                    displayTask.actionRequests.map((request: any) => (
                      <div
                        key={request.id}
                        className="flex items-start gap-4 p-3 bg-white border rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {request.senderName
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs  text-black capitalize">
                              {request.senderName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs  text-black capitalize">
                              {request.recipient}
                            </span>
                          </div>
                          {/* <p className="text-xs text-muted-foreground mb-1">
                            {request.role}
                          </p> */}
                          <p className="text-xs text-black">{request.task}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Due {new Date(request.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-amber-50 text-amber-600 py-1.5 px-3 hover:bg-orange-50 border-amber-200 text-xs">
                          Pending
                        </Badge>
                      </div>
                    ))}

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
                </div>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            {displayTask.creator.badge === "DC" ? (
              <TaskSidebar
                taskType={displayTask.creator.badge}
                canApprove={canApprove && currentStageIndex < displayTask.timeline.stages.length - 1}
                currentStageIndex={currentStageIndex}
                auditLogs={auditLogs}
                taskData={{
                  ...displayTask,
                  // Add DC-specific fields
                  daysRequested: displayTask.formFields?.requestedExtension || "5",
                  approvedDays: "0",
                  number: displayTask.id,
                  createdBy: displayTask.creator.name,
                  status: displayTask.timeline.current,
                }}
                onStageClick={(stage) => handleApproveTask(stage)}
                onApprove={() => {
                  const lastStage = displayTask.timeline.stages[displayTask.timeline.stages.length - 1];
                  handleApproveTask(lastStage);
                }}
                onReject={() => {
                  toast.info("Task rejected");
                }}
                onRequestInfo={() => {
                  toast.info("Request info dialog triggered");
                }}
              />
            ) : (
              <div className="space-y-6 px-6 py-[45px] border-l">
                {/* Decision Timeline */}
                <div className="">
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
                            width: `${(currentStageIndex / (displayTask.timeline.stages.length - 1)) * 100}%`,
                          }}
                        />
                      </div>

                      {/* Steps */}
                      <div className="flex justify-between relative z-10">
                        {displayTask.timeline.stages.map((stage: any, i: any) => (
                          <button
                            key={stage}
                            disabled={!canApprove}
                            onClick={() => canApprove && handleApproveTask(stage)}
                            className={cn(
                              "relative flex flex-col items-center flex-1",
                              canApprove ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                            )}>
                            {/* Dot */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${i <= currentStageIndex
                                ? "bg-[#8081F6] border-[#8081F6]"
                                : "bg-white border-border"
                                }`}
                            />
                            {/* Label */}
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

                {/* Deadlines */}
                {/* <Card className="p-[17px] shadow-none rounded-lg bg-sidebar border-0">
                  <h3 className="text-xs font-medium text-muted-foreground mb-3">
                    Deadlines
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground">Reply due</span>
                      <span className="text-sm  text-[#8081F6]">
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
                          className="h-full bg-[#8081F6] rounded-full"
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
                    <h3 className="text-xs font-medium text-muted-foreground">
                      Linked Documents
                    </h3>
                    <Button variant="ghost" className="h-6 w-6 p-0 text-[#8081F6] hover:bg-transparent">
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

                {/* Activity Timeline */}
                <div className="mt-8 border-t border-border pt-6">
                  <h3 className="text-xs font-normal text-foreground mb-5st pl-2">Audit Trail</h3>
                  {auditLogs && auditLogs.length > 0 ? (
                    groupLogsByDate(auditLogs.slice(0, 30)).map((group) => (
                      <div key={group.label} className="mb-5">
                        <p className="text-xs font-normal text-muted-foreground mb-3 pl-2">{group.label}</p>
                        <div>
                          {group.logs.map((log: any, i: number) => {
                            const { bg, icon } = getLogIconConfig(log);
                            const { text, oldStatus, newStatus, detail, hideUserName, chips } = getActionLabel(log, displayTask?.displayId);
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
                            className="inline-flex items-center gap-1 bg-primary/10 text-[#8081F6] text-xs px-2 py-1 rounded-md"
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
                    <CommandInput placeholder="Search team members..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
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
                                  <div className="h-8 w-8 rounded-full bg-[#8081F6] text-white flex items-center justify-center text-sm font-medium">
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
                                    isSelected ? "border-[#8081F6] bg-[#8081F6]" : "border-border bg-white"
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
              className="px-4 py-2 border border-transparent rounded-lg text-sm text-white bg-[#8081F6] hover:bg-[#6c6de0] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <h3 className="text-lg font-normal text-foreground">
                      {selectedResponse.sender}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(selectedResponse.date).toLocaleString()}</span>
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
                <div className="prose prose-sm max-w-none prose-slate">
                  <div
                    className="text-sm text-foreground leading-relaxed bg-white rounded-lg"
                    dangerouslySetInnerHTML={{ __html: selectedResponse.content }}
                  />
                </div>
              </div>

              {/* Footer Actions — only visible to task creator */}
              {canApprove && (
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
