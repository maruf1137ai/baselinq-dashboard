import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface AddEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddEvidenceModal: React.FC<AddEvidenceModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Add Evidence</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal">Compliance Item</label>
            <div className="bg-sidebar border border-border py-[9px] px-[17px] rounded-xl text-muted-foreground text-base">
              Client Approval for VO-001
            </div>
          </div>

          <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4 bg-muted/50">
            <Upload className="w-10 h-10 text-gray-400" />
            <div className="space-y-1">
              <p className="text-base font-medium text-gray-900">Drop files or browse</p>
              <p className="text-sm text-gray-500">Supported formats: PDF, DOC, DOCX, JPG, PNG</p>
            </div>
            <Button variant="outline" className="bg-card">
              Browse Files
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="bg-card">
            Cancel
          </Button>
          <Button className="bg-primary hover:bg-primary text-primary-foreground">
            Save Evidence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEvidenceModal;
