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
      <DialogContent className="sm:max-w-[600px] bg-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-[19px] text-[#1A1A1A] font-normal">Add Evidence</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[14px] text-[#717784] font-normal">Compliance Item</label>
            <div className="bg-[#F3F2F0] border border-[#E6E8EB] py-[9px] px-[17px] rounded-[10px] text-[#717784] text-base">
              Client Approval for VO-001
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4 bg-gray-50/50">
            <Upload className="w-10 h-10 text-gray-400" />
            <div className="space-y-1">
              <p className="text-base font-medium text-gray-900">Drop files or browse</p>
              <p className="text-sm text-gray-500">Supported formats: PDF, DOC, DOCX, JPG, PNG</p>
            </div>
            <Button variant="outline" className="bg-white">
              Browse Files
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="bg-white">
            Cancel
          </Button>
          <Button className="bg-[#8081F6] hover:bg-[#6b6ce0] text-white">
            Save Evidence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEvidenceModal;
