import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateProfile } from "@/lib/Api";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { User as UserIcon, Mail, MapPin, Briefcase, Save, Loader2, LayoutDashboard, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <label className="text-[11px] font-normal text-muted-foreground tracking-wider ml-0.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm";

const AccountProfile = () => {
  const { data: user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    profile: {
      phone_number: "", bio: "", address: "", city: "", state: "",
      postal_code: "", id_number: "", professional_body: "", professional_reg_number: "",
    },
    role: "",
    insurance_document: { expiry_date: "" },
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
        role: user.role?.code?.toLowerCase() || "",
        insurance_document: { expiry_date: user.insurance_document?.expiry_date || "" },
      });

    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        ...formData,
        insurance_document: { ...formData.insurance_document, expiry_date: formData.insurance_document.expiry_date || null },
      });
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
      <form onSubmit={handleSave}>
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-normal tracking-tight text-foreground">Profile Details</h2>
            <p className="text-sm text-muted-foreground mt-1">Your personal identity, contact info, and professional credentials.</p>
          </div>
          <div className="flex items-center gap-3">

            <Button type="submit" disabled={isSaving} className="h-9 px-5 rounded-lg bg-primary text-white hover:bg-primary/90 font-normal text-sm flex items-center gap-2 shrink-0">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <SectionCard title="Personal Information" subtitle="Basic identity and contact details" icon={<UserIcon className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Full Name">
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={cn(INPUT_CLS, "font-normal")} />
            </Field>
            <Field label="Work Email Address">
              <div className="flex items-center gap-2.5 px-3 h-10 bg-slate-100/50 rounded-lg text-sm text-muted-foreground border border-border cursor-not-allowed">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user?.email}</span>
                <span className="ml-auto text-[9px] bg-slate-200 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">Verified</span>
              </div>
            </Field>
            <Field label="Phone Number">
              <Input value={formData.profile.phone_number} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, phone_number: e.target.value } })} className={INPUT_CLS} placeholder="+27 12 345 6789" />
            </Field>
            {user?.account_type === "individual" && (
              <Field label="Identity Number (ID)">
                <Input value={formData.profile.id_number} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, id_number: e.target.value } })} className={INPUT_CLS} />
              </Field>
            )}
            <Field label="Professional Biography" colSpan>
              <Textarea value={formData.profile.bio} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, bio: e.target.value } })} className={cn(INPUT_CLS, "resize-none h-24 py-3")} placeholder="Brief professional summary..." />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Professional Credentials" subtitle="Registrations, discipline, and insurance" icon={<Briefcase className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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
              <Input value={formData.profile.professional_body} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, professional_body: e.target.value } })} className={INPUT_CLS} placeholder="e.g. SACAP, ECSA, ASAQS" />
            </Field>
            <Field label="Registration No.">
              <Input value={formData.profile.professional_reg_number} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, professional_reg_number: e.target.value } })} className={INPUT_CLS} placeholder="e.g. REG-123456" />
            </Field>
            <Field label="Insurance Expiry Date">
              <Input type="date" value={formData.insurance_document.expiry_date} onChange={e => setFormData({ ...formData, insurance_document: { ...formData.insurance_document, expiry_date: e.target.value } })} className={INPUT_CLS} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Physical Address" subtitle="Registered entity or personal location" icon={<MapPin className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Street Address" colSpan>
              <Input value={formData.profile.address} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, address: e.target.value } })} className={INPUT_CLS} placeholder="Building Number, Street Name..." />
            </Field>
            <Field label="City">
              <Input value={formData.profile.city} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, city: e.target.value } })} className={INPUT_CLS} />
            </Field>
            <Field label="Province / State">
              <Input value={formData.profile.state} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, state: e.target.value } })} className={INPUT_CLS} />
            </Field>
            <Field label="Postal / ZIP Code">
              <Input value={formData.profile.postal_code} onChange={e => setFormData({ ...formData, profile: { ...formData.profile, postal_code: e.target.value } })} className={INPUT_CLS} />
            </Field>
          </div>
        </SectionCard>
      </form>
    </div>
  );
};

export default AccountProfile;
