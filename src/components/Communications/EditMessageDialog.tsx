import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { patchData } from '@/lib/Api';
import { toast } from 'sonner';

interface EditMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string | number | null;
  message: { id: string | number; content: string } | null;
  onSaved: () => void;
}

export const EditMessageDialog: React.FC<EditMessageDialogProps> = ({ isOpen, onClose, channelId, message, onSaved }) => {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContent(message?.content || '');
    }
  }, [isOpen, message]);

  const handleSave = async () => {
    if (!message || !channelId) return;
    if (!content.trim() || content === message.content) return;
    setIsSaving(true);
    try {
      await patchData({
        url: `channels/${channelId}/messages/${message.id}/`,
        data: { content },
      });
      toast.success('Message updated');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to update message');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] font-sans text-base leading-relaxed resize-none"
            autoFocus
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="bg-card">
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary text-primary-foreground"
            onClick={handleSave}
            disabled={isSaving || !content.trim() || content === message?.content}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
