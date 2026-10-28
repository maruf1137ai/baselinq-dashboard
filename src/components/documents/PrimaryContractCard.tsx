/**
 * Primary Contract notice — Documents page, under the page header.
 *
 * WEIGHT
 * ------
 * This is a PRECONDITION NOTICE, not a hero. It used to be a dashed amber
 * card with a `p-6` body, a 48x48 amber icon tile, an uppercase amber chip,
 * a four-line paragraph and a solid amber-700 button — roughly 190px of
 * chrome, sitting ABOVE the page title, on a page whose actual subject is
 * the document list below it.
 *
 * It now follows the pattern the homepage already settled on for exactly
 * this class of thing (see the composition block in `Index.tsx` and
 * `PrimaryContractAlert`): ONE bounded container of hairline-divided rows,
 * `empty:hidden`, no amber FILL, a single amber icon carrying the whole
 * signal. Everything the card could do, it still does — upload-and-mark,
 * replace, unset, the candidate-count hint, the same permission gate, the
 * same progress read-out — it just does it at the weight of a row.
 *
 * Two states:
 *   1. EMPTY — no primary contract set yet. One row: the consequence, and
 *      the upload action. This is what the AI MVP needs from the user:
 *      tell us WHICH uploaded doc is the official signed contract.
 *   2. FILLED — primary contract set. One row: the filename, its age, and
 *      the Replace / Unset actions.
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
  Upload,
  AlertTriangle,
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

/**
 * The precondition container and its rows — the same grammar as the
 * homepage precondition stack: one bounded card, hairline-divided rows,
 * `empty:hidden` so a satisfied precondition draws nothing at all rather
 * than an empty 2px box.
 */
const SHELL =
  "empty:hidden bg-card border border-border rounded-xl overflow-hidden divide-y divide-border";
const ROW = "flex items-center gap-3 px-4 py-2.5 min-w-0";

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
      <div className={SHELL}>
        <div className={ROW + " text-sm text-muted-foreground"}>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Loading primary contract…
        </div>
      </div>
    );
  }

  const filled = data?.primary_contract;

  // ── EMPTY state — one row, the consequence and the action ──────
  if (!filled) {
    const candidates = data?.candidate_count ?? 0;
    return (
      <div className={SHELL}>
        <div className={ROW}>
          {/* The ONE amber thing. No amber fill, no amber chip, no amber
              button — the icon carries the whole signal. */}
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-foreground flex-1 min-w-0">
            No primary contract set — AI answers cite generic clauses until you
            mark the signed agreement as primary.
            {candidates > 0 && (
              <span className="text-muted-foreground">
                {" "}
                {candidates} document{candidates !== 1 ? "s" : ""} uploaded, none marked; mark one
                in the list below, or upload the agreement now.
              </span>
            )}
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
          {canUploadDocument && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 px-3 text-xs shrink-0"
              title="PDF only · max 50 MB"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Uploading… {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="mr-1.5" />
                  Upload contract
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── FILLED state — one row, the filename and its two actions ────
  const age = relativeAge(filled.uploaded_at);
  const supportingCount = data?.supporting_documents?.length ?? 0;

  return (
    <div className={SHELL}>
      <div className={ROW}>
        <FileCheck2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-foreground flex-1 min-w-0 truncate">
          <span className="text-muted-foreground">Primary contract</span>{" "}
          {filled.name || filled.file_name}
          <span className="text-muted-foreground">
            {age ? ` · uploaded ${age}` : ""}
            {supportingCount > 0
              ? ` · ${supportingCount} supporting document${supportingCount !== 1 ? "s" : ""}`
              : ""}
          </span>
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
        <div className="flex items-center gap-1 shrink-0">
          {canUploadDocument && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Replacing… {uploadProgress}%
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-1.5" />
                  Replace
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!confirm("Remove primary contract designation? AI analyses will continue but won't anchor against any specific document.")) return;
              markRoleMutation.mutate({ docId: filled.id, role: "other" });
            }}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Unset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrimaryContractCard;
