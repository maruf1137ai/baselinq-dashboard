import React from 'react';
import { Copy, Scissors, ClipboardPaste, Link2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useDocumentClipboard } from './DocumentClipboardContext';
import type { ApiDocument } from '@/components/documents/DocumentTable';
import type { FolderTab } from '@/types/folder';

const CONTRACT_TYPE = 'Contract Agreement';

/**
 * Wraps a document row with a right-click menu:
 * Copy / Cut / Paste · Copy path · Rename · Delete.
 * - Copy is disabled for the project contract (it must not be duplicated).
 * - Paste targets `pasteFolderId` (the doc's own folder) and is disabled when
 *   the clipboard is empty or this row is unfiled.
 * - Rename / Delete are gated on the doc's userPermissions and delegate to the
 *   host page (which owns the dialogs).
 */
export const DocItemContextMenu: React.FC<{
  doc: ApiDocument;
  tab: FolderTab;
  pasteFolderId: string | null;
  onRename?: (doc: ApiDocument) => void;
  onDelete?: (doc: ApiDocument) => void;
  children: React.ReactNode;
}> = ({ doc, tab, pasteFolderId, onRename, onDelete, children }) => {
  const { copy, cut, paste, canPasteInto, getDocPath } = useDocumentClipboard();
  const isContract = doc.type === CONTRACT_TYPE;
  const canPaste = canPasteInto(tab) && !!pasteFolderId;
  const canEdit = doc.userPermissions?.canEdit === true;
  const canDelete = doc.userPermissions?.canDelete === true;

  const handleCopyPath = async () => {
    const path = getDocPath(doc);
    try {
      await navigator.clipboard.writeText(path);
      toast.success('Path copied');
    } catch {
      toast.error('Could not copy path');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem
          disabled={isContract}
          onSelect={() => copy(doc, tab)}
        >
          <Copy className="w-3.5 h-3.5 mr-2" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => cut(doc, tab)}>
          <Scissors className="w-3.5 h-3.5 mr-2" />
          Cut
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canPaste}
          onSelect={() => pasteFolderId && paste(pasteFolderId, tab)}
        >
          <ClipboardPaste className="w-3.5 h-3.5 mr-2" />
          Paste into this folder
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleCopyPath}>
          <Link2 className="w-3.5 h-3.5 mr-2" />
          Copy path
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canEdit || !onRename}
          onSelect={() => onRename?.(doc)}
        >
          <Pencil className="w-3.5 h-3.5 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!canDelete || !onDelete}
          onSelect={() => onDelete?.(doc)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

/**
 * Wraps a folder row with a right-click menu offering only "Paste into this
 * folder" (disabled when the clipboard is empty or in a different tab).
 */
export const FolderItemContextMenu: React.FC<{
  folderId: string;
  tab: FolderTab;
  children: React.ReactNode;
}> = ({ folderId, tab, children }) => {
  const { paste, canPasteInto } = useDocumentClipboard();
  const canPaste = canPasteInto(tab);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          disabled={!canPaste}
          onSelect={() => paste(folderId, tab)}
        >
          <ClipboardPaste className="w-3.5 h-3.5 mr-2" />
          Paste into this folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
