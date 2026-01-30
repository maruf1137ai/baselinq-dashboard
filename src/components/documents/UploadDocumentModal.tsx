import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-[16px] text-[#1A1F36] font-normal">Upload Document</DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <div className="border-2 border-dashed border-[#E5E7EB] rounded-[20px] p-10 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-[#F0F4FF] rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-[#8081F6]" />
            </div>
            
            <div className="space-y-2">
              <p className="text-[16px] text-[#1A1F36]">Drag and drop your document here</p>
              <p className="text-[14px] text-[#6B7280]">or click to browse your files</p>
            </div>

            <Button className="bg-[#8081F6] hover:bg-[#6b6ce0] text-white px-8 py-2.5 h-auto text-[15px] font-medium rounded-lg">
              Choose File
            </Button>

            <p className="text-[13px] text-[#6B7280]">
              Supported formats: PDF, DOCX, XLSX, PNG, JPG
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDocumentModal;
