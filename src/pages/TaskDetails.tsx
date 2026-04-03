import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapUnderline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Card } from "@/components/ui/card";
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
  const s = (status || '').toLowerCase().replace(/_/g, ' ').trim();
  if (s === 'done') return 'Approved';
  if (s === 'in review' || s === 'review') return 'Review';
  return capitalize(status.replace(/_/g, ' '));
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
  if (a === 'created') return { icon: <Circle className="w-3 h-3 text-[#F59E0B]" />, bg: '#FEF3C7' };
  if (a === 'approved') return { icon: <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />, bg: '#E9F7EC' };
  if (a === 'rejected') return { icon: <XCircle className="w-3 h-3 text-[#DC2626]" />, bg: '#FEF2F2' };
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
  if (s === 'done' || s === 'approved' || s === 'completed') return 'bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]';
  if (s === 'in progress' || s === 'in review' || s === 'review') return 'bg-primary/10 text-[#8081F6] border border-[#C7D2FE]';
  if (s === 'rejected' || s === 'declined') return 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]';
  return 'bg-muted text-muted-foreground border border-border';
};

const getActionLabel = (log: any): { text: string; oldStatus?: string; newStatus?: string } => {
  const action = (log.action || '').toLowerCase();
  if (action === 'status_updated') {
    // Parse "Status changed from X to Y" — X/Y can be multi-word (e.g. "in review")
    const desc = (log.description || '') as string;
    const descLower = desc.toLowerCase();
    const fromIdx = descLower.indexOf('from ');
    const toIdx = descLower.lastIndexOf(' to ');
    if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx + 4) {
      const oldStatus = desc.slice(fromIdx + 5, toIdx).trim();
      const newStatus = desc.slice(toIdx + 4).trim();
      if (oldStatus && newStatus) {
        return {
          text: 'changed the status from',
          oldStatus: displayStatus(oldStatus),
          newStatus: displayStatus(newStatus),
        };
      }
    }
    // Fallback: try explicit old/new value fields
    const raw = log.newValue || log.new_value || log.to || log.value || '';
    const oldRaw = log.oldValue || log.old_value || log.from || '';
    if (raw || oldRaw) {
      return {
        text: 'changed the status from',
        oldStatus: oldRaw ? displayStatus(oldRaw) : undefined,
        newStatus: raw ? displayStatus(raw) : undefined,
      };
    }
    // No parseable status info — show generic text without dangling "from"
    return { text: 'updated the status' };
  }
  if (action === 'created') return { text: 'created this task' };
  if (action === 'assigned') return { text: 'assigned this task' };
  if (action === 'approved') return { text: 'approved this task' };
  if (action === 'rejected') return { text: 'rejected this task' };
  if (action === 'comment_added' || action === 'response_added') return { text: 'added a response' };
  const humanized = action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  return { text: humanized };
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
  const updateTask = async (_data?: any) => { };
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
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // Assign user modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignUsers, setSelectedAssignUsers] = useState<any[]>([]);
  const [assignUserPopoverOpen, setAssignUserPopoverOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // VO Structured Pricing Response state
  const [recommendedAmount, setRecommendedAmount] = useState<string>("");
  const [pricingDecision, setPricingDecision] = useState<string>("");
  const [pricingConditions, setPricingConditions] = useState<string>("");

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
        return { recommendedAmount, pricingDecision, pricingConditions };
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

    const newResponse = {
      content,
      sender: userName,
      date: new Date().toISOString(),
      id: crypto.randomUUID(),
      structuredData: getStructuredData()
    };

    const currentResponses =
      currentTask.responses && Array.isArray(currentTask.responses)
        ? currentTask.responses
        : [];

    const updatedResponses = [...currentResponses, newResponse];

    try {
      const updateData: any = {
        id: currentTask.id,
        responses: updatedResponses,
      };

      // Automate Status Transitions based on Decision
      if (displayTask.type === "VO" && pricingDecision) {
        if (pricingDecision === "approved") updateData.status = "Approved";
        if (pricingDecision === "rejected") updateData.status = "Rejected";
        if (pricingDecision === "partially_approved") updateData.status = "Priced";
      }

      if (displayTask.type === "RFI" && rfiResponseStatus) {
        if (rfiResponseStatus === "clarification_provided") updateData.status = "Response Provided";
        if (rfiResponseStatus === "further_info_required") updateData.status = "Further Info Required";
        if (rfiResponseStatus === "as_per_drawing") updateData.status = "Closed";
      }

      if (displayTask.type === "DC" && dcExtensionGranted) {
        updateData.status = "EOT Awarded";
      }

      if (displayTask.type === "CPI") {
        if (cpiProgress === 100) {
          updateData.status = "Completed";
        } else if (cpiRiskLevel === "High" || cpiRiskLevel === "Medium") {
          updateData.status = "On Track / At Risk";
        } else {
          updateData.status = "In Progress";
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
        } else {
          updateData.status = "Distributed";
        }
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


      setCurrentTask((prev: any) => ({
        ...prev,
        ...updateData
      }));
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
      const boardStatus = taskStatus === "Done" ? "done" : taskStatus === "Todo" ? "todo" : "in review";
      await Promise.all([
        patchData({
          url: `tasks/tasks/${taskId}/update-entity/`,
          data: { status, taskStatus, project: Number(projectId) },
        }),
        // patchData({
        //   url: `tasks/tasks/${taskId}/`,
        //   data: { status: boardStatus },
        // }),
      ]);
      toast.success("Task approved successfully");
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
      await patchData({
        url: `tasks/tasks/${taskId}/`,
        data: {
          assignedTo: selectedAssignUsers.map((u) => {
            return u.userId
          }),
        },
      });

      toast.success("User(s) assigned successfully");
      setShowAssignModal(false);
      setSelectedAssignUsers([]);
      await refetchTask();
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
        name: task.createdBy?.name || task.raisedBy?.name || task.issuedBy?.name || task.submittedBy?.name || assignedBy?.name || "User",
        role: assignedBy?.role || "Creator",
        badge: taskType === "CRITICALPATHITEM" ? "CPI" : taskType,
      },
      watcher: {
        name: assignedTo[0]?.name || "Watcher",
        role: assignedTo[0]?.role || "Watcher",
      },
      assignedTo: assignedTo,
      actionRequests: mappedActionRequests,
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
            current: task.status || apiResponse.status || "Delay Identified",
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
            current: task.status || apiResponse.status || "Scheduled",
            stages: ["Scheduled", "In Progress", "On Track / At Risk", "Completed"],
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

  const canApprove = true;

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
                    <Badge
                      variant="secondary"
                      className="bg-amber-50 rounded-full px-3 py-2 text-amber-600 border-amber-200 text-xs">
                      Due: {displayTask.dueDate}
                    </Badge>
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

                <TaskContentRenderer displayTask={displayTask} />

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

              {/* Previous Responses Section */}
              {currentTask?.responses && currentTask.responses.length > 0 && (
                <Card className="p-6 shadow-none pt-5 bg-white rounded-lg border-border mb-4">
                  <h2 className="text-sm font-medium text-foreground mb-5">
                    Previous Responses
                  </h2>
                  <div className="space-y-3">
                    {currentTask.responses.map((resp: any) => (
                      <div
                        key={resp.id}
                        className="flex items-start gap-4 p-3 bg-white border rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs">
                            {resp.sender
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground capitalize">
                              {resp.sender}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(resp.date).toLocaleString()}
                            </span>
                          </div>
                          <div
                            className="text-sm text-muted-foreground prose prose-sm max-w-none mt-2"
                            dangerouslySetInnerHTML={{ __html: resp.content }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Response Section */}
              <Card className="p-6 shadow-none pt-5 bg-white rounded-lg border-border">
                <h2 className="text-sm  text-foreground mb-5">
                  {displayTask.type === "RFI"
                    ? "Answer Composer"
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
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Recommended Amount */}
                      <div>
                        <label className="text-xs font-normal text-muted-foreground block mb-2">
                          Recommended Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R</span>
                          <input
                            type="text"
                            value={recommendedAmount}
                            onChange={(e) => {
                              // Allow only numbers and decimal point
                              const value = e.target.value.replace(/[^\d.]/g, '');
                              setRecommendedAmount(value);
                            }}
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Your assessed value for this variation</p>
                      </div>

                      {/* Decision */}
                      <div>
                        <label className="text-xs font-normal text-muted-foreground block mb-2">
                          Decision
                        </label>
                        <select
                          value={pricingDecision}
                          onChange={(e) => setPricingDecision(e.target.value)}
                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="">Select decision...</option>
                          <option value="approved">Approved</option>
                          <option value="partially_approved">Partially Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="needs_clarification">Needs Clarification</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">Your formal assessment</p>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div>
                      <label className="text-xs font-normal text-muted-foreground block mb-2">
                        Conditions / Caveats
                      </label>
                      <textarea
                        value={pricingConditions}
                        onChange={(e) => setPricingConditions(e.target.value)}
                        placeholder="Any conditions or caveats on your approval/rejection..."
                        rows={2}
                        className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Optional notes on conditions for this decision</p>
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
                  <div className="space-y-6 mb-6 pb-6 border-b border-border">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Progress Slider */}
                      <div className="md:col-span-2">
                        <div className="flex justify-between mb-2">
                          <label className="text-xs font-normal text-muted-foreground">
                            Current Progress
                          </label>
                          <span className="text-xs font-medium text-primary">{cpiProgress}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={cpiProgress}
                          onChange={(e) => setCpiProgress(parseInt(e.target.value))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Forecast Date */}
                      <div>
                        <label className="text-xs font-normal text-muted-foreground block mb-2">
                          Expected Finish Date
                        </label>
                        <input
                          type="date"
                          value={cpiForecastDate}
                          onChange={(e) => setCpiForecastDate(e.target.value)}
                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Update the predicted completion date</p>
                      </div>

                      {/* Risk Level */}
                      <div>
                        <label className="text-xs font-normal text-muted-foreground block mb-2">
                          Risk Assessment
                        </label>
                        <select
                          value={cpiRiskLevel}
                          onChange={(e) => setCpiRiskLevel(e.target.value)}
                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="Low">Low Risk (On Track)</option>
                          <option value="Medium">Medium Risk (Monitoring)</option>
                          <option value="High">High Risk (At Risk)</option>
                        </select>
                      </div>

                      {/* Milestone Impact */}
                      <div className="md:col-span-2">
                        <label className="text-xs font-normal text-muted-foreground block mb-2">
                          Milestone Impact
                        </label>
                        <select
                          value={cpiMilestoneImpact}
                          onChange={(e) => setCpiMilestoneImpact(e.target.value)}
                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="">Select affected milestone...</option>
                          <option value="Practical Completion">Impacts Practical Completion</option>
                          <option value="Roof Wet">Impacts Roof Wet Milestone</option>
                          <option value="Handover">Impacts Handover</option>
                          <option value="None">None / Internal Buffer Used</option>
                        </select>
                      </div>

                      {/* Recovery Plan */}
                      <div className="md:col-span-2">
                        <label className="text-xs font-normal text-muted-foreground block mb-2">
                          Recovery Strategy / Plan
                        </label>
                        <textarea
                          value={cpiRecoveryPlan}
                          onChange={(e) => setCpiRecoveryPlan(e.target.value)}
                          placeholder="What steps are being taken to recover the schedule?"
                          rows={2}
                          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        />
                      </div>
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
                    <Button
                      className="font-normal"
                      onClick={() => handleApproveTask('Approved')}
                      disabled={!canApprove || ["Approved", "Completed"].includes(displayTask.timeline.current)}>
                      {["Approved", "Completed"].includes(displayTask.timeline.current) ? "Approved" : "Approve"}
                    </Button>

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
                    onSuccess={() => { refetchTask(); refetchRequestInfo(); refetchAuditLogs(); }}
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
                            const { text, oldStatus, newStatus } = getActionLabel(log);
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
                                      <span className="text-sm font-normal text-foreground">{log.createdByName || 'System'}</span>
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
    </DashboardLayout>
  );
}
