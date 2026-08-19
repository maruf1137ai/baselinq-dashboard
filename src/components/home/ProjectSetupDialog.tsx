/**
 * Project setup dialog — lifted out of `src/pages/Index.tsx` during the
 * homepage rebuild. The behaviour is unchanged: it patches the project,
 * registers uploaded documents, and sends client / associated-company
 * invitations. Only its container moved, so the homepage can be a composition
 * of blocks rather than a 1,600-line file with a 500-line modal at the bottom.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarIcon,
  Check,
  ChevronDown,
  ClipboardList,
  CloudUpload,
  FileText,
  MapPin,
  Plus,
  Shield,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LocationPickerMap } from "@/components/LocationPickerMap";
import {
  ALLOWED_FILE_EXTENSIONS,
  getAppointedCompanies,
  inviteAppointedCompany,
  inviteClient,
  patchData,
  registerS3Document,
  validateFile,
} from "@/lib/Api";
import { INPUT_BASE, SELECT_BASE, TEXTAREA_BASE } from "@/lib/constants";
import { COMPANY_TYPES } from "@/lib/roleUtils";
import { cn } from "@/lib/utils";
import { useS3Upload } from "@/hooks/useS3Upload";
import type { ProjectSetupState } from "@/lib/homeSetup";

const qInputCls = INPUT_BASE;
const qSelectCls = SELECT_BASE + " appearance-none";
const qTextareaCls = TEXTAREA_BASE + " min-h-[200px]";

const EMPTY_FORM = {
  brief: "",
  company_name: "", client_name: "", client_email: "",
  total_budget: "",
  location_street: "", location_lat: "", location_lng: "",
  start_date: "", end_date: "",
  appointed_company_name: "",
  appointed_company_type: "",
  appointed_contact_name: "",
  appointed_contact_email: "",
  appointed_position: "",
  appointed_insurance_expiry: "",
};

interface AppointedInviteEntry {
  id: string;
  company_name: string;
  company_type: string;
  contact_name: string;
  email: string;
  position: string;
}

export interface ProjectSetupDialogProps {
  open: boolean;
  /** When set, only that section is shown. Null shows every missing field. */
  section: string | null;
  onClose: () => void;
  projectId: string | undefined;
  projectStats: ProjectSetupState | null;
  canEditProject: boolean;
  isClientOrContractor: boolean;
}

