import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen, Upload, FileText, File } from 'lucide-react';
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

interface ContractsTreeProps {
  projectId: string;
  documents?: ApiDocument[];
  onDocumentClick?: (id: string) => void;
  onViewRegister?: (folderId: string, folderName: string) => void;
}

interface FolderNodeProps {
  folder: Folder;
  depth: number;
  projectId: string;
  docsByFolderId: Map<string, ApiDocument[]>;
  descendantCountById: Map<string, number>;
  onDocumentClick?: (id: string) => void;
  onViewRegister?: (folderId: string, folderName: string) => void;
}

/**
 * Recursive folder node component.
 * Renders a single folder with collapsible children.
 */
function FolderNode({ folder, depth, projectId, docsByFolderId, descendantCountById, onDocumentClick, onViewRegister }: FolderNodeProps) {
  const folderDocs = docsByFolderId.get(folder._id) ?? [];
  const descendantCount = descendantCountById.get(folder._id) ?? 0;
  const hasChildren = folder.children && folder.children.length > 0;
  const hasDocs = folderDocs.length > 0;
  const isExpandable = hasChildren || hasDocs;
  // Auto-open any folder whose subtree contains at least one document so the
  // user lands on a tree where their uploads are immediately visible.
  const [isOpen, setIsOpen] = useState(descendantCount > 0);
  const navigate = useNavigate();

  const isLeaf = !hasChildren;

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/documents/upload?tab=contracts&folder_id=${folder._id}`);
  };

  const handleViewRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewRegister) {
      onViewRegister(folder._id, folder.name.replace(/_/g, ' '));
    }
  };

  // Base indentation: 16px per level
  const indentStyle = { paddingLeft: `${depth * 16}px` };

  // Show recursive descendant count so the user can see at top level which
  // branches contain their uploads.
  const docCount = descendantCount;

  const renderDocuments = () => (
    folderDocs.map((doc) => (
      <div
        key={doc._id}
        className="flex items-center gap-2 py-2 px-4 hover:bg-amber-50/50 cursor-pointer transition-colors group/doc border-t border-border/50"
        style={{ paddingLeft: `${(depth + 1) * 16 + 16}px` }}
        onClick={() => onDocumentClick?.(doc._id)}
      >
        <div className="flex-shrink-0 w-4" />
        <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-foreground truncate flex-1">{doc.name}</span>
        {doc.reference && (
          <span className="text-xs text-muted-foreground font-mono">{doc.reference}</span>
        )}
      </div>
    ))
  );

  return (
    <div className="border-b border-border last:border-b-0">
      {isExpandable ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 py-3 px-4 hover:bg-amber-50 cursor-pointer transition-colors group",
                isOpen && "bg-amber-50/50"
              )}
              style={indentStyle}
            >
              <div className="flex-shrink-0 text-muted-foreground">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 transition-transform" />
                )}
              </div>

              <div className="flex-shrink-0 text-amber-600">
                {isOpen ? (
                  <FolderOpen className="w-5 h-5" />
                ) : (
                  <FolderIcon className="w-5 h-5" />
                )}
              </div>

              <span className={cn("text-sm text-foreground flex-1", hasChildren && "font-medium")}>
                {folder.name.replace(/_/g, ' ')}
              </span>

              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                docCount > 0
                  ? "bg-amber-100 text-amber-700 font-medium"
                  : "bg-slate-100 text-muted-foreground"
              )}>
                {docCount}
              </span>

              {/* Leaf actions — only show on leaves (no children), visible on hover */}
              {isLeaf && (
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
              )}
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-l border-amber-200 ml-4">
              {folder.children.map((child) => (
                <FolderNode
                  key={child._id}
                  folder={child}
                  depth={depth + 1}
                  projectId={projectId}
                  docsByFolderId={docsByFolderId}
                  descendantCountById={descendantCountById}
                  onDocumentClick={onDocumentClick}
                  onViewRegister={onViewRegister}
                />
              ))}
              {renderDocuments()}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        // Pure leaf with no docs — just the row with hover actions
        <div
          className="flex items-center gap-2 py-3 px-4 hover:bg-amber-50 transition-colors group"
          style={indentStyle}
        >
          <div className="flex-shrink-0 w-4" />
          <div className="flex-shrink-0 text-amber-600">
            <FolderIcon className="w-5 h-5" />
          </div>
          <span className="text-sm text-foreground flex-1">
            {folder.name.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
            0
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
      )}
    </div>
  );
}

/**
 * Main ContractsTree component.
 * Displays the read-only hierarchical folder structure for Contracts tab.
 */
export function ContractsTree({ projectId, documents, onDocumentClick, onViewRegister }: ContractsTreeProps) {
  const { data, isLoading, error } = useContractsFolders(projectId);

  // Ensure folders is always an array
  const folders = Array.isArray(data) ? data : [];

  // Group documents by folderId for O(1) lookup during recursive render.
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
  // Used both for the count badge and for auto-opening folders that contain docs.
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
            You may not have permission to view contract folders, or they haven't been created yet.
            Please contact your project administrator if you believe you should have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-50/50 border-b border-border">
        <h3 className="text-sm font-semibold text-amber-900">
          Contracts Folder Structure
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Read-only folder hierarchy. Click on a folder to expand/collapse, or upload files to leaf folders.
        </p>
      </div>

      {/* Tree */}
      <div className="divide-y divide-border">
        {folders.map((folder) => (
          <FolderNode
            key={folder._id}
            folder={folder}
            depth={0}
            projectId={projectId}
            docsByFolderId={docsByFolderId}
            descendantCountById={descendantCountById}
            onDocumentClick={onDocumentClick}
            onViewRegister={onViewRegister}
          />
        ))}
      </div>

      {/* Unfiled documents — orphans uploaded before folder linkage existed */}
      {(documents ?? []).some((d) => !d.folderId) && (
        <div className="border-t-2 border-amber-200">
          <div className="px-4 py-2 bg-amber-50/30">
            <p className="text-xs font-medium text-amber-900">
              Unfiled Contracts ({(documents ?? []).filter((d) => !d.folderId).length})
            </p>
            <p className="text-xs text-muted-foreground">
              Uploaded before folder structure was set up. Re-upload to file under a specific folder.
            </p>
          </div>
          {(documents ?? [])
            .filter((d) => !d.folderId)
            .map((doc) => (
              <div
                key={doc._id}
                className="flex items-center gap-2 py-2 px-4 hover:bg-amber-50/50 cursor-pointer transition-colors border-t border-border/50"
                onClick={() => onDocumentClick?.(doc._id)}
              >
                <File className="w-4 h-4 text-slate-400 flex-shrink-0 ml-6" />
                <span className="text-sm text-foreground truncate flex-1">{doc.name}</span>
                {doc.reference && (
                  <span className="text-xs text-muted-foreground font-mono">{doc.reference}</span>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Footer info */}
      <div className="px-4 py-3 bg-slate-50 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>{folders.length}</strong> top-level folders loaded.
          This structure is automatically seeded and cannot be modified.
        </p>
      </div>
    </div>
  );
}
