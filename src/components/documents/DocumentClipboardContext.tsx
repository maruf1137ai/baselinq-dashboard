import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { moveDocument, duplicateDocument, patchData } from '@/lib/Api';
import type { ApiDocument } from '@/components/documents/DocumentTable';
import type { FolderTab } from '@/types/folder';
import { useFolders } from '@/hooks/useFolders';
import { buildFolderIndex, buildDocPath, buildFolderPath } from '@/lib/documentPath';
import { TAB_TO_CATEGORY, getCategoryForDoc } from '@/lib/documentTaxonomy';
import {
  MoveConfirmDialog,
  type PendingMove,
  type CrossTabFields,
} from './MoveConfirmDialog';

/** The document type that the AI analysis / RAG knowledge base depend on. */
const CONTRACT_TYPE = 'Contract Agreement';

type Operation = 'copy' | 'cut';

interface ClipboardEntry {
  doc: ApiDocument;
  operation: Operation;
  /** Source tab (kept for reference; cross-tab paste is now allowed). */
  tab: FolderTab;
}

interface DocumentClipboardValue {
  entry: ClipboardEntry | null;
  /** True while a move/copy/paste request is in flight. */
  isBusy: boolean;
  copy: (doc: ApiDocument, tab: FolderTab) => void;
  cut: (doc: ApiDocument, tab: FolderTab) => void;
  clear: () => void;
  /** Whether the current clipboard item can be pasted (any tab now). */
  canPasteInto: (tab: FolderTab) => boolean;
  /** Paste the clipboard item into a folder — opens the move-confirm dialog. */
  paste: (targetFolderId: string, tab: FolderTab) => void;
  /** Ask to move/copy a document into a folder — opens the confirm dialog.
   *  Used by drag-and-drop (operation 'move') and by paste. */
  requestMove: (args: { doc: ApiDocument; operation: 'move' | 'copy'; destFolderId: string }) => void;
  /** Breadcrumb path string for a document ("Tab / Folder / … / Title"). */
  getDocPath: (doc: ApiDocument) => string;
}

const DocumentClipboardContext = createContext<DocumentClipboardValue | null>(null);

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;

