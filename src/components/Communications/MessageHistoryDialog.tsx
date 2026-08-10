import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History } from 'lucide-react';
import { formatDateTime } from '@/lib/dateUtils';

interface EditHistoryEntry {
  previous_content: string;
  edited_by: string | null;
  edited_at: string;
}

interface MessageHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: {
    content: string;
    sender_name?: string;
    edited_at?: string | null;
    edit_history?: EditHistoryEntry[];
  } | null;
}

export const MessageHistoryDialog: React.FC<MessageHistoryDialogProps> = ({ isOpen, onClose, message }) => {
  const history = message?.edit_history || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 overflow-hidden max-h-[80vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Edit History
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-3 overflow-y-auto">
          <div className="bg-muted/50 border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">Current</span>
              <span className="text-xs text-muted-foreground">
                {message?.edited_at ? formatDateTime(message.edited_at) : ''}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{message?.content}</p>
          </div>

          {history.map((entry, index) => (
            <div key={index} className="border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{entry.edited_by || 'Unknown'}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(entry.edited_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.previous_content}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
