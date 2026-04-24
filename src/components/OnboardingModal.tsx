import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { uploadProjectDocument, validateFile, ALLOWED_FILE_EXTENSIONS, lookupCompany } from "@/lib/Api";
import {
  X,
  FileText,
  Check,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ScrollText,
  Plus,
  Loader2,
  Search,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, differenceInMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Types ────────────────────────────────────────────────────────────────────

interface PersonnelState {
  name: string;
  email: string;
  phone: string;
}

interface AddressState {
  street: string;
  city: string;
  province: string;
  postal_code: string;
}


interface ClientFormState {
  company_name: string;
  company_registration: string;
  vat_number: string;
  physical_address: AddressState;
  postal_address: AddressState;
  office_number: string;
  client: PersonnelState;
  client_representative: PersonnelState;
}

interface AppointedFormState {
  company_name: string;
  company_registration: string;
  vat_number: string;
  physical_address: AddressState;
  postal_address: AddressState;
  office_number: string;
  role_as_per_appointment: string;
  principal: PersonnelState;
  technical_representative: PersonnelState;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_ADDRESS: AddressState = { street: "", city: "", province: "", postal_code: "" };

const DEFAULT_PERSONNEL: PersonnelState = { name: "", email: "", phone: "" };

const DEFAULT_CLIENT: ClientFormState = {
  company_name: "",
  company_registration: "",
  vat_number: "",
  physical_address: { ...DEFAULT_ADDRESS },
  postal_address: { ...DEFAULT_ADDRESS },
  office_number: "",
  client: { ...DEFAULT_PERSONNEL },
  client_representative: { ...DEFAULT_PERSONNEL },
};

const DEFAULT_APPOINTED: AppointedFormState = {
  company_name: "",
  company_registration: "",
  vat_number: "",
  physical_address: { ...DEFAULT_ADDRESS },
  postal_address: { ...DEFAULT_ADDRESS },
  office_number: "",
  role_as_per_appointment: "",
  principal: { ...DEFAULT_PERSONNEL },
  technical_representative: { ...DEFAULT_PERSONNEL },
};

// ── Zod schema ───────────────────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  project_number: z.string().min(1, "Project number is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  fx_rate: z.coerce.number().min(0, "Must be a positive number"),
  retention_rate: z.coerce.number().min(0).max(10, "Must be between 0 and 10"),
  vat_rate: z.coerce.number().min(0).max(25, "Must be between 0 and 25"),
  contract_type: z.string().min(1, "Contract type is required"),
  total_budget: z.coerce.number().min(0, "Must be a positive number"),
  location: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

// ── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Project Details" },
  { id: 2, label: "Client Details" },
  { id: 3, label: "Associated Company" },
  { id: 4, label: "Scope of Works" },
  { id: 5, label: "Financials & Timeline" },
];

const STEP_FIELDS: Record<number, (keyof z.infer<typeof projectSchema>)[]> = {
  1: ["name", "project_number", "location"],
  2: [],
  3: [],
  4: ["description"],
  5: ["start_date", "end_date", "total_budget", "fx_rate", "contract_type", "retention_rate", "vat_rate"],
};

// ── Helper Components ───────────────────────────────────────────────────────

const ensureAddress = (val: any): AddressState => {
  if (val && typeof val === "object" && "street" in val) return val as AddressState;
  return { street: String(val || ""), city: "", province: "", postal_code: "" };
};

const ensureBanking = (val: any): any => {
  return {};
};

function StepAddressFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AddressState;
  onChange: (v: AddressState) => void;
}) {
  const fieldCls = cn(
    "w-full h-10 px-3 rounded-lg text-sm border outline-none transition-all",
    "bg-[#f5f6f8] border-border focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
  );
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <input className={fieldCls} placeholder="Street" value={value.street} onChange={(e) => onChange({ ...value, street: e.target.value })} />
        <input className={fieldCls} placeholder="City" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} />
        <input className={fieldCls} placeholder="Province" value={value.province} onChange={(e) => onChange({ ...value, province: e.target.value })} />
        <input className={fieldCls} placeholder="Code" value={value.postal_code} onChange={(e) => onChange({ ...value, postal_code: e.target.value })} />
      </div>
    </div>
  );
}


