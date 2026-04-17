import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoles } from "@/hooks/useRoles";
import { updateProfile, getOrgMembers, orgInviteMember, orgRemoveMember, orgCancelInvitation, getPresignedUrl, uploadFileToPresignedUrl } from "@/lib/Api";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Building2, Save, Loader2, Users, UserPlus, Trash2, X, Clock, Paperclip, ShieldCheck, Lock } from "lucide-react";
import { hasPermission } from "@/lib/roleUtils";

type Member = { id: number; name: string; email: string; role: string | null; role_code: string | null };
type PendingInvite = { id: number; email: string; name: string; position: string; invited_at: string; expires_at: string };

function SectionCard({ title, subtitle, icon, children, action }: {
  title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden mb-5">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-slate-50/50">
        <div className="w-9 h-9 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-primary shrink-0">{icon}</div>
        <div className="flex-1">
          <h3 className="text-sm font-normal text-foreground tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", colSpan && "md:col-span-2")}>
      <label className="text-[11px] font-normal text-muted-foreground normal-case ml-0.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm";
const MODAL_INPUT_CLS = "w-full px-4 py-3 bg-[#f5f5f8] border border-transparent rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]/30 focus:bg-white transition-all";

const AccountOrganization = () => {
  const { data: user, isLoading } = useCurrentUser();
  const { roles } = useRoles();
  const queryClient = useQueryClient();

  const CLIENT_INVITE_CODES = ["CLIENT", "CPM", "ADMIN", "VIEWER", "LIMITED", "LIMITED_VIEWER"];
  const inviteRoles = roles.filter(r => r.code && !CLIENT_INVITE_CODES.includes(r.code));
  const [isSaving, setIsSaving] = useState(false);

  // Org details form
  const [formData, setFormData] = useState({
    organization: { name: "", company_reg_number: "", ck_number: "", vat_number: "", company_size: "" },
  });

  // Insurance certificate
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [insuranceExpiry, setInsuranceExpiry] = useState("");

  // Team state
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteRows, setInviteRows] = useState<{ id: string; name: string; email: string; position: string }[]>([{ id: crypto.randomUUID(), name: "", email: "", position: "" }]);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const isOrg = user?.account_type === "organisation";
  const canEdit = isOrg || hasPermission(user?.role?.code, "manageSettings");

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
      setInsuranceExpiry(user.insurance_document?.expiry_date || "");
    }
  }, [user]);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const data = await getOrgMembers();
      setMembers(data.members);
      setPendingInvites(data.pending_invitations);
    } catch {
      // silently fail — team section just shows empty
    } finally {
      setTeamLoading(false);
    }
  }, [isOrg]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsSaving(true);
    try {
      let insurance_s3_key: string | undefined;
      let insurance_file_name: string | undefined;
      if (insuranceFile) {
        const { upload_url, key } = await getPresignedUrl({
          filename: insuranceFile.name,
          content_type: insuranceFile.type || "application/octet-stream",
          folder: "projects/insurance",
        });
        await uploadFileToPresignedUrl(upload_url, insuranceFile, insuranceFile.type || "application/octet-stream");
        insurance_s3_key = key;
        insurance_file_name = insuranceFile.name;
      }
      await updateProfile({
        ...formData,
        insurance_document: {
          expiry_date: insuranceExpiry || null,
          ...(insurance_s3_key && { s3_key: insurance_s3_key }),
          ...(insurance_file_name && { file_name: insurance_file_name }),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setInsuranceFile(null);
      toast.success("Saved successfully");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = inviteRows.filter(r => r.email.trim());
    if (!validRows.length) return;
    setInviting(true);
    try {
      await Promise.all(validRows.map(r => orgInviteMember({ name: r.name, email: r.email, position: r.position })));
      toast.success(validRows.length === 1 ? `Invitation sent to ${validRows[0].email}` : `${validRows.length} invitations sent`);
      setInviteRows([{ id: crypto.randomUUID(), name: "", email: "", position: "" }]);
      setShowInviteForm(false);
      loadTeam();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    setRemovingId(memberId);
    try {
      await orgRemoveMember(memberId);
      toast.success("User removed from organisation.");
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to remove user.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    setCancellingId(inviteId);
    try {
      await orgCancelInvitation(inviteId);
      toast.success("Invitation cancelled.");
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to cancel invitation.");
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-24"><AwesomeLoader message="Loading..." /></div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-foreground">Organisation</h2>
          <p className="text-sm text-muted-foreground mt-1">Corporate profile, registration numbers, and entity classification.</p>
        </div>
        {canEdit ? (
          <Button onClick={handleSave} disabled={isSaving} className="h-9 px-5 rounded-lg bg-primary text-white hover:bg-primary/90 font-normal text-sm flex items-center gap-2 shrink-0">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-border text-muted-foreground text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-only access</span>
          </div>
        )}
      </div>

      <>
        {/* Org details */}
        <form onSubmit={handleSave}>
          <SectionCard title="Organisation & Entity Details" subtitle="Corporate profile and registration information" icon={<Building2 className="w-4 h-4" />}>
            {!isOrg && !user?.organization && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-border text-muted-foreground text-sm mb-4">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>You are not linked to any organisation. Contact your organisation admin for access.</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Company / Entity Name">
                <Input readOnly={!canEdit} value={formData.organization.name} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, name: e.target.value } })} className={cn(INPUT_CLS, "font-normal", !canEdit && "bg-slate-50/50 cursor-not-allowed")} />
              </Field>
              <Field label="Company Registration No.">
                <Input readOnly={!canEdit} value={formData.organization.company_reg_number} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, company_reg_number: e.target.value } })} className={cn(INPUT_CLS, !canEdit && "bg-slate-50/50 cursor-not-allowed")} />
              </Field>
              <Field label="VAT Registration Number">
                <Input readOnly={!canEdit} value={formData.organization.vat_number} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, vat_number: e.target.value } })} className={cn(INPUT_CLS, !canEdit && "bg-slate-50/50 cursor-not-allowed")} />
              </Field>
              <Field label="CK Number">
                <Input readOnly={!canEdit} value={formData.organization.ck_number} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, ck_number: e.target.value } })} className={cn(INPUT_CLS, !canEdit && "bg-slate-50/50 cursor-not-allowed")} />
              </Field>
              <Field label="Enterprise Size">
                <select disabled={!canEdit} value={formData.organization.company_size} onChange={e => setFormData({ ...formData, organization: { ...formData.organization, company_size: e.target.value } })} className={cn(INPUT_CLS, "w-full outline-none px-3", !canEdit && "bg-slate-50/50 cursor-not-allowed")}>
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

        {/* Insurance Certificate */}
        <SectionCard
          title="Insurance Certificate"
          subtitle="Professional indemnity or public liability certificate"
          icon={<ShieldCheck className="w-4 h-4" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Certificate Document">
              {!insuranceFile && user?.insurance_document?.file_name && (
                <div className="flex items-center gap-2.5 px-3.5 h-10 bg-slate-50 rounded-lg border border-border text-sm text-foreground mb-2">
                  <Paperclip className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate flex-1 text-xs">{user.insurance_document.file_name}</span>
                  <span className="text-[10px] text-muted-foreground bg-slate-100 border border-border px-1.5 py-0.5 rounded shrink-0">Current</span>
                </div>
              )}
              <label className={cn(
                "flex items-center gap-2.5 px-3.5 h-10 border border-dashed rounded-lg text-sm transition-all",
                insuranceFile
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground",
                canEdit ? "cursor-pointer hover:border-primary hover:text-primary" : "cursor-not-allowed bg-slate-50/50 opacity-60"
              )}>
                <Paperclip className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1 text-xs">
                  {insuranceFile ? insuranceFile.name : user?.insurance_document?.file_name ? "Replace certificate…" : "Upload certificate…"}
                </span>
                {canEdit && insuranceFile && (
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setInsuranceFile(null); }}
                    className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {canEdit && (
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={e => setInsuranceFile(e.target.files?.[0] ?? null)}
                  />
                )}
              </label>
              <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG or PNG. Saved when you click Save Changes.</p>
            </Field>
            <Field label="Expiry Date">
              <Input
                readOnly={!canEdit}
                type="date"
                value={insuranceExpiry}
                onChange={e => setInsuranceExpiry(e.target.value)}
                className={cn(INPUT_CLS, !canEdit && "bg-slate-50/50 cursor-not-allowed")}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Team members */}
        <SectionCard
          title="Users"
          subtitle="People who have joined your organisation"
          icon={<Users className="w-4 h-4" />}
          action={canEdit && (
            <button
              type="button"
              onClick={() => setShowInviteForm(v => !v)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-normal"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite User
            </button>
          )}
        >
          {/* Invite form */}
          {showInviteForm && (
            <form onSubmit={handleInvite} className="mb-5">
              <p className="text-[13px] text-gray-500 mb-3">Invite users to your organisation.</p>
              <div className="space-y-2">
                {inviteRows.map((row) => (
                  <div key={row.id} className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/40">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Full name"
                        value={row.name}
                        onChange={e => setInviteRows(p => p.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                        className={MODAL_INPUT_CLS}
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={row.email}
                        onChange={e => setInviteRows(p => p.map(r => r.id === row.id ? { ...r, email: e.target.value } : r))}
                        className={MODAL_INPUT_CLS}
                      />
                      <select
                        value={row.position}
                        onChange={e => setInviteRows(p => p.map(r => r.id === row.id ? { ...r, position: e.target.value } : r))}
                        className={MODAL_INPUT_CLS}
                      >
                        <option value="">Position...</option>
                        {inviteRoles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                        <option value="admin">Administrator</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {inviteRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setInviteRows(p => p.filter(r => r.id !== row.id))}
                        className="mt-2.5 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setInviteRows(p => [...p, { id: crypto.randomUUID(), name: "", email: "", position: "" }])}
                className="mt-3 flex items-center gap-2 text-[13px] text-[#6c5ce7] hover:text-[#6c6de9] transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add another user
              </button>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                <Button type="submit" disabled={inviting} className="h-9 px-5 rounded-xl bg-[#6c5ce7] hover:bg-[#6c6de9] text-white text-sm font-normal flex items-center gap-2">
                  {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {inviting ? "Sending..." : "Send Invitation"}
                </Button>
                <button type="button" onClick={() => { setShowInviteForm(false); setInviteRows([{ id: crypto.randomUUID(), name: "", email: "", position: "" }]); }} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Active members */}
          {teamLoading ? (
            <div className="flex items-center justify-center py-8"><AwesomeLoader message="Loading team..." /></div>
          ) : members.length === 0 && pendingInvites.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No users yet</p>
              <p className="text-xs text-muted-foreground mt-1">Invite someone to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-normal text-primary">
                    {(member.name || member.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{member.name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  {member.role && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-slate-100 text-muted-foreground shrink-0">
                      {member.role}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                      className="shrink-0 text-muted-foreground/50 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Remove user"
                    >
                      {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ))}

              {/* Pending invitations */}
              {pendingInvites.length > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground normal-case pt-3 pb-1 px-1">Pending Invitations</p>
                  {pendingInvites.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-slate-50/50">
                      <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{inv.name || inv.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{inv.email}{inv.position ? ` · ${inv.position}` : ""}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-600 shrink-0">
                        Pending
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id)}
                          disabled={cancellingId === inv.id}
                          className="shrink-0 text-muted-foreground/50 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Cancel invitation"
                        >
                          {cancellingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </SectionCard>
      </>
    </div>
  );
};

export default AccountOrganization;
