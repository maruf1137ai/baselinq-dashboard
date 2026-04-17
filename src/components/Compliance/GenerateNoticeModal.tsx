import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface GenerateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GenerateNoticeModal: React.FC<GenerateNoticeModalProps> = ({ isOpen, onClose }) => {
  const [recipients, setRecipients] = useState<string[]>(['client@project.com']);
  const [newRecipient, setNewRecipient] = useState('');
  const [noticeContent, setNoticeContent] = useState(`RE: Client Approval for VO-001

Dear Client,

In accordance with JBCC 13.3, we hereby provide notice regarding Client Approval for VO-001.

This matter requires your immediate attention as it blocks payment.

2 days until penalty clause applies`);

  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newRecipient.trim()) {
      e.preventDefault();
      if (!recipients.includes(newRecipient.trim())) {
        setRecipients([...recipients, newRecipient.trim()]);
      }
      setNewRecipient('');
    }
  };

  const removeRecipient = (recipientToRemove: string) => {
    setRecipients(recipients.filter(r => r !== recipientToRemove));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white   p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg text-foreground font-normal">Generate Notice</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal">Compliance Item</label>
            <div className="bg-sidebar border border-border py-[9px] px-[17px] rounded-xl text-muted-foreground text-base">
              Client Approval for VO-001
            </div> 
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal">Recipients</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {recipients.map((recipient) => (
                <Badge key={recipient} variant="secondary" className="bg-[#E8F1FF] rounded-xl text-[#3A6FF7] hover:bg-blue-100 gap-1 pl-2 pr-1 py-1 font-normal">
                  {recipient}
                  <button onClick={() => removeRecipient(recipient)} className="hover:bg-blue-200 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input 
              placeholder="Add recipient email..." 
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              onKeyDown={handleAddRecipient}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-normal">Notice Content</label>
            <Textarea 
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
              className="min-h-[200px] font-sans text-base leading-relaxed resize-none"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t  flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="bg-white">
            Cancel
          </Button>
          <Button className="bg-[#6c5ce7] hover:bg-[#6c5ce7] text-white">
            Generate & Link to Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateNoticeModal;
