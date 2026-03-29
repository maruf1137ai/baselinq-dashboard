import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  MapPin,
  Pencil,
  X,
  FileText,
  Calendar as CalendarIcon,
  Rocket,
  Info,
  CloudUpload,
  ChevronDown,
  DollarSign,
  LogOut,
  Building2,
  User,
  Phone,
  Mail,
  CreditCard,
  Briefcase,
  ScrollText,
  Plus,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { validateFile, registerS3Document, deleteProjectDocument, ALLOWED_FILE_EXTENSIONS, ProjectDocument } from "@/lib/Api";
import { useS3Upload } from "@/hooks/useS3Upload";
import { useUpdateProject } from "@/hooks/useProjects";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";
import {
  format,
  parseISO,
  differenceInDays,
  differenceInMonths,
} from "date-fns";
import { cn, formatDate } from "@/lib/utils";
import Logo from "@/components/icons/Logo";
import AiIcon from "@/components/icons/AiIcon";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  project_number: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  total_budget: string;
  currency: string;
  fx_rate: string;
  retention_rate: string;
  vat_rate: string;
  contract_type: string;
}

interface FormErrors {
  name?: string;
  project_number?: string;
  start_date?: string;
  end_date?: string;
  date_range?: string;
  total_budget?: string;
  attachments?: string;
}

interface PersonnelState {
  name: string;
  email: string;
  phone: string;
}

interface ClientFormState {
  company_name: string;
  company_registration: string;
  vat_number: string;
  physical_address: string;
  postal_address: string;
  banking_details: string;
  office_number: string;
  client: PersonnelState;
  client_representative: PersonnelState;
}

interface ClientErrors {
  company_name?: string;
}

interface AppointedFormState {
  company_name: string;
  company_registration: string;
  vat_number: string;
  physical_address: string;
  postal_address: string;
  banking_details: string;
  office_number: string;
  role_as_per_appointment: string;
  principal: PersonnelState;
  technical_representative: PersonnelState;
}

interface AppointedErrors {
  company_name?: string;
}

interface TaskOrderState {
  brief: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Project Details", description: "Name, number, and location" },
  { id: 2, label: "Client Details", description: "Client company & contacts" },
  { id: 3, label: "Appointed Company", description: "Professional firm & contacts" },
  { id: 4, label: "Documents", description: "Upload project files" },
  { id: 5, label: "Scope of Works", description: "Description & requirements" },
  { id: 6, label: "Financials & Timeline", description: "Budget, dates, and rates" },
];

const CONTRACT_TYPES = ["JBCC", "NEC", "FIDIC", "GCC"];
const CURRENCIES = ["ZAR", "USD", "EUR", "GBP"];
const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const DEFAULT_PERSONNEL: PersonnelState = { name: "", email: "", phone: "" };

const DEFAULT_FORM: FormState = {
  name: "",
  project_number: "",
  description: "",
  location: "",
  start_date: "",
  end_date: "",
  total_budget: "",
  currency: "ZAR",
  fx_rate: "1",
  retention_rate: "5",
  vat_rate: "15",
  contract_type: "JBCC",
};

const DEFAULT_CLIENT_FORM: ClientFormState = {
  company_name: "",
  company_registration: "",
  vat_number: "",
  physical_address: "",
  postal_address: "",
  banking_details: "",
  office_number: "",
  client: { ...DEFAULT_PERSONNEL },
  client_representative: { ...DEFAULT_PERSONNEL },
};

