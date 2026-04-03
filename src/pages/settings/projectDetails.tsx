import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useProjects, useProject } from "@/hooks/useProjects";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteProjectDocument, ProjectDocument } from "@/lib/Api";
import { FilePreviewModal } from "@/components/TaskComponents/FilePreviewModal";
import {
  FileText,
  Trash2,
  TriangleAlert,
  ShieldCheck,
  Building2,
  ClipboardList,
  FolderOpen,
  Search,
  Plus,
} from "lucide-react";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoField({ label, value, colSpan }: {
  label: string;
  value?: string | null;
  colSpan?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1", colSpan && "col-span-2")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

function PersonnelCard({ label, role, personnel }: {
  label: string;
  role: string;
  personnel?: { name?: string; email?: string; phone?: string };
}) {
  const name = personnel?.name || "";
  const email = personnel?.email || "";
  const phone = personnel?.phone || "";
  const hasData = name || email || phone;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{role}</span>
      </div>
      {hasData ? (
        <div className="space-y-1">
          {name && <p className="text-sm font-medium text-foreground">{name}</p>}
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
          {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No personnel assigned</p>
      )}
    </div>
  );
}

function SectionCard({ title, badge, icon, children }: {
  title: string;
  badge?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden mb-8">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-slate-50/50">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-primary shrink-0 transition-transform duration-200 hover:scale-105">
              {icon}
            </div>
          )}
          <span className="text-sm font-normal text-foreground tracking-tight">{title}</span>
        </div>
        {badge && (
          <span className="text-[10px] font-normal text-muted-foreground bg-white border border-border px-2.5 py-1 rounded-full uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatAddress = (addr: any) => {
  if (!addr) return "—";
  if (typeof addr === "string") return addr;
  const parts = [addr.street, addr.city, addr.province, addr.postal_code].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
};

const formatBanking = (bank: any) => {
  if (!bank) return "—";
  if (typeof bank === "string") return bank;
  const parts = [bank.bank_name, bank.account_number, bank.branch_code].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
};

const ProjectDetails = () => {
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<ProjectDocument | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjects();

  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const { data: fetchedProject, isLoading } = useProject(selectedProjectId ?? undefined);

  // Prefer freshly fetched individual project (has client_details); fall back to list
  const selectedProject = fetchedProject ||
    projects.find((project: any) => (project._id || project.id) == selectedProjectId);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <AwesomeLoader message="Fetching Project Details..." />
      </div>
    );
  }


  const documents: ProjectDocument[] = selectedProject?.documents || [];

  const getDocName = (doc: ProjectDocument) => doc.file_name || doc.fileName || doc.name || "Unknown";
  const getDocUrl = (doc: ProjectDocument) =>
    (doc as any).streamUrl || (doc as any).stream_url || doc.file_url || doc.fileUrl || "";
  const getDocDate = (doc: ProjectDocument) => doc.uploaded_at || doc.uploadedAt;
  const getDocId = (doc: ProjectDocument) => doc.id || doc._id;

  // Normalise new fields (API returns camelCase)
  const clientDetails = selectedProject?.clientDetails || selectedProject?.client_details;
  const taskOrderBrief = selectedProject?.taskOrderBrief || selectedProject?.task_order_brief;

  const currency = selectedProject?.currency || "ZAR";
  const currencySymbol: Record<string, string> = { ZAR: "R", USD: "$", EUR: "€", GBP: "£" };
  const sym = currencySymbol[currency] || "R";

  const handleDeleteDocument = (e: React.MouseEvent, doc: ProjectDocument) => {
    e.stopPropagation();
    setDocToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const pId = selectedProject?._id || selectedProject?.id;
    const docId = docToDelete ? getDocId(docToDelete) : null;
    if (!pId || !docId) return;

    setIsDeleting(true);
    try {
      await deleteProjectDocument(pId, docId);
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(key => typeof key === "string" && key.startsWith("projects")) ||
          query.queryKey[0] === "projects" ||
          query.queryKey[0] === "project",
      });
      toast.success("Document deleted successfully");
      setShowDeleteConfirm(false);
      setDocToDelete(null);
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const getProjectCompletionStats = () => {
    const fields = [
      { label: "Client Details", value: clientDetails },
      { label: "Scope of Works", value: taskOrderBrief },
      { label: "Documents", value: documents.length > 0 ? "yes" : null },
      { label: "Budget Allocation", value: (selectedProject?.totalBudget ?? selectedProject?.total_budget) != null ? "yes" : null },
    ];

    const filledCount = fields.filter(f => !!f.value).length;
    const totalCount = fields.length;
    const percentage = Math.round((filledCount / totalCount) * 100);
    const missing = fields.filter(f => !f.value).map(f => f.label);

    return { percentage, filledCount, totalCount, missing };
  };

  const stats = getProjectCompletionStats();

  return (
    <div className="p-6 space-y-2">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b border-border pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-normal uppercase tracking-widest mb-3">
            <ShieldCheck className="w-3 h-3" />
            Project Settings
          </div>
          <h1 className="text-3xl font-normal text-foreground tracking-tight">Project Details</h1>
        </div>
        <div className="flex gap-2">
          <Button className={cn("h-11 bg-transparent text-muted-foreground border border-border hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors px-6 rounded-xl")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 10V2" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.66699 6.6665L8.00033 9.99984L11.3337 6.6665" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-normal">Export Data</span>
          </Button>
          <Button
            onClick={() => navigate("/edit-project")}
            className={cn("h-11 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-3 px-8 rounded-xl")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.1156 4.54126C14.4681 4.18888 14.6662 3.71091 14.6662 3.2125C14.6663 2.71409 14.4683 2.23607 14.116 1.8836C13.7636 1.53112 13.2856 1.33307 12.7872 1.33301C12.2888 1.33295 11.8108 1.53088 11.4583 1.88326L2.56096 10.7826C2.40618 10.9369 2.29171 11.127 2.22763 11.3359L1.34696 14.2373C1.32973 14.2949 1.32843 14.3562 1.3432 14.4145C1.35796 14.4728 1.38824 14.5261 1.43083 14.5686C1.47341 14.6111 1.52671 14.6413 1.58507 14.656C1.64343 14.6707 1.70467 14.6693 1.7623 14.6519L4.6643 13.7719C4.87308 13.7084 5.06308 13.5947 5.21763 13.4406L14.1156 4.54126Z" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-normal">Edit Project</span>
          </Button>
        </div>
      </div>

      {/* ── Completion Reminder Banner ── */}
      {stats.percentage < 100 && (
        <div className="mb-10 p-6 rounded-2xl bg-white border border-primary/20 shadow-sm flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-sm font-normal text-foreground leading-none">Project Setup Incomplete</h4>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
              You've completed <span className="font-bold text-primary">{stats.filledCount} of {stats.totalCount}</span> project onboarding steps.
              Ensure all details are filled to enable automated contract generation and team collaboration.
            </p>
            {stats.missing.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-3">
                {stats.missing.slice(0, 4).map(f => (
                  <span key={f} className="inline-flex px-2 py-0.5 rounded bg-slate-50 text-[9px] text-muted-foreground border border-border">
                    {f} Required
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0">
            <Button
              onClick={() => navigate("/edit-project")}
              className="h-10 px-6 bg-primary/10 hover:bg-primary/20 text-primary text-xs rounded-xl transition-all border border-primary/10 shadow-none font-normal"
            >
              Complete Onboarding
            </Button>
          </div>
        </div>
      )}

      {/* ── Overview ── */}
      <SectionCard title="Overview" icon={<FileText className="w-5 h-5" />}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          <InfoField label="Project Name" value={selectedProject?.name} />
          <InfoField label="Project Code" value={selectedProject?.projectNumber || selectedProject?.project_number} />
          <InfoField label="Location" value={selectedProject?.location} />
          <InfoField label="Contract Type" value={selectedProject?.contractType || selectedProject?.contract_type} />
          <InfoField
            label="Start Date"
            value={
              selectedProject?.startDate || selectedProject?.start_date
                ? formatDate(selectedProject.startDate || selectedProject.start_date)
                : null
            }
          />
          <InfoField
            label="End Date"
            value={
              selectedProject?.endDate || selectedProject?.end_date
                ? formatDate(selectedProject.endDate || selectedProject.end_date)
                : null
            }
          />
          <InfoField
            label="Total Budget"
            value={
              (selectedProject?.totalBudget ?? selectedProject?.total_budget) != null
                ? `${sym} ${(selectedProject?.totalBudget ?? selectedProject?.total_budget!).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : null
            }
          />
          <InfoField label="Currency" value={currency} />
          <InfoField label="VAT Rate" value={selectedProject?.vatRate != null ? `${selectedProject.vatRate}%` : null} />
          <InfoField label="Retention Rate" value={selectedProject?.retentionRate != null ? `${selectedProject.retentionRate}%` : null} />
          <InfoField
            label="Description"
            value={selectedProject?.description}
            colSpan
          />
        </div>
      </SectionCard>

      {/* ── Client Details ── */}
      <SectionCard
        title="Client Details"
        badge="Contracts & Invoicing"
        icon={<Building2 className="w-5 h-5" />}>
        {clientDetails ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <InfoField label="Client Name or Company" value={clientDetails.company_name} />
              <InfoField label="Company Registration / ID" value={clientDetails.company_registration} />
              <InfoField label="VAT Number" value={clientDetails.vat_number} />
              <InfoField label="Office Number" value={clientDetails.office_number} />
              <InfoField label="Physical Address" value={formatAddress(clientDetails.physical_address)} />
              <InfoField label="Postal Address" value={formatAddress(clientDetails.postal_address)} />
              <InfoField label="Banking Details" value={formatBanking(clientDetails.banking_details)} colSpan />
            </div>

            <div className="border-t border-border pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Assigned Personnel
              </p>
              <div className="grid grid-cols-2 gap-4">
                <PersonnelCard
                  label="Client"
                  role="Super User"
                  personnel={clientDetails.client}
                />
                <PersonnelCard
                  label="Client Representative"
                  role="Tech User"
                  personnel={clientDetails.client_representative}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No client details captured yet.</p>
        )}
      </SectionCard>

      {/* ── Scope of Works ── */}
      <SectionCard title="Scope of Works" icon={<ClipboardList className="w-5 h-5" />}>
        {taskOrderBrief ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Client Brief
            </p>
            <div className="relative rounded-lg bg-muted border border-border px-5 py-4">
              <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary" />
              <p className="text-sm text-muted-foreground leading-relaxed pl-2 whitespace-pre-wrap">
                {taskOrderBrief}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2.5">
              This brief will auto-populate into contract documents and appointment letters.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No scope of works captured yet.</p>
        )}
      </SectionCard>

      {/* ── Documents ── */}
      <SectionCard
        title="Documents"
        badge={`${documents.length} file${documents.length !== 1 ? "s" : ""}`}
        icon={<FolderOpen className="w-5 h-5" />}>
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {documents.map((doc, i) => (
              <div
                key={getDocId(doc) || i}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted hover:bg-muted/50 cursor-pointer transition-all"
                onClick={() => setSelectedDocument(doc)}>
                <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center shrink-0 border border-border">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getDocName(doc)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getDocDate(doc)
                      ? formatDate(getDocDate(doc))
                      : "N/A"}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteDocument(e, doc)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Delete document">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No documents found for this project.</p>
        )}
      </SectionCard>

      <FilePreviewModal
        isOpen={!!selectedDocument}
        onOpenChange={(open) => !open && setSelectedDocument(null)}
        file={selectedDocument ? {
          name: getDocName(selectedDocument),
          url: getDocUrl(selectedDocument),
        } : null}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="w-4 h-4" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {docToDelete ? getDocName(docToDelete) : ""}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetails;