function StepPersonnelCard({
  label,
  role,
  roleColor,
  value,
  onChange,
}: {
  label: string;
  role: string;
  roleColor: string;
  value: PersonnelState;
  onChange: (v: PersonnelState) => void;
}) {
  const fieldCls = cn(
    "w-full h-10 px-3 rounded-lg text-sm border outline-none transition-all",
    "bg-[#f5f6f8] border-border focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
  );
  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium text-white" style={{ background: roleColor }}>
          {role}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input className={cn(fieldCls, "pl-9")} placeholder="Full name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input className={cn(fieldCls, "pl-9")} placeholder="Email address" type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input className={cn(fieldCls, "pl-9")} placeholder="Phone number" type="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project?: any;
}

// ── Component ────────────────────────────────────────────────────────────────

export function OnboardingModal({ isOpen, onOpenChange, project }: OnboardingModalProps) {
  const queryClient = useQueryClient();
  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdatingProject } = useUpdateProject();
  const isPending = isCreating || isUpdatingProject;
  const { data: userObj } = useCurrentUser();

  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});
  const [fileErrors, setFileErrors] = React.useState<Record<string, string>>({});

  const [clientForm, setClientForm] = useState<ClientFormState>(DEFAULT_CLIENT);
  const [clientError, setClientError] = useState("");
  const [appointedForm, setAppointedForm] = useState<AppointedFormState>(DEFAULT_APPOINTED);
  const [appointedError, setAppointedError] = useState("");
  const [taskOrderBrief, setTaskOrderBrief] = useState("");
  const [showClientPersonnel, setShowClientPersonnel] = useState(false);
  const [showAppointedPersonnel, setShowAppointedPersonnel] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [userProfileLoaded, setUserProfileLoaded] = useState(false);

  const handleCompanyLookup = async (target: "client" | "appointed") => {
    const reg = (target === "client" ? clientForm.company_registration : appointedForm.company_registration).trim();
    if (!reg) {
      toast.error("Please enter a registration number to look up.");
      return;
    }

    setIsLookingUp(true);
    try {
      const data = await lookupCompany(reg);
      if (data) {
        if (target === "client") {
          setClientForm((prev) => ({
            ...prev,
            company_name: data.company_name || prev.company_name,
            vat_number: data.vat_number || prev.vat_number,
            office_number: data.office_number || prev.office_number,
            physical_address: data.physical_address ? {
              ...prev.physical_address,
              ...data.physical_address,
            } : prev.physical_address,
          }));
        } else {
          setAppointedForm((prev) => ({
            ...prev,
            company_name: data.company_name || prev.company_name,
            vat_number: data.vat_number || prev.vat_number,
            office_number: data.office_number || prev.office_number,
            physical_address: data.physical_address ? {
              ...prev.physical_address,
              ...data.physical_address,
            } : prev.physical_address,
          }));
        }
        toast.success("Company details retrieved successfully!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Company not found or lookup failed. Please enter details manually.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "", description: "", project_number: "",
      start_date: "", end_date: "",
      fx_rate: 1, retention_rate: 5, vat_rate: 15,
      contract_type: "JBCC", total_budget: 0, location: "", attachments: [],
    },
  });

  // ── Populate on open ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    if (project) {
      const getDate = (d: string) => (d ? d.split("T")[0] : "");
      form.reset({
        name: project.name || "",
        description: project.description || project.task_order_brief || project.taskOrderBrief || "",
        project_number: project.projectNumber || project.project_number || "",
        start_date: getDate(project.startDate || project.start_date),
        end_date: getDate(project.endDate || project.end_date),
        fx_rate: project.fxRate ?? project.fx_rate ?? 1,
        retention_rate: project.retentionRate ?? project.retention_rate ?? 5,
        vat_rate: project.vatRate ?? project.vat_rate ?? 15,
        contract_type: project.contractType || project.contract_type || "JBCC",
        total_budget: project.totalBudget ?? project.total_budget ?? 0,
        location: project.location || "",
        attachments: project.attachments || [],
      });

      const cd = project.clientDetails || project.client_details;
      setClientForm(cd ? {
        company_name: cd.company_name || "",
        company_registration: cd.company_registration || "",
        vat_number: cd.vat_number || "",
        physical_address: ensureAddress(cd.physical_address),
        postal_address: ensureAddress(cd.postal_address),
        office_number: cd.office_number || "",
        client: cd.client || { ...DEFAULT_PERSONNEL },
        client_representative: cd.client_representative || { ...DEFAULT_PERSONNEL },
      } : { ...DEFAULT_CLIENT });

      const ac = project.appointedCompany || project.appointed_company;
      setAppointedForm(ac ? {
        company_name: ac.company_name || "",
        company_registration: ac.company_registration || "",
        vat_number: ac.vat_number || "",
        physical_address: ensureAddress(ac.physical_address),
        postal_address: ensureAddress(ac.postal_address),
        office_number: ac.office_number || "",
        role_as_per_appointment: ac.role_as_per_appointment || "",
        principal: ac.principal || { ...DEFAULT_PERSONNEL },
        technical_representative: ac.technical_representative || { ...DEFAULT_PERSONNEL },
      } : { ...DEFAULT_APPOINTED });

      setTaskOrderBrief(project.description || project.task_order_brief || project.taskOrderBrief || "");

      if (cd && (cd.client?.name || cd.client?.email || cd.client_representative?.name || cd.client_representative?.email)) {
        setShowClientPersonnel(true);
      }
      if (ac && (ac.principal?.name || ac.principal?.email || ac.technical_representative?.name || ac.technical_representative?.email)) {
        setShowAppointedPersonnel(true);
      }
    } else {
      form.reset({
        name: "",
        description: "",
        project_number: "",
        start_date: "",
        end_date: "",
        fx_rate: 1,
        retention_rate: 5,
        vat_rate: 15,
        contract_type: "JBCC",
        total_budget: 0,
        location: "",
        attachments: [],
      });
      setClientForm({ ...DEFAULT_CLIENT });
      setTaskOrderBrief("");
      setShowClientPersonnel(false);
      setShowAppointedPersonnel(false);

      if (!appointedForm.company_name && userObj) {
        const org = userObj.organization;
        const profile = userObj.profile;

        if (org || profile) {
          setAppointedForm({
            ...DEFAULT_APPOINTED,
            company_name: org?.name || DEFAULT_APPOINTED.company_name,
            company_registration: org?.company_reg_number || DEFAULT_APPOINTED.company_registration,
            vat_number: org?.vat_number || DEFAULT_APPOINTED.vat_number,
            office_number: profile?.phone_number || DEFAULT_APPOINTED.office_number,
            physical_address: {
              ...DEFAULT_APPOINTED.physical_address,
              street: profile?.address || DEFAULT_APPOINTED.physical_address.street,
              city: profile?.city || DEFAULT_APPOINTED.physical_address.city,
              province: profile?.state || DEFAULT_APPOINTED.physical_address.province,
              postal_code: profile?.postal_code || DEFAULT_APPOINTED.physical_address.postal_code,
            },
            principal: {
              ...DEFAULT_APPOINTED.principal,
              name: userObj.name || DEFAULT_APPOINTED.principal.name,
              email: userObj.email || DEFAULT_APPOINTED.principal.email,
            },
          });
        }
      }
    }

    setSelectedFiles([]);
    setClientError("");
    setAppointedError("");
    setCurrentStep(1);
  }, [project, isOpen, form]);

  // ── File handling ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      const errors: Record<string, string> = {};
      newFiles.forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) validFiles.push(file);
        else { errors[file.name] = validation.error || "Invalid file"; toast.error(`${file.name}: ${validation.error}`); }
      });
      setFileErrors((prev) => ({ ...prev, ...errors }));
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      if (validFiles.length > 0) form.clearErrors("attachments");
    }
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => { const u = { ...prev }; delete u[fileToRemove.name]; return u; });
    setFileErrors((prev) => { const u = { ...prev }; delete u[fileToRemove.name]; return u; });
  };

  const uploadAllFiles = async (projectId: string) => {
    if (!selectedFiles.length) return [];
    setIsUploading(true);
    const uploadedDocs: any[] = [];
    for (const file of selectedFiles) {
      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        const doc = await uploadProjectDocument(projectId, file, (p) => setUploadProgress((prev) => ({ ...prev, [file.name]: p })));
        uploadedDocs.push(doc);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
        setFileErrors((prev) => ({ ...prev, [file.name]: err instanceof Error ? err.message : "Upload failed" }));
      }
    }
    setIsUploading(false);
    return uploadedDocs;
  };

  // ── Auto-generate project number ────────────────────────────────────────────

  const generateProjectNumber = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const prefix = words.length === 1 ? words[0].substring(0, 3).toUpperCase() : words.map((w) => w[0]).join("").toUpperCase().substring(0, 4);
    return `${prefix}-001`;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue("name", name);
    const cur = form.getValues("project_number");
    const isAuto = cur === "" || cur === "PRJ-001" || /^[A-Z]{1,4}-001$/.test(cur);
    if (!project && isAuto) form.setValue("project_number", name.trim() ? generateProjectNumber(name) : "");
  };

  // ── Duration ────────────────────────────────────────────────────────────────

  const values = form.watch();

  const getDurationLabel = () => {
    if (!values.start_date || !values.end_date) return null;
    try {
      const start = parseISO(values.start_date);
      const end = parseISO(values.end_date);
      if (end <= start) return null;
      const months = differenceInMonths(end, start);
      const rem = differenceInDays(end, new Date(start.getFullYear(), start.getMonth() + months, start.getDate()));
      if (months === 0) return `${differenceInDays(end, start)} days`;
      if (rem === 0) return `${months} month${months !== 1 ? "s" : ""}`;
      return `${months} month${months !== 1 ? "s" : ""}, ${rem} day${rem !== 1 ? "s" : ""}`;
    } catch { return null; }
  };

  // ── Step navigation ─────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (currentStep === 2) {
      if (!clientForm.company_name.trim()) { setClientError("Client name or company is required"); return; }
      setClientError("");
    }
    if (currentStep === 3) {
      if (!appointedForm.company_name.trim()) { setAppointedError("Company name is required"); return; }
      setAppointedError("");
    }
    const fields = STEP_FIELDS[currentStep];
    if (fields && fields.length > 0) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (formValues: z.infer<typeof projectSchema>) => {
    const data = {
      name: formValues.name,
      description: formValues.description,
      project_number: formValues.project_number,
      projectNumber: formValues.project_number,
      start_date: formValues.start_date || null,
      startDate: formValues.start_date || null,
      end_date: formValues.end_date || null,
      endDate: formValues.end_date || null,
      fx_rate: formValues.fx_rate,
      fxRate: formValues.fx_rate,
      retention_rate: formValues.retention_rate,
      retentionRate: formValues.retention_rate,
      vat_rate: formValues.vat_rate,
      vatRate: formValues.vat_rate,
      contract_type: formValues.contract_type,
      contractType: formValues.contract_type,
      total_budget: formValues.total_budget,
      totalBudget: formValues.total_budget,
      location: formValues.location,
      status: "Draft",
      client_details: {
        company_name: clientForm.company_name,
        company_registration: clientForm.company_registration,
        vat_number: clientForm.vat_number,
        physical_address: clientForm.physical_address,
        postal_address: clientForm.postal_address,
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
        office_number: appointedForm.office_number,
        role_as_per_appointment: appointedForm.role_as_per_appointment,
        principal: appointedForm.principal,
        technical_representative: appointedForm.technical_representative,
      },
      task_order_brief: taskOrderBrief,
      ...((project?.id || project?._id) && {
        id: project.id || project?._id,
        _id: project?._id || project?.id,
      }),
    };

    const handleSuccess = async (result: any) => {
      const projectData = result?.project || result;
      if (!projectData) { toast.error("Failed to retrieve project details after save"); return; }
      const pId = projectData._id || projectData.id;
      if (selectedFiles.length > 0 && pId) {
        try {
          await uploadAllFiles(pId);
          toast.success(project ? "Project updated with attachments!" : "Project created with attachments!");
        } catch {
          toast.error("Project saved but failed to upload attachments");
        }
      } else {
        toast.success(project ? "Project updated successfully!" : "Project created successfully!");
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const userId = userObj?.id || project?.user_id;
      if (userId) queryClient.invalidateQueries({ queryKey: [`projects/?userId=${userId}`] });
      onOpenChange(false);
      if (pId) {
        localStorage.setItem("selectedProjectId", String(pId));
        if (projectData.location) localStorage.setItem("projectLocation", projectData.location);
      }
      setSelectedFiles([]);
    };

    const handleError = (error: any) => {
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === "object" && !Array.isArray(errorData)) {
          const msgs: string[] = [];
          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) messages.forEach((m) => msgs.push(`${field}: ${m}`));
            else if (typeof messages === "string") msgs.push(`${field}: ${messages}`);
          });
          if (msgs.length > 0) { msgs.forEach((m) => toast.error(m)); return; }
        }
        if (typeof errorData === "string") { toast.error(errorData); return; }
        if (errorData.message) { toast.error(errorData.message); return; }
      }
      toast.error(`Failed to ${project ? "update" : "create"} project: ${error instanceof Error ? error.message : "Unknown error"}`);
    };

    if (project) {
      updateProject(data, { onSuccess: handleSuccess, onError: handleError });
    } else {
      createProject(data, { onSuccess: handleSuccess, onError: handleError });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const fieldCls = cn(
    "w-full h-10 px-3 rounded-lg text-sm border outline-none transition-all",
    "bg-[#f5f6f8] border-border focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] bg-white max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {project ? "Edit Project" : "Welcome! Let's set up your first project"}
          </DialogTitle>
          <DialogDescription>
            {project ? "Update the project details below." : "You need at least one project to get started."}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    currentStep > step.id ? "bg-primary text-white" :
                      currentStep === step.id ? "bg-primary text-white" :
                        "bg-muted text-muted-foreground/50",
                  )}>
                    {currentStep > step.id ? <Check className="h-3.5 w-3.5" /> : step.id}
                  </div>
                  <span className={cn("text-xs whitespace-nowrap", currentStep >= step.id ? "text-foreground" : "text-muted-foreground/50")}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-[2px] mx-1 mb-4 transition-colors", currentStep > step.id ? "bg-primary" : "bg-[#E5E7EB]")} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="px-6 pb-6">

            {/* Step 1: Project Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl><Input placeholder="My Awesome Project" {...field} onChange={handleNameChange} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="project_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Number</FormLabel>
                      <FormControl><Input placeholder="PRJ-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="Project Location (e.g. New York, NY)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* Step 2: Client Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Building2 className="w-4 h-4 text-[#6c5ce7]" />
                  <span className="text-sm font-medium text-muted-foreground">Company Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Client Name or Company *</label>
                    <input className={cn(fieldCls, clientError && "!border-red-400")} placeholder="Acme Corp" value={clientForm.company_name}
                      onChange={(e) => { setClientForm(p => ({ ...p, company_name: e.target.value })); setClientError(""); }} />
                    {clientError && <p className="text-xs text-red-500 mt-1">{clientError}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Company Registration</label>
                    <div className="relative group">
                      <input
                        className={cn(fieldCls, "pr-10")}
                        placeholder="e.g. 1970/014526/07"
                        value={clientForm.company_registration}
                        onChange={(e) =>
                          setClientForm((p) => ({
                            ...p,
                            company_registration: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleCompanyLookup("client")}
                        disabled={isLookingUp}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#6c5ce7] hover:bg-[#6c5ce7]/5 transition-all"
                        title="Auto-fill from registration"
                      >
                        {isLookingUp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6c5ce7]" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">VAT Number</label>
                    <input className={fieldCls} placeholder="VAT-001" value={clientForm.vat_number} onChange={(e) => setClientForm(p => ({ ...p, vat_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Office Number</label>
                    <input className={fieldCls} placeholder="+1 555 000 0000" value={clientForm.office_number} onChange={(e) => setClientForm(p => ({ ...p, office_number: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <StepAddressFields label="Physical Address" value={clientForm.physical_address} onChange={(v) => setClientForm(p => ({ ...p, physical_address: v }))} />
                    <StepAddressFields label="Postal Address" value={clientForm.postal_address} onChange={(v) => setClientForm(p => ({ ...p, postal_address: v }))} />
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground normal-case mb-3">Assigned Personnel</p>
                  {!showClientPersonnel ? (
                    <button
                      type="button"
                      onClick={() => setShowClientPersonnel(true)}
                      className="w-full py-4 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground hover:border-[#6c5ce7] hover:text-[#6c5ce7] hover:bg-primary/10 transition-all group">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-normal">Add Assigned Personnel</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <StepPersonnelCard label="Client" role="Super User" roleColor="#6c5ce7" value={clientForm.client} onChange={(v) => setClientForm(p => ({ ...p, client: v }))} />
                      <StepPersonnelCard label="Client Representative" role="Tech User" roleColor="#00b894" value={clientForm.client_representative} onChange={(v) => setClientForm(p => ({ ...p, client_representative: v }))} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Associated Company */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Briefcase className="w-4 h-4 text-[#f59e0b]" />
                  <span className="text-sm font-medium text-muted-foreground">Associated Company</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Company Name *</label>
                    <input className={cn(fieldCls, appointedError && "!border-red-400")} placeholder="Smith & Associates" value={appointedForm.company_name}
                      onChange={(e) => { setAppointedForm(p => ({ ...p, company_name: e.target.value })); setAppointedError(""); }} />
                    {appointedError && <p className="text-xs text-red-500 mt-1">{appointedError}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Role as per Appointment</label>
                    <input className={fieldCls} placeholder="e.g. Principal Agent, Architect" value={appointedForm.role_as_per_appointment} onChange={(e) => setAppointedForm(p => ({ ...p, role_as_per_appointment: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Company Registration</label>
                    <div className="relative group">
                      <input
                        className={cn(fieldCls, "pr-10")}
                        placeholder="e.g. 2012/123456/07"
                        value={appointedForm.company_registration}
                        onChange={(e) =>
                          setAppointedForm((p) => ({
                            ...p,
                            company_registration: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleCompanyLookup("appointed")}
                        disabled={isLookingUp}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#6c5ce7] hover:bg-[#6c5ce7]/5 transition-all"
                        title="Auto-fill from registration"
                      >
                        {isLookingUp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6c5ce7]" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">VAT Number</label>
                    <input className={fieldCls} placeholder="VAT-002" value={appointedForm.vat_number} onChange={(e) => setAppointedForm(p => ({ ...p, vat_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Office Number</label>
                    <input className={fieldCls} placeholder="+1 555 000 0001" value={appointedForm.office_number} onChange={(e) => setAppointedForm(p => ({ ...p, office_number: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <StepAddressFields label="Physical Address" value={appointedForm.physical_address} onChange={(v) => setAppointedForm(p => ({ ...p, physical_address: v }))} />
                    <StepAddressFields label="Postal Address" value={appointedForm.postal_address} onChange={(v) => setAppointedForm(p => ({ ...p, postal_address: v }))} />
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground normal-case mb-3">Assigned Personnel</p>
                  {!showAppointedPersonnel ? (
                    <button
                      type="button"
                      onClick={() => setShowAppointedPersonnel(true)}
                      className="w-full py-4 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground hover:border-[#6c5ce7] hover:text-[#6c5ce7] hover:bg-primary/10 transition-all group">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-normal">Add Assigned Personnel</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <StepPersonnelCard label="Principal Architect" role="Super User" roleColor="#6c5ce7" value={appointedForm.principal} onChange={(v) => setAppointedForm(p => ({ ...p, principal: v }))} />
                      <StepPersonnelCard label="Technical Representative" role="Tech User" roleColor="#00b894" value={appointedForm.technical_representative} onChange={(v) => setAppointedForm(p => ({ ...p, technical_representative: v }))} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Scope of Works */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <ScrollText className="w-4 h-4 text-[#6c5ce7]" />
                    <span className="text-sm font-medium text-muted-foreground">Scope of Works</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Describe the full scope of construction works. This will auto-populate into contract documents and appointment letters.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <textarea
                      className="w-full min-h-[200px] px-4 py-4 rounded-xl text-sm text-foreground outline-none transition-all bg-[#f5f6f8] border border-border focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10 resize-none leading-relaxed"
                      placeholder="Describe the project scope, deliverables, and key requirements..."
                      value={taskOrderBrief}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTaskOrderBrief(val);
                        form.setValue("description", val);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Financials & Timeline */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white" align="start">
                          <Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="end_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white" align="start">
                          <Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {getDurationLabel() && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted border border-border px-4 py-3">
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">Duration: {getDurationLabel()}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="total_budget" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field}
                          value={(field.value as any) === 0 || (field.value as any) === "" ? "" : field.value !== undefined && field.value !== null ? (field.value as any).toLocaleString() : ""}
                          onChange={(e) => { const val = e.target.value.replace(/,/g, "").replace(/R\s?/, ""); if (val === "") field.onChange(""); else if (!isNaN(Number(val))) field.onChange(Number(val)); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fx_rate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>FX Rate</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={(field.value as any) === 0 ? "" : field.value} onChange={(e) => { const val = e.target.value; field.onChange(val === "" ? "" : Number(val)); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contract_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select contract type" /></SelectTrigger></FormControl>
                        <SelectContent className="bg-white">
                          <SelectItem value="JBCC">JBCC</SelectItem>
                          <SelectItem value="NEC">NEC</SelectItem>
                          <SelectItem value="FIDIC">FIDIC</SelectItem>
                          <SelectItem value="GCC">GCC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="retention_rate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retention Rate (%)</FormLabel>
                      <FormControl>
                        <Input max={10} type="number" step="0.1" {...field} value={(field.value as any) === 0 ? "" : field.value} onChange={(e) => { const val = e.target.value; field.onChange(val === "" ? "" : Number(val)); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vat_rate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Rate (%)</FormLabel>
                      <FormControl>
                        <Input max={25} type="number" step="0.1" {...field} value={(field.value as any) === 0 ? "" : field.value} onChange={(e) => { const val = e.target.value; field.onChange(val === "" ? "" : Number(val)); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
              <Button type="button" variant="ghost" onClick={handleBack} disabled={currentStep === 1}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                {currentStep < STEPS.length ? (
                  <Button type="button" onClick={handleNext}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isPending || isUploading}
                    onClick={async () => {
                      const fields = STEP_FIELDS[currentStep];
                      if (fields && fields.length > 0) {
                        const valid = await form.trigger(fields);
                        if (!valid) return;
                      }
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    {isPending || isUploading
                      ? project ? "Updating..." : "Creating..."
                      : project ? "Update Project" : "Create Project"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
