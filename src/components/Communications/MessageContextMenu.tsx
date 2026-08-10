import React from 'react';
import { Copy, Pencil, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface MessageContextMenuProps {
  message: { content: string; is_edited?: boolean };
  isOwnMessage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  children: React.ReactNode;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  isOwnMessage,
  onEdit,
  onDelete,
  onViewHistory,
  children,
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </ContextMenuItem>
        {isOwnMessage && (
          <ContextMenuItem onSelect={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </ContextMenuItem>
        )}
        {message.is_edited && (
          <ContextMenuItem onSelect={onViewHistory}>
            <History className="h-4 w-4 mr-2" />
            View Edit History
          </ContextMenuItem>
        )}
        {isOwnMessage && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={onDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
