import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { formatDate } from '@/lib/dateUtils';
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen, Upload, FileText, File, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContractsFolders } from '@/hooks/useFolders';
import type { Folder } from '@/types/folder';
import type { ApiDocument } from '@/components/documents/DocumentTable';
import { Button } from '@/components/ui/button';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DocItemContextMenu, FolderItemContextMenu } from './DocumentContextMenu';

/** Spring-load delay before an drag-hovered folder auto-expands (ms). */
const SPRING_FOLDER_DELAY = 500;

interface ContractsTreeProps {
  projectId: string;
  documents?: ApiDocument[];
  onDocumentClick?: (id: string) => void;
  onViewRegister?: (folderId: string, folderName: string) => void;
  onRenameDoc?: (doc: ApiDocument) => void;
  onDeleteDoc?: (doc: ApiDocument) => void;
}

interface FolderNodeProps {
  folder: Folder;
  depth: number;
  projectId: string;
  docsByFolderId: Map<string, ApiDocument[]>;
  descendantCountById: Map<string, number>;
  hasRecentActivityById: Map<string, boolean>;
  hasAiFlagsById: Map<string, boolean>;
  onDocumentClick?: (id: string) => void;
  onViewRegister?: (folderId: string, folderName: string) => void;
  onRenameDoc?: (doc: ApiDocument) => void;
  onDeleteDoc?: (doc: ApiDocument) => void;
  /**
   * Breadcrumb of ancestor folder names (display-formatted). Top-level node
   * receives []. Used to build the `folder_path` URL param on the row-level
   * Upload button.
   */
  parentPath: string[];
}

/**
 * Compact relative-time formatter — "today" / "Nd ago" / "DD MMM" for older.
 */
function formatRelative(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffDay = Math.floor((Date.now() - then) / 86_400_000);
  if (diffDay < 1) return 'today';
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(iso);
}

/**
 * A single filed document row — draggable (move to another folder) and
 * right-clickable (Copy / Cut / Paste / Copy path / Rename / Delete).
 */
function ContractDocumentRow({
  doc, depth, idx, onDocumentClick, onRenameDoc, onDeleteDoc,
}: {
  doc: ApiDocument;
  depth: number;
  idx: number;
  onDocumentClick?: (id: string) => void;
  onRenameDoc?: (doc: ApiDocument) => void;
  onDeleteDoc?: (doc: ApiDocument) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: doc._id,
    data: { doc },
  });

  return (
    <DocItemContextMenu
      doc={doc}
      tab="contracts"
      pasteFolderId={doc.folderId}
      onRename={onRenameDoc}
      onDelete={onDeleteDoc}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={cn(
          "flex items-center gap-3 py-2 pr-4 bg-white cursor-pointer transition-colors group/doc relative hover:bg-primary/[0.03]",
          idx > 0 && "border-t border-border/40",
          isDragging && "opacity-40",
        )}
        style={{ paddingLeft: `${depth * 16 + 14}px` }}
        onClick={() => onDocumentClick?.(doc._id)}
      >
        {/* Primary accent stripe on the left edge of the row */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary/40 group-hover/doc:bg-primary transition-colors"
          style={{ left: `${depth * 16 + 8}px` }}
        />
        <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover/doc:bg-primary/15 transition-colors">
          <FileText className="w-3.5 h-3.5 text-primary" />
        </div>
        <p className="text-sm truncate flex-1 min-w-0">
          <span className="text-foreground group-hover/doc:text-primary transition-colors">{doc.name}</span>
          <span className="text-muted-foreground ml-2 hidden sm:inline">
            {' · '}{doc.type || '—'}
            {doc.uploadedBy?.name && <>{' · '}{doc.uploadedBy.name}</>}
            {doc.createdAt && <>{' · '}{formatRelative(doc.createdAt)}</>}
          </span>
        </p>
        {doc.reference && (
          <span className="font-mono text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-md shrink-0">
            {doc.reference}
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover/doc:text-primary shrink-0 transition-colors" />
      </div>
    </DocItemContextMenu>
  );
}

/**
 * Unfiled document row — draggable into a folder and right-clickable.
 * Paste-into is disabled here (no folder to paste into).
 */
function ContractsUnfiledRow({
  doc, onDocumentClick, onRenameDoc, onDeleteDoc,
}: {
  doc: ApiDocument;
  onDocumentClick?: (id: string) => void;
  onRenameDoc?: (doc: ApiDocument) => void;
  onDeleteDoc?: (doc: ApiDocument) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: doc._id,
    data: { doc },
  });

  return (
    <DocItemContextMenu
      doc={doc}
      tab="contracts"
      pasteFolderId={null}
      onRename={onRenameDoc}
      onDelete={onDeleteDoc}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => onDocumentClick?.(doc._id)}
        className={cn(
          "flex items-center gap-3 py-2 px-4 hover:bg-muted/30 cursor-pointer transition-colors group/doc",
          isDragging && "opacity-40",
        )}
      >
        <File className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 ml-7" />
        <span className="text-sm text-muted-foreground truncate flex-1">{doc.name}</span>
        {doc.reference && (
          <span className="font-mono text-[11px] text-muted-foreground shrink-0">
            {doc.reference}
          </span>
        )}
      </div>
    </DocItemContextMenu>
  );
}

