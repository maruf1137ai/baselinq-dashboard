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
import { Label } from "@/components/ui/label";

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

  // Both instances of this dialog are mounted by the Compliance page at once.
  // Only the open one renders (Radix portals the content), but scoping the
  // field ids by mode keeps them unique whatever the dialog is nested in.
  const fieldId = (name: string) => `obligation-${mode}-${name}`;

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
              <Label htmlFor={fieldId("document")} className="text-sm text-foreground">
                Document
              </Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger id={fieldId("document")} className="mt-1.5">
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
            <Label htmlFor={fieldId("title")} className="text-sm text-foreground">
              Obligation
            </Label>
            <Input
              id={fieldId("title")}
              className="mt-1.5"
              value={draft.title}
              placeholder="e.g. Issue revised programme within 14 days"
              onChange={e => setDraft({ ...draft, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor={fieldId("due-date")} className="text-sm text-foreground">
              Due date
            </Label>
            <Input
              id={fieldId("due-date")}
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
            <Label htmlFor={fieldId("responsible-role")} className="text-sm text-foreground">
              Responsible role
            </Label>
            <Input
              id={fieldId("responsible-role")}
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
