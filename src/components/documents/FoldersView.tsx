import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen, Upload, FileText, File, FolderPlus, Sparkles } from 'lucide-react';
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

interface FolderRowProps {
  folder: Folder;
  docs: ApiDocument[];
  tab: FolderTab;
  onDocumentClick?: (id: string) => void;
  onViewRegister?: (folderId: string, folderName: string) => void;
}

/** Compact relative-time formatter — matches ContractsTree. */
function formatRelative(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffDay = Math.floor((Date.now() - then) / 86_400_000);
  if (diffDay < 1) return 'today';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Folder row for Drawings / Documents. Two visual levels:
 *   - Folder header: subtle bg, folder icon, name, count chip,
 *     activity dot + AI-flag indicator, hover actions.
 *   - Document rows inside: distinct styling — file icon in primary
 *     well, two-line layout (name + type · uploader · when), monospace
 *     ref chip on right. Visually unmistakeable from a folder.
 */
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

  const hasRecent = docs.some(d => new Date(d.createdAt).getTime() > Date.now() - SEVEN_DAYS);
  const hasAiFlags = docs.some(d => (d.aiFlags ?? 0) > 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            // Folder rows always sit on a warm muted band so they're
            // visually distinct from the white document rows below.
            'flex items-center gap-2 py-2.5 px-4 bg-muted/20 hover:bg-muted/35 cursor-pointer transition-colors group border-t border-border/50',
          )}
        >
          <div className="flex-shrink-0 text-muted-foreground">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <div className="flex-shrink-0 text-muted-foreground">
            {isOpen ? <FolderOpen className="w-3.5 h-3.5" /> : <FolderIcon className="w-3.5 h-3.5" />}
          </div>
          <span className="text-sm text-foreground flex-1 truncate">{folder.name.replace(/_/g, ' ')}</span>

          {hasAiFlags && (
            <span className="text-amber-600 shrink-0" title="Contains AI findings">
              <Sparkles className="w-3 h-3" />
            </span>
          )}
          {hasRecent && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Recent activity" />
          )}

          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full tabular-nums shrink-0',
              docs.length > 0
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/40 text-muted-foreground',
            )}
          >
            {docs.length}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={handleViewRegister}
              title="View Issue Register"
            >
              <FileText className="w-3 h-3 mr-1" />
              Register
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
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
          <div className="py-3 px-4 pl-12 text-xs text-muted-foreground italic border-t border-border/30">
            No documents in this folder yet.
          </div>
        ) : (
          <div className="ml-7">
            {docs.map((doc, idx) => (
              <div
                key={doc._id}
                className={cn(
                  "flex items-center gap-3 py-2.5 pr-4 pl-4 bg-white hover:bg-primary/[0.03] cursor-pointer transition-colors group/doc relative",
                  idx > 0 && "border-t border-border/40"
                )}
                onClick={() => onDocumentClick?.(doc._id)}
              >
                {/* Primary accent stripe down the left — same indicator
                    used in ContractsTree, makes documents pop against
                    the muted folder bands. */}
                <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-primary/40 group-hover/doc:bg-primary transition-colors" />
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover/doc:bg-primary/15 transition-colors">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate group-hover/doc:text-primary transition-colors">
                    {doc.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.type || '—'}
                    {doc.uploadedBy?.name && (
                      <>
                        <span aria-hidden className="mx-1">·</span>
                        {doc.uploadedBy.name}
                      </>
                    )}
                    {doc.createdAt && (
                      <>
                        <span aria-hidden className="mx-1">·</span>
                        {formatRelative(doc.createdAt)}
                      </>
                    )}
                  </p>
                </div>
                {doc.reference && (
                  <span className="font-mono text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-md shrink-0">
                    {doc.reference}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover/doc:text-primary shrink-0 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Discipline → Folder → Documents view for Drawings and Documents tabs.
 *
 * Visual hierarchy:
 *   - Discipline group header (e.g. "Architectural"): prominent — accent
 *     stripe, bigger label, doc count summary.
 *   - Folder rows within each discipline: secondary — folder icon, name,
 *     count chip, activity indicators.
 *   - Document rows inside each folder: distinct file-card style, two
 *     lines, primary-coloured icon well, monospace ref chip.
 */
export function FoldersView({ projectId, tab, documents, onDocumentClick, onViewRegister }: FoldersViewProps) {
  const { data, isLoading, error } = useFolders({ projectId, tab });
  const navigate = useNavigate();

  // For drawings/documents the seeded tree is empty; folders are created flat.
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

  // Group folders by discipline.
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

  // Sort disciplines alphabetically; Uncategorized last.
  const disciplineKeys = Array.from(foldersByDiscipline.keys()).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {disciplineKeys.map((discipline) => {
        const folders = foldersByDiscipline.get(discipline) ?? [];
        const totalDocs = folders.reduce((sum, f) => sum + (docsByFolderId.get(f._id)?.length ?? 0), 0);
        const hasRecent = folders.some(f => (docsByFolderId.get(f._id) ?? []).some(d => new Date(d.createdAt).getTime() > Date.now() - SEVEN_DAYS));

        return (
          <div key={discipline} className="border-b border-border last:border-b-0">
            {/* Discipline header — strong visual band at the top of each
                discipline section. Stone/warm tint so the section reads
                as a "header strip" against the white doc rows below. */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 relative border-b border-border">
              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r" />
              <span className="text-sm font-medium text-foreground tracking-tight">{discipline}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {folders.length} folder{folders.length !== 1 ? 's' : ''} · {totalDocs} doc{totalDocs !== 1 ? 's' : ''}
              </span>
              {hasRecent && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Recent activity" />
              )}
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
        <div className="border-t-2 border-border bg-muted/10">
          <div className="px-4 py-2.5">
            <p className="text-xs font-medium text-foreground">Unfiled ({unfiledDocs.length})</p>
            <p className="text-[11px] text-muted-foreground">
              Uploaded before folder structure was set up. Re-upload to file under a folder.
            </p>
          </div>
          {unfiledDocs.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center gap-3 py-2 px-4 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onDocumentClick?.(doc._id)}
            >
              <File className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 ml-7" />
              <span className="text-sm text-muted-foreground truncate flex-1">{doc.name}</span>
              {doc.reference && (
                <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                  {doc.reference}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
