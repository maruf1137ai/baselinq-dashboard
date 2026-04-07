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
  X,
  Plus,
  User as UserIcon,
} from "lucide-react";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRoles } from "@/hooks/useRoles";

// ── Constants ──────────────────────────────────────────────────────────────────

const COMPANY_TYPES = [
  "Architectural", "Structural Engineering", "Civil Engineering",
  "Mechanical Engineering", "Electrical Engineering", "Quantity Surveying",
  "Project Management", "Construction Management", "Interior Design",
  "Landscape Architecture", "Urban Planning", "Environmental Consulting",
  "Legal & Compliance", "General Contractor", "Other",
];

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
  const { roles: appRoles } = useRoles();
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const { data: fetchedProject, isLoading } = useProject(selectedProjectId ?? undefined);
  const isClientOrContractor = ["CLIENT", "OWNER", "CONTRACTOR", "CPM", "PM"].includes(fetchedProject?.roleName?.toUpperCase() || "");

  const [appointedCompanies, setAppointedCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const [appointedInvites, setAppointedInvites] = useState<AppointedInviteEntry[]>([]);

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
    if (!selectedProjectId) return;
    const toInvite = appointedInvites.filter((e) => e.email.trim() && e.company_name.trim());
    if (toInvite.length === 0) {
      toast.info("No new companies to invite.");
      return;
    }

    try {
      await Promise.allSettled(
        toInvite.map((entry) =>
          inviteAppointedCompany({
            project_id: selectedProjectId,
            company_name: entry.company_name,
            contact_name: entry.contact_name,
            contact_email: entry.email,
            position: entry.position || 'architect',
          })
        )
      );
      toast.success("Invitation(s) sent successfully");
      setAppointedInvites([]);
      fetchCompanies();
      queryClient.invalidateQueries({ queryKey: ["project", String(selectedProjectId)] });
    } catch {
      toast.error("Failed to send invitations.");
    }
  };

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
    <div className="max-w-[1000px] mx-auto p-12">
      {/* ── Main Container ── */}
      <div className="bg-white border border-[#EAECF0] rounded-[20px] shadow-[0_1px_3px_rgba(16,24,40,0.1),0_1px_2px_rgba(16,24,40,0.06)] overflow-hidden">

        {/* Header */}
        <div className="px-8 py-7 border-b border-[#F2F4F7] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#EAECF0] shadow-sm flex items-center justify-center text-[#667085] shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-medium text-[#101828] leading-tight tracking-tight">Appointed Company</h2>
            <p className="text-[14px] text-[#667085] mt-1">Professional firm appointed to this project</p>
          </div>
        </div>

        <div className="p-10 space-y-10">

          {/* Participating Companies Section */}
          <div className="space-y-6">
            <h3 className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">
              Participating Companies
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {isLoadingCompanies ? (
                <p className="text-sm text-gray-400">Loading companies...</p>
              ) : appointedCompanies.length === 0 ? (
                <div className="p-8 border border-dashed border-[#EAECF0] rounded-2xl text-center">
                  <p className="text-sm text-[#667085]">No companies have joined yet.</p>
                </div>
              ) : (
                appointedCompanies.map((comp) => (
                  <div key={comp.id} className="group relative flex items-center justify-between p-5 rounded-[18px] border border-[#EAECF0] bg-white hover:border-[#8081F6] hover:shadow-[0_4px_12px_rgba(108,92,231,0.08)] transition-all">
                    <div className="flex gap-4 items-center">
                      <div className="w-11 h-11 rounded-xl bg-[#F9FAFB] border border-[#F2F4F7] flex items-center justify-center text-[#8081F6] group-hover:bg-[#8081F6]/5 group-hover:border-[#8081F6]/10 transition-colors">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#101828]">{comp.company_name}</p>
                        <p className="text-[12px] text-[#667085] uppercase tracking-wider mt-0.5">{comp.role || 'Partner'}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className={cn(
                        "text-[11px] font-medium px-2.5 py-0.5 rounded-full",
                        comp.status === "Joined"
                          ? "bg-[#ECFDF3] text-[#027A48]"
                          : "bg-[#EFF8FF] text-[#175CD3]"
                      )}>
                        {comp.status}
                      </span>
                      <p className="text-[12px] text-[#667085]">{comp.contact_name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="h-px bg-[#F2F4F7]" />

          {/* Invitation Area */}
          <div className="space-y-6">
            <p className="text-[14px] text-[#667085]">
              Invite the professional firms appointed to this project. They'll receive an email to fill in their company details.
            </p>

            <div className="space-y-4">
              {appointedInvites.map((entry) => (
                <div key={entry.id} className="relative bg-white border border-[#EAECF0] rounded-[20px] p-8 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <button
                    type="button"
                    onClick={() => setAppointedInvites((prev) => prev.filter((e) => e.id !== entry.id))}
                    className="absolute top-6 right-6 p-2 rounded-lg text-[#98A2B3] hover:text-[#F04438] hover:bg-[#FEF3F2] transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">Company Name</label>
                      <Input
                        value={entry.company_name}
                        onChange={(e) => updateInvite(entry.id, { company_name: e.target.value })}
                        className="h-11 rounded-xl border-[#D0D5DD] bg-white focus:ring-4 focus:ring-[#8081F6]/10 focus:border-[#8081F6] text-[14px] placeholder:text-[#98A2B3]"
                        placeholder="e.g. Base Architects and Associates"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">Company Type</label>
                      <select
                        value={entry.company_type}
                        onChange={(e) => updateInvite(entry.id, { company_type: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#D0D5DD] bg-white focus:outline-none focus:ring-4 focus:ring-[#8081F6]/10 focus:border-[#8081F6] text-[14px] appearance-none"
                      >
                        <option value="">Select type...</option>
                        {COMPANY_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">Professional Role</label>
                      <select
                        value={entry.position}
                        onChange={(e) => updateInvite(entry.id, { position: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#D0D5DD] bg-white focus:outline-none focus:ring-4 focus:ring-[#8081F6]/10 focus:border-[#8081F6] text-[14px] appearance-none"
                      >
                        <option value="">Select role...</option>
                        {appRoles.map((r) => (
                          <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">Contact Person Name</label>
                      <Input
                        value={entry.contact_name}
                        onChange={(e) => updateInvite(entry.id, { contact_name: e.target.value })}
                        className="h-11 rounded-xl border-[#D0D5DD] bg-white focus:ring-4 focus:ring-[#8081F6]/10 focus:border-[#8081F6] text-[14px] placeholder:text-[#98A2B3]"
                        placeholder="e.g. John Smith"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">Email Address</label>
                      <Input
                        type="email"
                        value={entry.email}
                        onChange={(e) => updateInvite(entry.id, { email: e.target.value })}
                        className="h-11 rounded-xl border-[#D0D5DD] bg-white focus:ring-4 focus:ring-[#8081F6]/10 focus:border-[#8081F6] text-[14px] placeholder:text-[#98A2B3]"
                        placeholder="e.g. john@firm.co.za"
                      />
                    </div>
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
                className="w-full py-6 border-2 border-dashed border-[#EAECF0] rounded-[20px] flex items-center justify-center gap-2 group hover:border-[#8081F6] hover:bg-[#F9FAFB] transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-[#F2F4F7] flex items-center justify-center group-hover:bg-[#8081F6] transition-colors">
                  <Plus className="w-4 h-4 text-[#667085] group-hover:text-white" />
                </div>
                <span className="text-[15px] font-medium text-[#475467] group-hover:text-[#8081F6]">
                  {appointedInvites.length === 0 ? "Add Appointed Company" : "Add Another Company"}
                </span>
              </button>
            </div>
          </div>

          {/* Action Footer */}
          {appointedInvites.length > 0 && (
            <div className="flex justify-end pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="h-12 px-8 rounded-xl bg-[#8081F6] text-white hover:bg-[#6c6de9] shadow-[0_4px_14px_rgba(108,92,231,0.25)] transition-all flex items-center gap-2.5 text-[15px] font-medium"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? "Inviting..." : "Send Invitations"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointedCompanies;

