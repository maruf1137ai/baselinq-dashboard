/**
 * Primary Contract card — top of Documents page.
 *
 * Two states:
 *   1. EMPTY — no primary contract set yet. Renders a prominent
 *      upload CTA with explanation copy. This is what the AI MVP
 *      needs from the user: tell us WHICH uploaded doc is the
 *      official signed contract.
 *   2. FILLED — primary contract set. Renders a badge with filename
 *      + uploaded date + "Replace" + "View" actions.
 *
 * Calls the backend Primary Contract endpoints introduced in branch
 * feat/ai-mvp-cache-invalidation-and-visibility:
 *   GET   /api/projects/<id>/primary-contract/
 *   PATCH /api/projects/<id>/documents/<doc_id>/role/
 */

import { useState, useRef } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileCheck2,
  ShieldCheck,
  Upload,
  AlertTriangle,
  Calendar,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPrimaryContract,
  uploadProjectDocument,
  setProjectDocumentRole,
  validateFile,
  type PrimaryContractInfo,
} from "@/lib/Api";

const ACCEPTED = ".pdf,application/pdf";

function relativeAge(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export const PrimaryContractCard = ({ projectId }: { projectId: string | number }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canUploadDocument } = usePermissions();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data, isLoading } = useQuery<PrimaryContractInfo>({
    queryKey: ["project-primary-contract", projectId],
    queryFn: () => getPrimaryContract(projectId),
    enabled: !!projectId,
  });

  const markRoleMutation = useMutation({
    mutationFn: ({ docId, role }: { docId: number; role: "primary_contract" | "other" }) =>
      setProjectDocumentRole(projectId, docId, role),
    onSuccess: (resp) => {
      toast.success(resp.message);
      queryClient.invalidateQueries({ queryKey: ["project-primary-contract", projectId] });
    },
    onError: () => toast.error("Failed to update document role."),
  });

  const handleFileSelected = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await uploadProjectDocument(projectId, file, (p) => setUploadProgress(p));
      // Immediately mark this newly-uploaded doc as the primary contract.
      const docId = Number((uploaded as any).id ?? (uploaded as any)._id);
      if (!docId) throw new Error("Upload succeeded but no document id was returned.");
      await setProjectDocumentRole(projectId, docId, "primary_contract");
      toast.success(`'${file.name}' set as the primary contract. AI analyses will now anchor against it.`);
      queryClient.invalidateQueries({ queryKey: ["project-primary-contract", projectId] });
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-xl bg-white shadow-sm p-5 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading primary contract…
      </div>
    );
  }

  const filled = data?.primary_contract;

  // ── EMPTY state — prominent CTA ─────────────────────────────────
  if (!filled) {
    return (
      <div className="relative border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-medium text-amber-900">
                Upload your project's official contract
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-amber-800 bg-amber-200/60 px-1.5 py-0.5 rounded">
                Required for AI analysis
              </span>
            </div>
            <p className="text-sm text-amber-900/80 leading-relaxed max-w-2xl">
              Mark the signed JBCC / NEC / GCC agreement as your{" "}
              <strong>primary contract</strong> so Baselinq AI knows which
              document is authoritative. Supporting documents (Bills of
              Quantities, addenda, specifications) can be uploaded
              afterwards and will be retrieved alongside it, weighted by
              role.
            </p>
            {data?.candidate_count && data.candidate_count > 0 ? (
              <p className="text-xs text-amber-800 mt-2">
                {data.candidate_count} document{data.candidate_count !== 1 ? "s" : ""} already uploaded on this project but none marked as primary. You can either mark one of them in the document list below, or upload the official agreement now.
              </p>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />
            {canUploadDocument && (
              <div className="mt-4 flex items-center gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-9 px-4 bg-amber-700 hover:bg-amber-800 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Uploading… {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-2" />
                      Upload primary contract (PDF)
                    </>
                  )}
                </Button>
                <span className="text-xs text-amber-800/70">
                  PDF only · max 50&nbsp;MB
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── FILLED state — badge + actions ──────────────────────────────
  const age = relativeAge(filled.uploaded_at);
  const supportingCount = data?.supporting_documents?.length ?? 0;

  return (
    <div className="border border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">
              Primary Contract
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">
              AI anchor
            </span>
            {supportingCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                · {supportingCount} supporting document{supportingCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <h3 className="text-base font-medium text-foreground flex items-center gap-2 truncate">
            <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="truncate">{filled.name || filled.file_name}</span>
          </h3>
          {age && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Uploaded {age}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            This document anchors every AI analysis on this project.
            Bill of Quantities, addenda and specifications are retrieved
            alongside it but weighted lower so this contract's clauses
            win in tie cases.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelected(f);
            }}
          />
          <div className="mt-3 flex items-center gap-2">
            {canUploadDocument && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 px-3 text-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    Replacing… {uploadProgress}%
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-3 h-3 mr-1.5" />
                    Replace
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                if (!confirm("Remove primary contract designation? AI analyses will continue but won't anchor against any specific document.")) return;
                markRoleMutation.mutate({ docId: filled.id, role: "other" });
              }}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Unset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrimaryContractCard;
