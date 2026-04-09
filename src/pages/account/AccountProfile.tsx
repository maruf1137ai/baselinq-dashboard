import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateProfile, postData } from "@/lib/Api";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { User as UserIcon, Mail, MapPin, Briefcase, Save, Loader2, LayoutDashboard, ChevronDown, Lock, Info, Eye, EyeOff } from "lucide-react";
import { hasPermission } from "@/lib/roleUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const INPUT_CLS = "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm placeholder:text-sm";

const AccountProfile = () => {
  const { data: user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = user?.account_type === 'organisation' || hasPermission(user?.role?.code, 'manageSettings');

  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", new_password_confirm: "" });
  const [isSavingPw, setIsSavingPw] = useState(false);
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.new_password_confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (pwForm.new_password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsSavingPw(true);
    try {
      await postData({ url: "auth/password/change/", data: pwForm });
      toast.success("Password changed successfully");
      setPwForm({ old_password: "", new_password: "", new_password_confirm: "" });
    } catch (err: any) {
      const msg = err?.response?.data?.old_password?.[0]
        || err?.response?.data?.new_password?.[0]
        || err?.response?.data?.error
        || "Failed to change password";
      toast.error(msg);
    } finally {
      setIsSavingPw(false);
    }
  };

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
              <div className="flex items-center gap-2">
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val })}
                  disabled={!isAdmin && !!user?.role?.code}
                >
                  <SelectTrigger className={cn(INPUT_CLS, (!isAdmin && !!user?.role?.code) && "bg-slate-50 cursor-not-allowed")}>
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
                {!isAdmin && !!user?.role?.code && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Contact your administrator to change your primary role.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
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

      <form onSubmit={handleChangePassword}>
        <SectionCard title="Change Password" subtitle="Update your account password" icon={<Lock className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Current Password" colSpan>
              <div className="relative">
                <Input type={showPw.old ? "text" : "password"} value={pwForm.old_password} onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })} className={cn(INPUT_CLS, "pr-10")} placeholder="Enter current password" />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, old: !s.old }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="New Password">
              <div className="relative">
                <Input type={showPw.new ? "text" : "password"} value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} className={cn(INPUT_CLS, "pr-10")} placeholder="At least 8 characters" />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm New Password">
              <div className="relative">
                <Input type={showPw.confirm ? "text" : "password"} value={pwForm.new_password_confirm} onChange={e => setPwForm({ ...pwForm, new_password_confirm: e.target.value })} className={cn(INPUT_CLS, "pr-10")} placeholder="Repeat new password" />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          </div>
          <div className="flex justify-end mt-5">
            <Button type="submit" disabled={isSavingPw || !pwForm.old_password || !pwForm.new_password} className="gap-2 font-normal">
              {isSavingPw ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Update Password</>}
            </Button>
          </div>
        </SectionCard>
      </form>
    </div>
  );
};

export default AccountProfile;
