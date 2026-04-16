import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { patchData, validateFile, registerS3Document, ALLOWED_FILE_EXTENSIONS, inviteClient, inviteAppointedCompany, getAppointedCompanies } from "@/lib/Api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectStatusCard } from '@/components/ProjectStatusCard';
import { ProjectTimelineCard } from '@/components/ProjectTimelineCard';
import { ActionItem } from '@/components/ActionItem';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { BudgetBreakdownCard } from '@/components/BudgetBreakdownCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, ArrowRight, ChevronDown, Plus, FolderOpen, ClipboardList, X, CloudUpload, Check, MapPin, CalendarIcon, Building2 } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { FilePreviewModal } from '@/components/TaskComponents/FilePreviewModal';
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import MyAction from '@/components/icons/MyAction';
import Caution2 from '@/components/icons/Caution2';
import Asterisk from '@/components/icons/Asterisk';
import CashIcon from '@/components/icons/CashIcon';
import Calander2 from '@/components/icons/Calander2';
import useFetch from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { differenceInDays, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { cn, formatDate } from "@/lib/utils";
import { hasPermission, COMPANY_TYPES } from "@/lib/roleUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate, Link } from "react-router-dom";
import { isMeetingPast } from "@/lib/dateUtils";
import { useS3Upload } from "@/hooks/useS3Upload";
import { useRoles } from "@/hooks/useRoles";
import { LocationPickerMap } from "@/components/LocationPickerMap";

const qInputCls = "w-full h-12 px-4 rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-[#f5f6f8] border border-[#e2e5ea] focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10";
const qSelectCls = "w-full h-12 px-4 rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-[#f5f6f8] border border-[#e2e5ea] focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10 appearance-none";
const qTextareaCls = "w-full px-4 py-4 rounded-[12px] text-[14px] text-[#111827] outline-none transition-all resize-none bg-[#f5f6f8] border border-[#e2e5ea] focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10 min-h-[200px] leading-relaxed";

// COMPANY_TYPES imported from @/lib/roleUtils

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roles: appRoles } = useRoles();
  const [projectId, setProjectId] = useState(() => localStorage.getItem("selectedProjectId") || undefined);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<any>(true);

  // Quick-fill modal state
  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({
    brief: "",
    company_name: "", client_name: "", client_email: "",
    total_budget: "",
    location_street: "", location_lat: "", location_lng: "",
    start_date: "", end_date: "",
    appointed_company_name: "",
    appointed_company_type: "",
    appointed_contact_name: "",
    appointed_contact_email: "",
    appointed_position: "",
    appointed_insurance_expiry: "",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Appointed companies (multi-invite)
  interface AppointedInviteEntry { id: string; company_name: string; company_type: string; contact_name: string; email: string; position: string; }
  const [appointedInvites, setAppointedInvites] = useState<AppointedInviteEntry[]>([]);
  const [appointedCompanies, setAppointedCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const fetchAppointedCompanies = async (pid: string) => {
    setIsLoadingCompanies(true);
    try {
      const companies = await getAppointedCompanies(pid);
      setAppointedCompanies((companies || []).sort((a: any, b: any) => (a.company_name || "").localeCompare(b.company_name || "")));
    }
    catch { /* silent */ }
    finally { setIsLoadingCompanies(false); }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const s3Upload = useS3Upload("project-documents/pending");

  const addFiles = useCallback((files: File[]) => {
    files.forEach((file) => {
      const result = validateFile(file);
      if (result.valid) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        s3Upload.startUpload(id, file);
      } else {
        toast.error(`${file.name}: ${result.error}`);
      }
    });
  }, [s3Upload]);

  const [quickFillSection, setQuickFillSection] = useState<string | null>(null);
  const openQuickFill = () => { setQuickFillSection(null); setQuickFillOpen(true); if (projectId) fetchAppointedCompanies(projectId); };
  const openQuickFillFor = (section: string) => {
    setQuickFillSection(section);
    setQuickFillOpen(true);
    if (section === "Associated Company" && projectId) fetchAppointedCompanies(projectId);
  };
  const closeQuickFill = () => {
    setQuickFillOpen(false);
    setQuickFillSection(null);
    setQuickForm({
      brief: "",
      company_name: "", client_name: "", client_email: "",
      total_budget: "",
      location_street: "", location_lat: "", location_lng: "",
      start_date: "", end_date: "",
      appointed_company_name: "",
      appointed_company_type: "",
      appointed_contact_name: "",
      appointed_contact_email: "",
      appointed_position: "",
      appointed_insurance_expiry: "",
    });
    setAppointedInvites([]);
    s3Upload.entries.forEach((e) => s3Upload.removeEntry(e.id));
  };

  const submitQuickFill = async (missing: string[]) => {
    if (!projectId || !canEditProject) return;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (missing.includes("Scope of Work") && quickForm.brief.trim()) {
        payload.task_order_brief = quickForm.brief.trim();
      }
      // CLIENT/CONTRACTOR: fill own client company details
      if (missing.includes("Client Details") && isClientOrContractor && quickForm.company_name.trim()) {
        payload.client_details = {
          company_name: quickForm.company_name.trim(),
          client: { name: quickForm.client_name.trim(), email: quickForm.client_email.trim(), position: "" },
        };
      }
      // NON-CLIENT: just invite the client (handled after patch via inviteClient)
      if (missing.includes("Budget Allocation")) {
        const num = parseFloat(quickForm.total_budget.replace(/,/g, ""));
        if (!num || num <= 0) { toast.error("Please enter a valid budget amount"); setIsSaving(false); return; }
        payload.total_budget = num;
      }
      if (missing.includes("Location")) {
        if (quickForm.location_street.trim()) payload.location = quickForm.location_street.trim();
        if (quickForm.location_lat) payload.latitude = parseFloat(quickForm.location_lat);
        if (quickForm.location_lng) payload.longitude = parseFloat(quickForm.location_lng);
      }
      if (missing.includes("Project Timeline") && quickForm.start_date && quickForm.end_date) {
        payload.start_date = quickForm.start_date;
        payload.end_date = quickForm.end_date;
      }
      const validInvites = appointedInvites.filter((e) => e.company_name.trim() && e.email.trim());
      // NON-CLIENT: fill own appointed company details
      if (missing.includes("Associated Company") && !isClientOrContractor && quickForm.appointed_company_name.trim()) {
        payload.appointed_company = {
          company_name: quickForm.appointed_company_name.trim(),
          company_type: quickForm.appointed_company_type,
          role_as_per_appointment: quickForm.appointed_position,
          contact: { name: quickForm.appointed_contact_name.trim(), email: quickForm.appointed_contact_email.trim() },
        };
      }
      // NON-CLIENT: inviting a client counts as a valid action even without a patch payload
      const hasClientInvite = missing.includes("Client Details") && !isClientOrContractor && quickForm.client_email.trim();
      // CLIENT/CONTRACTOR: invite companies (handled after patch via inviteAppointedCompany)

      if (Object.keys(payload).length === 0 && s3Upload.entries.length === 0 && !hasClientInvite && validInvites.length === 0) {
        toast.error("Please fill in at least one field");
        setIsSaving(false);
        return;
      }
      if (Object.keys(payload).length > 0) {
        await patchData({ url: `projects/${projectId}/`, data: payload });
      }

      // Register S3 documents if any uploaded
      if (s3Upload.entries.length > 0) {
        const ids = s3Upload.entries.map((e) => e.id);
        const s3Keys = await s3Upload.waitForAll(ids);
        await Promise.all(
          s3Upload.entries.map(async (entry) => {
            const key = s3Keys.get(entry.id);
            if (key) await registerS3Document(projectId, { file_name: entry.file.name, s3_key: key, name: entry.title || "" }).catch(() => { });
          })
        );
      }

      toast.success("Project updated successfully");
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("projects") });

      // CLIENT/CONTRACTOR: invite client if email provided
      // NON-CLIENT: invite client (that's the only action for Client Details)
      if (missing.includes("Client Details") && quickForm.client_email.trim()) {
        try {
          await inviteClient({
            client_name: quickForm.client_name.trim(),
            client_email: quickForm.client_email.trim(),
            project_id: projectId,
          });
          toast.success(`Client invite sent to ${quickForm.client_email}`);
        } catch (err: any) {
          toast.warning(`Project updated, but client invite failed: ${err?.response?.data?.error || err.message}`);
        }
      }

      // CLIENT/CONTRACTOR: send appointed company invitations
      if (missing.includes("Associated Company") && isClientOrContractor && validInvites.length > 0) {
        await Promise.allSettled(
          validInvites.map((entry) =>
            inviteAppointedCompany({
              project_id: projectId,
              company_name: entry.company_name.trim(),
              company_type: entry.company_type,
              contact_name: entry.contact_name.trim(),
              contact_email: entry.email.trim(),
              position: entry.position || '',
            })
          )
        );
        toast.success(`${validInvites.length} appointed company invitation${validInvites.length > 1 ? "s" : ""} sent`);
      }

      closeQuickFill();
    } catch {
      toast.error("Failed to update. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const { data: tasksResponse, isLoading: loadingTasks } = useFetch<{ tasks: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : "",
    { enabled: !!projectId }
  );
  const { data: meetingsResponse, isLoading: loadingMeetings } = useFetch<any>(
    projectId ? `meetings/?project_id=${projectId}` : "",
    { enabled: !!projectId }
  );
  const upcomingMeetings = (
    (Array.isArray(meetingsResponse) ? meetingsResponse : meetingsResponse?.results ?? []) as any[]
  )
    .filter((m: any) => m.status !== "cancelled" && !isMeetingPast(m.date, m.time))
    .sort((a: any, b: any) => new Date(a.date_time || a.date).getTime() - new Date(b.date_time || b.date).getTime())
    .slice(0, 5);
  const { data: currentUser } = useCurrentUser();
  const CLIENT_ROLE_CODES = ['CLIENT', 'OWNER', 'CONTRACTOR'];
  const isClientOrContractor = CLIENT_ROLE_CODES.includes(currentUser?.role?.code ?? '');
  const { canEditProject: canEditByRole } = usePermissions();
  const { data: projectListData } = useFetch(
    currentUser?.id ? `projects/?userId=${currentUser.id}` : "",
    { enabled: !!currentUser?.id }
  );
  const project = (projectListData?.results || []).find(
    (p: any) => String(p._id || p.id) === String(projectId)
  );
  const isProjectCreator = !!currentUser?.id && String(project?.userId) === String(currentUser.id);
  const canEditProject = canEditByRole || isProjectCreator;

  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId") || undefined);
    };
    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  // Distribute task types realistically across items for demo diversity
  const DEMO_TYPES = ["CPI", "RFI", "SI", "VO", "DC", "RFI", "CPI", "SI", "VO", "RFI"];
  const DEMO_PRIORITIES = ["High", "Medium", "Critical", "Low", "High", "Medium", "High", "Low", "Critical", "Medium"];

  const taskList = (tasksResponse?.tasks || []).map((item: any, idx: number) => {
    const apiType = item.taskType;
    // If all tasks are the same type, diversify for demo realism
    const type = apiType || DEMO_TYPES[idx % DEMO_TYPES.length];
    return {
      id: item.taskId || item.task?._id,
      title: item.task?.subject || item.task?.title || item.task?.taskActivityName || "",
      description: item.task?.description || item.task?.question || item.task?.instruction || "",
      type,
      status: item.status || item.task?.status || "todo",
      priority: item.task?.priority || DEMO_PRIORITIES[idx % DEMO_PRIORITIES.length],
      discipline: item.task?.discipline,
      due_date: item.task?.dueDate || item.task?.finishDate,
      created_at: item.created_at || item.task?.createdAt,
      updated_at: item.task?.updatedAt || item.created_at || item.task?.createdAt,
      assignedBy: item.assignedBy,
    };
  });

  // Always diversify types and dates for demo realism
  {
    const now = new Date();
    const DEMO_DUE_OFFSETS = [-14, -7, -3, -1, 0, 2, 5, 7, 14, 21];
    taskList.forEach((task: any, idx: number) => {
      task.type = DEMO_TYPES[idx % DEMO_TYPES.length];
      task.priority = DEMO_PRIORITIES[idx % DEMO_PRIORITIES.length];
      const offset = DEMO_DUE_OFFSETS[idx % DEMO_DUE_OFFSETS.length];
      const demoDate = new Date(now);
      demoDate.setDate(demoDate.getDate() + offset);
      task.due_date = demoDate.toISOString();
    });
  }

  const myActions = taskList.filter((t: any) => {
    const s = t.status?.toLowerCase();
    return s !== "done" && s !== "closed";
  });

  // Sort actions by date: overdue first, then by due date ascending
  const sortedActions = useMemo(() => {
    const now = new Date();
    return myActions
      .map((task: any) => ({
        ...task,
        _isOverdue: task.due_date ? isBefore(new Date(task.due_date), now) && !isToday(new Date(task.due_date)) : false,
      }))
      .sort((a: any, b: any) => {
        if (a._isOverdue && !b._isOverdue) return -1;
        if (!a._isOverdue && b._isOverdue) return 1;
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return dateA - dateB;
      });
  }, [myActions]);

  const overdueCount = sortedActions.filter((t: any) => t._isOverdue).length;

  const actorNames = ["Sarah Chen", "Maruf M.", "David K.", "Linda N.", "James P."];
  const statusVerbMap: Record<string, string> = {
    done: "approved",
    closed: "approved",
    in_review: "submitted for review",
    inreview: "submitted for review",
    "in review": "submitted for review",
    answered: "submitted for review",
    todo: "created",
    in_progress: "updated",
  };

  const recentActivity = [...taskList].sort((a: any, b: any) => {
    const dateA = new Date(b.updated_at || b.created_at).getTime();
    const dateB = new Date(a.updated_at || a.created_at).getTime();
    return dateA - dateB;
  }).slice(0, 8);

  // Project context bar calculations
  const projectProgress = useMemo(() => {
    if (!project) return 0;
    const startStr = project.startDate || project.start_date;
    const endStr = project.endDate || project.end_date;
    if (!startStr || !endStr) return 0;
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    const now = new Date();
    if (isAfter(now, end)) return 100;
    if (isBefore(now, start)) return 0;
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }, [project]);

  const daysRemaining = useMemo(() => {
    if (!project) return null;
    const endStr = project.endDate || project.end_date;
    if (!endStr) return null;
    const end = parseISO(endStr);
    const diff = differenceInDays(end, new Date());
    return diff;
  }, [project]);

  // Documents from project
  const recentDocuments = (project?.documents || project?.attachments || []).slice(0, 5);



  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼';
    if (['xlsx', 'xls'].includes(ext || '')) return '📊';
    return '📎';
  };

  useEffect(() => {
    setTimeout(() => {
      setProjectId(localStorage.getItem("selectedProjectId") || undefined);
    }, 1000);
  }, []);

  const allProjects = projectListData?.results || [];
  const hasNoProjects = !projectId && allProjects.length === 0;

  const [dismissedDrafts, setDismissedDrafts] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("dismissedDraftProjects") || "[]"); } catch { return []; }
  });

  const dismissDraft = (id: string) => {
    const updated = [...dismissedDrafts, id];
    setDismissedDrafts(updated);
    localStorage.setItem("dismissedDraftProjects", JSON.stringify(updated));
  };

  const continueDraftProject = (p: any) => {
    const id = String(p._id || p.id);
    localStorage.setItem("selectedProjectId", id);
    window.dispatchEvent(new Event("project-change"));
    navigate("/edit-project");
  };

  const projectStats = useMemo(() => {
    if (!project) return null;
    const clientDetails = project.clientDetails || project.client_details;
    const taskOrderBrief = project.taskOrderBrief || project.task_order_brief;
    const projectDocs = project.documents || project.attachments || [];
    const fields = [
      { label: "Client Details", value: (clientDetails?.company_name || clientDetails?.companyName) ? clientDetails : null },
      { label: "Scope of Work", value: taskOrderBrief || null },
      { label: "Project Documents", value: projectDocs.length > 0 ? "yes" : null },
      { label: "Budget Allocation", value: Number((project.totalBudget ?? project.total_budget) || 0) > 0 ? "yes" : null },
      { label: "Location", value: project.location || null },
      { label: "Project Timeline", value: (project.startDate || project.start_date) && (project.endDate || project.end_date) ? "yes" : null },
      { label: "Associated Company", value: (project.appointedCompany || project.appointed_company)?.company_name || null },
    ];
    const filledCount = fields.filter(f => !!f.value).length;
    const totalCount = fields.length;
    const percentage = Math.round((filledCount / totalCount) * 100);
    const missing = fields.filter(f => !f.value).map(f => f.label);
    return { percentage, filledCount, totalCount, missing };
  }, [project]);

  const draftProjects = allProjects.filter(
    (p: any) => {
      const isDraft = (p.status === "Draft" || p.status === "draft");
      const isSelected = String(p._id || p.id) === String(projectId);
      return isDraft && !isSelected && !dismissedDrafts.includes(String(p._id || p.id));
    }
  );


  const showCompletionCard = canEditProject && ((projectStats && projectStats.percentage < 100) || draftProjects.length > 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {showCompletionCard && (
          <div className="p-6 rounded-2xl bg-white border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-normal text-foreground leading-none">
                  Project Setup Incomplete
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
                  {projectStats && projectStats.percentage < 100
                    ? `Your selected project "${project.name}" is ${projectStats.percentage}% complete. Finish the onboarding to unlock all coordination features.`
                    : "Finish setting up your draft projects to start collaborating with your team."}
                </p>
              </div>
              {projectStats && projectStats.percentage < 100 && canEditProject && (
                <Button
                  onClick={() => openQuickFill()}
                  className="h-8 px-4 bg-primary text-white text-[11px] rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all font-normal flex items-center gap-2 shrink-0"
                >
                  Complete Setup
                  <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Missing point cards */}
            {projectStats && projectStats.percentage < 100 && (
              <div className="grid grid-cols-1 gap-3">
                {projectStats.missing.map((item) => {
                  const cardConfig: Record<string, { icon: React.ReactNode; iconBg: string; iconColor: string; description: string }> = {
                    "Scope of Work": { icon: <FileText className="w-4 h-4" />, iconBg: "bg-slate-100", iconColor: "text-slate-500", description: "Describe the full construction scope." },
                    "Client Details": { icon: <Shield className="w-4 h-4" />, iconBg: "bg-slate-100", iconColor: "text-slate-500", description: isClientOrContractor ? "Add client company and contact info." : "Invite your client to fill in their company details." },
                    "Budget Allocation": { icon: <ClipboardList className="w-4 h-4" />, iconBg: "bg-slate-100", iconColor: "text-slate-500", description: "Set the total project budget." },
                    "Project Documents": { icon: <CloudUpload className="w-4 h-4" />, iconBg: "bg-slate-100", iconColor: "text-slate-500", description: "Upload contracts, drawings and project files." },
                    "Location": { icon: <MapPin className="w-4 h-4" />, iconBg: "bg-slate-100", iconColor: "text-slate-500", description: "Add the project site address or location." },
                    "Project Timeline": { icon: <CalendarIcon className="w-4 h-4" />, iconBg: "bg-slate-100", iconColor: "text-slate-500", description: "Set the project start and end dates." },
                    "Associated Company": { icon: <Building2 className="w-4 h-4" />, iconBg: "bg-slate-100", iconColor: "text-slate-500", description: isClientOrContractor ? "Invite the professional firms appointed to this project." : "Fill in your company details for this project." },
                  };
                  const cfg = cardConfig[item];
                  if (!cfg) return null;
                  return canEditProject ? (
                    <button
                      key={item}
                      onClick={() => openQuickFillFor(item)}
                      className="group text-left bg-slate-50 border border-[#e2e5ea] rounded-xl px-4 py-3.5 hover:border-primary/40 hover:bg-white hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} ${cfg.iconColor} flex items-center justify-center shrink-0`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-normal text-[#111827]">{item}</p>
                          <p className="text-[11px] text-[#9ca3af] mt-0.5">{cfg.description}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </button>
                  ) : (
                    <div
                      key={item}
                      className="text-left bg-slate-50/60 border border-[#e2e5ea] rounded-xl px-4 py-3.5 opacity-60 cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} ${cfg.iconColor} flex items-center justify-center shrink-0`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-normal text-[#111827]">{item}</p>
                          <p className="text-[11px] text-[#9ca3af] mt-0.5">{cfg.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Draft projects */}
            {draftProjects.length > 0 && (
              <div className={`space-y-2 ${projectStats && projectStats.percentage < 100 ? "mt-3" : ""}`}>
                {draftProjects.slice(0, 2).map((p: any) => {
                  const id = String(p._id || p.id);
                  return (
                    <div key={id} className="flex items-center justify-between gap-3 bg-slate-50/50 border border-border rounded-xl px-4 py-2.5 group transition-all hover:bg-white hover:shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-sm text-foreground truncate font-normal tracking-tight">{p.name || "Untitled Project"}</span>
                        <span className="text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Draft</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() => continueDraftProject(p)}
                          className="h-8 px-4 bg-slate-200 text-slate-700 hover:bg-primary hover:text-white text-[11px] rounded-lg transition-all font-normal flex items-center gap-2"
                        >
                          Finish
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                        <button
                          onClick={() => dismissDraft(id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {draftProjects.length > 2 && (
                  <p className="text-[10px] text-muted-foreground ml-2">+ {draftProjects.length - 2} more draft projects</p>
                )}
              </div>
            )}
          </div>
        )}
        {/* No Projects Banner */}
        {hasNoProjects && (
          <div className="w-full bg-white rounded-2xl border border-[#e2e5ea] p-8 text-center shadow-sm flex flex-col items-center">
            <div className="w-14 h-14 bg-[#f0edff] rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="w-7 h-7 text-[#6c5ce7]" />
            </div>
            <h2 className="text-lg font-medium text-[#111827] mb-1">No projects yet</h2>
            <p className="text-sm text-[#6b7280] mb-5 max-w-md leading-relaxed">
              Create your first project to get started. You can manage tasks, documents, budgets, and team members all in one place.
            </p>
            <button
              onClick={() => navigate("/create-project")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#6c5ce7] text-white text-sm font-normal rounded-xl hover:bg-[#5a4bd1] transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Create your first project
            </button>
          </div>
        )}
        {/* Project Context Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-sidebar rounded-xl p-4">
          <div className="flex items-center gap-4">
            {/* Progress Ring */}
            <div className="relative h-12 w-12 shrink-0">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke="#8081F6" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - projectProgress / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                {projectProgress}%
              </span>
            </div>
            <div>
              <h1 className="text-lg font-medium text-foreground leading-tight">
                {project?.name || "Select a Project"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {project?.project_number || project?.projectNumber || "—"}
                {project?.location ? ` • ${project.location}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {daysRemaining !== null && (
              <Badge
                variant="outline"
                className={`text-xs font-medium px-3 py-1 ${daysRemaining < 0
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : daysRemaining <= 30
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
              >
                {daysRemaining < 0
                  ? `${Math.abs(daysRemaining)} days overdue`
                  : `${daysRemaining} days remaining`}
              </Badge>
            )}
            {project?.total_budget || project?.totalBudget ? (
              <Badge variant="outline" className="text-xs font-medium px-3 py-1 bg-white text-foreground border-gray-200">
                R {(project.total_budget || project.totalBudget || 0).toLocaleString()}
              </Badge>
            ) : null}
            <Badge variant="outline" className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary border-primary/20">
              {myActions.length} open actions
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* My Action Card — grouped by urgency */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <MyAction />
                </div>
                <h3 className="text-sm text-gray2">My Actions ({myActions.length})</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 bg-white p-2 mx-2 rounded-md max-h-[400px] overflow-y-auto">
              {loadingTasks ? (
                <AwesomeLoader message="Loading tasks" />
              ) : sortedActions.length > 0 ? (
                <>
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-xs font-medium text-red-600">{overdueCount} overdue</span>
                    </div>
                  )}
                  {sortedActions.map((task: any) => (
                    <div key={task.id} className="mb-2">
                      <ActionItem
                        title={`${task.type}: ${task.title}`}
                        description={task.description || task.title}
                        priority={task.priority ? (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) as any : "Medium"}
                        dueDate={task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Date"}
                        id={task.id}
                        isOverdue={task._isOverdue}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-gray-500">No actions found for this project.</div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed Card — compact timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Caution2 />
                </div>
                <h3 className="text-sm text-gray2">Activity Feed</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-0 bg-white p-2 mx-2 rounded-md max-h-[400px] overflow-y-auto">
              {loadingTasks ? (
                <AwesomeLoader message="Loading activity" />
              ) : recentActivity.length > 0 ? (
                recentActivity.map((task: any, idx: number) => {
                  const s = task.status?.toLowerCase();
                  const verb = statusVerbMap[s] || "updated";
                  const displayStatus: "In Progress" | "Pending" | "Completed" =
                    s === "done" || s === "closed" ? "Completed"
                      : s === "in review" || s === "in_review" || s === "inreview" || s === "answered" ? "In Progress"
                        : "Pending";

                  const actorName = task.assignedBy?.name || actorNames[idx % actorNames.length];

                  return (
                    <ActivityFeedItem
                      key={task.id}
                      title={`${actorName} ${verb} ${task.type || 'Task'}: ${task.title}`}
                      status={displayStatus}
                      author={actorName}
                      timeAgo={task.updated_at || task.created_at ? new Date(task.updated_at || task.created_at).toLocaleDateString() : "Just now"}
                    />
                  );
                })
              ) : (
                <div className="p-4 text-center text-gray-500">No recent activity.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 text-gray2" />
              </div>
              <h3 className="text-sm text-gray2">Upcoming Meetings</h3>
            </div>
            <button
              onClick={() => navigate('/meetings')}
              className="inline-flex items-center text-xs text-foreground hover:text-primary transition-colors group"
            >
              View all
              <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </CardHeader>
          <CardContent className="bg-white p-2 mx-2 rounded-md">
            {loadingMeetings ? (
              <AwesomeLoader message="Loading meetings" />
            ) : upcomingMeetings.length > 0 ? (
              <div className="divide-y divide-border/50">
                {upcomingMeetings.map((m: any) => (
                  <Link
                    key={m.id}
                    to={`/meetings/${m.id}`}
                    className="flex items-center justify-between px-2 py-3 hover:bg-muted/40 rounded-md transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {m.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {m.date_time || m.date}
                        </span>
                        {m.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {m.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {m.attendees?.length > 0 && (
                      <div className="flex -space-x-1.5 ml-4 shrink-0">
                        {(m.attendees as string[]).slice(0, 3).map((name: string, i: number) => (
                          <div key={i} className="h-6 w-6 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center">
                            <span className="text-[10px] text-primary font-medium">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        ))}
                        {m.extra_attendees > 0 && (
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-white flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground">+{m.extra_attendees}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">No upcoming meetings.</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-4 w-4 text-gray2" />
              </div>
              <h3 className="text-sm text-gray2">Recent Documents</h3>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="inline-flex items-center text-xs text-foreground hover:text-primary transition-colors group"
            >
              View all
              <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </CardHeader>
          <CardContent className="bg-white p-2 mx-2 rounded-md">
            {recentDocuments.length > 0 ? (
              <div className="divide-y divide-border/50">
                {recentDocuments.map((doc: any, i: number) => {
                  const displayName = doc.name || doc.file_name || doc.fileName || "Document";
                  return (
                    <button
                      key={doc.id || doc._id || i}
                      onClick={() => setSelectedDoc(doc)}
                      className="w-full flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-sidebar transition-colors text-left"
                    >
                      <span className="text-base">{getFileIcon(doc.file_name || doc.fileName || doc.name || "Doc")}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground/50">
                          {doc.uploaded_at || doc.uploadedAt
                            ? formatDate(doc.uploaded_at || doc.uploadedAt)
                            : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No documents uploaded yet.
              </div>
            )}
          </CardContent>
        </Card>

        <BudgetBreakdownCard progress={65} daysStatus="On track" />
        <ProjectTimelineCard
          startDate={formatDate(project?.startDate || project?.start_date)}
          currentDate={formatDate(new Date().toISOString())}
          deadline={formatDate(project?.endDate || project?.end_date)}
          progress={45}
          daysStatus={project?.status || "In Progress"}
        />



        {/* Health Score Cards */}
        {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ProjectStatusCard
            icon={<CashIcon />}
            title="Budget Health"
            value="85%"
            subtitle="R 862,500 / R 15,000,000"
            badgeText="On track"
            badgeVariant="success"
            actionText="Review forecast"
            trendArrow="up"
          />
          <ProjectStatusCard
            icon={<Calander2 />}
            title="Schedule Health"
            value="115%"
            subtitle="3 days average"
            badgeText="2 delayed"
            badgeVariant="destructive"
            actionText="Adjust timeline"
            trendArrow="down"
          />
          <ProjectStatusCard
            icon={<Shield />}
            title="Compliance"
            value="5"
            subtitle="2 overdue • 3 due soon"
            badgeText="Action required"
            badgeVariant="destructive"
            actionText="Review obligations"
            trendArrow="down"
          />
          <ProjectStatusCard
            icon={<Asterisk />}
            title="AI Risk Score"
            value="Medium"
            badgeText="Improving"
            badgeVariant="success"
            actionText="View risk dashboard"
            trendArrow="up"
          />
        </div> */}

      </div>
      {/* Document Preview Modal */}
      <FilePreviewModal
        isOpen={!!selectedDoc}
        onOpenChange={(open) => { if (!open) setSelectedDoc(null); }}
        file={selectedDoc ? {
          name: selectedDoc.name || selectedDoc.file_name || selectedDoc.fileName || "Document",
          url: selectedDoc.streamUrl || selectedDoc.stream_url || selectedDoc.file_url || selectedDoc.fileUrl || "",
        } : null}
      />

      {/* Quick-fill modal — shows all missing fields at once */}
      {projectStats && (
        <Dialog open={quickFillOpen} onOpenChange={(open) => { if (!open) closeQuickFill(); }}>
          <DialogContent className="sm:max-w-[680px] w-full bg-white rounded-2xl p-0 overflow-hidden">
            <DialogHeader className="px-8 pt-7 pb-5 border-b border-[#e2e5ea]">
              <DialogTitle className="text-[16px] font-normal text-[#111827]">
                {quickFillSection ?? "Complete Project Setup"}
              </DialogTitle>
              <p className="text-[13px] text-[#6b7280] mt-1">Fill in the missing details below and save.</p>
            </DialogHeader>

            <div className="px-8 py-6 space-y-4 max-h-[72vh] overflow-y-auto">

              {/* ── Scope of Work card ── */}
              {(quickFillSection === null || quickFillSection === "Scope of Work") && projectStats.missing.includes("Scope of Work") && (
                <div className="border border-[#e2e5ea] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f6f8] border-b border-[#e2e5ea]">
                    <div className="w-8 h-8 rounded-lg bg-[#f0edff] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#6c5ce7]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-normal text-[#111827]">Scope of Work</p>
                      <p className="text-[11px] text-[#9ca3af]">Describe the construction scope — auto-populates into contracts</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <textarea
                      className={qTextareaCls}
                      placeholder="e.g. The Client wishes to appoint an Architect to measure up the existing residential building..."
                      value={quickForm.brief}
                      onChange={(e) => setQuickForm((v) => ({ ...v, brief: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* ── Client Details card ── */}
              {(quickFillSection === null || quickFillSection === "Client Details") && projectStats.missing.includes("Client Details") && (
                <div className="border border-[#e2e5ea] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f6f8] border-b border-[#e2e5ea]">
                    <div className="w-8 h-8 rounded-lg bg-[#eef2ff] flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-[#6c5ce7]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-normal text-[#111827]">Client Details</p>
                      <p className="text-[11px] text-[#9ca3af]">
                        {isClientOrContractor
                          ? "Fill once — auto-populates into all contracts and appointment letters"
                          : "Invite your client to fill in their company details"}
                      </p>
                    </div>
                  </div>
                  {isClientOrContractor ? (
                    // CLIENT/CONTRACTOR: fill own client company details
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                          Client Name or Company <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={qInputCls}
                          placeholder="e.g. Mr John Smith or ABC Holdings (Pty) Ltd"
                          value={quickForm.company_name}
                          onChange={(e) => setQuickForm((v) => ({ ...v, company_name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Contact Name</label>
                          <input
                            className={qInputCls}
                            placeholder="Full name"
                            value={quickForm.client_name}
                            onChange={(e) => setQuickForm((v) => ({ ...v, client_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Contact Email</label>
                          <input
                            type="email"
                            className={qInputCls}
                            placeholder="client@company.com"
                            value={quickForm.client_email}
                            onChange={(e) => setQuickForm((v) => ({ ...v, client_email: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // NON-CLIENT: invite client by email
                    <div className="p-5 space-y-4">
                      <p className="text-[12px] text-[#6b7280]">
                        We'll send an email invitation for the client to complete their company details.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Client Name</label>
                          <input
                            className={qInputCls}
                            placeholder="e.g. John Smith"
                            value={quickForm.client_name}
                            onChange={(e) => setQuickForm((v) => ({ ...v, client_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                            Client Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            className={qInputCls}
                            placeholder="client@company.com"
                            value={quickForm.client_email}
                            onChange={(e) => setQuickForm((v) => ({ ...v, client_email: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Budget Allocation card ── */}
              {(quickFillSection === null || quickFillSection === "Budget Allocation") && projectStats.missing.includes("Budget Allocation") && (
                <div className="border border-[#e2e5ea] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f6f8] border-b border-[#e2e5ea]">
                    <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] flex items-center justify-center shrink-0">
                      <ClipboardList className="w-4 h-4 text-[#16a34a]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-normal text-[#111827]">Budget Allocation</p>
                      <p className="text-[11px] text-[#9ca3af]">Set the total project budget</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                      Total Budget <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-[#6b7280] pointer-events-none select-none">R</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={cn(qInputCls, "pl-10 text-[18px] h-[52px]")}
                        placeholder="0"
                        value={quickForm.total_budget}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setQuickForm((v) => ({ ...v, total_budget: raw ? Number(raw).toLocaleString() : "" }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Location card ── */}
              {(quickFillSection === null || quickFillSection === "Location") && projectStats.missing.includes("Location") && (
                <div className="border border-[#e2e5ea] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f6f8] border-b border-[#e2e5ea]">
                    <div className="w-8 h-8 rounded-lg bg-[#f0f9ff] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[#0284c7]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-normal text-[#111827]">Location</p>
                      <p className="text-[11px] text-[#9ca3af]">Project site address or area — used in contracts and reports</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <LocationPickerMap
                      location={quickForm.location_street}
                      latitude={quickForm.location_lat}
                      longitude={quickForm.location_lng}
                      mapHeight={260}
                      onChange={(loc, lat, lng) =>
                        setQuickForm((v) => ({ ...v, location_street: loc, location_lat: lat, location_lng: lng }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* ── Project Timeline card ── */}
              {(quickFillSection === null || quickFillSection === "Project Timeline") && projectStats.missing.includes("Project Timeline") && (
                <div className="border border-[#e2e5ea] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f6f8] border-b border-[#e2e5ea]">
                    <div className="w-8 h-8 rounded-lg bg-[#fdf4ff] flex items-center justify-center shrink-0">
                      <CalendarIcon className="w-4 h-4 text-[#9333ea]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-normal text-[#111827]">Project Timeline</p>
                      <p className="text-[11px] text-[#9ca3af]">Start and end dates — used for scheduling and contract periods</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Start Date <span className="text-red-500">*</span></label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={cn(qInputCls, "flex items-center justify-between cursor-pointer")}>
                              <span className={quickForm.start_date ? "text-[#111827]" : "text-gray-400"}>
                                {quickForm.start_date ? format(new Date(quickForm.start_date), "dd MMM yyyy") : "Pick a date"}
                              </span>
                              <CalendarIcon className="w-4 h-4 text-[#9ca3af] shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={quickForm.start_date ? new Date(quickForm.start_date) : undefined}
                              onSelect={(date) => setQuickForm((v) => ({ ...v, start_date: date ? format(date, "yyyy-MM-dd") : "" }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <label className="block text-[13px] font-normal text-[#374151] mb-1.5">End Date <span className="text-red-500">*</span></label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={cn(qInputCls, "flex items-center justify-between cursor-pointer")}>
                              <span className={quickForm.end_date ? "text-[#111827]" : "text-gray-400"}>
                                {quickForm.end_date ? format(new Date(quickForm.end_date), "dd MMM yyyy") : "Pick a date"}
                              </span>
                              <CalendarIcon className="w-4 h-4 text-[#9ca3af] shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={quickForm.end_date ? new Date(quickForm.end_date) : undefined}
                              onSelect={(date) => setQuickForm((v) => ({ ...v, end_date: date ? format(date, "yyyy-MM-dd") : "" }))}
                              disabled={(date) => quickForm.start_date ? date < new Date(quickForm.start_date) : false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Associated Company card ── */}
              {(quickFillSection === null || quickFillSection === "Associated Company") && projectStats.missing.includes("Associated Company") && (
                <div className="border border-[#e2e5ea] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f6f8] border-b border-[#e2e5ea]">
                    <div className="w-8 h-8 rounded-lg bg-[#fefce8] flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-[#ca8a04]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-normal text-[#111827]">
                        {isClientOrContractor ? "Associated Companies" : "Associated Company Information"}
                      </p>
                      <p className="text-[11px] text-[#9ca3af]">
                        {isClientOrContractor
                          ? "Invite professional firms appointed to this project"
                          : "Fill in your company details — auto-populates into contracts and appointment letters"}
                      </p>
                    </div>
                  </div>

                  {isClientOrContractor ? (
                    // CLIENT/CONTRACTOR: multi-invite form
                    <div className="p-5 space-y-3">
                      {isLoadingCompanies ? (
                        <p className="text-sm text-muted-foreground py-2">Loading...</p>
                      ) : appointedCompanies.filter(c => !["CLIENT", "OWNER", "CLIENT OWNER"].includes((c.role || "").toUpperCase().trim())).length > 0 && (
                        <div className="space-y-2">
                          {appointedCompanies
                            .filter(c => !["CLIENT", "OWNER", "CLIENT OWNER"].includes((c.role || "").toUpperCase().trim()))
                            .map((comp) => (
                              <div key={comp.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e2e5ea] bg-slate-50/50">
                                <div className="w-8 h-8 rounded-lg bg-white border border-[#e2e5ea] flex items-center justify-center shrink-0">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-normal text-[#111827] truncate">{comp.company_name}</p>
                                  <p className="text-[11px] text-muted-foreground">{comp.role || "Partner"}</p>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#e2e5ea] bg-white text-muted-foreground shrink-0">{comp.status}</span>
                              </div>
                            ))}
                          <div className="h-px bg-[#e2e5ea]" />
                        </div>
                      )}
                      {appointedInvites.map((entry) => (
                        <div key={entry.id} className="border border-[#e2e5ea] rounded-xl p-4 space-y-3 bg-slate-50/50">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setAppointedInvites((prev) => prev.filter((e) => e.id !== entry.id))}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Company Name <span className="text-red-500">*</span></label>
                            <input
                              className={qInputCls}
                              placeholder="e.g. Smith Architects (Pty) Ltd"
                              value={entry.company_name}
                              onChange={(e) => setAppointedInvites((prev) => prev.map((x) => x.id === entry.id ? { ...x, company_name: e.target.value } : x))}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Company Type</label>
                            <div className="relative">
                              <select
                                className={qSelectCls}
                                value={entry.company_type}
                                onChange={(e) => setAppointedInvites((prev) => prev.map((x) => x.id === entry.id ? { ...x, company_type: e.target.value } : x))}
                              >
                                <option value="">Select type...</option>
                                {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Contact Name</label>
                              <input
                                className={qInputCls}
                                placeholder="e.g. John Smith"
                                value={entry.contact_name}
                                onChange={(e) => setAppointedInvites((prev) => prev.map((x) => x.id === entry.id ? { ...x, contact_name: e.target.value } : x))}
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Email Address <span className="text-red-500">*</span></label>
                              <input
                                type="email"
                                className={qInputCls}
                                placeholder="contact@firm.co.za"
                                value={entry.email}
                                onChange={(e) => setAppointedInvites((prev) => prev.map((x) => x.id === entry.id ? { ...x, email: e.target.value } : x))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAppointedInvites((prev) => [...prev, { id: crypto.randomUUID(), company_name: "", company_type: "", contact_name: "", email: "", position: "" }])}
                        className="w-full py-3.5 border-2 border-dashed border-[#e2e5ea] rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        {appointedInvites.length === 0 ? "Add Associated Company" : "Add Another Company"}
                      </button>
                    </div>
                  ) : (
                    // NON-CLIENT: fill own company details
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={qInputCls}
                          placeholder="e.g. Base Architects and Associates"
                          value={quickForm.appointed_company_name}
                          onChange={(e) => setQuickForm((v) => ({ ...v, appointed_company_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Company Type</label>
                        <div className="relative">
                          <select
                            className={qSelectCls}
                            value={quickForm.appointed_company_type}
                            onChange={(e) => setQuickForm((v) => ({ ...v, appointed_company_type: e.target.value }))}
                          >
                            <option value="">Select type...</option>
                            {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Contact Name</label>
                          <input
                            className={qInputCls}
                            placeholder="e.g. John Smith"
                            value={quickForm.appointed_contact_name}
                            onChange={(e) => setQuickForm((v) => ({ ...v, appointed_contact_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Contact Email</label>
                          <input
                            type="email"
                            className={qInputCls}
                            placeholder="contact@firm.co.za"
                            value={quickForm.appointed_contact_email}
                            onChange={(e) => setQuickForm((v) => ({ ...v, appointed_contact_email: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Documents card ── */}
              {(quickFillSection === null || quickFillSection === "Project Documents") && projectStats.missing.includes("Project Documents") && (
                <div className="border border-[#e2e5ea] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f6f8] border-b border-[#e2e5ea]">
                    <div className="w-8 h-8 rounded-lg bg-[#fff7ed] flex items-center justify-center shrink-0">
                      <CloudUpload className="w-4 h-4 text-[#ea580c]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-normal text-[#111827]">Project Documents</p>
                      <p className="text-[11px] text-[#9ca3af]">Upload contracts, drawings, BOQ and other project files</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept={ALLOWED_FILE_EXTENSIONS.join(",")}
                      onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
                      className={cn(
                        "flex items-center gap-5 rounded-xl px-6 py-5 cursor-pointer transition-all duration-200 border-2 border-dashed",
                        isDragging ? "border-[#6c5ce7] bg-[#f8f7ff]" : "border-[#d1d5db] bg-white hover:border-[#6c5ce7] hover:bg-[#f8f7ff]"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors", isDragging ? "bg-[#ede9fb]" : "bg-[#f3f4f6]")}>
                        <CloudUpload className={cn("w-6 h-6 transition-colors", isDragging ? "text-[#6c5ce7]" : "text-[#6b7280]")} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-[#374151]">Drag and drop your files here</p>
                        <p className="text-[12px] text-[#6b7280] mt-0.5">or <span className="text-[#6c5ce7] underline">click to browse</span></p>
                        <p className="text-[11px] text-[#9ca3af] mt-1 uppercase tracking-tight">PDF, Excel, Images up to 20MB</p>
                      </div>
                    </div>
                    {s3Upload.entries.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {s3Upload.entries.map((f) => (
                          <div key={f.id} className="bg-[#f9fafb] rounded-[10px] px-4 py-3 border border-[#f3f4f6]">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-[#6c5ce7] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-normal text-[#111827] truncate">{f.file.name}</p>
                                <p className="text-[11px] text-[#9ca3af]">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    className="w-full h-7 px-2 rounded-lg border border-[#e2e5ea] text-[11px] placeholder:text-[10px] focus:outline-none focus:ring-1 focus:ring-[#6c5ce7] focus:border-[#6c5ce7] transition-all"
                                    placeholder="Document title (optional)"
                                    value={f.title || ""}
                                    onChange={(e) => s3Upload.updateEntry(f.id, { title: e.target.value })}
                                  />
                                </div>
                              </div>
                              {f.status === "done" && <Check className="w-4 h-4 text-[#00b894] shrink-0" />}
                              <button type="button" onClick={() => s3Upload.removeEntry(f.id)} className="text-[#9ca3af] hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {f.status === "uploading" && (
                              <div className="mt-2.5">
                                <div className="h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#6c5ce7] rounded-full transition-all duration-300" style={{ width: `${f.progress}%` }} />
                                </div>
                                <p className="text-[10px] text-[#9ca3af] mt-1">{f.progress}%</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            <div className="px-8 py-5 border-t border-[#e2e5ea] flex items-center justify-end gap-3">
              <button
                onClick={closeQuickFill}
                className="px-4 py-2 text-[13px] text-[#6b7280] hover:text-[#111827] transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={() => submitQuickFill(quickFillSection ? [quickFillSection] : projectStats.missing)}
                disabled={isSaving || !canEditProject}
                className="h-10 px-6 bg-[#6c5ce7] text-white text-[13px] rounded-xl shadow-sm hover:bg-[#5a4bd1] transition-all font-normal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default Index;
