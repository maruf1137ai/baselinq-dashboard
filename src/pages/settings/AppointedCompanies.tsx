import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import React, { useState, useEffect } from "react";
import {
  inviteAppointedCompany,
  getAppointedCompanies,
  removeAppointedCompany,
  getPresignedUrl,
  uploadFileToPresignedUrl,
} from "@/lib/Api";
import {
  Building2,
  Save,
  Loader2,
  X,
  Plus,
  FileText,
  Download,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ChevronDown,
  ChevronUp,
  Trash2,
  User,
} from "lucide-react";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRoles } from "@/hooks/useRoles";
import { usePermissions } from "@/hooks/usePermissions";

// ── Constants ──────────────────────────────────────────────────────────────────

const INPUT_CLS =
  "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm placeholder:text-sm placeholder:text-muted-foreground";

const SELECT_CLS =
  "h-10 w-full px-3 border border-border bg-white rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

interface AppointedInviteEntry {
  id: string;
  company_name: string;
  company_type: string;
  contact_name: string;
  email: string;
  position: string;
  insurance_file: File | null;
  insurance_expiry: string;
}


const AppointedCompanies = () => {
  const { canManageTeam } = usePermissions();
  const queryClient = useQueryClient();
  const updateProjectMutation = useUpdateProject();
  const { roles: appRoles } = useRoles();
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const { isLoading } = useProject(selectedProjectId ?? undefined);

  const [appointedCompanies, setAppointedCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const [appointedInvites, setAppointedInvites] = useState<AppointedInviteEntry[]>([]);

  // Per-company expanded members panel
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string | number>>(new Set());

  // Remove confirmation
  const [removeConfirmId, setRemoveConfirmId] = useState<string | number | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    if (selectedProjectId) fetchCompanies();
  }, [selectedProjectId]);

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

  const handleSave = async () => {
    if (!selectedProjectId || !canManageTeam) return;
    const toInvite = appointedInvites.filter((e) => e.email.trim() && e.company_name.trim());
    if (toInvite.length === 0) {
      toast.info("No new companies to invite.");
      return;
    }

    try {
      await Promise.allSettled(
        toInvite.map(async (entry) => {
          let insurance_s3_key: string | undefined;
          let insurance_file_name: string | undefined;

          if (entry.insurance_file) {
            const { upload_url, key } = await getPresignedUrl({
              filename: entry.insurance_file.name,
              content_type: entry.insurance_file.type || "application/octet-stream",
              folder: "projects/insurance",
            });
            await uploadFileToPresignedUrl(upload_url, entry.insurance_file, entry.insurance_file.type || "application/octet-stream");
            insurance_s3_key = key;
            insurance_file_name = entry.insurance_file.name;
          }

          return inviteAppointedCompany({
            project_id: selectedProjectId,
            company_name: entry.company_name,
            contact_name: entry.contact_name,
            contact_email: entry.email,
            position: entry.position || "architect",
            insurance_s3_key,
            insurance_file_name,
            insurance_expiry: entry.insurance_expiry || undefined,
          });
        })
      );
      toast.success("Invitation(s) sent successfully");
      setAppointedInvites([]);
      fetchCompanies();
      queryClient.invalidateQueries({ queryKey: ["project", String(selectedProjectId)] });
    } catch {
      toast.error("Failed to send invitations.");
    }
  };

  const handleRemoveCompany = async (companyId: string | number) => {
    if (!selectedProjectId) return;
    setRemoveLoading(true);
    try {
      await removeAppointedCompany(selectedProjectId, companyId);
      toast.success("Company removed from project.");
      setRemoveConfirmId(null);
      fetchCompanies();
    } catch {
      toast.error("Failed to remove company.");
    } finally {
      setRemoveLoading(false);
    }
  };

  const toggleExpand = (id: string | number) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateInvite = (id: string, patch: Partial<AppointedInviteEntry>) =>
    setAppointedInvites((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <AwesomeLoader message="Fetching Associated Companies..." />
      </div>
    );
  }

  const isSaving = updateProjectMutation.isPending;

  const CLIENT_ROLES = ["CLIENT", "OWNER", "CLIENT OWNER"];
  const appointedOnly = appointedCompanies
    .filter((c) => !CLIENT_ROLES.includes((c.role || "").toUpperCase().trim()))
    .sort((a, b) => (a.company_name || "").localeCompare(b.company_name || ""));

  return (
    <div className="w-full bg-slate-50/30">
      <div className="max-w-5xl mx-auto p-8 pb-20">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-normal uppercase tracking-widest mb-3">
              <Building2 className="w-3 h-3" />
              Project Settings
            </div>
            <h1 className="text-3xl font-normal text-foreground tracking-tight">Associated Companies</h1>
          </div>
          {canManageTeam ? (
            appointedInvites.length > 0 && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="h-11 px-8 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-3 shrink-0"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span className="font-normal">{isSaving ? "Inviting..." : "Send Invitations"}</span>
              </Button>
            )
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-border text-muted-foreground text-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>Read-only access</span>
            </div>
          )}
        </div>

        {/* ── Single Card ── */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-5 border-b border-border bg-slate-50/50">
            <div className="w-10 h-10 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-primary shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-normal text-foreground tracking-tight">Associated Companies</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Professional firms appointed to this project</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Existing companies */}
            {isLoadingCompanies ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : appointedOnly.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-3">
                  {appointedOnly.map((comp) => {
                    const hasInsurance = !!comp.insurance_file_name;
                    const isExpired = comp.insurance_expiry
                      ? new Date(comp.insurance_expiry) < new Date()
                      : false;
                    const isExpanded = expandedCompanies.has(comp.id);
                    const members: any[] = comp.members || [];
                    const isNumericId = typeof comp.id === "number" || /^\d+$/.test(String(comp.id));

                    return (
                      <div key={comp.id} className="rounded-lg border border-border bg-slate-50/30 hover:bg-white hover:shadow-sm transition-all">
                        {/* Top row: company info + actions */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex gap-3 items-center">
                            <div className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center text-muted-foreground shadow-sm shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-normal text-foreground">{comp.company_name}</p>
                              <p className="text-[11px] text-muted-foreground uppercase tracking-tighter mt-0.5">{comp.role || "Partner"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full border",
                              comp.status === "Joined"
                                ? "bg-slate-100 text-foreground border-border"
                                : "bg-slate-50 text-muted-foreground border-border"
                            )}>
                              {comp.status}
                            </span>

                            {/* Members toggle */}
                            {isNumericId && (
                              <button
                                onClick={() => toggleExpand(comp.id)}
                                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                                title={isExpanded ? "Hide members" : "Show members"}
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>{members.length}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}

                            {/* Remove company */}
                            {canManageTeam && isNumericId && (
                              removeConfirmId === comp.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleRemoveCompany(comp.id)}
                                    disabled={removeLoading}
                                    className="text-[11px] px-2 py-1 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors flex items-center gap-1"
                                  >
                                    {removeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setRemoveConfirmId(null)}
                                    className="text-[11px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setRemoveConfirmId(comp.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
                                  title="Remove company"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Members panel */}
                        {isExpanded && (
                          <div className="border-t border-border bg-white px-4 pb-4 pt-3 space-y-2">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2">Members</p>
                            {members.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">No members yet.</p>
                            ) : (
                              members.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-border">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-medium shrink-0">
                                      {(m.name || m.email || "?")[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-xs font-normal text-foreground">{m.name || m.email}</p>
                                      <p className="text-[10px] text-muted-foreground">{m.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground">{m.role}</span>
                                    {m.status && (
                                      <span className={cn(
                                        "text-[9px] px-1.5 py-0.5 rounded-full",
                                        m.status === "Invited" ? "bg-amber-100 text-amber-700" :
                                        m.status === "Expired" ? "bg-red-100 text-red-700" :
                                        "bg-green-100 text-green-700"
                                      )}>
                                        {m.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* Insurance Certificate Card — only shown when insurance exists */}
                        {hasInsurance && <div className={cn(
                          "mx-4 mb-4 rounded-xl border overflow-hidden",
                          hasInsurance && !isExpired
                            ? "border-green-200"
                            : hasInsurance && isExpired
                              ? "border-amber-200"
                              : "border-border"
                        )}>
                          {/* Certificate header stripe */}
                          <div className={cn(
                            "flex items-center justify-between px-4 py-2.5",
                            hasInsurance && !isExpired
                              ? "bg-green-600"
                              : hasInsurance && isExpired
                                ? "bg-amber-500"
                                : "bg-slate-400"
                          )}>
                            <div className="flex items-center gap-2 text-white">
                              {hasInsurance && !isExpired
                                ? <ShieldCheck className="w-3.5 h-3.5" />
                                : hasInsurance && isExpired
                                  ? <ShieldAlert className="w-3.5 h-3.5" />
                                  : <FileText className="w-3.5 h-3.5" />
                              }
                              <span className="text-[10px] font-medium uppercase tracking-widest">
                                {hasInsurance && !isExpired
                                  ? "Certificate of Insurance"
                                  : hasInsurance && isExpired
                                    ? "Insurance Expired"
                                    : "No Insurance on File"}
                              </span>
                            </div>
                            <span className={cn(
                              "text-[9px] font-medium px-2 py-0.5 rounded-full",
                              hasInsurance && !isExpired
                                ? "bg-green-500 text-white"
                                : hasInsurance && isExpired
                                  ? "bg-amber-400 text-white"
                                  : "bg-slate-300 text-slate-600"
                            )}>
                              {hasInsurance && !isExpired ? "VALID" : hasInsurance && isExpired ? "EXPIRED" : "PENDING"}
                            </span>
                          </div>

                          {/* Certificate body */}
                          <div className={cn(
                            "px-4 py-3 flex items-center justify-between",
                            hasInsurance && !isExpired
                              ? "bg-green-50"
                              : hasInsurance && isExpired
                                ? "bg-amber-50"
                                : "bg-slate-50"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                hasInsurance && !isExpired
                                  ? "bg-green-100 text-green-600"
                                  : hasInsurance && isExpired
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-slate-100 text-slate-400"
                              )}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-normal text-foreground leading-snug">
                                  {hasInsurance ? comp.insurance_file_name : "No document uploaded"}
                                </p>
                                {comp.insurance_expiry ? (
                                  <p className={cn(
                                    "text-[10px] mt-0.5",
                                    isExpired ? "text-amber-600" : "text-muted-foreground"
                                  )}>
                                    {isExpired ? "Expired" : "Expires"}{" "}
                                    {new Date(comp.insurance_expiry).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">No expiry date recorded</p>
                                )}
                              </div>
                            </div>
                            {comp.insurance_url && (
                              <a
                                href={comp.insurance_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all shrink-0 ml-3",
                                  hasInsurance && !isExpired
                                    ? "bg-white border-green-200 text-green-700 hover:bg-green-100"
                                    : "bg-white border-amber-200 text-amber-700 hover:bg-amber-100"
                                )}
                                title="Download insurance certificate"
                              >
                                <Download className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>}
                      </div>
                    );
                  })}
                </div>
                <div className="h-px bg-border/60" />
              </>
            ) : null}

            {/* Invite forms — only shown to users who can manage team */}
            {canManageTeam && appointedInvites.map((entry) => (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-normal text-muted-foreground tracking-wider ml-0.5">Company Name</label>
                    <Input
                      value={entry.company_name}
                      onChange={(e) => updateInvite(entry.id, { company_name: e.target.value })}
                      className={INPUT_CLS}
                      placeholder="e.g. Base Architects and Associates"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-normal text-muted-foreground tracking-wider ml-0.5">Professional Role</label>
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
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-normal text-muted-foreground tracking-wider ml-0.5">Contact Person Name</label>
                    <Input
                      value={entry.contact_name}
                      onChange={(e) => updateInvite(entry.id, { contact_name: e.target.value })}
                      className={INPUT_CLS}
                      placeholder="e.g. John Smith"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-normal text-muted-foreground tracking-wider ml-0.5">Email Address</label>
                    <Input
                      type="email"
                      value={entry.email}
                      onChange={(e) => updateInvite(entry.id, { email: e.target.value })}
                      className={INPUT_CLS}
                      placeholder="e.g. john@firm.co.za"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add button — only shown to users who can manage team */}
            {canManageTeam && (
              <button
                type="button"
                onClick={() =>
                  setAppointedInvites((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), company_name: "", company_type: "", contact_name: "", email: "", position: "", insurance_file: null, insurance_expiry: "" },
                  ])
                }
                className="w-full py-4 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Plus className="w-4 h-4" />
                {appointedInvites.length === 0 ? "Add Associated Company" : "Add Another Company"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AppointedCompanies;