export const DocumentClipboardProvider: React.FC<{
  projectId: string;
  /** Called after a successful cross-tab move so the host can switch tabs. */
  onMovedToTab?: (tab: FolderTab) => void;
  children: React.ReactNode;
}> = ({ projectId, onMovedToTab, children }) => {
  const queryClient = useQueryClient();
  const [entry, setEntry] = useState<ClipboardEntry | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);

  // All three folder trees, merged into one id→folder index. Reuses the same
  // ['folders', projectId, tab] cache the tree views already populate, so this
  // adds no extra network cost. Needed to resolve a destination folder's tab
  // and to build breadcrumb paths for the confirm dialog / "copy path".
  const contracts = useFolders({ projectId, tab: 'contracts' });
  const drawings = useFolders({ projectId, tab: 'drawings' });
  const documents = useFolders({ projectId, tab: 'documents' });
  const folderIndex = useMemo(
    () =>
      buildFolderIndex([
        ...(contracts.data ?? []),
        ...(drawings.data ?? []),
        ...(documents.data ?? []),
      ]),
    [contracts.data, drawings.data, documents.data],
  );

  const invalidate = useCallback(() => {
    // Prefix match refetches the 'all' and 'filtered' document variants; the
    // folder counts and summary update too.
    queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
    queryClient.invalidateQueries({ queryKey: ['documents-summary', projectId] });
    queryClient.invalidateQueries({ queryKey: ['folders', projectId] });
  }, [queryClient, projectId]);

  const moveMutation = useMutation({
    mutationFn: ({ docId, folderId }: { docId: string; folderId: string }) =>
      moveDocument(projectId, docId, folderId),
    onSuccess: invalidate,
    onError: (err) => toast.error(errMsg(err, 'Failed to move document.')),
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ docId, folderId }: { docId: string; folderId: string }) =>
      duplicateDocument(projectId, docId, folderId),
    onSuccess: invalidate,
    onError: (err) => toast.error(errMsg(err, 'Failed to copy document.')),
  });

  const patchMoveMutation = useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: Record<string, unknown> }) =>
      patchData({ url: `documents/${docId}/?project_id=${projectId}`, data }),
    onSuccess: invalidate,
    onError: (err) => toast.error(errMsg(err, 'Failed to move document.')),
  });

  const isBusy =
    moveMutation.isPending || duplicateMutation.isPending || patchMoveMutation.isPending;

  const copy = useCallback((doc: ApiDocument, tab: FolderTab) => {
    if (doc.type === CONTRACT_TYPE) {
      toast.error('The project contract cannot be copied. You can move it instead.');
      return;
    }
    setEntry({ doc, operation: 'copy', tab });
    toast.success(`Copied "${doc.name}"`);
  }, []);

  const cut = useCallback((doc: ApiDocument, tab: FolderTab) => {
    setEntry({ doc, operation: 'cut', tab });
    toast.success(`Cut "${doc.name}"`);
  }, []);

  const clear = useCallback(() => setEntry(null), []);

  // Cross-tab paste is allowed now — the confirm dialog handles category change.
  const canPasteInto = useCallback(
    (_tab: FolderTab) => !!entry && !isBusy,
    [entry, isBusy],
  );

  const getDocPath = useCallback(
    (doc: ApiDocument) =>
      buildDocPath({
        tab: (doc.folderTab as FolderTab | null) ?? null,
        folderId: doc.folderId ?? null,
        byId: folderIndex.byId,
        docName: doc.name,
        discipline: doc.discipline,
      }),
    [folderIndex],
  );

  const requestMove = useCallback(
    ({ doc, operation, destFolderId }: { doc: ApiDocument; operation: 'move' | 'copy'; destFolderId: string }) => {
      if (isBusy) return;
      if ((doc.folderId ?? null) === destFolderId) return; // dropped back where it started
      const destFolder = folderIndex.byId.get(destFolderId);
      if (!destFolder) {
        toast.error('Destination folder not found.');
        return;
      }
      const destTab = destFolder.tab;
      const sourceTab = (doc.folderTab as FolderTab | null) ?? null;
      const destCategory = TAB_TO_CATEGORY[destTab];
      const sourceCategory = sourceTab ? TAB_TO_CATEGORY[sourceTab] : getCategoryForDoc(doc);
      setPending({
        doc,
        operation,
        sourceTab,
        sourceFolderId: doc.folderId ?? null,
        destTab,
        destFolderId,
        sourcePath: buildFolderPath(doc.folderId ?? null, folderIndex.byId, {
          tab: sourceTab,
          discipline: doc.discipline,
        }),
        destPath: buildFolderPath(destFolderId, folderIndex.byId),
        destCategory,
        crossCategory: sourceCategory !== destCategory,
      });
    },
    [folderIndex, isBusy],
  );

  const paste = useCallback(
    (targetFolderId: string, _tab: FolderTab) => {
      if (!entry || isBusy) return;
      // No-op when cutting into the folder the doc already lives in.
      if (entry.operation === 'cut' && entry.doc.folderId === targetFolderId) {
        clear();
        return;
      }
      requestMove({
        doc: entry.doc,
        operation: entry.operation === 'cut' ? 'move' : 'copy',
        destFolderId: targetFolderId,
      });
    },
    [entry, isBusy, clear, requestMove],
  );

  const handleConfirmSameCategory = useCallback(
    (p: PendingMove) => {
      const onSuccess = () => {
        toast.success(p.operation === 'copy' ? 'Document copied.' : 'Document moved.');
        clear();
        setPending(null);
      };
      if (p.operation === 'copy') {
        duplicateMutation.mutate({ docId: p.doc._id, folderId: p.destFolderId }, { onSuccess });
      } else {
        moveMutation.mutate({ docId: p.doc._id, folderId: p.destFolderId }, { onSuccess });
      }
    },
    [moveMutation, duplicateMutation, clear],
  );

  const handleConfirmCrossCategory = useCallback(
    (p: PendingMove, fields: CrossTabFields) => {
      const data: Record<string, unknown> = {
        folder_id: p.destFolderId,
        type: fields.type,
      };
      if (fields.discipline) data.discipline = fields.discipline;
      if (fields.issuedTo) data.issued_to = fields.issuedTo;
      if (fields.issueStatus) data.issue_status = fields.issueStatus;
      if (fields.certificateSubtype) data.certificate_subtype = fields.certificateSubtype;
      patchMoveMutation.mutate(
        { docId: p.doc._id, data },
        {
          onSuccess: () => {
            toast.success('Document moved.');
            clear();
            setPending(null);
            onMovedToTab?.(p.destTab);
          },
        },
      );
    },
    [patchMoveMutation, clear, onMovedToTab],
  );

  const value = useMemo<DocumentClipboardValue>(
    () => ({ entry, isBusy, copy, cut, clear, canPasteInto, paste, requestMove, getDocPath }),
    [entry, isBusy, copy, cut, clear, canPasteInto, paste, requestMove, getDocPath],
  );

  return (
    <DocumentClipboardContext.Provider value={value}>
      {children}
      <MoveConfirmDialog
        pending={pending}
        projectId={projectId}
        isBusy={isBusy}
        onCancel={() => setPending(null)}
        onConfirmSameCategory={handleConfirmSameCategory}
        onConfirmCrossCategory={handleConfirmCrossCategory}
      />
    </DocumentClipboardContext.Provider>
  );
};

export function useDocumentClipboard(): DocumentClipboardValue {
  const ctx = useContext(DocumentClipboardContext);
  if (!ctx) {
    throw new Error('useDocumentClipboard must be used within a DocumentClipboardProvider');
  }
  return ctx;
}
