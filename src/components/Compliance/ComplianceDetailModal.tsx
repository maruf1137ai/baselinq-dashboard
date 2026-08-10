import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, FileText, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useObligationEvidence, useUpdateObligationNotes } from '@/hooks/useCompliance';
import type { ComplianceObligation } from '@/hooks/useCompliance';

interface ComplianceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number | null;
  obligation: ComplianceObligation | null;
}

const statusBadge: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  'In Progress': 'bg-amber-50 text-amber-700',
  Completed: 'bg-green-50 text-green-700',
};

function formatDue(dueDate: string | null): string {
  if (!dueDate) return 'No due date';
  return new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ComplianceDetailModal: React.FC<ComplianceDetailModalProps> = ({ isOpen, onClose, projectId, obligation }) => {
  const [notes, setNotes] = useState('');
  const { data: evidence, isLoading: isEvidenceLoading } = useObligationEvidence(isOpen ? obligation?._id ?? null : null);
  const { mutateAsync: updateNotes, isPending: isSavingNotes } = useUpdateObligationNotes(projectId);

  useEffect(() => {
    if (isOpen) {
      setNotes(obligation?.notes || '');
    }
  }, [isOpen, obligation]);

  const handleSaveNotes = async () => {
    if (!obligation) return;
    try {
      await updateNotes({ documentId: obligation.documentId, obligationId: obligation._id, notes });
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg" className="p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>{obligation?.title || 'Compliance item'}</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={`${obligation?.isOverdue ? 'bg-red-100 text-red-800 font-medium' : statusBadge[obligation?.status || 'Pending']} border-0 text-xs px-2 py-0.5 rounded-full`}>
                {obligation?.isOverdue ? `${obligation.daysOverdue}d overdue` : (obligation?.status || 'Pending')}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Due {formatDue(obligation?.dueDate ?? null)}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" /> {obligation?.documentReference} — {obligation?.documentName}
            </div>

            {obligation?.responsibleRole && (
              <div className="text-xs text-muted-foreground">Responsible: {obligation.responsibleRole}</div>
            )}
          </div>

          {/* Drafted Notice */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" /> Drafted Notice
            </label>
            {obligation?.noticeGeneratedAt ? (
              <div className="bg-muted/50 border border-border py-3 px-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                {obligation.noticeContent}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">
                No notice drafted yet — use "Generate & Link Notice" to draft one.
              </p>
            )}
          </div>

          {/* Evidence */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" /> Evidence files
            </label>
            {isEvidenceLoading && (
              <p className="text-sm text-muted-foreground py-2">Loading evidence...</p>
            )}
            {!isEvidenceLoading && (!evidence || evidence.length === 0) && (
              <p className="text-sm text-muted-foreground italic py-2">No evidence files attached yet.</p>
            )}
            {!isEvidenceLoading && evidence && evidence.length > 0 && (
              <div className="space-y-2">
                {evidence.map((file) => (
                  <a
                    key={file._id}
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-muted/50 border border-border py-2 px-3 rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    <span className="text-foreground truncate">{file.fileName}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-3">
                      {file.uploadedBy.name || 'Unknown'} · {formatDateTime(file.createdAt)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this compliance item..."
              className="min-h-[120px] font-sans text-base leading-relaxed resize-none"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose} className="bg-card">
            Close
          </Button>
          <Button
            className="bg-primary hover:bg-primary text-primary-foreground"
            onClick={handleSaveNotes}
            disabled={isSavingNotes || !obligation}
          >
            {isSavingNotes ? 'Saving...' : 'Save Notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComplianceDetailModal;