/**
 * Recursive folder node. Visual hierarchy is depth-aware (see inline notes).
 * Folder headers are drop targets; while a document is dragged over a folder
 * it spring-loads open after a short delay so the user can drill into
 * subfolders without releasing the drag.
 */
function FolderNode({ folder, depth, projectId, docsByFolderId, descendantCountById, hasRecentActivityById, hasAiFlagsById, onDocumentClick, onViewRegister, onRenameDoc, onDeleteDoc, parentPath }: FolderNodeProps) {
  const folderDocs = docsByFolderId.get(folder._id) ?? [];
  const descendantCount = descendantCountById.get(folder._id) ?? 0;
  const hasChildren = folder.children && folder.children.length > 0;
  const hasDocs = folderDocs.length > 0;
  const isExpandable = hasChildren || hasDocs;
  const isTopLevel = depth === 0;
  const isLeaf = !hasChildren;
  const hasRecent = hasRecentActivityById.get(folder._id) ?? false;
  const hasAiFlags = hasAiFlagsById.get(folder._id) ?? false;

  // Default to collapsed — folders open only when the user clicks them.
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { canUploadDocument } = usePermissions();

  // Each folder header is its own drop target.
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: folder._id });

  // Spring-load: auto-expand while a document is dragged over this folder.
  useEffect(() => {
    if (!isOver || isOpen || !isExpandable) return;
    const t = window.setTimeout(() => setIsOpen(true), SPRING_FOLDER_DELAY);
    return () => window.clearTimeout(t);
  }, [isOver, isOpen, isExpandable]);

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const folderName = folder.name.replace(/_/g, ' ');
    const crumbs = ['Contracts', ...parentPath, folderName];
    const folderPath = encodeURIComponent(crumbs.join(' > '));
    navigate(
      `/documents/upload?tab=contracts&folder_id=${folder._id}` +
      `&folder_name=${encodeURIComponent(folder.name)}` +
      `&folder_path=${folderPath}`,
    );
  };

  const handleViewRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewRegister?.(folder._id, folder.name.replace(/_/g, ' '));
  };

  const indentStyle = isTopLevel ? undefined : { paddingLeft: `${(depth - 1) * 16 + 14}px` };

  const renderDocuments = () => folderDocs.map((doc, idx) => (
    <ContractDocumentRow
      key={doc._id}
      doc={doc}
      depth={depth}
      idx={idx}
      onDocumentClick={onDocumentClick}
      onRenameDoc={onRenameDoc}
      onDeleteDoc={onDeleteDoc}
    />
  ));

  const isMidLevel = depth === 1;
  const isDeepLevel = depth >= 2;
  const folderRow = (
    <div
      className={cn(
        "flex items-center gap-2 pr-4 cursor-pointer transition-colors group relative",
        isTopLevel && "py-3 px-4 bg-muted/50 hover:bg-muted/65 border-b border-border",
        isMidLevel && "py-2.5 bg-muted/25 hover:bg-muted/40",
        isDeepLevel && "py-2 bg-muted/10 hover:bg-muted/25",
      )}
      style={indentStyle}
    >
      {isTopLevel && (
        <div className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r transition-colors",
          isOpen ? "bg-primary" : "bg-primary/30"
        )} />
      )}

      <div className={cn(
        "flex-shrink-0",
        isTopLevel ? "text-foreground" : "text-muted-foreground"
      )}>
        {isOpen
          ? <ChevronDown className="w-4 h-4 transition-transform" />
          : <ChevronRight className="w-4 h-4 transition-transform" />}
      </div>

      <div className={cn(
        "flex-shrink-0",
        isTopLevel ? "text-primary"
          : isMidLevel ? "text-muted-foreground"
            : "text-muted-foreground/70"
      )}>
        {isOpen
          ? <FolderOpen className="w-3.5 h-3.5" />
          : <FolderIcon className="w-3.5 h-3.5" />}
      </div>

      <span className={cn(
        "flex-1 truncate",
        isTopLevel && "text-sm font-medium text-foreground tracking-tight",
        isMidLevel && "text-sm text-foreground",
        isDeepLevel && "text-sm text-muted-foreground",
      )}>
        {folder.name.replace(/_/g, ' ')}
      </span>

      {hasAiFlags && (
        <span className="text-primary" title="Contains AI findings">
          <Sparkles className="w-3 h-3" />
        </span>
      )}
      {hasRecent && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Recent activity" />
      )}

      <span className={cn(
        "text-xs px-2 py-0.5 rounded-full font-normal tabular-nums shrink-0",
        descendantCount > 0
          ? "bg-primary/10 text-primary"
          : "bg-muted/40 text-muted-foreground"
      )}>
        {descendantCount}
      </span>

      {isLeaf && (
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
          {canUploadDocument && (
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
          )}
        </div>
      )}
    </div>
  );

  const dropHighlight = isOver && "ring-2 ring-inset ring-primary/50 bg-primary/[0.04]";

  return (
    <div className={cn(
      isTopLevel ? "border-b border-border last:border-b-0" : ""
    )}>
      {isExpandable ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div ref={setDropRef} className={cn("transition-colors", dropHighlight)}>
            <FolderItemContextMenu folderId={folder._id} tab="contracts">
              <CollapsibleTrigger asChild>
                {folderRow}
              </CollapsibleTrigger>
            </FolderItemContextMenu>
          </div>

          <CollapsibleContent>
            <div
              className={cn(
                isTopLevel ? "border-l-2 border-primary/15" : "border-l border-border/60"
              )}
              style={{ marginLeft: `${depth * 16 + 18}px` }}
            >
              {folder.children.map((child) => (
                <FolderNode
                  key={child._id}
                  folder={child}
                  depth={depth + 1}
                  projectId={projectId}
                  docsByFolderId={docsByFolderId}
                  descendantCountById={descendantCountById}
                  hasRecentActivityById={hasRecentActivityById}
                  hasAiFlagsById={hasAiFlagsById}
                  onDocumentClick={onDocumentClick}
                  onViewRegister={onViewRegister}
                  onRenameDoc={onRenameDoc}
                  onDeleteDoc={onDeleteDoc}
                  parentPath={[...parentPath, folder.name.replace(/_/g, ' ')]}
                />
              ))}
              {renderDocuments()}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        // Pure leaf with no docs — still a drop target + paste menu.
        <div ref={setDropRef} className={cn("transition-colors", dropHighlight)}>
          <FolderItemContextMenu folderId={folder._id} tab="contracts">
            {folderRow}
          </FolderItemContextMenu>
        </div>
      )}
    </div>
  );
}

