import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateProfile } from "@/lib/Api";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Save,
  Loader2,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Shared UI Components ──────────────────────────────────────────────────────

function SectionCard({ title, subtitle, icon, children }: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode
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

// ── Main Component ─────────────────────────────────────────────────────────────

const OrganizationPage = () => {
  const { data: user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
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
        insurance_document: {
          expiry_date: user.insurance_document?.expiry_date || null,
        },
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <AwesomeLoader message="Initialising Profile Settings..." />
      </div>
    );
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const sanitizedData = {
      ...formData,
      insurance_document: {
        ...formData.insurance_document,
        expiry_date: formData.insurance_document.expiry_date || null
      }
    };

    try {
      await updateProfile(sanitizedData);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("An error occurred whilst updating your profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionStats = () => {
    const fields = [
      { key: "name", label: "Full Name", value: formData.name },
      { key: "phone", label: "Phone Number", value: formData.profile.phone_number },
      { key: "address", label: "Address", value: formData.profile.address },
      { key: "city", label: "City", value: formData.profile.city },
      { key: "body", label: "Professional Body", value: formData.profile.professional_body },
      { key: "reg_no", label: "Professional Reg No.", value: formData.profile.professional_reg_number },
    ];

    if (user?.account_type === 'organisation') {
      fields.push({ key: "org_name", label: "Company Name", value: formData.organization.name });
      fields.push({ key: "org_reg", label: "Company Reg No.", value: formData.organization.company_reg_number });
    } else {
      fields.push({ key: "id_no", label: "ID Number", value: formData.profile.id_number });
    }

    const filledCount = fields.filter(f => !!f.value).length;
    const totalCount = fields.length;
    const percentage = Math.round((filledCount / totalCount) * 100);
    const missing = fields.filter(f => !f.value).map(f => f.label);

    return { percentage, filledCount, totalCount, missing };
  };

  const stats = getCompletionStats();

  return (
    <div className="w-full bg-slate-50/30">
      <div className="max-w-5xl mx-auto p-8 pb-32">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b border-border pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-normal uppercase tracking-widest mb-3">
              <ShieldCheck className="w-3 h-3" />
              Organization Settings
            </div>
            <h1 className="text-3xl font-normal text-foreground tracking-tight">Organization</h1>
            {/* <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Consolidated view of your personal, professional, and organizational profile details captured during onboarding.
            </p> */}
          </div>
          <Button
            onClick={handleUpdate}
            disabled={isSaving}
            className="h-11 px-8 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-3 shrink-0"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span className="font-normal">{isSaving ? "Saving Changes..." : "Save Details"}</span>
          </Button>
        </div>

        {/* ── Completion Reminder Banner ── */}
        {stats.percentage < 100 && (
          <div className="mb-10 p-6 rounded-2xl bg-white border border-primary/20 shadow-sm flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-sm font-normal text-foreground">Complete your profile</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                You've completed <span className="font-normal text-primary">{stats.filledCount} of {stats.totalCount}</span> essential fields.
                Keep your profile updated to ensure compliance and smooth collaboration on projects.
              </p>
              {stats.missing.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                  {stats.missing.slice(0, 3).map(f => (
                    <span key={f} className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-[9px] text-muted-foreground border border-border">
                      Missing {f}
                    </span>
                  ))}
                  {stats.missing.length > 3 && (
                    <span className="text-[9px] text-muted-foreground self-center">+{stats.missing.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <button
                onClick={() => {
                  const firstMissing = document.querySelector(`input[value=""], select[value=""]`);
                  firstMissing?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] rounded-lg transition-all border border-primary/10"
              >
                Review Missing Fields
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-2">

          {/* ── Personal Info ── */}
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
                  onChange={e => setFormData({
                    ...formData,
                    profile: { ...formData.profile, phone_number: e.target.value }
                  })}
                  className={INPUT_CLS}
                  placeholder="+27 12 345 6789"
                />
              </Field>
              {user?.account_type === 'individual' && (
                <Field label="Identity Number (ID)">
                  <Input
                    value={formData.profile.id_number}
                    onChange={e => setFormData({
                      ...formData,
                      profile: { ...formData.profile, id_number: e.target.value }
                    })}
                    className={INPUT_CLS}
                  />
                </Field>
              )}
              <Field label="Professional Biography / Bio" colSpan>
                <Textarea
                  value={formData.profile.bio}
                  onChange={e => setFormData({
                    ...formData,
                    profile: { ...formData.profile, bio: e.target.value }
                  })}
                  className={cn(INPUT_CLS, "resize-none h-28 py-3")}
                  placeholder="Brief professional summary..."
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── Professional Info ── */}
          <SectionCard
            title="Professional Credentials"
            subtitle="Professional body registrations and discipline details"
            icon={<Briefcase className="w-5 h-5" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <Field label="Primary Discipline / Role">
                <div className="flex items-center gap-3 px-3.5 h-10 bg-slate-100/50 rounded-lg text-sm text-foreground border border-border cursor-not-allowed font-normal">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {user?.role?.name || "Architect"}
                </div>
              </Field>
              <Field label="Professional Body">
                <Input
                  value={formData.profile.professional_body}
                  onChange={e => setFormData({
                    ...formData,
                    profile: { ...formData.profile, professional_body: e.target.value }
                  })}
                  className={INPUT_CLS}
                  placeholder="e.g. SACAP, ECSA, ASAQS"
                />
              </Field>
              <Field label="Professional Registration No.">
                <Input
                  value={formData.profile.professional_reg_number}
                  onChange={e => setFormData({
                    ...formData,
                    profile: { ...formData.profile, professional_reg_number: e.target.value }
                  })}
                  className={INPUT_CLS}
                  placeholder="e.g. REG-123456"
                />
              </Field>
              <Field label="Professional Insurance Expiry">
                <Input
                  type="date"
                  value={formData.insurance_document.expiry_date}
                  onChange={e => setFormData({
                    ...formData,
                    insurance_document: { ...formData.insurance_document, expiry_date: e.target.value }
                  })}
                  className={INPUT_CLS}
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── Organisation Details ── */}
          {user?.account_type === 'organisation' && (
            <SectionCard
              title="Organization & Entity Details"
              subtitle="Corporate profile and registration information"
              icon={<Building2 className="w-5 h-5" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Field label="Company / Entity Name">
                  <Input
                    value={formData.organization.name}
                    onChange={e => setFormData({
                      ...formData,
                      organization: { ...formData.organization, name: e.target.value }
                    })}
                    className={cn(INPUT_CLS, "font-normal")}
                  />
                </Field>
                <Field label="Company Registration No.">
                  <Input
                    value={formData.organization.company_reg_number}
                    onChange={e => setFormData({
                      ...formData,
                      organization: { ...formData.organization, company_reg_number: e.target.value }
                    })}
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="VAT Registration Number">
                  <Input
                    value={formData.organization.vat_number}
                    onChange={e => setFormData({
                      ...formData,
                      organization: { ...formData.organization, vat_number: e.target.value }
                    })}
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="CK Number">
                  <Input
                    value={formData.organization.ck_number}
                    onChange={e => setFormData({
                      ...formData,
                      organization: { ...formData.organization, ck_number: e.target.value }
                    })}
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Enterprise Size">
                  <select
                    value={formData.organization.company_size}
                    onChange={e => setFormData({
                      ...formData,
                      organization: { ...formData.organization, company_size: e.target.value }
                    })}
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
          )}

          {/* ── Address ── */}
          <SectionCard
            title="Physical Address"
            subtitle="Registered entity or personal physical location"
            icon={<MapPin className="w-5 h-5" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <Field label="Street Address" colSpan>
                <Input
                  value={formData.profile.address}
                  onChange={e => setFormData({
                    ...formData,
                    profile: { ...formData.profile, address: e.target.value }
                  })}
                  className={INPUT_CLS}
                  placeholder="Building Number, Street Name..."
                />
              </Field>
              <Field label="City">
                <Input
                  value={formData.profile.city}
                  onChange={e => setFormData({
                    ...formData,
                    profile: { ...formData.profile, city: e.target.value }
                  })}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Province / State">
                <Input
                  value={formData.profile.state}
                  onChange={e => setFormData({
                    ...formData,
                    profile: { ...formData.profile, state: e.target.value }
                  })}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Postal / ZIP Code">
                <Input
                  value={formData.profile.postal_code}
                  onChange={e => setFormData({
                    ...formData,
                    profile: { ...formData.profile, postal_code: e.target.value }
                  })}
                  className={INPUT_CLS}
                />
              </Field>
            </div>
          </SectionCard>
        </form>
      </div>
    </div>
  );
};

export default OrganizationPage;
