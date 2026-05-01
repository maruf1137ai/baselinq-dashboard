import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen, Upload, FileText, File, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFolders } from '@/hooks/useFolders';
import type { Folder, FolderTab } from '@/types/folder';
import type { ApiDocument } from '@/components/documents/DocumentTable';
import { Button } from '@/components/ui/button';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface FoldersViewProps {
  projectId: string;
  tab: FolderTab;
  documents?: ApiDocument[];
  onDocumentClick?: (id: string) => void;
  onViewRegister?: (folderId: string, folderName: string) => void;
}

// Neutral palette, consistent across all tabs — primary purple is the only accent.
const NEUTRAL_THEME = {
  fg: 'text-muted-foreground',
  bgSoft: 'bg-muted/20',
  chip: 'bg-primary/10 text-primary',
  dot: 'bg-primary/30',
};

interface FolderRowProps {
  folder: Folder;
  docs: ApiDocument[];
  tab: FolderTab;
  onDocumentClick?: (id: string) => void;
  onViewRegister?: (folderId: string, folderName: string) => void;
}

function FolderRow({ folder, docs, tab, onDocumentClick, onViewRegister }: FolderRowProps) {
  const [isOpen, setIsOpen] = useState(docs.length > 0);
  const navigate = useNavigate();

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/documents/upload?tab=${tab}&folder_id=${folder._id}`);
  };

  const handleViewRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewRegister?.(folder._id, folder.name.replace(/_/g, ' '));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-2 py-2.5 px-4 hover:bg-muted/40 cursor-pointer transition-colors group border-t border-border/50',
            isOpen && NEUTRAL_THEME.bgSoft,
          )}
        >
          <div className="flex-shrink-0 text-muted-foreground">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <div className="flex-shrink-0 text-muted-foreground">
            {isOpen ? <FolderOpen className="w-4 h-4" /> : <FolderIcon className="w-4 h-4" />}
          </div>
          <span className="text-sm text-foreground flex-1">{folder.name.replace(/_/g, ' ')}</span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              docs.length > 0
                ? `${NEUTRAL_THEME.chip} font-medium`
                : 'bg-muted text-muted-foreground',
            )}
          >
            {docs.length}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleViewRegister}
              title="View Issue Register"
            >
              <FileText className="w-3 h-3 mr-1" />
              Register
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleUpload}
              title="Upload Document"
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {docs.length === 0 ? (
          <div className="py-3 px-4 pl-12 text-xs text-muted-foreground border-t border-border/30">
            No documents in this folder yet.
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center gap-2 py-2 px-4 pl-12 hover:bg-muted/30 cursor-pointer transition-colors border-t border-border/30"
              onClick={() => onDocumentClick?.(doc._id)}
            >
              <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground truncate flex-1">{doc.name}</span>
              {doc.reference && (
                <span className="text-xs text-muted-foreground font-mono">{doc.reference}</span>
              )}
            </div>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Discipline → Folder → Documents view for Drawings and Documents tabs.
 * Mirrors the ContractsTree visual language but for the flat suggestion-based
 * folder structure created by the upload wizard.
 */
export function FoldersView({ projectId, tab, documents, onDocumentClick, onViewRegister }: FoldersViewProps) {
  const [headerOpen, setHeaderOpen] = useState(true);
  const { data, isLoading, error } = useFolders({ projectId, tab });
  const navigate = useNavigate();

  // For drawings/documents the seeded tree is empty; folders are created flat.
  // We still recurse via children just in case.
  const allFolders = useMemo(() => {
    const flat: Folder[] = [];
    const walk = (nodes: Folder[]) => {
      nodes.forEach((n) => {
        flat.push(n);
        if (n.children?.length) walk(n.children);
      });
    };
    walk(Array.isArray(data) ? data : []);
    return flat;
  }, [data]);

  const docsByFolderId = useMemo(() => {
    const map = new Map<string, ApiDocument[]>();
    (documents ?? []).forEach((doc) => {
      if (doc.folderId) {
        const arr = map.get(doc.folderId) ?? [];
        arr.push(doc);
        map.set(doc.folderId, arr);
      }
    });
    return map;
  }, [documents]);

  // Group folders by discipline (the logical grouping for Drawings/Documents)
  const foldersByDiscipline = useMemo(() => {
    const map = new Map<string, Folder[]>();
    allFolders.forEach((f) => {
      const key = f.discipline || 'Uncategorized';
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    });
    return map;
  }, [allFolders]);

  // Any doc we can't place under a visible folder — either no folderId (truly
  // unfiled) OR folderId points to a folder not in the fetched tree (e.g. a
  // doc whose Document.type maps to this tab but whose folder lives under a
  // different tab, or was deleted).
  const visibleFolderIds = useMemo(
    () => new Set(allFolders.map((f) => f._id)),
    [allFolders],
  );
  const unfiledDocs = (documents ?? []).filter(
    (d) => !d.folderId || !visibleFolderIds.has(d.folderId),
  );
  const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <AwesomeLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-destructive">Failed to load folders. Please try again.</p>
      </div>
    );
  }

  const hasAnyFolders = allFolders.length > 0;
  const hasAnyDocs = (documents?.length ?? 0) > 0;

  if (!hasAnyFolders && !hasAnyDocs) {
    return (
      <div className="bg-white rounded-lg border border-border py-10 text-center">
        <FolderPlus className="w-6 h-6 mx-auto mb-3 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-foreground mb-1">No {tab} yet</p>
        <p className="text-xs text-muted-foreground mb-4">
          Upload your first {tabLabel.replace(/s$/, '').toLowerCase()} to create a folder.
        </p>
        <Button
          className="h-8 text-xs rounded-lg bg-primary text-white hover:opacity-90"
          onClick={() => navigate(`/documents/upload?tab=${tab}`)}
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Upload {tabLabel.replace(/s$/, '')}
        </Button>
      </div>
    );
  }

  // Sort disciplines alphabetically; Uncategorized last
  const disciplineKeys = Array.from(foldersByDiscipline.keys()).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Header — collapsible */}
      <button
        type="button"
        onClick={() => setHeaderOpen((v) => !v)}
        className="w-full px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
      >
        <div>
          <h3 className="text-sm font-medium text-foreground">{tabLabel} by Folder</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Folders are grouped by discipline. Click a folder to see its documents.
          </p>
        </div>
        {headerOpen
          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {headerOpen && (
        <>
          {disciplineKeys.map((discipline) => {
            const folders = foldersByDiscipline.get(discipline) ?? [];
            const totalDocs = folders.reduce((sum, f) => sum + (docsByFolderId.get(f._id)?.length ?? 0), 0);

            return (
              <div key={discipline} className="border-b border-border last:border-b-0">
                {/* Discipline header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b border-border/50">
                  <div className={cn('w-1.5 h-1.5 rounded-full', NEUTRAL_THEME.dot)} />
                  <span className="text-xs font-medium text-foreground">{discipline}</span>
                  <span className="text-xs text-muted-foreground">
                    {folders.length} folder{folders.length !== 1 ? 's' : ''} · {totalDocs} doc{totalDocs !== 1 ? 's' : ''}
                  </span>
                </div>

                {folders.map((folder) => (
                  <FolderRow
                    key={folder._id}
                    folder={folder}
                    docs={docsByFolderId.get(folder._id) ?? []}
                    tab={tab}
                    onDocumentClick={onDocumentClick}
                    onViewRegister={onViewRegister}
                  />
                ))}
              </div>
            );
          })}

          {unfiledDocs.length > 0 && (
            <div className="border-t-2 border-border">
              <div className="px-4 py-2 bg-muted/20">
                <p className="text-xs font-medium text-foreground">Unfiled ({unfiledDocs.length})</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded before folder structure was set up. Re-upload to file under a folder.
                </p>
              </div>
              {unfiledDocs.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center gap-2 py-2 px-4 pl-10 hover:bg-muted/40 cursor-pointer transition-colors border-t border-border/30"
                  onClick={() => onDocumentClick?.(doc._id)}
                >
                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{doc.name}</span>
                  {doc.reference && (
                    <span className="text-xs text-muted-foreground font-mono">{doc.reference}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
