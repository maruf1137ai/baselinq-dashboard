import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDate } from "@/lib/utils";
import { useProjects, useProject, useUpdateProject } from "@/hooks/useProjects";
import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  deleteProjectDocument,
  lookupCompany,
  inviteAppointedCompany,
  getAppointedCompanies,
  ProjectDocument,
} from "@/lib/Api";
import { FilePreviewModal } from "@/components/TaskComponents/FilePreviewModal";
import {
  FileText,
  Trash2,
  TriangleAlert,
  ShieldCheck,
  Building2,
  ClipboardList,
  FolderOpen,
  Save,
  Loader2,
  Calendar as CalendarIcon,
  Search,
  X,
  Plus,
  Phone,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoles } from "@/hooks/useRoles";
import { hasPermission } from "@/lib/roleUtils";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONTRACT_TYPES = ["JBCC", "NEC", "FIDIC", "GCC"];
const CURRENCIES = ["ZAR", "USD", "EUR", "GBP"];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  badge,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden mb-5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50/50">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-9 h-9 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-primary shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-normal text-foreground tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <span className="text-[10px] font-normal text-muted-foreground bg-white border border-border px-2.5 py-1 rounded-full uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  colSpan,
}: {
  label: string;
  children: React.ReactNode;
  colSpan?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", colSpan && "md:col-span-2")}>
      <label className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider ml-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function PersonnelCard({
  label,
  role,
  personnel,
}: {
  label: string;
  role: string;
  personnel?: { name?: string; email?: string; phone?: string };
}) {
  const name = personnel?.name || "";
  const email = personnel?.email || "";
  const phone = personnel?.phone || "";
  const hasData = name || email || phone;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{role}</span>
      </div>
      {hasData ? (
        <div className="space-y-1">
          {name && <p className="text-sm text-foreground">{name}</p>}
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
          {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No personnel assigned</p>
      )}
    </div>
  );
}

const INPUT_CLS =
  "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm placeholder:text-sm placeholder:text-muted-foreground";

const SELECT_CLS =
  "h-10 w-full px-3 border border-border bg-white rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-sm";

const DATE_BTN_CLS =
  "h-10 w-full flex items-center gap-2 px-3 border border-border bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-left";

// ── Main Component ─────────────────────────────────────────────────────────────

interface AppointedInviteEntry {
  id: string;
  company_name: string;
  company_type: string;
  contact_name: string;
  email: string;
  position: string;
}

const COMPANY_TYPES = [
  "Architectural", "Structural Engineering", "Civil Engineering",
  "Mechanical Engineering", "Electrical Engineering", "Quantity Surveying",
  "Project Management", "Construction Management", "Interior Design",
  "Landscape Architecture", "Urban Planning", "Environmental Consulting",
  "Legal & Compliance", "General Contractor", "Other",
];

const CLIENT_ROLE_CODES = ["CLIENT", "OWNER", "CONTRACTOR"];

const ProjectDetails = () => {
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<ProjectDocument | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjects();
  const updateProjectMutation = useUpdateProject();
  const { data: currentUser } = useCurrentUser();
  const { roles: appRoles } = useRoles();

  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const { data: fetchedProject, isLoading } = useProject(selectedProjectId ?? undefined);

  const project = fetchedProject || projects.find((p: any) => (p._id || p.id) == selectedProjectId);
  const myRole = project?.roleName || currentUser?.role?.code || "";
  const canEditProject = hasPermission(myRole, "editProject");

  const [appointedCompanies, setAppointedCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const selectedProject = project;

  const [appointedForm, setAppointedForm] = useState({
    company_name: "",
    company_type: "",
    company_registration: "",
    vat_number: "",
    office_number: "",
    role_as_per_appointment: "",
    contact_name: "",
    contact_email: "",
    physical_address: { street: "", city: "", province: "", postal_code: "" },
    postal_address: { street: "", city: "", province: "", postal_code: "" },
  });

  const [appointedInvites, setAppointedInvites] = useState<AppointedInviteEntry[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    project_number: "",
    location: "",
    contract_type: "JBCC",
    start_date: "",
    end_date: "",
    total_budget: "",
    currency: "ZAR",
    vat_rate: "",
    retention_rate: "",
    description: "",
    task_order_brief: "",
    client_details: {
      company_name: "",
      company_registration: "",
      vat_number: "",
      office_number: "",
      physical_address: { street: "", city: "", province: "", postal_code: "" },
      postal_address: { street: "", city: "", province: "", postal_code: "" },
      banking_details: { bank_name: "", account_number: "", branch_code: "" },
    },
  });

  useEffect(() => {
    if (!selectedProject) return;
    const cd = (selectedProject as any).clientDetails || (selectedProject as any).client_details || {};
    const pa = cd.physical_address || {};
    const postal = cd.postal_address || {};
    const bank = cd.banking_details || {};
    const ac = (selectedProject as any).appointedCompany || (selectedProject as any).appointed_company || {};
    const acPa = ac.physical_address || {};
    const acPostal = ac.postal_address || {};
    setAppointedForm({
      company_name: ac.company_name || "",
      company_type: ac.company_type || "",
      company_registration: ac.company_registration || "",
      vat_number: ac.vat_number || "",
      office_number: ac.office_number || "",
      role_as_per_appointment: ac.role_as_per_appointment || "",
      contact_name: ac.contact?.name || ac.contact_name || "",
      contact_email: ac.contact?.email || ac.contact_email || "",
      physical_address: {
        street: typeof acPa === "string" ? acPa : acPa.street || "",
        city: typeof acPa === "string" ? "" : acPa.city || "",
        province: typeof acPa === "string" ? "" : acPa.province || "",
        postal_code: typeof acPa === "string" ? "" : acPa.postal_code || "",
      },
      postal_address: {
        street: typeof acPostal === "string" ? acPostal : acPostal.street || "",
        city: typeof acPostal === "string" ? "" : acPostal.city || "",
        province: typeof acPostal === "string" ? "" : acPostal.province || "",
        postal_code: typeof acPostal === "string" ? "" : acPostal.postal_code || "",
      },
    });

    setFormData({
      name: selectedProject.name || "",
      project_number:
        (selectedProject as any).projectNumber || (selectedProject as any).project_number || "",
      location: (selectedProject as any).location || "",
      contract_type:
        (selectedProject as any).contractType || (selectedProject as any).contract_type || "JBCC",
      start_date: (selectedProject as any).startDate || (selectedProject as any).start_date || "",
      end_date: (selectedProject as any).endDate || (selectedProject as any).end_date || "",
      total_budget: String(
        (selectedProject as any).totalBudget ?? (selectedProject as any).total_budget ?? ""
      ),
      currency: (selectedProject as any).currency || "ZAR",
      vat_rate: String(
        (selectedProject as any).vatRate ?? (selectedProject as any).vat_rate ?? ""
      ),
      retention_rate: String(
        (selectedProject as any).retentionRate ?? (selectedProject as any).retention_rate ?? ""
      ),
      description: (selectedProject as any).description || "",
      task_order_brief:
        (selectedProject as any).taskOrderBrief || (selectedProject as any).task_order_brief || "",
      client_details: {
        company_name: cd.company_name || "",
        company_registration: cd.company_registration || "",
        vat_number: cd.vat_number || "",
        office_number: cd.office_number || "",
        physical_address: {
          street: typeof pa === "string" ? pa : pa.street || "",
          city: typeof pa === "string" ? "" : pa.city || "",
          province: typeof pa === "string" ? "" : pa.province || "",
          postal_code: typeof pa === "string" ? "" : pa.postal_code || "",
        },
        postal_address: {
          street: typeof postal === "string" ? postal : postal.street || "",
          city: typeof postal === "string" ? "" : postal.city || "",
          province: typeof postal === "string" ? "" : postal.province || "",
          postal_code: typeof postal === "string" ? "" : postal.postal_code || "",
        },
        banking_details: {
          bank_name: typeof bank === "string" ? bank : bank.bank_name || "",
          account_number: typeof bank === "string" ? "" : bank.account_number || "",
          branch_code: typeof bank === "string" ? "" : bank.branch_code || "",
        },
      },
    });
  }, [fetchedProject]);

  const fetchCompanies = async () => {
    if (!selectedProjectId) return;
    setIsLoadingCompanies(true);
    try {
      const data = await getAppointedCompanies(selectedProjectId);
      setAppointedCompanies(data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [selectedProjectId]);

  const handleCompanyLookup = async () => {
    const reg = appointedForm.company_registration.trim();
    if (!reg) { toast.error("Enter a registration number to look up."); return; }
    setIsLookingUp(true);
    try {
      const data = await lookupCompany(reg);
      if (data) {
        setAppointedForm((prev) => ({
          ...prev,
          company_name: data.company_name || prev.company_name,
          vat_number: data.vat_number || prev.vat_number,
          office_number: data.office_number || prev.office_number,
          physical_address: data.physical_address
            ? { ...prev.physical_address, ...data.physical_address }
            : prev.physical_address,
        }));
        toast.success("Company details retrieved successfully!");
      }
    } catch {
      toast.error("Company not found. Please enter details manually.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const pId = (selectedProject as any)?._id || (selectedProject as any)?.id;
    if (!pId) return;

    try {
      await updateProjectMutation.mutateAsync({
        id: pId,
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        total_budget: formData.total_budget ? Number(formData.total_budget) : undefined,
        vat_rate: formData.vat_rate ? Number(formData.vat_rate) : undefined,
        retention_rate: formData.retention_rate ? Number(formData.retention_rate) : undefined,
        appointed_company: {
          ...appointedForm,
          contact: {
            name: appointedForm.contact_name,
            email: appointedForm.contact_email
          }
        },
      } as any);
      queryClient.invalidateQueries({ queryKey: ["project", String(selectedProjectId)] });

      if (canEditProject) {
        const toInvite = appointedInvites.filter((e) => e.email.trim());
        await Promise.allSettled(
          toInvite.map((entry) =>
            inviteAppointedCompany({
              project_id: pId,
              company_name: entry.company_name,
              contact_name: entry.contact_name,
              contact_email: entry.email,
              position: entry.position,
            })
          )
        );
        if (toInvite.length > 0) {
          toast.success("Invitation(s) sent to appointed companies");
          setAppointedInvites([]);
          fetchCompanies();
        }
      }

      toast.success("Project saved successfully");
    } catch {
      toast.error("Failed to save. Please try again.");
    }
  };

  const setField = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const setClientField = (key: string, value: string) =>
    setFormData((prev) => ({
      ...prev,
      client_details: { ...prev.client_details, [key]: value },
    }));

  const setAddressField = (
    type: "physical_address" | "postal_address",
    key: string,
    value: string
  ) =>
    setFormData((prev) => ({
      ...prev,
      client_details: {
        ...prev.client_details,
        [type]: { ...prev.client_details[type], [key]: value },
      },
    }));

  const setBankingField = (key: string, value: string) =>
    setFormData((prev) => ({
      ...prev,
      client_details: {
        ...prev.client_details,
        banking_details: { ...prev.client_details.banking_details, [key]: value },
      },
    }));

  const setAppointedField = (key: string, value: string) =>
    setAppointedForm((prev) => ({ ...prev, [key]: value }));

  const setAppointedAddressField = (
    type: "physical_address" | "postal_address",
    key: string,
    value: string
  ) =>
    setAppointedForm((prev) => ({
      ...prev,
      [type]: { ...prev[type], [key]: value },
    }));

  const updateInvite = (id: string, patch: Partial<AppointedInviteEntry>) =>
    setAppointedInvites((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <AwesomeLoader message="Fetching Project Details..." />
      </div>
    );
  }

  // ── Document helpers ────────────────────────────────────────────────────────
  const documents: ProjectDocument[] = (selectedProject as any)?.documents || [];
  const getDocName = (doc: ProjectDocument) =>
    doc.file_name || doc.fileName || doc.name || "Unknown";
  const getDocUrl = (doc: ProjectDocument) =>
    (doc as any).streamUrl || (doc as any).stream_url || doc.file_url || doc.fileUrl || "";
  const getDocDate = (doc: ProjectDocument) => doc.uploaded_at || doc.uploadedAt;
  const getDocId = (doc: ProjectDocument) => doc.id || doc._id;

  const handleDeleteDocument = (e: React.MouseEvent, doc: ProjectDocument) => {
    e.stopPropagation();
    setDocToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const pId = (selectedProject as any)?._id || (selectedProject as any)?.id;
    const docId = docToDelete ? getDocId(docToDelete) : null;
    if (!pId || !docId) return;

    setIsDeleting(true);
    try {
      await deleteProjectDocument(pId, docId);
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (key) => typeof key === "string" && key.startsWith("projects")
          ) ||
          query.queryKey[0] === "projects" ||
          query.queryKey[0] === "project",
      });
      toast.success("Document deleted successfully");
      setShowDeleteConfirm(false);
      setDocToDelete(null);
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const clientDetails =
    (selectedProject as any)?.clientDetails || (selectedProject as any)?.client_details;
  const isSaving = updateProjectMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <form onSubmit={handleSave}>
        {/* ── Page Header ── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-normal uppercase tracking-widest mb-3">
              <ShieldCheck className="w-3 h-3" />
              Project Settings
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-foreground">Project Details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure basic project info, financials and legal framework.
            </p>
          </div>
          <Button
            type="submit"
            disabled={isSaving}
            className="h-9 px-5 rounded-lg bg-primary text-white hover:bg-primary/90 font-normal text-sm flex items-center gap-2 shrink-0 mt-10"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save Details"}
          </Button>
        </div>

        {/* ── Project Information ── */}
        <SectionCard
          title="Project Information"
          subtitle="Core details, dates, and financials"
          icon={<FileText className="w-4 h-4" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Project Name">
              <Input
                value={formData.name}
                onChange={(e) => setField("name", e.target.value)}
                className={INPUT_CLS}
                placeholder="e.g. Sandton Office Development"
              />
            </Field>
            <Field label="Project Code / Number">
              <Input
                value={formData.project_number}
                onChange={(e) => setField("project_number", e.target.value)}
                className={INPUT_CLS}
                placeholder="e.g. PRJ-2024-001"
              />
            </Field>
            <Field label="Location">
              <Input
                value={formData.location}
                onChange={(e) => setField("location", e.target.value)}
                className={INPUT_CLS}
                placeholder="e.g. Sandton, Gauteng"
              />
            </Field>
            <Field label="Contract Type">
              <select
                value={formData.contract_type}
                onChange={(e) => setField("contract_type", e.target.value)}
                className={SELECT_CLS}
              >
                {CONTRACT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start Date">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(DATE_BTN_CLS, !formData.start_date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    {formData.start_date
                      ? format(parseISO(formData.start_date), "PPP")
                      : "Pick a date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? parseISO(formData.start_date) : undefined}
                    onSelect={(date) =>
                      setField("start_date", date ? format(date, "yyyy-MM-dd") : "")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field label="End Date">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(DATE_BTN_CLS, !formData.end_date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    {formData.end_date
                      ? format(parseISO(formData.end_date), "PPP")
                      : "Pick a date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date ? parseISO(formData.end_date) : undefined}
                    onSelect={(date) =>
                      setField("end_date", date ? format(date, "yyyy-MM-dd") : "")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field label="Total Budget">
              <Input
                type="number"
                value={formData.total_budget}
                onChange={(e) => setField("total_budget", e.target.value)}
                className={INPUT_CLS}
                placeholder="e.g. 5000000"
              />
            </Field>
            <Field label="Currency">
              <select
                value={formData.currency}
                onChange={(e) => setField("currency", e.target.value)}
                className={SELECT_CLS}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="VAT Rate (%)">
              <Input
                type="number"
                value={formData.vat_rate}
                onChange={(e) => setField("vat_rate", e.target.value)}
                className={INPUT_CLS}
                placeholder="e.g. 15"
              />
            </Field>
            <Field label="Retention Rate (%)">
              <Input
                type="number"
                value={formData.retention_rate}
                onChange={(e) => setField("retention_rate", e.target.value)}
                className={INPUT_CLS}
                placeholder="e.g. 5"
              />
            </Field>
            <Field label="Description" colSpan>
              <Textarea
                value={formData.description}
                onChange={(e) => setField("description", e.target.value)}
                className={cn(INPUT_CLS, "resize-none h-24 py-3")}
                placeholder="Brief project description..."
              />
            </Field>
          </div>
        </SectionCard>

        {/* ── Client Details ── */}
        <SectionCard
          title="Client Details"
          subtitle="Company information and contacts"
          badge="Contracts & Invoicing"
          icon={<Building2 className="w-4 h-4" />}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Client Name or Company">
                <Input
                  value={formData.client_details.company_name}
                  onChange={(e) => setClientField("company_name", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="e.g. Acme Holdings (Pty) Ltd"
                />
              </Field>
              <Field label="Company Registration / ID">
                <Input
                  value={formData.client_details.company_registration}
                  onChange={(e) => setClientField("company_registration", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="e.g. 2005/123456/07"
                />
              </Field>
              <Field label="VAT Number">
                <Input
                  value={formData.client_details.vat_number}
                  onChange={(e) => setClientField("vat_number", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="e.g. 4570123456"
                />
              </Field>
              <Field label="Office Number">
                <Input
                  value={formData.client_details.office_number}
                  onChange={(e) => setClientField("office_number", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="+27 11 123 4567"
                />
              </Field>
            </div>

            {/* Physical Address */}
            <div>
              <p className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider mb-3">
                Physical Address
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Street" colSpan>
                  <Input
                    value={formData.client_details.physical_address.street}
                    onChange={(e) =>
                      setAddressField("physical_address", "street", e.target.value)
                    }
                    className={INPUT_CLS}
                    placeholder="Building No., Street Name"
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={formData.client_details.physical_address.city}
                    onChange={(e) =>
                      setAddressField("physical_address", "city", e.target.value)
                    }
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Province">
                  <Input
                    value={formData.client_details.physical_address.province}
                    onChange={(e) =>
                      setAddressField("physical_address", "province", e.target.value)
                    }
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Postal Code">
                  <Input
                    value={formData.client_details.physical_address.postal_code}
                    onChange={(e) =>
                      setAddressField("physical_address", "postal_code", e.target.value)
                    }
                    className={INPUT_CLS}
                  />
                </Field>
              </div>
            </div>

            {/* Postal Address */}
            <div>
              <p className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider mb-3">
                Postal Address
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Street" colSpan>
                  <Input
                    value={formData.client_details.postal_address.street}
                    onChange={(e) =>
                      setAddressField("postal_address", "street", e.target.value)
                    }
                    className={INPUT_CLS}
                    placeholder="Building No., Street Name"
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={formData.client_details.postal_address.city}
                    onChange={(e) =>
                      setAddressField("postal_address", "city", e.target.value)
                    }
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Province">
                  <Input
                    value={formData.client_details.postal_address.province}
                    onChange={(e) =>
                      setAddressField("postal_address", "province", e.target.value)
                    }
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Postal Code">
                  <Input
                    value={formData.client_details.postal_address.postal_code}
                    onChange={(e) =>
                      setAddressField("postal_address", "postal_code", e.target.value)
                    }
                    className={INPUT_CLS}
                  />
                </Field>
              </div>
            </div>

            {/* Banking Details */}
            <div>
              <p className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider mb-3">
                Banking Details
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Bank Name">
                  <Input
                    value={formData.client_details.banking_details.bank_name}
                    onChange={(e) => setBankingField("bank_name", e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. First National Bank"
                  />
                </Field>
                <Field label="Account Number">
                  <Input
                    value={formData.client_details.banking_details.account_number}
                    onChange={(e) => setBankingField("account_number", e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. 62012345678"
                  />
                </Field>
                <Field label="Branch Code">
                  <Input
                    value={formData.client_details.banking_details.branch_code}
                    onChange={(e) => setBankingField("branch_code", e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. 250655"
                  />
                </Field>
              </div>
            </div>

            {/* Assigned Personnel (read-only) */}
            {clientDetails && (clientDetails.client || clientDetails.client_representative) && (
              <div>
                <p className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider mb-3">
                  Assigned Personnel
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <PersonnelCard
                    label="Client"
                    role="Super User"
                    personnel={clientDetails.client}
                  />
                  <PersonnelCard
                    label="Client Representative"
                    role="Tech User"
                    personnel={clientDetails.client_representative}
                  />
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Appointed Company ── */}
        <SectionCard
          title="Appointed Company"
          subtitle="Professional firm appointed to this project"
          icon={<UserIcon className="w-4 h-4" />}
        >
          <div className="space-y-8">
            {/* 1. Show already appointed/invited companies */}
            {appointedCompanies.length > 0 && (
              <div className="space-y-4">
                <p className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider">
                  Participating Companies
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointedCompanies.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50/30 hover:bg-white hover:shadow-sm transition-all"
                    >
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center text-primary shadow-sm">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-normal text-foreground">
                            {comp.company_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-tighter mt-0.5">
                            {comp.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full border",
                            comp.status === "Joined"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : comp.status === "Expired"
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                          )}
                        >
                          {comp.status}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-1.5 font-normal">
                          {comp.contact_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {canEditProject && <div className="h-px bg-border/60 my-6" />}
              </div>
            )}

            {canEditProject ? (
              /* CLIENT / CONTRACTOR: invite form */
              <div className="space-y-4">
                {appointedInvites.length > 0 && (
                  <p className="text-xs text-muted-foreground -mt-1">
                    Invite the professional firms appointed to this project. They'll receive an email to fill in their company details.
                  </p>
                )}
                {appointedInvites.map((entry) => (
                  <div key={entry.id} className="border border-border rounded-xl p-4 space-y-4 bg-slate-50/50">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setAppointedInvites((prev) => prev.filter((e) => e.id !== entry.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Company Name" colSpan>
                        <Input
                          value={entry.company_name}
                          onChange={(e) => updateInvite(entry.id, { company_name: e.target.value })}
                          className={INPUT_CLS}
                          placeholder="e.g. Base Architects and Associates"
                        />
                      </Field>
                      <Field label="Company Type">
                        <select
                          value={entry.company_type}
                          onChange={(e) => updateInvite(entry.id, { company_type: e.target.value })}
                          className={SELECT_CLS}
                        >
                          <option value="">Select type...</option>
                          {COMPANY_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Professional Role">
                        <select
                          value={entry.position}
                          onChange={(e) => updateInvite(entry.id, { position: e.target.value })}
                          className={SELECT_CLS}
                        >
                          <option value="">Select role...</option>
                          {appRoles.map((r) => (
                            <option key={r.code} value={r.code}>{r.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Contact Person Name">
                        <Input
                          value={entry.contact_name}
                          onChange={(e) => updateInvite(entry.id, { contact_name: e.target.value })}
                          className={INPUT_CLS}
                          placeholder="e.g. John Smith"
                        />
                      </Field>
                      <Field label="Email Address">
                        <Input
                          type="email"
                          value={entry.email}
                          onChange={(e) => updateInvite(entry.id, { email: e.target.value })}
                          className={INPUT_CLS}
                          placeholder="e.g. john@firm.co.za"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setAppointedInvites((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), company_name: "", company_type: "", contact_name: "", email: "", position: "" },
                    ])
                  }
                  className="w-full py-4 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  {appointedInvites.length === 0 ? "Add Appointed Company" : "Add Another Company"}
                </button>
              </div>
            ) : (
              /* Other roles: full company details form */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Company Name" colSpan>
                    <Input
                      value={appointedForm.company_name}
                      onChange={(e) => setAppointedField("company_name", e.target.value)}
                      className={INPUT_CLS}
                      placeholder="e.g. Base Architects and Associates"
                    />
                  </Field>
                  <Field label="Company Registration / ID">
                    <div className="relative">
                      <Input
                        value={appointedForm.company_registration}
                        onChange={(e) => setAppointedField("company_registration", e.target.value)}
                        className={cn(INPUT_CLS, "pr-10")}
                        placeholder="e.g. 1970/014526/07"
                      />
                      <button
                        type="button"
                        onClick={handleCompanyLookup}
                        disabled={isLookingUp}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                        title="Auto-fill from registration"
                      >
                        {isLookingUp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </Field>
                  <Field label="VAT Number">
                    <Input
                      value={appointedForm.vat_number}
                      onChange={(e) => setAppointedField("vat_number", e.target.value)}
                      className={INPUT_CLS}
                      placeholder="e.g. 4123456789"
                    />
                  </Field>
                  <Field label="Company Type">
                    <select
                      value={appointedForm.company_type}
                      onChange={(e) => setAppointedField("company_type", e.target.value)}
                      className={SELECT_CLS}
                    >
                      <option value="">Select type...</option>
                      {COMPANY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Office Number">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={appointedForm.office_number}
                        onChange={(e) => setAppointedField("office_number", e.target.value)}
                        className={cn(INPUT_CLS, "pl-9")}
                        placeholder="+27 11 123 4567"
                      />
                    </div>
                  </Field>
                  <Field label="Professional Role">
                    <select
                      value={appointedForm.role_as_per_appointment}
                      onChange={(e) => setAppointedField("role_as_per_appointment", e.target.value)}
                      className={SELECT_CLS}
                    >
                      <option value="">Select role...</option>
                      {appRoles.map((r) => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2 border-t border-border/40 pt-4 mt-2">
                    <Field label="Contact Person Name">
                      <Input
                        value={appointedForm.contact_name}
                        onChange={(e) => setAppointedField("contact_name", e.target.value)}
                        className={INPUT_CLS}
                        placeholder="e.g. John Smith"
                      />
                    </Field>
                    <Field label="Email Address">
                      <Input
                        type="email"
                        value={appointedForm.contact_email}
                        onChange={(e) => setAppointedField("contact_email", e.target.value)}
                        className={INPUT_CLS}
                        placeholder="e.g. john@firm.co.za"
                      />
                    </Field>
                  </div>
                </div>

                {/* Physical Address */}
                <div>
                  <p className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider mb-3">
                    Physical Address
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <Field label="Street" colSpan>
                      <Input
                        value={appointedForm.physical_address.street}
                        onChange={(e) => setAppointedAddressField("physical_address", "street", e.target.value)}
                        className={INPUT_CLS}
                        placeholder="Building No., Street Name"
                      />
                    </Field>
                    <Field label="City">
                      <Input
                        value={appointedForm.physical_address.city}
                        onChange={(e) => setAppointedAddressField("physical_address", "city", e.target.value)}
                        className={INPUT_CLS}
                      />
                    </Field>
                    <Field label="Province">
                      <Input
                        value={appointedForm.physical_address.province}
                        onChange={(e) => setAppointedAddressField("physical_address", "province", e.target.value)}
                        className={INPUT_CLS}
                      />
                    </Field>
                    <Field label="Postal Code">
                      <Input
                        value={appointedForm.physical_address.postal_code}
                        onChange={(e) => setAppointedAddressField("physical_address", "postal_code", e.target.value)}
                        className={INPUT_CLS}
                      />
                    </Field>
                  </div>
                </div>

                {/* Postal Address */}
                <div>
                  <p className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider mb-3">
                    Postal Address
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <Field label="Street" colSpan>
                      <Input
                        value={appointedForm.postal_address.street}
                        onChange={(e) => setAppointedAddressField("postal_address", "street", e.target.value)}
                        className={INPUT_CLS}
                        placeholder="Building No., Street Name"
                      />
                    </Field>
                    <Field label="City">
                      <Input
                        value={appointedForm.postal_address.city}
                        onChange={(e) => setAppointedAddressField("postal_address", "city", e.target.value)}
                        className={INPUT_CLS}
                      />
                    </Field>
                    <Field label="Province">
                      <Input
                        value={appointedForm.postal_address.province}
                        onChange={(e) => setAppointedAddressField("postal_address", "province", e.target.value)}
                        className={INPUT_CLS}
                      />
                    </Field>
                    <Field label="Postal Code">
                      <Input
                        value={appointedForm.postal_address.postal_code}
                        onChange={(e) => setAppointedAddressField("postal_address", "postal_code", e.target.value)}
                        className={INPUT_CLS}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Scope of Works ── */}
        <SectionCard
          title="Scope of Works"
          subtitle="Client brief and project requirements"
          icon={<ClipboardList className="w-4 h-4" />}
        >
          <Field label="Client Brief">
            <Textarea
              value={formData.task_order_brief}
              onChange={(e) => setField("task_order_brief", e.target.value)}
              className={cn(INPUT_CLS, "resize-none h-36 py-3")}
              placeholder="Describe the scope of works, client requirements, and deliverables..."
            />
          </Field>
          <p className="text-xs text-muted-foreground mt-2.5">
            This brief will auto-populate into contract documents and appointment letters.
          </p>
        </SectionCard>
      </form>

      {/* ── Documents (outside form to avoid accidental submit) ── */}
      <SectionCard
        title="Documents"
        badge={`${documents.length} file${documents.length !== 1 ? "s" : ""}`}
        icon={<FolderOpen className="w-4 h-4" />}
      >
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {documents.map((doc, i) => (
              <div
                key={getDocId(doc) || i}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted hover:bg-muted/50 cursor-pointer transition-all"
                onClick={() => setSelectedDocument(doc)}
              >
                <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center shrink-0 border border-border">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{getDocName(doc)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getDocDate(doc) ? formatDate(getDocDate(doc)) : "N/A"}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteDocument(e, doc)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Delete document"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No documents found for this project.</p>
        )}
      </SectionCard>

      <FilePreviewModal
        isOpen={!!selectedDocument}
        onOpenChange={(open) => !open && setSelectedDocument(null)}
        file={
          selectedDocument
            ? { name: getDocName(selectedDocument), url: getDocUrl(selectedDocument) }
            : null
        }
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="w-4 h-4" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-normal text-foreground">
                {docToDelete ? getDocName(docToDelete) : ""}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetails;
