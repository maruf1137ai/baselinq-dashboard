import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useFetch from "@/hooks/useFetch";
import { updateProfile } from "@/lib/Api";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Save,
  Loader2,
  FolderOpen,
  ChevronRight,
  Plus,
  Check,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Reuse same shared UI as Organization.tsx ────────────────────────────────

function SectionCard({ title, subtitle, icon, children }: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden mb-6">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-border bg-slate-50/50">
        <div className="w-10 h-10 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-normal text-foreground tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", colSpan && "md:col-span-2")}>
      <label className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider ml-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS = "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm";

// ── Tab type ────────────────────────────────────────────────────────────────

type Tab = "project" | "profile" | "organization";

// ── Main Component ──────────────────────────────────────────────────────────

const OnboardingDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { fetchUserRole } = useUserRoleStore();
  const { data: projectsData, isLoading: projectsLoading } = useFetch(
    user?.id ? `projects/?userId=${user.id}` : "",
    { enabled: !!user?.id }
  );

  const projects: any[] = projectsData?.results || projectsData || [];

  const [activeTab, setActiveTab] = useState<Tab>("project");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    profile: {
      phone_number: "",
      bio: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      id_number: "",
      professional_body: "",
      professional_reg_number: "",
    },
    organization: {
      name: "",
      company_reg_number: "",
      ck_number: "",
      vat_number: "",
      company_size: "",
    },
    role: "",
    insurance_document: {
      expiry_date: "",
    },
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        profile: {
          phone_number: user.profile?.phone_number || "",
          bio: user.profile?.bio || "",
          address: user.profile?.address || "",
          city: user.profile?.city || "",
          state: user.profile?.state || "",
          postal_code: user.profile?.postal_code || "",
          id_number: user.profile?.id_number || "",
          professional_body: user.profile?.professional_body || "",
          professional_reg_number: user.profile?.professional_reg_number || "",
        },
        organization: {
          name: user.organization?.name || "",
          company_reg_number: user.organization?.company_reg_number || "",
          ck_number: user.organization?.ck_number || "",
          vat_number: user.organization?.vat_number || "",
          company_size: user.organization?.company_size || "",
        },
        role: user.role?.code?.toLowerCase() || "",
        insurance_document: {
          expiry_date: user.insurance_document?.expiry_date || "",
        },
      });
    }
  }, [user]);

  const handleSelectProject = async (project: any) => {
    const pId = String(project._id || project.id);
    localStorage.setItem("selectedProjectId", pId);
    localStorage.setItem("projectLocation", project.location || "");
    if (user?.id) await fetchUserRole(pId, user.id);
    window.dispatchEvent(new Event("project-change"));
    navigate("/");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        ...formData,
        insurance_document: {
          ...formData.insurance_document,
          expiry_date: formData.insurance_document.expiry_date || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Saved successfully");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <AwesomeLoader message="Loading your workspace..." />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "project", label: "Select Project", icon: <FolderOpen className="w-4 h-4" /> },
    { key: "profile", label: "Profile Details", icon: <UserIcon className="w-4 h-4" /> },
    { key: "organization", label: "Organization", icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50/30">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-normal text-foreground tracking-tight">
            Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Select a project to get started or update your details below.</p>
        </div>
        {activeTab === "project" && (
          <Button
            onClick={() => navigate("/create-project")}
            className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all flex items-center gap-2 font-normal text-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        )}
        {(activeTab === "profile" || activeTab === "organization") && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all flex items-center gap-2 font-normal text-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Details"}
          </Button>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Tab nav ── */}
        <div className="flex items-center gap-1 border-b border-border mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 text-sm border-b-2 transition-all",
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── SELECT PROJECT tab ── */}
        {activeTab === "project" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-normal tracking-tight text-foreground">Your Projects</h2>
              <p className="text-sm text-muted-foreground mt-1">Select a project to enter your workspace.</p>
            </div>

            {projectsLoading ? (
              <div className="flex items-center justify-center py-20">
                <AwesomeLoader message="Loading projects..." />
              </div>
            ) : projects.length === 0 ? (
              <div className="border border-border rounded-xl bg-white shadow-sm p-12 text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 bg-[#f0edff] rounded-2xl flex items-center justify-center">
                  <FolderOpen className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-normal text-foreground">No projects yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Create your first project to start managing tasks, documents, and your team.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/create-project")}
                  className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 font-normal text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create your first project
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((project: any) => {
                  const pId = String(project._id || project.id);
                  const isActive = localStorage.getItem("selectedProjectId") === pId;
                  const isDraft = project.status === "Draft" || project.status === "draft";
                  return (
                    <button
                      key={pId}
                      onClick={() => handleSelectProject(project)}
                      className={cn(
                        "group text-left border rounded-xl bg-white shadow-sm px-5 py-5 hover:border-primary/40 hover:shadow-md transition-all duration-200",
                        isActive ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#f0edff] flex items-center justify-center shrink-0 mt-0.5">
                            <FolderOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-normal text-foreground truncate">{project.name || "Untitled Project"}</p>
                            {project.location && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {project.location}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {isDraft ? (
                                <span className="text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Draft</span>
                              ) : (
                                <span className="text-[9px] font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Active</span>
                              )}
                              {isActive && (
                                <span className="text-[9px] font-normal text-primary bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Current</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all",
                          isActive ? "bg-primary text-white" : "bg-slate-100 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          {isActive ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE tab ── */}
        {activeTab === "profile" && (
          <form onSubmit={handleSave} className="space-y-2">
            <SectionCard
              title="Personal Information"
              subtitle="Your basic account identity and contact details"
              icon={<UserIcon className="w-5 h-5" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Field label="Full Name">
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={cn(INPUT_CLS, "font-normal")}
                  />
                </Field>
                <Field label="Work Email Address">
                  <div className="flex items-center gap-3 px-3.5 h-10 bg-slate-100/50 rounded-lg text-sm text-muted-foreground border border-border cursor-not-allowed">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                    <span className="ml-auto text-[10px] bg-slate-200 px-1.5 py-0.5 rounded uppercase font-normal tracking-tighter">Verified</span>
                  </div>
                </Field>
                <Field label="Phone Number">
                  <Input
                    value={formData.profile.phone_number}
                    onChange={e => setFormData({ ...formData, profile: { ...formData.profile, phone_number: e.target.value } })}
                    className={INPUT_CLS}
                    placeholder="+27 12 345 6789"
                  />
                </Field>
                {user?.account_type === "individual" && (
                  <Field label="Identity Number (ID)">
                    <Input
                      value={formData.profile.id_number}
                      onChange={e => setFormData({ ...formData, profile: { ...formData.profile, id_number: e.target.value } })}
                      className={INPUT_CLS}
                    />
                  </Field>
                )}
                <Field label="Professional Biography / Bio" colSpan>
                  <Textarea
                    value={formData.profile.bio}
                    onChange={e => setFormData({ ...formData, profile: { ...formData.profile, bio: e.target.value } })}
                    className={cn(INPUT_CLS, "resize-none h-28 py-3")}
                    placeholder="Brief professional summary..."
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              title="Professional Credentials"
              subtitle="Professional body registrations and discipline details"
              icon={<Briefcase className="w-5 h-5" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Field label="Primary Discipline / Role">
                  <Select
                    value={formData.role}
                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                  >
                    <SelectTrigger className={INPUT_CLS}>
                      <SelectValue placeholder="Select Discipline..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="architect">Architect</SelectItem>
                      <SelectItem value="client">Client / Owner</SelectItem>
                      <SelectItem value="cpm">Client Project Manager</SelectItem>
                      <SelectItem value="cqs">Consultant Quantity Surveyor (CQS)</SelectItem>
                      <SelectItem value="contracts_mgr">Contracts Manager</SelectItem>
                      <SelectItem value="cons_planner">Consultant Planning Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Professional Body">
                  <Input
                    value={formData.profile.professional_body}
                    onChange={e => setFormData({ ...formData, profile: { ...formData.profile, professional_body: e.target.value } })}
                    className={INPUT_CLS}
                    placeholder="e.g. SACAP, ECSA, ASAQS"
                  />
                </Field>
                <Field label="Professional Registration No.">
                  <Input
                    value={formData.profile.professional_reg_number}
                    onChange={e => setFormData({ ...formData, profile: { ...formData.profile, professional_reg_number: e.target.value } })}
                    className={INPUT_CLS}
                    placeholder="e.g. REG-123456"
                  />
                </Field>
                <Field label="Professional Insurance Expiry">
                  <Input
                    type="date"
                    value={formData.insurance_document.expiry_date}
                    onChange={e => setFormData({ ...formData, insurance_document: { ...formData.insurance_document, expiry_date: e.target.value } })}
                    className={INPUT_CLS}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              title="Physical Address"
              subtitle="Registered entity or personal physical location"
              icon={<MapPin className="w-5 h-5" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Field label="Street Address" colSpan>
                  <Input
                    value={formData.profile.address}
                    onChange={e => setFormData({ ...formData, profile: { ...formData.profile, address: e.target.value } })}
                    className={INPUT_CLS}
                    placeholder="Building Number, Street Name..."
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={formData.profile.city}
                    onChange={e => setFormData({ ...formData, profile: { ...formData.profile, city: e.target.value } })}
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Province / State">
                  <Input
                    value={formData.profile.state}
                    onChange={e => setFormData({ ...formData, profile: { ...formData.profile, state: e.target.value } })}
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Postal / ZIP Code">
                  <Input
                    value={formData.profile.postal_code}
                    onChange={e => setFormData({ ...formData, profile: { ...formData.profile, postal_code: e.target.value } })}
                    className={INPUT_CLS}
                  />
                </Field>
              </div>
            </SectionCard>
          </form>
        )}

        {/* ── ORGANIZATION tab ── */}
        {activeTab === "organization" && (
          <form onSubmit={handleSave} className="space-y-2">
            {user?.account_type === "organisation" ? (
              <SectionCard
                title="Organization & Entity Details"
                subtitle="Corporate profile and registration information"
                icon={<Building2 className="w-5 h-5" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <Field label="Company / Entity Name">
                    <Input
                      value={formData.organization.name}
                      onChange={e => setFormData({ ...formData, organization: { ...formData.organization, name: e.target.value } })}
                      className={cn(INPUT_CLS, "font-normal")}
                    />
                  </Field>
                  <Field label="Company Registration No.">
                    <Input
                      value={formData.organization.company_reg_number}
                      onChange={e => setFormData({ ...formData, organization: { ...formData.organization, company_reg_number: e.target.value } })}
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="VAT Registration Number">
                    <Input
                      value={formData.organization.vat_number}
                      onChange={e => setFormData({ ...formData, organization: { ...formData.organization, vat_number: e.target.value } })}
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="CK Number">
                    <Input
                      value={formData.organization.ck_number}
                      onChange={e => setFormData({ ...formData, organization: { ...formData.organization, ck_number: e.target.value } })}
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Enterprise Size">
                    <select
                      value={formData.organization.company_size}
                      onChange={e => setFormData({ ...formData, organization: { ...formData.organization, company_size: e.target.value } })}
                      className={cn(INPUT_CLS, "w-full outline-none px-3")}
                    >
                      <option value="">Select Scale...</option>
                      <option value="1-10">Micro (1–10 people)</option>
                      <option value="11-50">Small (11–50 people)</option>
                      <option value="51-200">Medium (51–200 people)</option>
                      <option value="201-500">Large (201–500 people)</option>
                      <option value="500+">Enterprise (500+ people)</option>
                    </select>
                  </Field>
                </div>
              </SectionCard>
            ) : (
              <div className="border border-border rounded-xl bg-white shadow-sm p-10 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Organization details are only available for organisation accounts.
                </p>
              </div>
            )}
          </form>
        )}

      </div>
    </div>
  );
};

export default OnboardingDashboard;
