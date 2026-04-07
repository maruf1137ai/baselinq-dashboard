import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import React, { useState, useEffect } from "react";
import {
  lookupCompany,
  inviteAppointedCompany,
  getAppointedCompanies,
} from "@/lib/Api";
import {
  Building2,
  Save,
  Loader2,
  Search,
  X,
  Plus,
  Phone,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoles } from "@/hooks/useRoles";
import { hasPermission } from "@/lib/roleUtils";

// ── Constants ──────────────────────────────────────────────────────────────────

const COMPANY_TYPES = [
  "Architectural", "Structural Engineering", "Civil Engineering",
  "Mechanical Engineering", "Electrical Engineering", "Quantity Surveying",
  "Project Management", "Construction Management", "Interior Design",
  "Landscape Architecture", "Urban Planning", "Environmental Consulting",
  "Legal & Compliance", "General Contractor", "Other",
];


const INPUT_CLS =
  "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm placeholder:text-sm placeholder:text-muted-foreground";

const SELECT_CLS =
  "h-10 w-full px-3 border border-border bg-white rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-sm";

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
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

// ── Main Component ─────────────────────────────────────────────────────────────

interface AppointedInviteEntry {
  id: string;
  company_name: string;
  company_type: string;
  contact_name: string;
  email: string;
  position: string;
}

const AppointedCompanies = () => {
  const queryClient = useQueryClient();
  const updateProjectMutation = useUpdateProject();
  const { data: userInfo } = useCurrentUser();
  const { roles: appRoles } = useRoles();
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const { data: fetchedProject, isLoading } = useProject(selectedProjectId ?? undefined);
  const isClientOrContractor = ["CLIENT", "OWNER", "CONTRACTOR", "CPM", "PM"].includes(fetchedProject?.roleName?.toUpperCase() || "");

  const [appointedCompanies, setAppointedCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

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

  useEffect(() => {
    if (!fetchedProject) return;
    const ac = (fetchedProject as any).appointedCompany || (fetchedProject as any).appointed_company || {};
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
    if (!selectedProjectId) return;

    try {
      await updateProjectMutation.mutateAsync({
        id: selectedProjectId,
        appointed_company: {
          ...appointedForm,
          contact: {
            name: appointedForm.contact_name,
            email: appointedForm.contact_email
          }
        },
      } as any);
      queryClient.invalidateQueries({ queryKey: ["project", String(selectedProjectId)] });

      if (isClientOrContractor) {
        const toInvite = appointedInvites.filter((e) => e.email.trim());
        await Promise.allSettled(
          toInvite.map((entry) =>
            inviteAppointedCompany({
              project_id: selectedProjectId,
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

      toast.success("Details saved successfully");
    } catch {
      toast.error("Failed to save. Please try again.");
    }
  };

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
        <AwesomeLoader message="Fetching Appointed Companies..." />
      </div>
    );
  }

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
            <h2 className="text-2xl font-normal tracking-tight text-foreground">Appointed Companies</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the professional firms and consultants appointed to this project.
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

        {/* ── Appointed Company Section ── */}
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
                <div className="grid grid-cols-1 gap-4">
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
                {isClientOrContractor && <div className="h-px bg-border/60 my-6" />}
              </div>
            )}

            {isClientOrContractor ? (
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
      </form>
    </div>
  );
};

export default AppointedCompanies;
