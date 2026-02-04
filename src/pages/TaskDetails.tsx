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
  ArrowLeft,
  MoreVertical,
  User,
  Bold,
  Italic,
  Underline,
  Link2,
  Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link, useParams } from "react-router-dom";
import { RequestInfoDialog } from "@/components/commons/RequestInfoDialog";
import { useUpdateTask } from "@/supabse/hook/useTask";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { postData } from "@/lib/Api";
import { TaskContentRenderer } from "@/components/TaskComponents/TaskContentRenderer";
import { TaskSidebar } from "@/components/TaskComponents/TaskSidebar";

const taskDataMap = {
  "RFI-001": {
    id: "RFI-001",
    title: "Review foundation specs with structural engineer",
    dueDate: "Jan 07, 2026",
    creator: { name: "John Smith", role: "Architect", badge: "RFI" },
    watcher: { name: "David Contractor", role: "Watcher" },
    formFields: {
      subject: "Review foundation specs with structural engineer",
      discipline: "Structural Engineering",
      question:
        "We require clarification on the electrical outlet specifications for Block A, specifically regarding the number and placement of outlets in the residential units on floors 3-7.\n\nThe current drawings (E-201 Rev B) show 6 outlets per unit, but the approved specifications document indicates 8 outlets as per the JBCC requirements for residential buildings of this classification.\n\nPlease confirm which specification is correct and whether this will impact the current installation schedule and material procurement timeline.",
    },
    question: {
      text: `We require clarification on the electrical outlet specifications for Block A, specifically regarding the number and placement of outlets in the residential units on floors 3-7.

The current drawings (E-201 Rev B) show 6 outlets per unit, but the approved specifications document indicates 8 outlets as per the JBCC requirements for residential buildings of this classification.

Please confirm which specification is correct and whether this will impact the current installation schedule and material procurement timeline.`,
      tags: ["JBCC 13.3", "Notice within 14 days"],
    },
    timeline: {
      current: "In Review",
      stages: ["Pending", "In Review", "Approved", "Closed"],
    },
    deadlines: {
      replyDue: "07/01/2026",
      contractWindow: "14 days",
    },
    impact: {
      time: "5 days",
      cost: "R 45,000",
      riskScore: 75,
      riskMax: 100,
    },
    linked: [
      { type: "document", name: "JBCC Principal Building Agreement v3" },
      { type: "document", name: "Drawing E-201 Rev B" },
      { type: "message", name: "rfi-001", count: 7 },
      {
        type: "vo",
        name: "VO - Additional power outlets Block A",
        status: "Pending",
      },
    ],
    audit: [
      { action: "RFI created by David Contractor", date: "06/01 11:28" },
      { action: "Action request to QS", date: "06/01 11:33" },
      { action: "AI draft reply prepared", date: "07/01 09:15", isAI: true },
    ],
    actionRequests: [
      {
        id: 1,
        person: "David Contractor",
        role: "Contractor",
        task: "Upload photos & markups (Block A)",
        dueDate: "06/01",
        status: "Waiting",
      },
      {
        id: 2,
        person: "David Contractor",
        role: "Contractor",
        task: "Upload photos & markups (Block A)",
        dueDate: "06/01",
        status: "Waiting",
      },
    ],
  },
  "SI-001": {
    id: "SI-001",
    title: "Submit fire safety certificate application",
    dueDate: "Jan 08, 2026",
    creator: { name: "Sarah Johnson", role: "Project Manager", badge: "SI" },
    watcher: { name: "Mike Anderson", role: "Watcher" },
    formFields: {
      title: "Submit fire safety certificate application",
      discipline: "Fire Safety & Compliance",
      instruction:
        "Please submit the fire safety certificate application for Block B. Ensure all documentation is complete and complies with local regulations. This is critical for maintaining our project timeline.",
      location: "Block B - All Floors",
      urgency: "high",
      dueDate: "2026-01-08",
      voReference: "VO-023",
      costImpact: "under20k",
    },
    question: {
      text: `Please submit the fire safety certificate application for Block B.

Ensure all documentation is complete and complies with local regulations.

This is critical for maintaining our project timeline.`,
      tags: ["JBCC 14.2", "Urgent"],
    },
    timeline: {
      current: "Pending",
      stages: ["Pending", "In Review", "Approved", "Closed"],
    },
    deadlines: {
      replyDue: "08/01/2026",
      contractWindow: "7 days",
    },
    impact: {
      time: "3 days",
      cost: "R 25,000",
      riskScore: 60,
      riskMax: 100,
    },
    linked: [
      { type: "document", name: "Fire Safety Regulations 2025" },
      { type: "message", name: "si-001", count: 3 },
    ],
    audit: [{ action: "SI created by Mike Anderson", date: "07/01 14:20" }],
    actionRequests: [],
  },
  "VO-001": {
    id: "VO-001",
    title: "Approve material variation for facade panels",
    dueDate: "Jan 09, 2026",
    creator: { name: "Alex Turner", role: "Architect", badge: "VO" },
    watcher: { name: "Emma Davis", role: "Watcher" },
    formFields: {
      title: "Approve material variation for facade panels",
      discipline: "Architecture & Materials",
      description:
        "We propose a variation in the facade panel material from aluminum composite to fiber cement panels. This change will reduce costs by approximately 15% while maintaining the aesthetic requirements.",
      items: [
        {
          description: "Fiber cement facade panels - Main elevation",
          qty: 450,
          rate: 850,
        },
        {
          description: "Installation labor cost adjustment",
          qty: 1,
          rate: 120000,
        },
        {
          description: "Additional waterproofing membrane",
          qty: 450,
          rate: 150,
        },
      ],
    },
    question: {
      text: `We propose a variation in the facade panel material from aluminum composite to fiber cement panels.

This change will reduce costs by approximately 15% while maintaining the aesthetic requirements.

Please review and approve this variation order.`,
      tags: ["Cost Savings", "Material Change"],
    },
    timeline: {
      current: "In Review",
      stages: ["Pending", "In Review", "Approved", "Closed"],
    },
    deadlines: {
      replyDue: "09/01/2026",
      contractWindow: "21 days",
    },
    impact: {
      time: "0 days",
      cost: "-R 120,000",
      riskScore: 35,
      riskMax: 100,
    },
    linked: [
      { type: "document", name: "Facade Specifications v2" },
      { type: "message", name: "vo-001", count: 5 },
    ],
    audit: [
      { action: "VO created by Emma Davis", date: "08/01 09:45" },
      { action: "Cost analysis completed", date: "08/01 16:30" },
    ],
    actionRequests: [],
  },
  "DC-001": {
    id: "DC-001",
    title: "Facade Panel Material Variation Approval Delay Claim",
    dueDate: "Jan 12, 2026",
    creator: { name: "Robert Chen", role: "Contractor", badge: "DC" },
    watcher: { name: "Lisa Wong", role: "Watcher" },
    formFields: {
      title: "Facade Panel Material Variation Approval Delay Claim",
      causeCategory: "Client Decision Delay",
      costImpact: "R 450,000",
      description:
        "Delay claim due to late approval of facade panel material variation. The delay has caused a 14-day extension to the project timeline and additional costs for labor retention. We request compensation for the delay and extension of completion date.",
      requestedExtension: "14",
    },
    question: {
      text: `Delay claim due to late approval of facade panel material variation.

The delay has caused a 14-day extension to the project timeline and additional costs for labor retention.

We request compensation for the delay and extension of completion date.`,
      tags: ["Delay", "Compensation Required"],
    },
    timeline: {
      current: "Pending",
      stages: ["Pending", "In Review", "Approved", "Closed"],
    },
    deadlines: {
      replyDue: "12/01/2026",
      contractWindow: "28 days",
    },
    impact: {
      time: "14 days",
      cost: "R 450,000",
      riskScore: 85,
      riskMax: 100,
    },
    linked: [
      { type: "document", name: "Contract Schedule Extension Request" },
      {
        type: "vo",
        name: "VO-001 - Facade Panel Variation",
        status: "Approved",
      },
      { type: "message", name: "dc-001", count: 5 },
    ],
    audit: [
      { action: "DC created by Lisa Wong", date: "10/01 11:00" },
      { action: "Legal review requested", date: "10/01 15:45" },
    ],
    actionRequests: [],
  },
  "CPI-001": {
    id: "CPI-001",
    title: "Cost Proposal for facade panels",
    dueDate: "Jan 12, 2026",
    creator: { name: "James Wilson", role: "Quantity Surveyor", badge: "CPI" },
    watcher: { name: "Michelle Lee", role: "Watcher" },
    formFields: {
      title: "Cost Proposal for facade panels",
      discipline: "Quantity Surveying",
      description:
        "This is a critical path item for the facade panel procurement. The cost proposal must be reviewed and approved within 7 days to maintain project schedule. Delayed approval will impact the critical path and cause project delays.",
      proposedCost: "R 750,000",
      justification:
        "This cost includes material procurement, installation, and warranty. Urgent approval required to maintain critical path.",
      impactOnSchedule: "7 days delay if not approved by deadline",
    },
    question: {
      text: `This is a critical path item for the facade panel procurement.

The cost proposal must be reviewed and approved within 7 days to maintain project schedule.

Delayed approval will impact the critical path and cause project delays.`,
      tags: ["Critical Path", "Time Sensitive"],
    },
    timeline: {
      current: "In Review",
      stages: ["Pending", "In Review", "Approved", "Closed"],
    },
    deadlines: {
      replyDue: "12/01/2026",
      contractWindow: "7 days",
    },
    impact: {
      time: "7 days",
      cost: "R 750,000",
      riskScore: 90,
      riskMax: 100,
    },
    linked: [
      { type: "document", name: "Facade Panel Cost Breakdown" },
      { type: "message", name: "cpi-001", count: 5 },
    ],
    audit: [
      { action: "CPI created by Michelle Lee", date: "11/01 08:30" },
      { action: "Urgent flag added", date: "11/01 09:00", isAI: true },
    ],
    actionRequests: [],
  },
  "GI-001": {
    id: "GI-001",
    title: "GI for facade panels",
    dueDate: "Jan 12, 2026",
    creator: { name: "Thomas Brown", role: "Site Engineer", badge: "GI" },
    watcher: { name: "Anna Martinez", role: "Watcher" },
    formFields: {
      title: "GI for facade panels",
      discipline: "Site Engineering",
      instruction:
        "General instruction for facade panel installation procedures. All contractors must follow the updated installation guidelines provided in the attached document. Failure to comply will result in rework at contractor's expense.",
      effectiveDate: "2026-01-12",
      applicableTo: "All facade installation contractors",
      complianceRequired: "Mandatory",
    },
    question: {
      text: `General instruction for facade panel installation procedures.

All contractors must follow the updated installation guidelines provided in the attached document.

Failure to comply will result in rework at contractor's expense.`,
      tags: ["Installation", "Mandatory Compliance"],
    },
    timeline: {
      current: "Approved",
      stages: ["Pending", "In Review", "Approved", "Closed"],
    },
    deadlines: {
      replyDue: "12/01/2026",
      contractWindow: "14 days",
    },
    impact: {
      time: "0 days",
      cost: "R 0",
      riskScore: 20,
      riskMax: 100,
    },
    linked: [
      { type: "document", name: "Facade Panel Installation Guidelines v3" },
      { type: "message", name: "gi-001", count: 2 },
    ],
    audit: [
      { action: "GI created by Anna Martinez", date: "10/01 10:15" },
      { action: "Approved by Project Manager", date: "11/01 14:00" },
    ],
    actionRequests: [],
  },
};

