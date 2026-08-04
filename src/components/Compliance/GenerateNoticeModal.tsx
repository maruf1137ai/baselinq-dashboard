import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGenerateObligationNotice } from '@/hooks/useCompliance';
import { toast } from 'sonner';
import type { ComplianceObligation } from '@/hooks/useCompliance';

interface GenerateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number | null;
  obligation: ComplianceObligation | null;
}

const GenerateNoticeModal: React.FC<GenerateNoticeModalProps> = ({ isOpen, onClose, projectId, obligation }) => {
  const [noticeContent, setNoticeContent] = useState('');
  const { mutateAsync: generateNotice, isPending } = useGenerateObligationNotice(projectId);

  useEffect(() => {
    if (isOpen) {
      setNoticeContent(obligation?.noticeContent || '');
    }
  }, [isOpen, obligation]);

  const handleGenerate = async () => {
    if (!obligation) return;
    try {
      const result = await generateNotice(obligation._id);
      setNoticeContent(result.noticeContent);
      toast.success('Notice drafted');
    } catch {
      toast.error('Failed to generate notice');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Generate Notice</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal">Compliance Item</label>
            <div className="bg-muted/50 border border-border py-[9px] px-[17px] rounded-xl text-muted-foreground text-base">
              {obligation?.title || '—'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal">Drafted Notice</label>
            {noticeContent ? (
              <Textarea
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                className="min-h-[200px] font-sans text-base leading-relaxed resize-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground italic py-4">
                No notice drafted yet. Click "Generate" below to draft one from this obligation's
                real details — Baselinq drafts a notice, it never serves one on your behalf.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="bg-card">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isPending || !obligation}
          >
            {isPending ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateNoticeModal;
