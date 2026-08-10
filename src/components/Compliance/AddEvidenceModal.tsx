import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { S3AttachmentSection } from '@/components/S3AttachmentSection';
import { useS3Upload } from '@/hooks/useS3Upload';
import { useAddObligationEvidence } from '@/hooks/useCompliance';
import { toast } from 'sonner';
import type { ComplianceObligation } from '@/hooks/useCompliance';

interface AddEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number | null;
  obligation: ComplianceObligation | null;
}

const AddEvidenceModal: React.FC<AddEvidenceModalProps> = ({ isOpen, onClose, projectId, obligation }) => {
  const s3Upload = useS3Upload('obligation-evidence/pending');
  const { mutateAsync: addEvidence, isPending } = useAddObligationEvidence(projectId);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!obligation) return;
    if (s3Upload.entries.length === 0) {
      toast.error('Add at least one file before saving.');
      return;
    }
    const ids = s3Upload.entries.map((e) => e.id);
    const keys = await s3Upload.waitForAll(ids);
    let savedAny = false;
    for (const entry of s3Upload.entries) {
      const key = keys.get(entry.id);
      if (!key) {
        toast.error(`Failed to upload ${entry.file.name}`);
        continue;
      }
      try {
        await addEvidence({
          obligationId: obligation._id,
          s3Key: key,
          fileName: entry.file.name,
          fileType: entry.file.type,
        });
        savedAny = true;
      } catch {
        toast.error(`Failed to save evidence for ${entry.file.name}`);
      }
    }
    if (savedAny) {
      toast.success('Evidence saved');
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Add Evidence</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal">Compliance Item</label>
            <div className="bg-muted/50 border border-border py-[9px] px-[17px] rounded-xl text-muted-foreground text-base">
              {obligation?.title || '—'}
            </div>
          </div>

          <S3AttachmentSection s3Upload={s3Upload} inputId="compliance-evidence-upload" label="Evidence files" />
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={handleClose} className="bg-card">
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary text-primary-foreground"
            onClick={handleSave}
            disabled={isPending || !obligation}
          >
            {isPending ? 'Saving...' : 'Save Evidence'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEvidenceModal;
