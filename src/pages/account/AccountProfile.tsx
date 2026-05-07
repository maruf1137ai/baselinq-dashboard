import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { updateProfile, postData, patchData, getAppointedCompanies, inviteCompanyMember, removeCompanyMember, AppointedCompany } from "@/lib/Api";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { User as UserIcon, Mail, MapPin, Briefcase, Save, Loader2, LayoutDashboard, ChevronDown, Lock, Info, Eye, EyeOff, Building2, UserPlus, Trash2, X } from "lucide-react";
import { hasPermission } from "@/lib/roleUtils";
import { useRoles } from "@/hooks/useRoles";
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
  const { roles } = useRoles();
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = user?.account_type === 'organisation' || hasPermission(user?.role?.code, 'manageSettings');

  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", new_password_confirm: "" });
  const [isSavingPw, setIsSavingPw] = useState(false);

  const [companyForm, setCompanyForm] = useState({ name: "", company_reg_number: "", vat_number: "" });
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // My Company — admin member management
  const [myCompany, setMyCompany] = useState<AppointedCompany | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", position: "" });
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  const selectedProjectId = localStorage.getItem("selectedProjectId");

  useEffect(() => {
    if (user?.organization) {
      setCompanyForm({
        name: user.organization.name || "",
        company_reg_number: user.organization.company_reg_number || "",
        vat_number: user.organization.vat_number || "",
      });
    }
  }, [user?.organization]);

  useEffect(() => {
    if (!user?.id || !selectedProjectId) return;
    const fetchMyCompany = async () => {
      setIsLoadingCompany(true);
      try {
        const companies = await getAppointedCompanies(selectedProjectId);
        const mine = companies.find(c => c.admin_user_id === user.id && typeof c.id === "number");
        setMyCompany(mine ?? null);
      } catch {
        // non-critical
      } finally {
        setIsLoadingCompany(false);
      }
    };
    fetchMyCompany();
  }, [user?.id, selectedProjectId]);

  const handleInviteMember = async () => {
    if (!selectedProjectId || !myCompany || !inviteForm.email.trim()) return;
    setIsInviting(true);
    try {
      await inviteCompanyMember(selectedProjectId, myCompany.id, {
        contact_email: inviteForm.email.trim(),
        contact_name: inviteForm.name.trim(),
        position: inviteForm.position.trim(),
      });
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setInviteForm({ name: "", email: "", position: "" });
      setShowInviteForm(false);
      // Refresh
      const companies = await getAppointedCompanies(selectedProjectId);
      const mine = companies.find(c => c.admin_user_id === user?.id && typeof c.id === "number");
      setMyCompany(mine ?? null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (teamMemberId: number) => {
    if (!selectedProjectId) return;
    setRemovingMemberId(teamMemberId);
    try {
      await removeCompanyMember(selectedProjectId, teamMemberId);
      toast.success("Member removed");
      setMyCompany(prev => prev ? {
        ...prev,
        members: prev.members.filter(m => m.team_member_id !== teamMemberId),
      } : null);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };
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

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      await updateProfile({ organization: companyForm });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Company details saved");
    } catch {
      toast.error("Failed to save company details");
    } finally {
      setIsSavingCompany(false);
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

            <Button type="submit" disabled={isSaving} className="h-8 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 shrink-0">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
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

      {user?.organization && (
        <>
          {/* Company details */}
          <form onSubmit={handleSaveCompany}>
            <SectionCard title="My Company" subtitle="Your organisation's registered details" icon={<Building2 className="w-4 h-4" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Company Name" colSpan>
                  <Input value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} className={INPUT_CLS} placeholder="Company legal name" />
                </Field>
                <Field label="Registration Number">
                  <Input value={companyForm.company_reg_number} onChange={e => setCompanyForm(f => ({ ...f, company_reg_number: e.target.value }))} className={INPUT_CLS} placeholder="e.g. 2020/123456/07" />
                </Field>
                <Field label="VAT Number">
                  <Input value={companyForm.vat_number} onChange={e => setCompanyForm(f => ({ ...f, vat_number: e.target.value }))} className={INPUT_CLS} placeholder="e.g. 4123456789" />
                </Field>
              </div>
              <div className="flex justify-end mt-5">
                <Button type="submit" disabled={isSavingCompany} className="h-8 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 shrink-0">
                  {isSavingCompany ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  {isSavingCompany ? "Saving..." : "Save Company"}
                </Button>
              </div>
            </SectionCard>
          </form>

          {/* Company team members — only visible when user is admin of a company on the current project */}
          {isLoadingCompany ? null : myCompany && (
            <SectionCard
              title="Company Team"
              subtitle={`Users representing ${myCompany.company_name} on this project`}
              icon={<UserPlus className="w-4 h-4" />}
            >
              {/* Member list */}
              <div className="space-y-2 mb-4">
                {myCompany.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No members yet — invite your team below.</p>
                ) : (
                  myCompany.members.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-slate-50/40">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-medium shrink-0">
                          {(m.name || m.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{m.name || m.email}</p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.status && m.status !== "Joined" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-slate-100 text-muted-foreground">
                            {m.status}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{m.role}</span>
                        {m.team_member_id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.team_member_id!)}
                            disabled={removingMemberId === m.team_member_id}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10 disabled:opacity-40"
                            title="Remove member"
                          >
                            {removingMemberId === m.team_member_id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Invite form */}
              {showInviteForm ? (
                <div className="border border-border rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-foreground">Invite a team member</p>
                    <button type="button" onClick={() => setShowInviteForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground tracking-wider">Full Name</label>
                      <Input
                        className={INPUT_CLS}
                        placeholder="Jane Smith"
                        value={inviteForm.name}
                        onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground tracking-wider">Email Address <span className="text-destructive">*</span></label>
                      <Input
                        className={INPUT_CLS}
                        type="email"
                        placeholder="jane@company.com"
                        value={inviteForm.email}
                        onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground tracking-wider">Position / Role</label>
                      <Select
                        value={inviteForm.position}
                        onValueChange={val => setInviteForm(f => ({ ...f, position: val }))}
                      >
                        <SelectTrigger className={INPUT_CLS}>
                          <SelectValue placeholder="Select a role…" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(r => (
                            <SelectItem key={r.code} value={r.code} className="text-sm">
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowInviteForm(false)} className="h-8 text-xs">
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isInviting || !inviteForm.email.trim()}
                      onClick={handleInviteMember}
                      className="h-8 text-xs bg-primary text-white hover:bg-primary/90"
                    >
                      {isInviting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</> : <><UserPlus className="w-3.5 h-3.5 mr-1.5" />Send Invite</>}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowInviteForm(true)}
                  className="w-full py-3 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite a team member
                </button>
              )}
            </SectionCard>
          )}
        </>
      )}

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
