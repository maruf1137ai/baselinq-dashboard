import React, { useEffect, useState } from 'react';
import { ArrowRight, FolderInput, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import useFetch from '@/hooks/useFetch';
import {
  CATEGORY_TO_TYPES,
  DISCIPLINES,
  ISSUE_STATUSES,
  type DocCategory,
} from '@/lib/documentTaxonomy';
import type { ApiDocument } from '@/components/documents/DocumentTable';
import type { FolderTab } from '@/types/folder';

/** A move/copy awaiting confirmation. Built by the clipboard provider. */
export interface PendingMove {
  doc: ApiDocument;
  operation: 'move' | 'copy';
  sourceTab: FolderTab | null;
  sourceFolderId: string | null;
  destTab: FolderTab;
  destFolderId: string;
  /** Display breadcrumb of where the doc lives now. */
  sourcePath: string;
  /** Display breadcrumb of the destination folder. */
  destPath: string;
  destCategory: DocCategory;
  /** True when the destination tab/category differs from the source. */
  crossCategory: boolean;
}

/** Extra metadata required to file a doc into a different category. */
export interface CrossTabFields {
  type: string;
  discipline?: string;
  issuedTo?: string;
  issueStatus?: string;
  certificateSubtype?: string;
}

interface MoveConfirmDialogProps {
  pending: PendingMove | null;
  projectId: string;
  isBusy: boolean;
  onCancel: () => void;
  onConfirmSameCategory: (p: PendingMove) => void;
  onConfirmCrossCategory: (p: PendingMove, fields: CrossTabFields) => void;
}

function defaultTypeFor(doc: ApiDocument, destCategory: DocCategory): string {
  const opts = CATEGORY_TO_TYPES[destCategory];
  if (doc.type && opts.includes(doc.type)) return doc.type;
  if (destCategory === 'Drawings') return 'Drawing';
  if (destCategory === 'Contracts') return 'Contract';
  return opts[0] ?? '';
}

export const MoveConfirmDialog: React.FC<MoveConfirmDialogProps> = ({
  pending,
  projectId,
  isBusy,
  onCancel,
  onConfirmSameCategory,
  onConfirmCrossCategory,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [issuedTo, setIssuedTo] = useState('All');
  const [issueStatus, setIssueStatus] = useState<string>(ISSUE_STATUSES[0]);
  const [certificateSubtype, setCertificateSubtype] = useState('');
  const [attempted, setAttempted] = useState(false);

  const { data: capabilities } = useFetch<{ certificateSubtypes: string[] }>(
    projectId ? `documents/user-capabilities/?project_id=${projectId}` : '',
    { enabled: !!projectId },
  );
  const certSubtypes = capabilities?.certificateSubtypes ?? [];

  useEffect(() => {
    if (!pending) return;
    setStep(1);
    setAttempted(false);
    setType(defaultTypeFor(pending.doc, pending.destCategory));
    setDiscipline(pending.doc.discipline ?? '');
    setIssuedTo('All');
    setIssueStatus(ISSUE_STATUSES[0]);
    setCertificateSubtype('');
  }, [pending]);

  if (!pending) return null;

  const { doc, operation, destCategory, crossCategory } = pending;
  const isCopy = operation === 'copy';
  const copyBlocked = isCopy && crossCategory;

  const needsType = destCategory === 'Documents';
  const needsIssue = destCategory === 'Drawings';
  const needsCertSubtype = destCategory === 'Documents' && type === 'Certificate';

  const missingType = needsType && !type;
  const missingIssuedTo = needsIssue && !issuedTo.trim();
  const missingIssueStatus = needsIssue && !issueStatus;
  const missingCertSubtype = needsCertSubtype && !certificateSubtype;
  const step2Valid = !missingType && !missingIssuedTo && !missingIssueStatus && !missingCertSubtype;

  const errCls = (missing: boolean) =>
    attempted && missing ? 'border-red-400 ring-1 ring-red-300' : '';

  const handlePrimary = () => {
    if (copyBlocked) return;
    if (!crossCategory) {
      onConfirmSameCategory(pending);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    setAttempted(true);
    if (!step2Valid) return;
    onConfirmCrossCategory(pending, {
      type,
      discipline: discipline || undefined,
      issuedTo: needsIssue ? issuedTo.trim() || 'All' : undefined,
      issueStatus: needsIssue ? issueStatus : undefined,
      certificateSubtype: needsCertSubtype ? certificateSubtype : undefined,
    });
  };

  const verb = isCopy ? 'Copy' : 'Move';
  const primaryLabel = crossCategory && step === 1 ? 'Next' : verb;

  return (
    <Dialog open onOpenChange={(open) => !open && !isBusy && onCancel()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white border border-border shadow-xl rounded-xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <FolderInput className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-medium text-foreground">
                {verb} document
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* From → To summary (always shown) */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground pt-0.5">From</span>
              <span className="break-all text-foreground leading-snug" title={pending.sourcePath}>
                {pending.sourcePath}
              </span>
            </div>
            <div className="flex items-center gap-2 text-primary pl-0.5">
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground pt-0.5">To</span>
              <span className="break-all font-medium text-foreground leading-snug" title={pending.destPath}>
                {pending.destPath}
              </span>
            </div>
          </div>

          {copyBlocked && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Documents can only be <strong>moved</strong> across tabs, not copied. Cut and paste,
              or drag, to move it instead.
            </p>
          )}

          {/* Cross-category required fields (step 2) */}
          {crossCategory && step === 2 && !copyBlocked && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {pending.destPath.split(' / ')[0]} documents need a little more detail:
              </p>

              {needsType && (
                <div>
                  <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">
                    Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className={cn('h-10 border-border rounded-lg', errCls(missingType))}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_TO_TYPES[destCategory].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsCertSubtype && (
                <div>
                  <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">
                    Certificate Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={certificateSubtype} onValueChange={setCertificateSubtype}>
                    <SelectTrigger className={cn('h-10 border-border rounded-lg', errCls(missingCertSubtype))}>
                      <SelectValue placeholder="Select certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {certSubtypes.map((s) => (
                        <SelectItem key={s} value={s}>{s} Certificate</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsIssue && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">
                      Issued To <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={issuedTo}
                      onChange={(e) => setIssuedTo(e.target.value)}
                      placeholder="e.g. Contractor, All"
                      className={cn('h-10 border-border rounded-lg', errCls(missingIssuedTo))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select value={issueStatus} onValueChange={setIssueStatus}>
                      <SelectTrigger className={cn('h-10 border-border rounded-lg', errCls(missingIssueStatus))}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">Discipline</Label>
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger className="h-10 border-border rounded-lg">
                    <SelectValue placeholder="Select discipline (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/30 flex gap-2 shrink-0">
          {crossCategory && step === 2 && !copyBlocked ? (
            <Button variant="outline" onClick={() => setStep(1)} disabled={isBusy}
              className="h-8 text-xs rounded-lg border-border text-foreground">
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={onCancel} disabled={isBusy}
              className="h-8 text-xs rounded-lg border-border text-foreground">
              Cancel
            </Button>
          )}
          <Button onClick={handlePrimary} disabled={isBusy || copyBlocked}
            className="h-8 text-xs rounded-lg">
            {isBusy
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Working…</>
              : primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