export default function TaskDetails() {
  const { taskId } = useParams();
  const projectId = localStorage.getItem("selectedProjectId");
  // Fetch task details from new Django API
  const { data: taskDetailsResponse, isLoading } = useFetch(
    projectId && taskId ? `tasks/tasks/${taskId}/` : "",
    // projectId && taskId ? `projects/${projectId}/tasks/${taskId}/` : "",
    { enabled: !!taskId && !!projectId }
  );

  const { data: user } = useCurrentUser();
  const { mutateAsync: updateTask } = useUpdateTask();
  const [currentTask, setCurrentTask] = useState<any>(null);

  // Fetch request info for action requests
  const { data: requestInfoResponse } = useFetch(
    currentTask
      ? `tasks/request-task-info/?taskType=${currentTask.taskType}&taskId=${currentTask.taskId || currentTask.id || currentTask._id}`
      : null,
    { enabled: !!currentTask }
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

  const handleAnalyzeWithAi = async () => {
    setIsAnalyzeModalOpen(true);
    setIsAnalyzeLoading(true);

    try {
      const response = await postData({
        url: 'ai_analysis/vo/',
        data: {
          contract_document_id: 2,
          task_id: taskId,
        },
      });

      setAnalysisData(response);
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
      linked: [],
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
    : ((taskDataMap[taskId as keyof typeof taskDataMap] ||
      taskDataMap["RFI-001"]) as any);

  const currentStageIndex =
    displayTask.timeline.stages.indexOf(displayTask.timeline.current) !== -1
      ? displayTask.timeline.stages.indexOf(displayTask.timeline.current)
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

  if (
    isLoading &&
    !currentTask &&
    !taskDataMap[taskId as keyof typeof taskDataMap]
  ) {
    return <div className="p-8 text-center">Loading task details...</div>;
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
                      <p className="text-[#6B7280] text-sm">{`#${displayTask.type || "TSK"}-${displayTask.task_code || displayTask.id.slice(0, 4)}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="bg-[#FFF7ED] rounded-[28px] px-[14px] py-2 text-[#F97316] border-[#FED7AA] text-xs">
                      Due: {displayTask.dueDate}
                    </Badge>
                    <button className="text-gray-500 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
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
                      {isAnalyzeLoading ? "Generating..." : "Analyze with Ai"}
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
                          <p className="text-xs text-gray-500 mb-1">
                            {request.role}
                          </p>
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
                    {displayTask.audit.map((entry: any, i: any) => (
                      <div
                        key={i}
                        className={`p-3 border border-[#E7E9EB] rounded-[10px] ${entry.isAI
                          ? "bg-indigo-50 border border-[#8081F6B0] border-indigo-200"
                          : "bg-white"
                          }`}>
                        <p className="text-sm text-gray-900 flex items-center gap-2">
                          {entry.isAI && (
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                          )}
                          {entry.action}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          {entry.date}
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
    </DashboardLayout>
  );
}
