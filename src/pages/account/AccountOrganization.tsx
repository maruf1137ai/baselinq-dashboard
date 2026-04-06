import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateProfile } from "@/lib/Api";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Building2, Save, Loader2, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

function SectionCard({ title, subtitle, icon, children }: {
  title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden mb-5">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-slate-50/50">
        <div className="w-9 h-9 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-primary shrink-0">{icon}</div>
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
      <label className="text-[11px] font-normal text-muted-foreground uppercase tracking-wider ml-0.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm";

const AccountOrganization = () => {
  const { data: user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    organization: { name: "", company_reg_number: "", ck_number: "", vat_number: "", company_size: "" },
  });

  useEffect(() => {
    if (user) {
      setFormData({
        organization: {
          name: user.organization?.name || "",
          company_reg_number: user.organization?.company_reg_number || "",
          ck_number: user.organization?.ck_number || "",
          vat_number: user.organization?.vat_number || "",
          company_size: user.organization?.company_size || "",
        },
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(formData);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Saved successfully");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-24"><AwesomeLoader message="Loading..." /></div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-foreground">Organization</h2>
          <p className="text-sm text-muted-foreground mt-1">Corporate profile, registration numbers, and entity classification.</p>
        </div>
        <div className="flex items-center gap-3">
          {localStorage.getItem("selectedProjectId") && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              className="h-9 px-4 rounded-lg text-muted-foreground hover:text-foreground font-normal text-sm flex items-center gap-2 border-border shadow-none"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
          )}
          {user?.account_type === "organisation" && (
            <Button onClick={handleSave} disabled={isSaving} className="h-9 px-5 rounded-lg bg-primary text-white hover:bg-primary/90 font-normal text-sm flex items-center gap-2 shrink-0">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {user?.account_type === "organisation" ? (
        <form onSubmit={handleSave}>
          <SectionCard title="Organization & Entity Details" subtitle="Corporate profile and registration information" icon={<Building2 className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Company / Entity Name">
                <Input value={formData.organization.name} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, name: e.target.value } })} className={cn(INPUT_CLS, "font-normal")} />
              </Field>
              <Field label="Company Registration No.">
                <Input value={formData.organization.company_reg_number} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, company_reg_number: e.target.value } })} className={INPUT_CLS} />
              </Field>
              <Field label="VAT Registration Number">
                <Input value={formData.organization.vat_number} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, vat_number: e.target.value } })} className={INPUT_CLS} />
              </Field>
              <Field label="CK Number">
                <Input value={formData.organization.ck_number} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, ck_number: e.target.value } })} className={INPUT_CLS} />
              </Field>
              <Field label="Enterprise Size">
                <select value={formData.organization.company_size} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, company_size: e.target.value } })} className={cn(INPUT_CLS, "w-full outline-none px-3")}>
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
        </form>
      ) : (
        <div className="border border-border rounded-xl bg-white shadow-sm p-12 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-normal text-foreground">Organisation account required</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Organization details are only available for organisation accounts. Contact support to upgrade.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountOrganization;
