/**
 * Create or amend a contractual obligation.
 *
 * The same dialog serves both because the only reason to reopen an obligation
 * from this page is the missing-due-date case: AI extraction writes obligations
 * with no date, and an undated obligation cannot be chased. Recording the date
 * is the fix, so it is one click from the row rather than buried in the
 * document detail page.
 */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ObligationDraft {
  title: string;
  dueDate: string;
  responsibleRole: string;
}

export interface ObligationDocumentOption {
  id: string;
  name: string;
}

interface ObligationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  /** Create mode only — the documents an obligation can be attached to. */
  documents?: ObligationDocumentOption[];
  initial?: Partial<ObligationDraft>;
  /** Create mode passes the chosen document id back; edit mode passes null. */
  onSubmit: (draft: ObligationDraft, documentId: string | null) => void;
  isSaving?: boolean;
}

const EMPTY: ObligationDraft = { title: "", dueDate: "", responsibleRole: "" };

export default function ObligationModal({
  isOpen,
  onClose,
  mode,
  documents = [],
  initial,
  onSubmit,
  isSaving = false,
}: ObligationModalProps) {
  const [draft, setDraft] = useState<ObligationDraft>(EMPTY);
  const [documentId, setDocumentId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDraft({ ...EMPTY, ...initial });
    setDocumentId("");
  }, [isOpen, initial]);

  const canSubmit =
    draft.title.trim().length > 0 && (mode === "edit" || documentId !== "");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Track an obligation" : "Amend obligation"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "create" && (
            <div>
              <label className="text-sm text-foreground">Document</label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select the document that creates it" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {documents.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  No documents on this project yet. Obligations attach to the
                  document that creates them.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-foreground">Obligation</label>
            <Input
              className="mt-1.5"
              value={draft.title}
              placeholder="e.g. Issue revised programme within 14 days"
              onChange={e => setDraft({ ...draft, title: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-foreground">Due date</label>
            <Input
              type="date"
              className="mt-1.5"
              value={draft.dueDate}
              onChange={e => setDraft({ ...draft, dueDate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Without a date the obligation is listed but cannot be tracked as
              overdue. Baselinq does not infer one from the contract.
            </p>
          </div>

          <div>
            <label className="text-sm text-foreground">Responsible role</label>
            <Input
              className="mt-1.5"
              value={draft.responsibleRole}
              placeholder="e.g. Contractor"
              onChange={e => setDraft({ ...draft, responsibleRole: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!canSubmit || isSaving}
            onClick={() => onSubmit(draft, mode === "create" ? documentId : null)}
          >
            {mode === "create" ? "Track obligation" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