const DEFAULT_APPOINTED_FORM: AppointedFormState = {
  company_name: "",
  company_registration: "",
  vat_number: "",
  physical_address: "",
  postal_address: "",
  banking_details: "",
  office_number: "",
  role_as_per_appointment: "",
  principal: { ...DEFAULT_PERSONNEL },
  technical_representative: { ...DEFAULT_PERSONNEL },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseBudget(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

function formatWithCommas(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatCurrency(amount: number, currency = "ZAR"): string {
  const sym = CURRENCY_SYMBOLS[currency] || "R";
  return `${sym} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Input helpers ──────────────────────────────────────────────────────────────

function inputCls(error?: boolean, extra?: string) {
  return cn(
    "w-full h-12 px-4 rounded-[10px] text-sm text-[#111827] outline-none transition-all",
    "bg-[#f5f6f8] border border-[#e2e5ea]",
    "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
    error && "!border-red-400 focus:!border-red-400 focus:ring-red-400/10",
    extra
  );
}

const selectWrapCls = "relative w-full";
function selectCls() {
  return cn(
    "w-full h-12 px-4 pr-9 rounded-[10px] text-sm text-[#111827] outline-none",
    "bg-[#f5f6f8] border border-[#e2e5ea] appearance-none cursor-pointer",
    "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10 transition-all"
  );
}

// ── FileTypeIcon ───────────────────────────────────────────────────────────────

function FileTypeIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf")
    return (
      <div className="w-9 h-9 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-[9px] font-normal border border-red-100 shrink-0">
        PDF
      </div>
    );
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return (
      <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center border border-blue-100 shrink-0">
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  if (["xlsx", "xls"].includes(ext))
    return (
      <div className="w-9 h-9 bg-green-50 text-green-600 rounded-lg flex items-center justify-center text-[9px] font-normal border border-green-100 shrink-0">
        XLS
      </div>
    );
  return (
    <div className="w-9 h-9 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center border border-gray-100 shrink-0">
      <FileText className="w-4 h-4" />
    </div>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-flex items-center">
      <Info className="w-3.5 h-3.5 text-[#9ca3af] cursor-help" />
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1a1a2e] text-white text-[11px] rounded-lg px-3 py-2 w-48 text-center z-20 shadow-lg leading-relaxed">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a2e]" />
      </div>
    </div>
  );
}

// ── SelectWrapper ──────────────────────────────────────────────────────────────

function SelectField({
  value,
  onChange,
  children,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div className={selectWrapCls}>
      <select
        className={cn(selectCls(), error && "!border-red-400")}
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
    </div>
  );
}

// ── PersonnelCard ──────────────────────────────────────────────────────────────

function PersonnelCard({
  label,
  role,
  roleColor,
  iconColor,
  value,
  onChange,
}: {
  label: string;
  role: "Super User" | "Tech User";
  roleColor: string;
  iconColor: string;
  value: PersonnelState;
  onChange: (v: PersonnelState) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e2e5ea] bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: iconColor + "18" }}>
            <User className="w-3.5 h-3.5" style={{ color: iconColor }} />
          </div>
          <span className="text-[13px] font-normal text-[#374151]">{label}</span>
        </div>
        <span
          className="text-[11px] px-2.5 py-1 rounded-full font-normal text-white"
          style={{ background: roleColor }}>
          {role}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
          <input
            className={inputCls(false, "pl-9")}
            placeholder="Full name"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
          <input
            className={inputCls(false, "pl-9")}
            placeholder="Email address"
            type="email"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
          <input
            className={inputCls(false, "pl-9")}
            placeholder="Phone number"
            type="tel"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ── SectionHeader ──────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#f3f4f6]">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <span className="text-[13px] font-normal text-[#374151]">{label}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function EditProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: updateProject, isPending } = useUpdateProject();
  const s3Upload = useS3Upload("project-documents/pending");
  const { data: projects = [] } = useProjects();

  // Load the selected project
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const selectedProject = projects.find(
    (p: any) => (p._id || p.id) == selectedProjectId
  ) as any;

  // ── State ──────────────────────────────────────────────────────────────────

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [stepDir, setStepDir] = useState<"fwd" | "back">("fwd");
  const [stepKey, setStepKey] = useState(0);
  const [pnEditable, setPnEditable] = useState(false);
  const files = s3Upload.entries;
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  const [clientForm, setClientForm] = useState<ClientFormState>(DEFAULT_CLIENT_FORM);
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});
  const [appointedForm, setAppointedForm] = useState<AppointedFormState>(DEFAULT_APPOINTED_FORM);
  const [appointedErrors, setAppointedErrors] = useState<AppointedErrors>({});
  const [taskOrder, setTaskOrder] = useState<TaskOrderState>({ brief: "" });
  const [existingDocs, setExistingDocs] = useState<ProjectDocument[]>([]);
  const [deletingDocId, setDeletingDocId] = useState<string | number | null>(null);
  const [showClientPersonnel, setShowClientPersonnel] = useState(false);
  const [showAppointedPersonnel, setShowAppointedPersonnel] = useState(false);
  const [showTaskOrderBrief, setShowTaskOrderBrief] = useState(false);

  // ── Pre-populate from project ──────────────────────────────────────────────

  useEffect(() => {
    if (!selectedProject || initialized) return;

    const p = selectedProject;
    const cd = p.client_details || p.clientDetails || {};
    const ac = p.appointed_company || p.appointedCompany || {};

    const budget = p.total_budget || p.totalBudget || 0;
    const budgetStr = budget ? formatWithCommas(Math.round(Number(budget))) : "";

    const toDateStr = (v: string | undefined) => {
      if (!v) return "";
      // strip time component if present: "2024-01-15T00:00:00Z" → "2024-01-15"
      return v.split("T")[0];
    };

    setForm({
      name: p.name || "",
      project_number: p.project_number || p.projectNumber || "",
      description: p.description || "",
      location: p.location || "",
      start_date: toDateStr(p.start_date || p.startDate),
      end_date: toDateStr(p.end_date || p.endDate),
      total_budget: budgetStr,
      currency: p.currency || "ZAR",
      fx_rate: String(p.fx_rate ?? p.fxRate ?? 1),
      retention_rate: String(p.retention_rate ?? p.retentionRate ?? 5),
      vat_rate: String(p.vat_rate ?? p.vatRate ?? 15),
      contract_type: p.contract_type || p.contractType || "JBCC",
    });

    setClientForm({
      company_name: cd.company_name || "",
      company_registration: cd.company_registration || "",
      vat_number: cd.vat_number || "",
      physical_address: cd.physical_address || "",
      postal_address: cd.postal_address || "",
      banking_details: cd.banking_details || "",
      office_number: cd.office_number || "",
      client: cd.client || { ...DEFAULT_PERSONNEL },
      client_representative: cd.client_representative || { ...DEFAULT_PERSONNEL },
    });

    setAppointedForm({
      company_name: ac.company_name || "",
      company_registration: ac.company_registration || "",
      vat_number: ac.vat_number || "",
      physical_address: ac.physical_address || "",
      postal_address: ac.postal_address || "",
      banking_details: ac.banking_details || "",
      office_number: ac.office_number || "",
      role_as_per_appointment: ac.role_as_per_appointment || "",
      principal: ac.principal || { ...DEFAULT_PERSONNEL },
      technical_representative: ac.technical_representative || { ...DEFAULT_PERSONNEL },
    });

    const tb = p.task_order_brief || p.taskOrderBrief || "";
    setTaskOrder({ brief: tb });
    setExistingDocs(p.documents || []);

    // Check if personnel exists to show the sections
    if (cd.client?.name || cd.client?.email || cd.client_representative?.name || cd.client_representative?.email) {
      setShowClientPersonnel(true);
    }
    if (ac.principal?.name || ac.principal?.email || ac.technical_representative?.name || ac.technical_representative?.email) {
      setShowAppointedPersonnel(true);
    }
    if (tb) {
      setShowTaskOrderBrief(true);
    }

    setInitialized(true);
  }, [selectedProject, initialized]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const budget = parseBudget(form.total_budget);
  const vatRate = parseFloat(form.vat_rate) || 0;
  const retentionRate = parseFloat(form.retention_rate) || 0;
  const vatAmount = budget * (vatRate / 100);
  const totalWithVat = budget + vatAmount;
  const retentionAmount = budget * (retentionRate / 100);

  const getDuration = useCallback(() => {
    if (!form.start_date || !form.end_date) return null;
    try {
      const start = parseISO(form.start_date);
      const end = parseISO(form.end_date);
      if (end <= start) return null;
      const months = differenceInMonths(end, start);
      const days = differenceInDays(
        end,
        new Date(
          start.getFullYear(),
          start.getMonth() + months,
          start.getDate()
        )
      );
      return { months, days, start, end };
    } catch {
      return null;
    }
  }, [form.start_date, form.end_date]);

  const getDurationLabel = useCallback(() => {
    const d = getDuration();
    if (!d) return null;
    if (d.months === 0)
      return `${differenceInDays(d.end, d.start)} day${differenceInDays(d.end, d.start) !== 1 ? "s" : ""}`;
    if (d.days === 0)
      return `${d.months} month${d.months !== 1 ? "s" : ""}`;
    return `${d.months} month${d.months !== 1 ? "s" : ""}, ${d.days} day${d.days !== 1 ? "s" : ""}`;
  }, [getDuration]);

  const duration = getDuration();

  // ── Form helpers ───────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (errors[key as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  // ── File handling ──────────────────────────────────────────────────────────

  const addFiles = useCallback(
    (newFiles: File[]) => {
      newFiles.forEach((file) => {
        const result = validateFile(file);
        if (result.valid) {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          s3Upload.startUpload(id, file);
        } else {
          toast.error(`${file.name}: ${result.error}`);
        }
      });
    },
    [s3Upload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  // ── Delete existing document ───────────────────────────────────────────────

  const handleDeleteExistingDoc = async (doc: ProjectDocument) => {
    const projectId = selectedProject?._id || selectedProject?.id;
    const docId = doc.id || doc._id;
    if (!projectId || !docId) return;

    setDeletingDocId(docId);
    try {
      await deleteProjectDocument(projectId, docId);
      setExistingDocs((prev) => prev.filter((d) => (d.id || d._id) !== docId));
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Document removed");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      const next: FormErrors = {};
      if (!form.name.trim() || form.name.trim().length < 2)
        next.name = "Project name must be at least 2 characters";
      if (!form.project_number.trim())
        next.project_number = "Project number is required";
      setErrors(next);
      return Object.keys(next).length === 0;
    }
    if (step === 2) {
      const next: ClientErrors = {};
      if (!clientForm.company_name.trim())
        next.company_name = "Client name or company is required";
      setClientErrors(next);
      return Object.keys(next).length === 0;
    }
    if (step === 3) {
      const next: AppointedErrors = {};
      if (!appointedForm.company_name.trim())
        next.company_name = "Company name is required";
      setAppointedErrors(next);
      return Object.keys(next).length === 0;
    }
    // Steps 4 and 5 are optional when editing
    if (step === 4 || step === 5) return true;
    if (step === 6) {
      const next: FormErrors = {};
      if (!form.start_date) next.start_date = "Start date is required";
      if (!form.end_date) next.end_date = "End date is required";
      if (form.start_date && form.end_date && form.end_date <= form.start_date)
        next.date_range = "End date must be after start date";
      if (parseBudget(form.total_budget) <= 0)
        next.total_budget = "Total budget must be greater than 0";
      setErrors(next);
      return Object.keys(next).length === 0;
    }
    return true;
  };

  // ── Step navigation ────────────────────────────────────────────────────────

  const goToStep = (next: number) => {
    setStepDir(next > currentStep ? "fwd" : "back");
    setStepKey((k) => k + 1);
    setCurrentStep(next);
  };

  const handleNext = () => {
    if (validateStep(currentStep)) goToStep(currentStep + 1);
  };

  const handleBack = () => goToStep(currentStep - 1);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!validateStep(6)) return;
    setIsSubmitting(true);

    const b = parseBudget(form.total_budget);
    const fx = parseFloat(form.fx_rate) || 1;
    const ret = parseFloat(form.retention_rate) || 5;
    const vat = parseFloat(form.vat_rate) || 15;
    const projectId = selectedProject?._id || selectedProject?.id;

    const data: any = {
      id: projectId,
      name: form.name,
      description: form.description,
      project_number: form.project_number,
      start_date: form.start_date,
      end_date: form.end_date,
      fx_rate: fx,
      retention_rate: ret,
      vat_rate: vat,
      contract_type: form.contract_type,
      total_budget: b,
      location: form.location,
      currency: form.currency,
      client_details: {
        company_name: clientForm.company_name,
        company_registration: clientForm.company_registration,
        vat_number: clientForm.vat_number,
        physical_address: clientForm.physical_address,
        postal_address: clientForm.postal_address,
        banking_details: clientForm.banking_details,
        office_number: clientForm.office_number,
        client: clientForm.client,
        client_representative: clientForm.client_representative,
      },
      appointed_company: {
        company_name: appointedForm.company_name,
        company_registration: appointedForm.company_registration,
        vat_number: appointedForm.vat_number,
        physical_address: appointedForm.physical_address,
        postal_address: appointedForm.postal_address,
        banking_details: appointedForm.banking_details,
        office_number: appointedForm.office_number,
        role_as_per_appointment: appointedForm.role_as_per_appointment,
        principal: appointedForm.principal,
        technical_representative: appointedForm.technical_representative,
      },
      task_order_brief: taskOrder.brief,
    };

    updateProject(data, {
      onSuccess: async (result: any) => {
        const projectData = result?.project || result;
        const pId = projectData?._id || projectData?.id || projectId;

        if (files.length > 0 && pId) {
          const ids = files.map((e) => e.id);
          const s3Keys = await s3Upload.waitForAll(ids);

          let anyFailed = false;
          await Promise.all(
            files.map(async (entry) => {
              const key = s3Keys.get(entry.id);
              if (!key) { anyFailed = true; return; }
              try {
                await registerS3Document(pId, { file_name: entry.file.name, s3_key: key });
              } catch {
                anyFailed = true;
              }
            })
          );

          if (anyFailed) {
            toast.warning("Project updated, but some documents failed to register.");
          } else {
            toast.success("Project updated with new documents!");
          }
        } else {
          toast.success("Project updated successfully!");
        }

        queryClient.invalidateQueries({ queryKey: ["projects"] });
        if (pId) queryClient.invalidateQueries({ queryKey: ["project", pId] });

        setIsSubmitting(false);
        navigate("/settings/project-details");
      },
      onError: (error: any) => {
        setIsSubmitting(false);
        if (error?.response?.data) {
          const d = error.response.data;
          if (typeof d === "object" && !Array.isArray(d)) {
            Object.entries(d).forEach(([field, msgs]) => {
              const msg = Array.isArray(msgs) ? msgs[0] : msgs;
              toast.error(`${field}: ${msg}`);
            });
            return;
          }
          if (typeof d === "string") { toast.error(d); return; }
          if (d.message) { toast.error(d.message); return; }
        }
        toast.error(
          `Failed to update project: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      },
    });
  };

  const isLoading = isPending || isSubmitting;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Animation + date picker styles */}
      <style>{`
        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(22px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes slideFromLeft {
          from { opacity: 0; transform: translateX(-22px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        .anim-fwd  { animation: slideFromRight 0.2s ease-out; }
        .anim-back { animation: slideFromLeft  0.2s ease-out; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0; top: 0;
          width: 100%; height: 100%;
          cursor: pointer;
        }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-white">

        {/* ══════════════════════════════ LEFT SIDEBAR ══════════════════════ */}
        <aside className="hidden lg:flex w-[280px] bg-sidebar border-r border-[#ededed] flex-col h-full shrink-0">

          {/* Logo */}
          <div className="px-6 pt-6 pb-5 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 bg-[#121212] rounded-[10px] flex items-center justify-center shrink-0">
                <Logo />
              </div>
              <span className="text-[14px] font-normal text-[#121212] tracking-tight">
                Baselinq
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="px-6 pt-5 pb-2">
            <p className="text-[18px] font-normal text-[#101828] leading-tight">
              Edit Project
            </p>
            <p className="text-[12px] text-[#9ca3af] mt-1">
              Update your project details
            </p>
          </div>

          {/* Stepper */}
          <nav className="px-4 pt-3 flex-1 overflow-y-auto">
            {STEPS.map((step, i) => {
              const done = currentStep > step.id;
              const active = currentStep === step.id;
              return (
                <React.Fragment key={step.id}>
                  <div
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                      active ? "bg-[#f0edff]" : "bg-transparent"
                    )}
                  >
                    {/* Circle */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-normal shrink-0 mt-0.5 transition-colors",
                        done
                          ? "bg-[#6c5ce7] text-white"
                          : active
                            ? "bg-[#6c5ce7] text-white"
                            : "bg-[#f3f4f6] text-[#9ca3af]"
                      )}>
                      {done ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    {/* Label */}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-[13px] font-normal leading-tight",
                          done || active ? "text-[#101828]" : "text-[#9ca3af]"
                        )}>
                        {step.label}
                      </p>
                      <p
                        className={cn(
                          "text-[11px] mt-0.5",
                          done || active ? "text-[#6b7280]" : "text-[#d1d5db]"
                        )}>
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div
                      className="mx-auto my-0.5"
                      style={
                        done
                          ? { width: "2px", height: "16px", background: "#6c5ce7", marginLeft: "28px" }
                          : { width: 0, height: "16px", borderLeft: "2px dashed #e5e7eb", marginLeft: "28px" }
                      }
                    />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* ── Live Project Preview Card ── */}
          <div className="px-4 pb-5 mt-auto">
            <div className="rounded-2xl p-4" style={{ background: "#1a1a2e" }}>
              <div className="flex items-center gap-1.5 mb-3">
                <AiIcon size={14} />
                <span className="text-[10px] font-normal text-[#a78bfa] uppercase tracking-widest">
                  Project Preview
                </span>
              </div>

              {!form.name && !budget && !clientForm.company_name ? (
                <p className="text-[12px] text-white leading-relaxed">
                  Your project details will appear here as you fill them in.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {form.name && (
                    <div>
                      <p className="text-[15px] font-normal text-white leading-tight truncate">
                        {form.name}
                      </p>
                      {form.project_number && (
                        <p className="text-[11px] text-[#a78bfa] mt-0.5 font-normal">
                          {form.project_number}
                        </p>
                      )}
                    </div>
                  )}
                  {clientForm.company_name && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-[#6b7280] shrink-0" />
                      <p className="text-[11px] text-[#9ca3af] truncate">
                        {clientForm.company_name}
                      </p>
                    </div>
                  )}
                  {appointedForm.company_name && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-[#6b7280] shrink-0" />
                      <p className="text-[11px] text-[#9ca3af] truncate">
                        {appointedForm.company_name}
                      </p>
                    </div>
                  )}
                  {form.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-[#6b7280] shrink-0" />
                      <p className="text-[11px] text-[#9ca3af] truncate">
                        {form.location}
                      </p>
                    </div>
                  )}
                  {files.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-[#6b7280] shrink-0" />
                      <p className="text-[11px] text-[#9ca3af]">
                        {files.length} new document{files.length !== 1 ? "s" : ""} added
                      </p>
                    </div>
                  )}
                  {budget > 0 && (
                    <div className="pt-2.5 border-t border-[#2d2d4e]">
                      <p className="text-[16px] font-normal text-white">
                        {formatCurrency(budget, form.currency)}
                      </p>
                      {getDurationLabel() && (
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">
                          {getDurationLabel()} · {form.contract_type}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════ RIGHT PANEL ═══════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Mobile progress bar */}
          <div className="lg:hidden bg-white border-b border-[#ededed] px-5 py-3">
            <div className="flex gap-1.5 mb-2">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background:
                      s.id <= currentStep ? "#6c5ce7" : "#e5e7eb",
                  }}
                />
              ))}
            </div>
            <p className="text-[13px] font-normal text-[#374151]">
              Step {currentStep} of {STEPS.length}:{" "}
              {STEPS[currentStep - 1].label}
            </p>
          </div>

          {/* Back to Project Details / Logout */}
          <div className="flex justify-between px-8 pt-5 pb-1 shrink-0">
            <button
              onClick={() => navigate("/settings/project-details")}
              className="flex items-center gap-1.5 text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Project Details
            </button>
            <button
              onClick={() => { localStorage.clear(); navigate("/login"); }}
              className="flex items-center gap-1.5 text-[13px] text-[#9ca3af] hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-10">
            <div className="max-w-[720px] mx-auto pt-4">

              {/* Step heading */}
              <div className="mb-6">
                <h1 className="text-[24px] font-normal text-[#101828] leading-tight">
                  {STEPS[currentStep - 1].label}
                </h1>
                <p className="text-[14px] text-[#6b7280] mt-1.5 leading-relaxed">
                  {currentStep === 1 &&
                    "Give your project a name and number so your team can identify it."}
                  {currentStep === 2 &&
                    "Fill in the client's company details and assign personnel. This information will auto-populate into contracts and letters."}
                  {currentStep === 3 &&
                    "Enter the details of the appointed professional firm and their key team members."}
                  {currentStep === 4 &&
                    "Upload additional documents for this project. Existing documents are unchanged."}
                  {currentStep === 5 &&
                    "Describe the full scope of construction works. This will auto-populate into contract documents and appointment letters."}
                  {currentStep === 6 &&
                    "Define the financial parameters and schedule for this project."}
                </p>
              </div>

              {/* Animated step card */}
              <div
                key={stepKey}
                className={stepDir === "fwd" ? "anim-fwd" : "anim-back"}>
                <div
                  className="bg-sidebar rounded-2xl"
                  style={{
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04)",
                  }}>

                  {/* ────────────── STEP 1: PROJECT DETAILS ────────────── */}
                  {currentStep === 1 && (
                    <div className="p-8 space-y-5">

                      {/* Row 1: Name (3/5) + Number (2/5) */}
                      <div className="grid grid-cols-5 gap-4">
                        {/* Project Name */}
                        <div className="col-span-3">
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                            Project Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            className={inputCls(!!errors.name)}
                            placeholder="e.g. Marina Bay Tower"
                            value={form.name}
                            onChange={(e) => {
                              setField("name", e.target.value);
                              setErrors((prev) => ({ ...prev, name: undefined }));
                            }}
                          />
                          {errors.name && (
                            <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                              {errors.name}
                            </p>
                          )}
                        </div>

                        {/* Project Number */}
                        <div className="col-span-2">
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                            Project Number
                          </label>
                          <div className="relative">
                            <input
                              className={cn(
                                "w-full h-12 px-4 pr-10 rounded-[10px] text-sm outline-none transition-all",
                                pnEditable
                                  ? "bg-[#f5f6f8] border border-[#e2e5ea] text-[#111827] focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10"
                                  : "bg-[#f0edff] border border-[#d4ccff] text-[#6c5ce7] cursor-pointer",
                                errors.project_number && "!border-red-400"
                              )}
                              value={form.project_number}
                              readOnly={!pnEditable}
                              placeholder="e.g. PRJ-001"
                              onClick={() => { if (!pnEditable) setPnEditable(true); }}
                              onChange={(e) => setField("project_number", e.target.value)}
                              onBlur={() => setPnEditable(false)}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setPnEditable((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c5ce7] hover:text-[#5a4bd1] transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {errors.project_number && (
                            <p className="text-[12px] text-red-500 mt-0.5">
                              {errors.project_number}
                            </p>
                          )}
                        </div>
                      </div>



                      {/* Location */}
                      <div>
                        <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                          Project Location
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                          <input
                            className={inputCls(false, "pl-10")}
                            placeholder="e.g. Cape Town, Western Cape"
                            value={form.location}
                            onChange={(e) => setField("location", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─────────────── STEP 2: CLIENT DETAILS ─────────────── */}
                  {currentStep === 2 && (
                    <div className="p-8 space-y-6">

                      {/* ── Company Info ── */}
                      <div>
                        <SectionHeader
                          icon={<Building2 className="w-3.5 h-3.5" />}
                          label="Client Company Information"
                          iconBg="#eef2ff"
                          iconColor="#6c5ce7"
                        />
                        <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                          Fill in once — this will auto-populate into all contracts and appointment letters.
                        </p>

                        <div className="space-y-4">
                          {/* Client Name or Company */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Client Name or Company <span className="text-red-500">*</span>
                            </label>
                            <input
                              className={inputCls(!!clientErrors.company_name)}
                              placeholder="e.g. Mr John Smith or ABC Holdings (Pty) Ltd"
                              value={clientForm.company_name}
                              onChange={(e) => {
                                setClientForm((p) => ({ ...p, company_name: e.target.value }));
                                setClientErrors((p) => ({ ...p, company_name: undefined }));
                              }}
                            />
                            {clientErrors.company_name && (
                              <p className="text-[12px] text-red-500 mt-1">
                                {clientErrors.company_name}
                              </p>
                            )}
                          </div>

                          {/* Registration + VAT */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Company Registration / ID
                              </label>
                              <input
                                className={inputCls()}
                                placeholder="e.g. 2012/123456/07"
                                value={clientForm.company_registration}
                                onChange={(e) =>
                                  setClientForm((p) => ({ ...p, company_registration: e.target.value }))
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                VAT Number
                              </label>
                              <input
                                className={inputCls()}
                                placeholder="e.g. 4123456789"
                                value={clientForm.vat_number}
                                onChange={(e) =>
                                  setClientForm((p) => ({ ...p, vat_number: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          {/* Physical + Postal Address */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Physical Address
                              </label>
                              <textarea
                                className={cn(
                                  "w-full px-4 py-3 rounded-[10px] text-sm text-[#111827] outline-none transition-all resize-none",
                                  "bg-[#f5f6f8] border border-[#e2e5ea]",
                                  "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10"
                                )}
                                placeholder="Street address, city, province"
                                rows={2}
                                value={clientForm.physical_address}
                                onChange={(e) =>
                                  setClientForm((p) => ({ ...p, physical_address: e.target.value }))
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Postal Address
                              </label>
                              <textarea
                                className={cn(
                                  "w-full px-4 py-3 rounded-[10px] text-sm text-[#111827] outline-none transition-all resize-none",
                                  "bg-[#f5f6f8] border border-[#e2e5ea]",
                                  "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10"
                                )}
                                placeholder="P.O. Box or postal address"
                                rows={2}
                                value={clientForm.postal_address}
                                onChange={(e) =>
                                  setClientForm((p) => ({ ...p, postal_address: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          {/* Banking + Office */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-[13px] font-normal text-[#374151]">
                                  Banking Details
                                </label>
                                <Tooltip text="Bank name, account number, branch code" />
                              </div>
                              <div className="relative">
                                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                                <input
                                  className={inputCls(false, "pl-10")}
                                  placeholder="Bank · Account No · Branch code"
                                  value={clientForm.banking_details}
                                  onChange={(e) =>
                                    setClientForm((p) => ({ ...p, banking_details: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Office Number
                              </label>
                              <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                                <input
                                  className={inputCls(false, "pl-10")}
                                  placeholder="e.g. +27 11 123 4567"
                                  type="tel"
                                  value={clientForm.office_number}
                                  onChange={(e) =>
                                    setClientForm((p) => ({ ...p, office_number: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Assigned Personnel ── */}
                      <div>
                        <SectionHeader
                          icon={<User className="w-3.5 h-3.5" />}
                          label="Assigned Personnel"
                          iconBg="#f0fdf4"
                          iconColor="#00b894"
                        />
                        <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                          These members will be given predetermined access rights to the project.
                        </p>
                        {!showClientPersonnel ? (
                          <button
                            type="button"
                            onClick={() => setShowClientPersonnel(true)}
                            className="w-full py-6 border-2 border-dashed border-[#e2e5ea] rounded-xl flex flex-col items-center justify-center gap-2 text-[13px] text-[#6b7280] hover:border-[#6c5ce7] hover:text-[#6c5ce7] hover:bg-[#f8f7ff] transition-all group">
                            <div className="w-8 h-8 rounded-full bg-[#f3f4f6] flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span className="font-normal">Add Assigned Personnel</span>
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <PersonnelCard
                              label="Client"
                              role="Super User"
                              roleColor="#6c5ce7"
                              iconColor="#6c5ce7"
                              value={clientForm.client}
                              onChange={(v) => setClientForm((p) => ({ ...p, client: v }))}
                            />
                            <PersonnelCard
                              label="Client Representative"
                              role="Tech User"
                              roleColor="#00b894"
                              iconColor="#00b894"
                              value={clientForm.client_representative}
                              onChange={(v) => setClientForm((p) => ({ ...p, client_representative: v }))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─────────────── STEP 3: APPOINTED COMPANY ─────────────── */}
                  {currentStep === 3 && (
                    <div className="p-8 space-y-6">

                      {/* ── Company Info ── */}
                      <div>
                        <SectionHeader
                          icon={<Building2 className="w-3.5 h-3.5" />}
                          label="Appointed Company Information"
                          iconBg="#eff6ff"
                          iconColor="#3A6FF7"
                        />
                        <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                          Fill in once — this will auto-populate into PROCSA and JBCC agreements.
                        </p>

                        <div className="space-y-4">
                          {/* Company Name + Role */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Company Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                className={inputCls(!!appointedErrors.company_name)}
                                placeholder="e.g. Base Architects and Associates"
                                value={appointedForm.company_name}
                                onChange={(e) => {
                                  setAppointedForm((p) => ({ ...p, company_name: e.target.value }));
                                  setAppointedErrors((p) => ({ ...p, company_name: undefined }));
                                }}
                              />
                              {appointedErrors.company_name && (
                                <p className="text-[12px] text-red-500 mt-1">
                                  {appointedErrors.company_name}
                                </p>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-[13px] font-normal text-[#374151]">
                                  Responsibility / Role
                                </label>
                                <Tooltip text="Role as per the appointment (e.g. Principal Agent, Architect, QS)" />
                              </div>
                              <div className="relative">
                                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                                <input
                                  className={inputCls(false, "pl-10")}
                                  placeholder="e.g. Principal Agent / Architect"
                                  value={appointedForm.role_as_per_appointment}
                                  onChange={(e) =>
                                    setAppointedForm((p) => ({ ...p, role_as_per_appointment: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* Registration + VAT */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Company Registration
                              </label>
                              <input
                                className={inputCls()}
                                placeholder="e.g. 2012/123456/07"
                                value={appointedForm.company_registration}
                                onChange={(e) =>
                                  setAppointedForm((p) => ({ ...p, company_registration: e.target.value }))
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                VAT Number
                              </label>
                              <input
                                className={inputCls()}
                                placeholder="e.g. 4123456789"
                                value={appointedForm.vat_number}
                                onChange={(e) =>
                                  setAppointedForm((p) => ({ ...p, vat_number: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          {/* Physical + Postal Address */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Physical Address
                              </label>
                              <textarea
                                className={cn(
                                  "w-full px-4 py-3 rounded-[10px] text-sm text-[#111827] outline-none transition-all resize-none",
                                  "bg-[#f5f6f8] border border-[#e2e5ea]",
                                  "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10"
                                )}
                                placeholder="Street address, city, province"
                                rows={2}
                                value={appointedForm.physical_address}
                                onChange={(e) =>
                                  setAppointedForm((p) => ({ ...p, physical_address: e.target.value }))
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Postal Address
                              </label>
                              <textarea
                                className={cn(
                                  "w-full px-4 py-3 rounded-[10px] text-sm text-[#111827] outline-none transition-all resize-none",
                                  "bg-[#f5f6f8] border border-[#e2e5ea]",
                                  "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10"
                                )}
                                placeholder="P.O. Box or postal address"
                                rows={2}
                                value={appointedForm.postal_address}
                                onChange={(e) =>
                                  setAppointedForm((p) => ({ ...p, postal_address: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          {/* Banking + Office */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label className="text-[13px] font-normal text-[#374151]">
                                  Banking Details
                                </label>
                                <Tooltip text="Bank name, account number, branch code" />
                              </div>
                              <div className="relative">
                                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                                <input
                                  className={inputCls(false, "pl-10")}
                                  placeholder="Bank · Account No · Branch code"
                                  value={appointedForm.banking_details}
                                  onChange={(e) =>
                                    setAppointedForm((p) => ({ ...p, banking_details: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Office Number
                              </label>
                              <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                                <input
                                  className={inputCls(false, "pl-10")}
                                  placeholder="e.g. +27 11 123 4567"
                                  type="tel"
                                  value={appointedForm.office_number}
                                  onChange={(e) =>
                                    setAppointedForm((p) => ({ ...p, office_number: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Assigned Personnel ── */}
                      <div>
                        <SectionHeader
                          icon={<User className="w-3.5 h-3.5" />}
                          label="Assigned Personnel"
                          iconBg="#f0fdf4"
                          iconColor="#00b894"
                        />
                        <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                          These members will be given predetermined access rights to the project.
                        </p>
                        {!showAppointedPersonnel ? (
                          <button
                            type="button"
                            onClick={() => setShowAppointedPersonnel(true)}
                            className="w-full py-6 border-2 border-dashed border-[#e2e5ea] rounded-xl flex flex-col items-center justify-center gap-2 text-[13px] text-[#6b7280] hover:border-[#6c5ce7] hover:text-[#6c5ce7] hover:bg-[#f8f7ff] transition-all group">
                            <div className="w-8 h-8 rounded-full bg-[#f3f4f6] flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span className="font-normal">Add Assigned Personnel</span>
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <PersonnelCard
                              label="Principal Architect"
                              role="Super User"
                              roleColor="#6c5ce7"
                              iconColor="#6c5ce7"
                              value={appointedForm.principal}
                              onChange={(v) => setAppointedForm((p) => ({ ...p, principal: v }))}
                            />
                            <PersonnelCard
                              label="Technical Representative"
                              role="Tech User"
                              roleColor="#00b894"
                              iconColor="#00b894"
                              value={appointedForm.technical_representative}
                              onChange={(v) =>
                                setAppointedForm((p) => ({ ...p, technical_representative: v }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─────────────── STEP 4: DOCUMENTS ─────────────── */}
                  {currentStep === 4 && (
                    <div className="p-8 space-y-5 text-left">

                      {/* ── Existing documents ── */}
                      {existingDocs.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#f3f4f6]">
                            <div className="w-6 h-6 bg-[#eef2ff] rounded-lg flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5 text-[#6c5ce7]" />
                            </div>
                            <span className="text-[13px] font-normal text-[#374151]">
                              Existing Documents ({existingDocs.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {existingDocs.map((doc) => {
                              const docId = doc.id || doc._id;
                              const docName = doc.file_name || doc.fileName || doc.name || "Unknown";
                              const isDeleting = deletingDocId === docId;
                              return (
                                <div
                                  key={String(docId)}
                                  className={cn(
                                    "flex items-center gap-3 bg-[#f9fafb] rounded-[10px] px-4 py-3 border border-[#f3f4f6] transition-opacity",
                                    isDeleting && "opacity-50"
                                  )}>
                                  <FileTypeIcon filename={docName} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-normal text-[#111827] truncate">
                                      {docName}
                                    </p>
                                    {doc.uploaded_at || doc.uploadedAt ? (
                                      <p className="text-[11px] text-[#9ca3af]">
                                        {formatDate(doc.uploaded_at || doc.uploadedAt)}
                                      </p>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleDeleteExistingDoc(doc)}
                                    className="text-[#9ca3af] hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:cursor-not-allowed">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {existingDocs.length === 0 && files.length === 0 && (
                        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-4">
                          <span className="text-[15px] shrink-0 mt-px">📁</span>
                          <p className="text-[12px] text-amber-700 leading-relaxed">
                            No documents found. Upload the key documents for this project below.
                          </p>
                        </div>
                      )}

                      {/* ── Upload new documents ── */}
                      <div>
                        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#f3f4f6]">
                          <div className="w-6 h-6 bg-[#f0fdf4] rounded-lg flex items-center justify-center shrink-0">
                            <CloudUpload className="w-3.5 h-3.5 text-[#00b894]" />
                          </div>
                          <span className="text-[13px] font-normal text-[#374151]">Add New Documents</span>
                          <Tooltip text="Upload additional project files. PDF, JPG, PNG, XLSX (max 20MB)" />
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          multiple
                          accept={ALLOWED_FILE_EXTENSIONS.join(",")}
                          onChange={(e) => {
                            if (e.target.files) addFiles(Array.from(e.target.files));
                            e.target.value = "";
                          }}
                        />

                        {/* Drop zone */}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-xl py-8 cursor-pointer transition-all duration-200",
                            "border-2 border-dashed",
                            isDragging
                              ? "border-[#6c5ce7] bg-[#f8f7ff]"
                              : "border-[#d1d5db] bg-white hover:border-[#6c5ce7] hover:bg-[#f8f7ff]"
                          )}>
                          <CloudUpload
                            className={cn(
                              "w-8 h-8 mb-2 transition-colors",
                              isDragging ? "text-[#6c5ce7]" : "text-[#9ca3af]"
                            )}
                          />
                          <p className="text-[13px] font-normal text-[#374151]">
                            Drag and drop files here
                          </p>
                          <p className="text-[12px] text-[#6b7280] mt-1">
                            or{" "}
                            <span className="text-[#6c5ce7] underline font-normal">
                              click to browse
                            </span>
                          </p>
                        </div>

                        {/* New file list */}
                        {files.length > 0 && (
                          <div className="space-y-2 mt-3 px-1">
                            {files.map((f) => (
                              <div
                                key={f.id}
                                className="bg-[#f9fafb] rounded-[10px] px-4 py-3 border border-[#f3f4f6]">
                                <div className="flex items-center gap-3">
                                  <FileTypeIcon filename={f.file.name} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-normal text-[#111827] truncate">
                                      {f.file.name}
                                    </p>
                                    <p className="text-[11px] text-[#9ca3af]">
                                      {(f.file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                  {f.status === "error" && (
                                    <button
                                      type="button"
                                      onClick={() => s3Upload.retryUpload(f.id)}
                                      className="text-[11px] text-[#6c5ce7] hover:underline shrink-0 px-1">
                                      Retry
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => s3Upload.removeEntry(f.id)}
                                    className="text-[#9ca3af] hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                {f.status === "uploading" && (
                                  <div className="mt-2.5">
                                    <div className="h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-[#6c5ce7] rounded-full transition-all duration-300"
                                        style={{ width: `${f.progress}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-[#9ca3af] mt-1">{f.progress}%</p>
                                  </div>
                                )}
                                {f.status === "done" && (
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <Check className="w-3 h-3 text-[#00b894]" />
                                    <span className="text-[10px] text-[#00b894] font-normal">Uploaded</span>
                                  </div>
                                )}
                                {f.status === "error" && (
                                  <p className="text-[11px] text-red-500 mt-1">
                                    {f.error ?? "Upload failed"}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─────────────── STEP 5: SCOPE OF WORKS ─────────────── */}
                  {currentStep === 5 && (
                    <div className="p-8 space-y-6 text-left">
                      <div>
                        <SectionHeader
                          icon={<ScrollText className="w-3.5 h-3.5" />}
                          label="Scope of Works"
                          iconBg="#f0edff"
                          iconColor="#6c5ce7"
                        />
                        <p className="text-[13px] text-[#6b7280] -mt-2">
                          Describe the full scope of construction works. This will auto-populate into contract documents and appointment letters.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="relative group">
                          <textarea
                            className={cn(
                              "w-full px-4 py-4 rounded-[12px] text-[14px] text-[#111827] outline-none transition-all resize-none leading-relaxed",
                              "bg-[#f5f6f8] border border-[#e2e5ea]",
                              "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
                              "min-h-[250px]"
                            )}
                            placeholder={`e.g. The Client wishes to appoint an Architect to measure up the existing residential building...`}
                            value={taskOrder.brief}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTaskOrder({ brief: val });
                              setField("description", val); // Sync with description
                            }}
                          />

                          <div className="absolute right-3 bottom-3">
                            <button
                              type="button"
                              onClick={() => {
                                toast.info("Analyzing uploaded documents to extract scope...");
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e2e5ea] text-[12px] font-medium text-[#6c5ce7] shadow-sm hover:border-[#6c5ce7] hover:bg-[#f8f7ff] transition-all"
                            >
                              <AiIcon size={14} />
                              Extract from Contract
                            </button>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                          <span className="text-[15px] shrink-0 mt-px">✨</span>
                          <p className="text-[12px] text-blue-700 leading-relaxed">
                            <span className="font-semibold text-blue-800">AI Tip:</span> You can paste the raw contract scope here, or use the button above to extract it from your uploaded JBCC document.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────── STEP 6: FINANCIALS & TIMELINE ──────────── */}
                  {currentStep === 6 && (
                    <div className="p-8 space-y-7">

                      {/* ── Timeline group ── */}
                      <div>
                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#f3f4f6]">
                          <div className="w-6 h-6 bg-[#eef2ff] rounded-lg flex items-center justify-center shrink-0">
                            <CalendarIcon className="w-3.5 h-3.5 text-[#6c5ce7]" />
                          </div>
                          <span className="text-[13px] font-normal text-[#374151]">Timeline</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Start date */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Start Date <span className="text-red-500">*</span>
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    inputCls(!!errors.start_date),
                                    "flex items-center gap-2 text-left",
                                    !form.start_date && "text-[#9ca3af]"
                                  )}>
                                  <CalendarIcon className="w-4 h-4 shrink-0" />
                                  {form.start_date ? format(parseISO(form.start_date), "PPP") : "Pick a date"}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white" align="start">
                                <Calendar
                                  mode="single"
                                  selected={form.start_date ? parseISO(form.start_date) : undefined}
                                  onSelect={(date) => {
                                    setField("start_date", date ? format(date, "yyyy-MM-dd") : "");
                                    setErrors((p) => ({ ...p, start_date: undefined, date_range: undefined }));
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {errors.start_date && (
                              <p className="text-[12px] text-red-500 mt-1">{errors.start_date}</p>
                            )}
                          </div>

                          {/* End date */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              End Date <span className="text-red-500">*</span>
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    inputCls(!!(errors.end_date || errors.date_range)),
                                    "flex items-center gap-2 text-left",
                                    !form.end_date && "text-[#9ca3af]"
                                  )}>
                                  <CalendarIcon className="w-4 h-4 shrink-0" />
                                  {form.end_date ? format(parseISO(form.end_date), "PPP") : "Pick a date"}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white" align="start">
                                <Calendar
                                  mode="single"
                                  selected={form.end_date ? parseISO(form.end_date) : undefined}
                                  onSelect={(date) => {
                                    setField("end_date", date ? format(date, "yyyy-MM-dd") : "");
                                    setErrors((p) => ({ ...p, end_date: undefined, date_range: undefined }));
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {(errors.end_date || errors.date_range) && (
                              <p className="text-[12px] text-red-500 mt-1">
                                {errors.end_date || errors.date_range}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Duration bar */}
                        {duration && (
                          <div className="mt-4">
                            <div
                              className="h-2 rounded-full"
                              style={{ background: "linear-gradient(90deg, #6c5ce7, #a78bfa)" }}
                            />
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-[11px] text-[#9ca3af]">
                                {format(duration.start, "MMM d, yyyy")}
                              </span>
                              <span className="text-[13px] font-normal text-[#6c5ce7]">
                                {getDurationLabel()}
                              </span>
                              <span className="text-[11px] text-[#9ca3af]">
                                {format(duration.end, "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Financial group ── */}
                      <div>
                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#f3f4f6]">
                          <div className="w-6 h-6 bg-[#f0fdf4] rounded-lg flex items-center justify-center shrink-0">
                            <DollarSign className="w-3.5 h-3.5 text-[#00b894]" />
                          </div>
                          <span className="text-[13px] font-normal text-[#374151]">Financial Parameters</span>
                        </div>

                        {/* Row 1: Budget + Currency + Contract Type */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          {/* Budget */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Total Budget <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-normal text-[#6b7280] pointer-events-none select-none">
                                {CURRENCY_SYMBOLS[form.currency] || "R"}
                              </span>
                              <input
                                className={cn(
                                  "w-full rounded-[10px] outline-none transition-all",
                                  "bg-[#f5f6f8] border border-[#e2e5ea]",
                                  "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
                                  "pl-10 pr-4 text-[18px] font-normal text-[#111827] h-[52px]",
                                  errors.total_budget && "!border-red-400 focus:ring-red-400/10"
                                )}
                                placeholder="0"
                                value={form.total_budget}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  setField("total_budget", raw ? formatWithCommas(parseInt(raw, 10)) : "");
                                }}
                              />
                            </div>
                            {errors.total_budget && (
                              <p className="text-[12px] text-red-500 mt-1">{errors.total_budget}</p>
                            )}
                          </div>

                          {/* Currency */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Currency
                            </label>
                            <SelectField value={form.currency} onChange={(v) => setField("currency", v)}>
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </SelectField>
                          </div>

                          {/* Contract Type */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Contract Type
                            </label>
                            <SelectField value={form.contract_type} onChange={(v) => setField("contract_type", v)}>
                              {CONTRACT_TYPES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </SelectField>
                          </div>
                        </div>

                        {/* Row 2: FX Rate + Retention + VAT */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <label className="text-[13px] font-normal text-[#374151]">FX Rate</label>
                              <Tooltip text="Exchange rate to project base currency" />
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              className={inputCls()}
                              value={form.fx_rate}
                              onChange={(e) => setField("fx_rate", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Retention Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              max={10}
                              className={inputCls()}
                              value={form.retention_rate}
                              onChange={(e) => setField("retention_rate", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              VAT Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              max={25}
                              className={inputCls()}
                              value={form.vat_rate}
                              onChange={(e) => setField("vat_rate", e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Live financial summary */}
                        <div
                          className="mt-5 rounded-xl p-4 border"
                          style={{ background: "#f0edff", borderColor: "#e0d9ff" }}>
                          <p className="text-[11px] font-normal text-[#6c5ce7] uppercase tracking-widest mb-3">
                            Budget Summary
                          </p>
                          <div className="space-y-2">
                            {[
                              { label: `Contract Value (excl. VAT)`, value: budget },
                              { label: `VAT (${vatRate}%)`, value: vatAmount },
                              { label: `Total (incl. VAT)`, value: totalWithVat, bold: true },
                              { label: `Retention (${retentionRate}%)`, value: retentionAmount },
                            ].map(({ label, value, bold }) => (
                              <div
                                key={label}
                                className={cn(
                                  "flex justify-between items-center",
                                  bold && "pt-2 mt-1 border-t border-[#d4ccff]"
                                )}>
                                <span className={cn("text-[12px] text-[#6b7280]", bold && "font-normal text-[#374151]")}>
                                  {label}
                                </span>
                                <span className={cn("text-[13px] tabular-nums", bold ? "font-normal text-[#101828]" : "text-[#374151]")}>
                                  {budget > 0 ? formatCurrency(value, form.currency) : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Navigation buttons ── */}
                  <div
                    className={cn(
                      "flex items-center px-8 pb-8",
                      currentStep === 1 ? "justify-end" : "justify-between"
                    )}>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={isLoading}
                        className={cn(
                          "flex items-center gap-2 h-12 px-6 rounded-[10px] text-[14px] font-normal transition-all",
                          "bg-white text-[#374151] border-[1.5px] border-[#e5e7eb]",
                          "hover:border-[#d1d5db] hover:bg-[#f9fafb]",
                          isLoading && "opacity-50 cursor-not-allowed"
                        )}>
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}

                    {currentStep < STEPS.length ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className={cn(
                          "flex items-center gap-2 h-12 px-8 rounded-[10px] text-[14px] font-normal text-white transition-all",
                          "bg-[#6c5ce7] hover:bg-[#5a4bd1]",
                          "hover:shadow-[0_4px_12px_rgba(108,92,231,0.3)] hover:-translate-y-px"
                        )}>
                        Continue
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={cn(
                          "flex items-center gap-2.5 h-[52px] px-10 rounded-[10px] text-[15px] font-normal text-white transition-all border-0 cursor-pointer",
                          isLoading ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.99]"
                        )}
                        style={{
                          background: "linear-gradient(135deg, #6c5ce7, #5a4bd1)",
                          boxShadow: isLoading ? "none" : "0 4px 14px rgba(108,92,231,0.4)",
                        }}>
                        <Rocket className="w-4 h-4" />
                        {isLoading ? "Saving…" : "Save Changes"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