/**
 * Main ContractsTree component.
 * Read-only hierarchical folder structure for the Contracts tab. The drag-and-
 * drop context lives at the page level (Documents.tsx) so a drag can cross tabs.
 */
export function ContractsTree({ projectId, documents, onDocumentClick, onViewRegister, onRenameDoc, onDeleteDoc }: ContractsTreeProps) {
  const { data, isLoading, error } = useContractsFolders(projectId);
  const folders = Array.isArray(data) ? data : [];

  // Group docs by folderId for O(1) lookup during recursive render.
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

  // Pre-compute descendant doc count for every folder in one tree walk.
  const descendantCountById = useMemo(() => {
    const map = new Map<string, number>();
    const walk = (f: Folder): number => {
      const direct = (docsByFolderId.get(f._id) ?? []).length;
      const fromChildren = (f.children ?? []).reduce((sum, c) => sum + walk(c), 0);
      const total = direct + fromChildren;
      map.set(f._id, total);
      return total;
    };
    folders.forEach(walk);
    return map;
  }, [folders, docsByFolderId]);

  // Pre-compute "has recent activity" and "has AI flags" indicators.
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const { hasRecentActivityById, hasAiFlagsById } = useMemo(() => {
    const recent = new Map<string, boolean>();
    const flags = new Map<string, boolean>();
    const cutoff = Date.now() - SEVEN_DAYS;
    const walk = (f: Folder): { recent: boolean; flags: boolean } => {
      const direct = docsByFolderId.get(f._id) ?? [];
      let r = direct.some(d => new Date(d.createdAt).getTime() > cutoff);
      let l = direct.some(d => (d.aiFlags ?? 0) > 0);
      (f.children ?? []).forEach(c => {
        const child = walk(c);
        r = r || child.recent;
        l = l || child.flags;
      });
      recent.set(f._id, r);
      flags.set(f._id, l);
      return { recent: r, flags: l };
    };
    folders.forEach(walk);
    return { hasRecentActivityById: recent, hasAiFlagsById: flags };
  }, [folders, docsByFolderId]);

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
        <p className="text-sm text-destructive">
          Failed to load folders. Please try again.
        </p>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center max-w-md">
          <p className="text-sm font-medium text-foreground mb-2">
            No contract folders available
          </p>
          <p className="text-xs text-muted-foreground">
            You may not have permission to view contract folders, or they
            haven't been created yet. Please contact your project
            administrator if you believe you should have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <div>
        {folders.map((folder) => (
          <FolderNode
            key={folder._id}
            folder={folder}
            depth={0}
            projectId={projectId}
            docsByFolderId={docsByFolderId}
            descendantCountById={descendantCountById}
            hasRecentActivityById={hasRecentActivityById}
            hasAiFlagsById={hasAiFlagsById}
            onDocumentClick={onDocumentClick}
            onViewRegister={onViewRegister}
            onRenameDoc={onRenameDoc}
            onDeleteDoc={onDeleteDoc}
            parentPath={[]}
          />
        ))}
      </div>

      {/* Unfiled documents */}
      {(documents ?? []).some((d) => !d.folderId) && (
        <div className="border-t-2 border-border bg-muted/10">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">
                Unfiled ({(documents ?? []).filter((d) => !d.folderId).length})
              </p>
              <p className="text-[11px] text-muted-foreground">
                Uploaded before folder structure was set up. Drag into a folder or re-upload to file it.
              </p>
            </div>
          </div>
          {(documents ?? [])
            .filter((d) => !d.folderId)
            .map((doc) => (
              <ContractsUnfiledRow
                key={doc._id}
                doc={doc}
                onDocumentClick={onDocumentClick}
                onRenameDoc={onRenameDoc}
                onDeleteDoc={onDeleteDoc}
              />
            ))}
        </div>
      )}
    </div>
  );
}
