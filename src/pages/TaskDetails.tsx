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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link, useParams } from "react-router-dom";
import { RequestInfoDialog } from "@/components/commons/RequestInfoDialog";
import { useUpdateTask } from "@/supabse/hook/useTask";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { postData, patchData } from "@/lib/Api";
import { TaskContentRenderer } from "@/components/TaskComponents/TaskContentRenderer";
import { TaskSidebar } from "@/components/TaskComponents/TaskSidebar";
import { TaskAttachments } from "@/components/TaskComponents/TaskAttachments";

export default function TaskDetails() {
  const { taskId } = useParams();
  const projectId = localStorage.getItem("selectedProjectId");
  // Fetch task details from new Django API
  const { data: taskDetailsResponse, isLoading, refetch: refetchTask } = useFetch(
    projectId && taskId ? `tasks/tasks/${taskId}/` : "",
    // projectId && taskId ? `projects/${projectId}/tasks/${taskId}/` : "",
    { enabled: !!taskId && !!projectId }
  );

  const { data: user } = useCurrentUser();
  const { mutateAsync: updateTask } = useUpdateTask();
  const [currentTask, setCurrentTask] = useState<any>(null);

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

  // Fetch project team members for assign modal
  const { data: projectTeamData } = useFetch<any>(
    projectId ? `projects/${projectId}/team-members/` : "",
    { enabled: !!projectId }
  );
  const projectMembers = projectTeamData?.teamMembers || [];

  const handleAnalyzeWithAi = async () => {
    setIsAnalyzeModalOpen(true);
    setIsAnalyzeLoading(true);

    // Toggle between mock and real API: set USE_MOCK to false to use real API
    const USE_MOCK = false;

    try {
      if (USE_MOCK) {
        // Simulate API delay for realistic experience
        await new Promise(resolve => setTimeout(resolve, 1500));
        // setAnalysisData(MOCK_ANALYSIS_DATA);
      } else {
        const response = await postData({
          url: 'ai_analysis/vo/',
          data: {
            contract_document_id: 2,
            task_id: taskId,
          },
        });
        setAnalysisData(response);
      }
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      toast.error('Failed to analyze. Please try again.');
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
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content:
                  "You are a construction principal agent, now draft a response from this action item. Do not make it as an email reposone from ai. Remove any placeholder. reply as a plan text, do not add any title, subtitle, or any other formatting, response as ZAR (R)",
              },
              {
                role: "user",
                content: `Title: ${currentTask.title}\nDiscipline: ${currentTask.Discipline}\nDescription: ${currentTask.description || currentTask.Question || currentTask.Instruction || "No description provided"} ${currentTask?.impact}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
            stream: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedResponse = "";
      let hasStartedStreaming = false;

      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") break;

            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0].delta?.content || "";

              if (content && !hasStartedStreaming) {
                setIsLoadingAI(false);
                hasStartedStreaming = true;
              }

              accumulatedResponse += content;
              if (editor && content) {
                editor.commands.setContent(accumulatedResponse);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Final state sync
      setAiResponse(accumulatedResponse);
      // toast.success("AI response generated successfully");
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

    const newResponse = {
      content,
      sender: userName,
      date: new Date().toISOString(),
      id: crypto.randomUUID(),
    };

    const currentResponses =
      currentTask.responses && Array.isArray(currentTask.responses)
        ? currentTask.responses
        : [];

    const updatedResponses = [...currentResponses, newResponse];

    try {
      await updateTask({
        id: currentTask.id,
        responses: updatedResponses,
      });
      toast.success("Reply submitted successfully");
      editor.commands.setContent("");

      setCurrentTask((prev: any) => ({
        ...prev,
        responses: updatedResponses,
      }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit reply");
    }
  };

  const handleApproveTask = async () => {
    if (!currentTask) return;

    try {
      await updateTask({
        id: currentTask.id,
        timeline_status: "Approved",
      });
      toast.success("Task approved successfully");

      setCurrentTask((prev: any) => ({
        ...prev,
        timeline_status: "Approved",
      }));
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
        url: attachment.url || attachment.fileUrl || '',
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

  const currentStageIndex = displayTask
    ? displayTask.timeline.stages.indexOf(displayTask.timeline.current) !== -1
      ? displayTask.timeline.stages.indexOf(displayTask.timeline.current)
      : 0
    : 0;

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

  if (isLoading && !currentTask) {
    return (
      <DashboardLayout padding="p-0">
        <div className="p-8 text-center text-gray-500">Loading task details...</div>
      </DashboardLayout>
    );
  }

  if (!displayTask) {
    return (
      <DashboardLayout padding="p-0">
        <div className="p-8 text-center text-gray-500">Task not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout padding="p-0">
      <div className="min-h-screen ">
        <div className="">
          <div className="grid  grid-cols-3  ">
            {/* Left Column - Main Content */}
            <div className="col-span-2 space-y-4 px-8 py-[17px]">
              {/* Back Button */}
              <Link
                to={"/tasks"}
                className="flex mb-[24px] items-center gap-2 text-sm text-[#6B7280] hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                Back to Tasks
              </Link>

              {/* Header Card */}
              <Card className="p-6 bg-[#F3F2F0] shadow-none rounded-[10px] px-[25px] py-[17px] border-[#F3F4F6]">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h1 className="text-base  text-[#1B1C1F]">
                        {displayTask.title}
                      </h1>
                      {/* <p className="text-[#6B7280] text-sm">{displayTask.displayId || displayTask.id}</p> */}
                      <p className="text-[#6B7280] text-sm">{`#${currentTask.taskType}-${String(currentTask.taskId).padStart(3, '0')}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="bg-[#FFF7ED] rounded-[28px] px-[14px] py-2 text-[#F97316] border-[#FED7AA] text-xs">
                      Due: {displayTask.dueDate}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-gray-500 hover:text-gray-600">
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
                    <Badge className="bg-[#FFF3E6] border-[#FED7AA] capitalize text-[#D97706] py-[7px] px-[13px]  text-xs">
                      {displayTask.creator.badge}
                    </Badge>
                    <div className="border border-[#E7E9EB] flex items-center bg-white px-[13px] rounded-[8px] gap-2 py-[6px]">
                      <User className="h-[14px] w-[14px] text-[#6B7280]" />
                      <span className="text-sm text-gray-900 ">
                        {displayTask.creator.name}{" "}
                        <span className="text-sm text-gray-500">
                          ({displayTask.creator.role})
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="border border-[#E7E9EB] flex items-center bg-white px-[13px] rounded-[8px] gap-2 py-[6px]">
                      <User className="h-[14px] w-[14px] text-[#6B7280]" />
                      <span className="text-sm text-gray-900 ">
                        {displayTask.watcher.name}{" "}
                        <span className="text-sm text-gray-500">
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
              <Card className="p-[25px] shadow-none pt-[22px] bg-white rounded-[14px] border-[#E7E9EB]">
                <h2 className="text-base  text-[#0E1C2E] mb-5">
                  {displayTask.type === "RFI"
                    ? "Question & Context"
                    : displayTask.type === "SI"
                      ? "Instruction Details"
                      : displayTask.type === "VO"
                        ? "Variation Order Details"
                        : displayTask.type === "DC"
                          ? "Delay Reason & Impact"
                          : displayTask.type === "CPI"
                            ? "Cost Proposal Details"
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
                        className="bg-[#F2F3F5] border-[#E7E9EB] text-[#6B7280] text-[11px] px-[10px] py-[6px] rounded-[6px] font-normal">
                        {tag}
                      </Badge>
                    ))}
                </div> */}
              </Card>

              {/* Previous Responses Section */}
              {currentTask?.responses && currentTask.responses.length > 0 && (
                <Card className="p-[25px] shadow-none pt-[22px] bg-white rounded-[14px] border-[#E7E9EB] mb-4">
                  <h2 className="text-base font-medium text-[#0E1C2E] mb-5">
                    Previous Responses
                  </h2>
                  <div className="space-y-3">
                    {currentTask.responses.map((resp: any) => (
                      <div
                        key={resp.id}
                        className="flex items-start gap-4 p-3 bg-white border rounded-[10px]">
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
                            <span className="text-sm font-medium text-[#111827] capitalize">
                              {resp.sender}
                            </span>
                            <span className="text-[11px] text-[#6B7280]">
                              {new Date(resp.date).toLocaleString()}
                            </span>
                          </div>
                          <div
                            className="text-sm text-[#4B5563] prose prose-sm max-w-none mt-2"
                            dangerouslySetInnerHTML={{ __html: resp.content }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Response Section */}
              <Card className="p-[25px] shadow-none pt-[22px] bg-white rounded-[14px] border-[#E7E9EB]">
                <h2 className="text-base  text-[#0E1C2E] mb-5">
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
                            : displayTask.type === "GI"
                              ? "Response"
                              : "Response"}
                </h2>

                {/* Toolbar */}
                <div className="flex items-center gap-1 mb-4 pb-4 border-b">
                  <button
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`p-2 hover:bg-gray-100 rounded ${editor?.isActive("bold") ? "bg-gray-200" : ""}`}>
                    <Bold className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`p-2 hover:bg-gray-100 rounded ${editor?.isActive("italic") ? "bg-gray-200" : ""}`}>
                    <Italic className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() =>
                      editor?.chain().focus().toggleUnderline().run()
                    }
                    className={`p-2 hover:bg-gray-100 rounded ${editor?.isActive("underline") ? "bg-gray-200" : ""}`}>
                    <Underline className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={setLink}
                    className={`p-2 hover:bg-gray-100 rounded ${editor?.isActive("link") ? "bg-gray-200" : ""}`}>
                    <Link2 className="h-4 w-4 text-gray-600" />
                  </button>
                  {/* <button
                    onClick={() =>
                      editor?.chain().focus().toggleBulletList().run()
                    }
                    className={`p-2 hover:bg-gray-100 rounded ${editor?.isActive("bulletList") ? "bg-gray-200" : ""}`}>
                    <List className="h-4 w-4 text-gray-600" />
                  </button> */}
                  {/* <Separator orientation="vertical" className="h-6 mx-2" /> */}
                  {/* <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded text-sm">
                    <Zap className="h-4 w-4 text-[#8081F6]" />
                    <span className="text-gray-700">Smart Actions</span>
                  </button> */}
                </div>

                {/* Editor */}
                <div className="bg-gray-50 rounded-lg border-[#F3F3F5] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent relative">
                  {isLoadingAI && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/50 rounded-lg">
                      <div className="ai-orb-loader">
                        <div className="ai-orb-wave" />
                        <div className="ai-orb-wave" />
                        <div className="ai-orb-wave" />
                      </div>
                    </div>
                  )}
                  <EditorContent
                    editor={editor}
                    className="text-sm text-[#717784]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end mt-4">
                  {/* <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Powered by Baseline Intelligence</span>
                  </div> */}
                  <div className="flex items-center gap-3">
                    {/* <Button
                      variant="outline"
                      className="text-sm"
                      onClick={handleAnalyzeWithAi}
                    >
                      Analyze with Ai
                    </Button> */}
                    <button
                      onClick={handleAnalyzeWithAi}
                      disabled={isAnalyzeLoading}
                      className="bg-gray-900 flex items-center gap-1 px-3 py-2.5 rounded-[8px] hover:bg-gray-800 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      <Zap className="h-4 w-4" />
                      {isAnalyzeLoading ? "Generating..." : "Analyze with AI"}
                    </button>

                    <Button className="font-normal" onClick={handleSubmitReply}>
                      Submit Reply
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Action request */}
              <Card className="p-[25px] shadow-none pt-[22px] bg-white rounded-[14px] border-[#E7E9EB]">
                <h2 className="text-base  text-[#0E1C2E] mb-5">
                  Action Requests
                </h2>
                <div className="space-y-3">
                  {displayTask.actionRequests &&
                    displayTask.actionRequests.map((request: any) => (
                      <div
                        key={request.id}
                        className="flex items-start gap-4 p-3 bg-white border rounded-[10px]">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
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
                          {/* <p className="text-xs text-gray-500 mb-1">
                            {request.role}
                          </p> */}
                          <p className="text-xs text-black">{request.task}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Due {new Date(request.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-[#FFF7ED] text-[#F97316] py-1.5 px-3 hover:bg-orange-50 border-[#FED7AA] text-xs">
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
                taskData={{
                  ...displayTask,
                  // Add DC-specific fields
                  daysRequested: displayTask.formFields?.requestedExtension || "5",
                  approvedDays: "0",
                  number: displayTask.id,
                  createdBy: displayTask.creator.name,
                  status: displayTask.timeline.current,
                }}
                onApprove={handleApproveTask}
                onReject={() => {
                  toast.info("Task rejected");
                }}
                onRequestInfo={() => {
                  toast.info("Request info dialog triggered");
                }}
              />
            ) : (
              <div className="space-y-6 px-[25px] py-[45px] border-l">
                {/* Decision Timeline */}
                <div className="hidden">
                  <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-5">
                    Decision Timeline
                  </h3>
                  <div className="relative">
                    <div className="relative w-full max-w-3xl mx-auto">
                      {/* Line */}
                      <div className="absolute top-2 left-0 right-0 h-[2px] bg-gray-200">
                        <div
                          className="h-[2px] bg-[#8081F6] transition-all duration-500"
                          style={{
                            width: `${(currentStageIndex / (displayTask.timeline.stages.length - 1)) * 110}%`,
                          }}
                        />
                      </div>

                      {/* Steps */}
                      <div className="flex justify-between relative z-10">
                        <div className="relative flex items-center justify-between w-full">
                          {displayTask.timeline.stages.map(
                            (stage: any, i: any) => (
                              <div
                                key={stage}
                                className="relative flex flex-col items-center flex-1">
                                {/* Dot */}
                                <div
                                  className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${i <= currentStageIndex
                                    ? "bg-[#8081F6] border-[#8081F6]"
                                    : "bg-[#E7E9EB] border-[#E7E9EB]"
                                    }`}
                                />
                                {/* Label */}
                                <span
                                  className={`text-sm mt-3 text-[#6B7280] w-full ${i === 0
                                    ? "text-center"
                                    : i ===
                                      displayTask.timeline.stages.length - 1
                                      ? "text-center"
                                      : "text-center"
                                    }`}>
                                  {stage}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deadlines */}
                {/* <Card className="p-[17px] shadow-none rounded-[10px] bg-[#F3F2F0] border-0">
                  <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-3">
                    Deadlines
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#1B1C1F]">Reply due</span>
                      <span className="text-sm  text-[#8081F6]">
                        {displayTask.deadlines.replyDue}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#6B7280]">
                        Contract window
                      </span>
                      <span className="text-sm text-[#6B7280]">
                        {displayTask.deadlines.contractWindow}
                      </span>
                    </div>
                  </div>
                </Card> */}

                {/* <Button
                  className="w-full mt-4 font-normal"
                  onClick={handleApproveTask}
                  disabled={currentTask?.timeline_status === "Approved"}>
                  {currentTask?.timeline_status === "Approved"
                    ? "Approved"
                    : "Approve"}
                </Button> */}

                {/* Impact */}
                {/* <Card className="p-[17px] rounded-[10px] text-[#6B7280] bg-white shadow-none border-[#E7E9EB]">
                  <h3 className="text-xs  text-[#6B7280] uppercase tracking-wide mb-3">
                    Impact
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm ">Time impact</span>
                      <span className="text-sm  text-[#1B1C1F]">
                        {displayTask.impact.time}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm ">Cost impact</span>
                      <span className="text-sm  text-[#1B1C1F]">
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
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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


                {/* Linked */}
                {/* <Card className="pt-4 bg-white shadow-none border-0">
                  <h3 className="text-xs  text-[#6B7280] uppercase tracking-wide mb-3">Linked</h3>
                  <div className="space-y-2">
                    {displayTask.linked.map((item: any, i: any) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-[13px] py-[15px] border border-[#E7E9EB] rounded-[10px] hover:bg-white  transition-colors cursor-pointer"
                      >
                        {item.type === 'document' && <FileText className="h-4 w-4 text-[#6B7280] mt-0.5" />}
                        {item.type === 'message' && <MessageSquare className="h-4 w-4 text-[#6B7280] mt-0.5" />}
                        {item.type === 'vo' && <Link2 className="h-4 w-4 text-[#6B7280] mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-sm text-[#1B1C1F]">{item.name}</p>
                          {item.count && <p className="text-xs text-gray-500">{item.count} messages</p>}
                          {item.status && (
                            <Badge className="mt-1 rounded-[4px] bg-orange-50 text-orange-600 hover:bg-orange-50 text-xs">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card> */}

                {/* Audit */}
                <Card className="pt-4 bg-white shadow-none border-0">
                  <h3 className="text-xs  text-[#6B7280] uppercase tracking-wide mb-3">
                    Audit
                  </h3>
                  <div className="space-y-3">
                    {(auditLogs || []).map((entry: any) => (
                      <div
                        key={entry.id}
                        className="p-3 border border-[#E7E9EB] rounded-[10px] bg-white"
                      >
                        <p className="text-sm text-gray-900">
                          {entry.description}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          {entry.createdByName} &middot; {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
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
              <label className="text-sm font-medium">Select Users</label>
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
                            className="inline-flex items-center gap-1 bg-[#F0F0FF] text-[#8081F6] text-xs px-2 py-1 rounded-md"
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
                                    <span className="text-sm font-medium">{memberName || memberEmail}</span>
                                    {memberEmail && memberName && (
                                      <span className="text-xs text-muted-foreground">{memberEmail}</span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                    isSelected ? "border-[#8081F6] bg-[#8081F6]" : "border-gray-300 bg-white"
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
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">
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