export function ProjectSetupDialog({
  open: quickFillOpen,
  section: quickFillSection,
  onClose,
  projectId,
  projectStats,
  canEditProject,
  isClientOrContractor,
}: ProjectSetupDialogProps) {
  const queryClient = useQueryClient();
  const [quickForm, setQuickForm] = useState({ ...EMPTY_FORM });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [appointedInvites, setAppointedInvites] = useState<AppointedInviteEntry[]>([]);
  const [appointedCompanies, setAppointedCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const s3Upload = useS3Upload("project-documents/pending");

  // The associated-company list is only needed while that section is on screen.
  const wantsCompanies =
    quickFillOpen && (quickFillSection === null || quickFillSection === "Associated Company");

  useEffect(() => {
    if (!wantsCompanies || !projectId) return;
    let cancelled = false;
    setIsLoadingCompanies(true);
    getAppointedCompanies(projectId)
      .then((companies: any[]) => {
        if (cancelled) return;
        setAppointedCompanies(
          (companies || []).sort((a: any, b: any) =>
            (a.company_name || "").localeCompare(b.company_name || ""),
          ),
        );
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setIsLoadingCompanies(false); });
    return () => { cancelled = true; };
  }, [wantsCompanies, projectId]);

  const addFiles = useCallback((files: File[]) => {
    files.forEach((file) => {
      const result = validateFile(file);
      if (result.valid) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        s3Upload.startUpload(id, file);
      } else {
        toast.error(`${file.name}: ${result.error}`);
      }
    });
  }, [s3Upload]);

  const closeQuickFill = () => {
    setQuickForm({ ...EMPTY_FORM });
    setAppointedInvites([]);
    s3Upload.entries.forEach((e) => s3Upload.removeEntry(e.id));
    onClose();
  };

  const submitQuickFill = async (missing: string[]) => {
    if (!projectId || !canEditProject) return;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (missing.includes("Scope of Work") && quickForm.brief.trim()) {
        payload.task_order_brief = quickForm.brief.trim();
      }
      // CLIENT/CONTRACTOR: fill own client company details
      if (missing.includes("Client Details") && isClientOrContractor && quickForm.company_name.trim()) {
        payload.client_details = {
          company_name: quickForm.company_name.trim(),
          client: { name: quickForm.client_name.trim(), email: quickForm.client_email.trim(), position: "" },
        };
      }
      // NON-CLIENT: just invite the client (handled after patch via inviteClient)
      if (missing.includes("Budget Allocation")) {
        const num = parseFloat(quickForm.total_budget.replace(/,/g, ""));
        if (!num || num <= 0) { toast.error("Please enter a valid budget amount"); setIsSaving(false); return; }
        payload.total_budget = num;
      }
      if (missing.includes("Location")) {
        if (quickForm.location_street.trim()) payload.location = quickForm.location_street.trim();
        if (quickForm.location_lat) payload.latitude = parseFloat(quickForm.location_lat);
        if (quickForm.location_lng) payload.longitude = parseFloat(quickForm.location_lng);
      }
      if (missing.includes("Project Timeline") && quickForm.start_date && quickForm.end_date) {
        payload.start_date = quickForm.start_date;
        payload.end_date = quickForm.end_date;
      }
      const validInvites = appointedInvites.filter((e) => e.company_name.trim() && e.email.trim());
      // NON-CLIENT: fill own appointed company details
      if (missing.includes("Associated Company") && !isClientOrContractor && quickForm.appointed_company_name.trim()) {
        payload.appointed_company = {
          company_name: quickForm.appointed_company_name.trim(),
          company_type: quickForm.appointed_company_type,
          role_as_per_appointment: quickForm.appointed_position,
          contact: { name: quickForm.appointed_contact_name.trim(), email: quickForm.appointed_contact_email.trim() },
        };
      }
      // NON-CLIENT: inviting a client counts as a valid action even without a patch payload
      const hasClientInvite = missing.includes("Client Details") && !isClientOrContractor && quickForm.client_email.trim();

      if (Object.keys(payload).length === 0 && s3Upload.entries.length === 0 && !hasClientInvite && validInvites.length === 0) {
        toast.error("Please fill in at least one field");
        setIsSaving(false);
        return;
      }
      if (Object.keys(payload).length > 0) {
        await patchData({ url: `projects/${projectId}/`, data: payload });
      }

      // Register S3 documents if any uploaded
      if (s3Upload.entries.length > 0) {
        const ids = s3Upload.entries.map((e) => e.id);
        const s3Keys = await s3Upload.waitForAll(ids);
        await Promise.all(
          s3Upload.entries.map(async (entry) => {
            const key = s3Keys.get(entry.id);
            if (key) await registerS3Document(projectId, { file_name: entry.file.name, s3_key: key, name: entry.title || "" }).catch(() => { });
          })
        );
      }

      toast.success("Project updated successfully");
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("projects") });

      // Invite the client when an email was supplied.
      if (missing.includes("Client Details") && quickForm.client_email.trim()) {
        try {
          await inviteClient({
            client_name: quickForm.client_name.trim(),
            client_email: quickForm.client_email.trim(),
            project_id: projectId,
          });
          toast.success(`Client invite sent to ${quickForm.client_email}`);
        } catch (err: any) {
          toast.warning(`Project updated, but client invite failed: ${err?.response?.data?.error || err.message}`);
        }
      }

      // CLIENT/CONTRACTOR: send appointed company invitations
      if (missing.includes("Associated Company") && isClientOrContractor && validInvites.length > 0) {
        await Promise.allSettled(
          validInvites.map((entry) =>
            inviteAppointedCompany({
              project_id: projectId,
              company_name: entry.company_name.trim(),
              company_type: entry.company_type,
              contact_name: entry.contact_name.trim(),
              contact_email: entry.email.trim(),
              position: entry.position || '',
            })
          )
        );
        toast.success(`${validInvites.length} associated company invitation${validInvites.length > 1 ? "s" : ""} sent`);
      }

      closeQuickFill();
    } catch {
      toast.error("Failed to update. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {projectStats && (
        <Dialog open={quickFillOpen} onOpenChange={(open) => { if (!open) closeQuickFill(); }}>
          <DialogContent size="lg" className="p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-border">
              <DialogTitle>
                {quickFillSection ?? "Complete Project Setup"}
              </DialogTitle>
              <p className="text-xs text-[#6b7280] mt-1">Fill in the missing details below and save.</p>
            </DialogHeader>

            <div className="px-8 py-6 space-y-4 max-h-[72vh] overflow-y-auto">

              {/* ── Scope of Work card ── */}
              {(quickFillSection === null || quickFillSection === "Scope of Work") && projectStats.missing.includes("Scope of Work") && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border-b border-border">
                    <div className="w-8 h-8 rounded-lg bg-[#f0edff] flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-[#111827]">Scope of Work</p>
                      <p className="text-xs text-[#9ca3af]">Describe the construction scope — auto-populates into contracts</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <textarea
                      className={qTextareaCls}
                      placeholder="e.g. The Client wishes to appoint an Architect to measure up the existing residential building..."
                      value={quickForm.brief}
                      onChange={(e) => setQuickForm((v) => ({ ...v, brief: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* ── Client Details card ── */}
              {(quickFillSection === null || quickFillSection === "Client Details") && projectStats.missing.includes("Client Details") && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border-b border-border">
                    <div className="w-8 h-8 rounded-lg bg-[#eef2ff] flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-[#111827]">Client Details</p>
                      <p className="text-xs text-[#9ca3af]">
                        {isClientOrContractor
                          ? "Fill once — auto-populates into all contracts and appointment letters"
                          : "Invite your client to fill in their company details"}
                      </p>
                    </div>
                  </div>
                  {isClientOrContractor ? (
                    // CLIENT/CONTRACTOR: fill own client company details
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-normal text-[#374151] mb-1.5">
                          Client Name or Company <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={qInputCls}
                          placeholder="e.g. Mr John Smith or ABC Holdings (Pty) Ltd"
                          value={quickForm.company_name}
                          onChange={(e) => setQuickForm((v) => ({ ...v, company_name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-normal text-[#374151] mb-1.5">Contact Name</label>
                          <input
                            className={qInputCls}
                            placeholder="Full name"
                            value={quickForm.client_name}
                            onChange={(e) => setQuickForm((v) => ({ ...v, client_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-normal text-[#374151] mb-1.5">Contact Email</label>
                          <input
                            type="email"
                            className={qInputCls}
                            placeholder="client@company.com"
                            value={quickForm.client_email}
                            onChange={(e) => setQuickForm((v) => ({ ...v, client_email: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // NON-CLIENT: invite client by email
                    <div className="p-5 space-y-4">
                      <p className="text-xs text-[#6b7280]">
                        We'll send an email invitation for the client to complete their company details.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-normal text-[#374151] mb-1.5">Client Name</label>
                          <input
                            className={qInputCls}
                            placeholder="e.g. John Smith"
                            value={quickForm.client_name}
                            onChange={(e) => setQuickForm((v) => ({ ...v, client_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-normal text-[#374151] mb-1.5">
                            Client Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            className={qInputCls}
                            placeholder="client@company.com"
                            value={quickForm.client_email}
                            onChange={(e) => setQuickForm((v) => ({ ...v, client_email: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Budget Allocation card ── */}
              {(quickFillSection === null || quickFillSection === "Budget Allocation") && projectStats.missing.includes("Budget Allocation") && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border-b border-border">
                    <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] flex items-center justify-center shrink-0">
                      <ClipboardList className="h-4 w-4 text-[#16a34a]" />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-[#111827]">Budget Allocation</p>
                      <p className="text-xs text-[#9ca3af]">Set the total project budget</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <label className="block text-xs font-normal text-[#374151] mb-1.5">
                      Total Budget <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#6b7280] pointer-events-none select-none">R</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={cn(qInputCls, "pl-10 text-lg h-[52px]")}
                        placeholder="0"
                        value={quickForm.total_budget}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setQuickForm((v) => ({ ...v, total_budget: raw ? Number(raw).toLocaleString() : "" }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Location card ── */}
              {(quickFillSection === null || quickFillSection === "Location") && projectStats.missing.includes("Location") && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border-b border-border">
                    <div className="w-8 h-8 rounded-lg bg-[#f0f9ff] flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-[#0284c7]" />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-[#111827]">Location</p>
                      <p className="text-xs text-[#9ca3af]">Project site address or area — used in contracts and reports</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <LocationPickerMap
                      location={quickForm.location_street}
                      latitude={quickForm.location_lat}
                      longitude={quickForm.location_lng}
                      mapHeight={260}
                      onChange={(loc, lat, lng) =>
                        setQuickForm((v) => ({ ...v, location_street: loc, location_lat: lat, location_lng: lng }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* ── Project Timeline card ── */}
              {(quickFillSection === null || quickFillSection === "Project Timeline") && projectStats.missing.includes("Project Timeline") && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border-b border-border">
                    <div className="w-8 h-8 rounded-lg bg-[#fdf4ff] flex items-center justify-center shrink-0">
                      <CalendarIcon className="h-4 w-4 text-[#9333ea]" />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-[#111827]">Project Timeline</p>
                      <p className="text-xs text-[#9ca3af]">Start and end dates — used for scheduling and contract periods</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-normal text-[#374151] mb-1.5">Start Date <span className="text-red-500">*</span></label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={cn(qInputCls, "flex items-center justify-between cursor-pointer")}>
                              <span className={quickForm.start_date ? "text-[#111827]" : "text-gray-400"}>
                                {quickForm.start_date ? format(new Date(quickForm.start_date), "dd MMM yyyy") : "Pick a date"}
                              </span>
                              <CalendarIcon className="h-4 w-4 text-[#9ca3af] shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={quickForm.start_date ? new Date(quickForm.start_date) : undefined}
                              onSelect={(date) => setQuickForm((v) => ({ ...v, start_date: date ? format(date, "yyyy-MM-dd") : "" }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <label className="block text-xs font-normal text-[#374151] mb-1.5">End Date <span className="text-red-500">*</span></label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={cn(qInputCls, "flex items-center justify-between cursor-pointer")}>
                              <span className={quickForm.end_date ? "text-[#111827]" : "text-gray-400"}>
                                {quickForm.end_date ? format(new Date(quickForm.end_date), "dd MMM yyyy") : "Pick a date"}
                              </span>
                              <CalendarIcon className="h-4 w-4 text-[#9ca3af] shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={quickForm.end_date ? new Date(quickForm.end_date) : undefined}
                              onSelect={(date) => setQuickForm((v) => ({ ...v, end_date: date ? format(date, "yyyy-MM-dd") : "" }))}
                              disabled={(date) => quickForm.start_date ? date < new Date(quickForm.start_date) : false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Associated Company card ── */}
              {(quickFillSection === null || quickFillSection === "Associated Company") && projectStats.missing.includes("Associated Company") && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border-b border-border">
                    <div className="w-8 h-8 rounded-lg bg-[#fefce8] flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-[#ca8a04]" />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-[#111827]">
                        {isClientOrContractor ? "Associated Companies" : "Associated Company Information"}
                      </p>
                      <p className="text-xs text-[#9ca3af]">
                        {isClientOrContractor
                          ? "Invite professional firms associated with this project"
                          : "Fill in your company details — auto-populates into contracts and appointment letters"}
                      </p>
                    </div>
                  </div>

                  {isClientOrContractor ? (
                    // CLIENT/CONTRACTOR: multi-invite form
                    <div className="p-5 space-y-3">
                      {isLoadingCompanies ? (
                        <p className="text-sm text-muted-foreground py-2">Loading...</p>
                      ) : appointedCompanies.filter(c => !["CLIENT", "OWNER", "CLIENT OWNER"].includes((c.role || "").toUpperCase().trim())).length > 0 && (
                        <div className="space-y-2">
                          {appointedCompanies
                            .filter(c => !["CLIENT", "OWNER", "CLIENT OWNER"].includes((c.role || "").toUpperCase().trim()))
                            .map((comp) => (
                              <div key={comp.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50">
                                <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-normal text-[#111827] truncate">{comp.company_name}</p>
                                  <p className="text-xs text-muted-foreground">{comp.role || "Partner"}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-card text-muted-foreground shrink-0">{comp.status}</span>
                              </div>
                            ))}
                          <div className="h-px bg-border" />
                        </div>
                      )}
                      {appointedInvites.map((entry) => (
                        <div key={entry.id} className="rounded-xl p-4 space-y-3 bg-muted/50">
                          <div className="flex justify-end">
                            <button
                              aria-label="Remove invitation"
                              type="button"
                              onClick={() => setAppointedInvites((prev) => prev.filter((e) => e.id !== entry.id))}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs font-normal text-[#374151] mb-1.5">Company Name <span className="text-red-500">*</span></label>
                            <input
                              className={qInputCls}
                              placeholder="e.g. Smith Architects (Pty) Ltd"
                              value={entry.company_name}
                              onChange={(e) => setAppointedInvites((prev) => prev.map((x) => x.id === entry.id ? { ...x, company_name: e.target.value } : x))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-normal text-[#374151] mb-1.5">Company Type</label>
                            <div className="relative">
                              <select
                                className={qSelectCls}
                                value={entry.company_type}
                                onChange={(e) => setAppointedInvites((prev) => prev.map((x) => x.id === entry.id ? { ...x, company_type: e.target.value } : x))}
                              >
                                <option value="">Select type...</option>
                                {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-normal text-[#374151] mb-1.5">Contact Name</label>
                              <input
                                className={qInputCls}
                                placeholder="e.g. John Smith"
                                value={entry.contact_name}
                                onChange={(e) => setAppointedInvites((prev) => prev.map((x) => x.id === entry.id ? { ...x, contact_name: e.target.value } : x))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-normal text-[#374151] mb-1.5">Email Address <span className="text-red-500">*</span></label>
                              <input
                                type="email"
                                className={qInputCls}
                                placeholder="contact@firm.co.za"
                                value={entry.email}
                                onChange={(e) => setAppointedInvites((prev) => prev.map((x) => x.id === entry.id ? { ...x, email: e.target.value } : x))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAppointedInvites((prev) => [...prev, { id: crypto.randomUUID(), company_name: "", company_type: "", contact_name: "", email: "", position: "" }])}
                        className="w-full py-3.5 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        {appointedInvites.length === 0 ? "Add Associated Company" : "Add Another Company"}
                      </button>
                    </div>
                  ) : (
                    // NON-CLIENT: fill own company details
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-normal text-[#374151] mb-1.5">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={qInputCls}
                          placeholder="e.g. Base Architects and Associates"
                          value={quickForm.appointed_company_name}
                          onChange={(e) => setQuickForm((v) => ({ ...v, appointed_company_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-normal text-[#374151] mb-1.5">Company Type</label>
                        <div className="relative">
                          <select
                            className={qSelectCls}
                            value={quickForm.appointed_company_type}
                            onChange={(e) => setQuickForm((v) => ({ ...v, appointed_company_type: e.target.value }))}
                          >
                            <option value="">Select type...</option>
                            {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-normal text-[#374151] mb-1.5">Contact Name</label>
                          <input
                            className={qInputCls}
                            placeholder="e.g. John Smith"
                            value={quickForm.appointed_contact_name}
                            onChange={(e) => setQuickForm((v) => ({ ...v, appointed_contact_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-normal text-[#374151] mb-1.5">Contact Email</label>
                          <input
                            type="email"
                            className={qInputCls}
                            placeholder="contact@firm.co.za"
                            value={quickForm.appointed_contact_email}
                            onChange={(e) => setQuickForm((v) => ({ ...v, appointed_contact_email: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Documents card ── */}
              {(quickFillSection === null || quickFillSection === "Project Documents") && projectStats.missing.includes("Project Documents") && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border-b border-border">
                    <div className="w-8 h-8 rounded-lg bg-[#fff7ed] flex items-center justify-center shrink-0">
                      <CloudUpload className="h-4 w-4 text-[#ea580c]" />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-[#111827]">Project Documents</p>
                      <p className="text-xs text-[#9ca3af]">Upload contracts, drawings, BOQ and other project files</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept={ALLOWED_FILE_EXTENSIONS.join(",")}
                      onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
                      className={cn(
                        "flex items-center gap-5 rounded-xl px-6 py-5 cursor-pointer transition-all duration-200 border-2 border-dashed",
                        isDragging ? "border-primary bg-[#f8f7ff]" : "border-border bg-card hover:border-primary hover:bg-[#f8f7ff]"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors", isDragging ? "bg-[#ede9fb]" : "bg-muted")}>
                        <CloudUpload className={cn("h-6 w-6 transition-colors", isDragging ? "text-primary" : "text-[#6b7280]")} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#374151]">Drag and drop your files here</p>
                        <p className="text-xs text-[#6b7280] mt-0.5">or <span className="text-primary underline">click to browse</span></p>
                        <p className="text-xs text-[#9ca3af] mt-1 uppercase tracking-tight">PDF, Excel, Images up to 20MB</p>
                      </div>
                    </div>
                    {s3Upload.entries.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {s3Upload.entries.map((f) => (
                          <div key={f.id} className="bg-muted/50 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-normal text-[#111827] truncate">{f.file.name}</p>
                                <p className="text-xs text-[#9ca3af]">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    className="w-full h-7 px-2 rounded-lg border border-border text-xs placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    placeholder="Document title (optional)"
                                    value={f.title || ""}
                                    onChange={(e) => s3Upload.updateEntry(f.id, { title: e.target.value })}
                                  />
                                </div>
                              </div>
                              {f.status === "done" && <Check className="h-4 w-4 text-[#00b894] shrink-0" />}
                              <button
                                aria-label="Remove file" type="button" onClick={() => s3Upload.removeEntry(f.id)} className="text-[#9ca3af] hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            {f.status === "uploading" && (
                              <div className="mt-2.5">
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${f.progress}%` }} />
                                </div>
                                <p className="text-xs text-[#9ca3af] mt-1">{f.progress}%</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            <div className="px-8 py-5 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={closeQuickFill}
                className="px-4 py-2 text-xs text-[#6b7280] hover:text-[#111827] transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={() => submitQuickFill(quickFillSection ? [quickFillSection] : projectStats.missing)}
                disabled={isSaving || !canEditProject}
                className="h-10 px-6 bg-primary text-primary-foreground text-xs rounded-xl shadow-sm hover:bg-primary/90 transition-all font-normal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default ProjectSetupDialog;
