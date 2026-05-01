import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen, Upload, FileText, File, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContractsFolders } from '@/hooks/useFolders';
import type { Folder } from '@/types/folder';
import type { ApiDocument } from '@/components/documents/DocumentTable';
import { Button } from '@/components/ui/button';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { VersionUploadModal } from '@/components/documents/VersionUploadModal';
import { useQueryClient } from '@tanstack/react-query';

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
  onRevisionClick: (doc: ApiDocument) => void;
}

function FolderNode({
  folder, depth, projectId, docsByFolderId, descendantCountById,
  onDocumentClick, onViewRegister, onRevisionClick,
}: FolderNodeProps) {
  const folderDocs = docsByFolderId.get(folder._id) ?? [];
  const descendantCount = descendantCountById.get(folder._id) ?? 0;
  const hasChildren = folder.children && folder.children.length > 0;
  const hasDocs = folderDocs.length > 0;
  const isExpandable = hasChildren || hasDocs;
  const [isOpen, setIsOpen] = useState(descendantCount > 0);
  const navigate = useNavigate();
  const isLeaf = !hasChildren;
  const indentStyle = { paddingLeft: `${depth * 16}px` };
  const docCount = descendantCount;

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams({
      tab: 'contracts',
      folder_id: folder._id,
      folder_name: folder.name,
      folder_discipline: folder.discipline ?? '',
    });
    navigate(`/documents/upload?${params.toString()}`);
  };

  const handleViewRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewRegister?.(folder._id, folder.name.replace(/_/g, ' '));
  };

  const renderDocuments = () =>
    folderDocs.map((doc) => (
      <div
        key={doc._id}
        className="flex items-center gap-2 py-2 px-4 hover:bg-muted/40 cursor-pointer transition-colors group/doc border-t border-border/50"
        style={{ paddingLeft: `${(depth + 1) * 16 + 16}px` }}
        onClick={() => onDocumentClick?.(doc._id)}
      >
        <div className="flex-shrink-0 w-4" />
        <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-foreground truncate flex-1">{doc.name}</span>
        {doc.reference && (
          <span className="text-xs text-muted-foreground font-mono">{doc.reference}</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs opacity-0 group-hover/doc:opacity-100 transition-opacity ml-1 shrink-0"
          onClick={(e) => { e.stopPropagation(); onRevisionClick(doc); }}
          title="Upload new revision"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Revision
        </Button>
      </div>
    ));

  const leafActions = (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleViewRegister} title="View Issue Register">
        <FileText className="w-3 h-3 mr-1" />
        Register
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleUpload} title="Add files to this folder">
        <Upload className="w-3 h-3 mr-1" />
        Add Files
      </Button>
    </div>
  );

  return (
    <div className="border-b border-border last:border-b-0">
      {isExpandable ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div
              className={cn('flex items-center gap-2 py-3 px-4 hover:bg-muted/40 cursor-pointer transition-colors group', isOpen && 'bg-muted/20')}
              style={indentStyle}
            >
              <div className="flex-shrink-0 text-muted-foreground">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <div className="flex-shrink-0 text-muted-foreground">
                {isOpen ? <FolderOpen className="w-4 h-4" /> : <FolderIcon className="w-4 h-4" />}
              </div>
              <span className={cn('text-sm text-foreground flex-1', hasChildren && 'font-medium')}>
                {folder.name.replace(/_/g, ' ')}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', docCount > 0 ? 'bg-primary/10 text-primary font-medium' : 'bg-muted text-muted-foreground')}>
                {docCount}
              </span>
              {isLeaf && leafActions}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-l border-border ml-4">
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
                  onRevisionClick={onRevisionClick}
                />
              ))}
              {renderDocuments()}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex items-center gap-2 py-3 px-4 hover:bg-muted/40 transition-colors group" style={indentStyle}>
          <div className="flex-shrink-0 w-4" />
          <div className="flex-shrink-0 text-muted-foreground">
            <FolderIcon className="w-4 h-4" />
          </div>
          <span className="text-sm text-foreground flex-1">{folder.name.replace(/_/g, ' ')}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">0</span>
          {leafActions}
        </div>
      )}
    </div>
  );
}

export function ContractsTree({ projectId, documents, onDocumentClick, onViewRegister }: ContractsTreeProps) {
  const [headerOpen, setHeaderOpen] = useState(true);
  const { data, isLoading, error } = useContractsFolders(projectId);
  const queryClient = useQueryClient();

  const [revisionDoc, setRevisionDoc] = useState<ApiDocument | null>(null);

  const folders = Array.isArray(data) ? data : [];

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

  if (isLoading) return <div className="flex items-center justify-center py-12"><AwesomeLoader /></div>;
  if (error) return <div className="flex items-center justify-center py-12"><p className="text-sm text-destructive">Failed to load folders. Please try again.</p></div>;
  if (folders.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-foreground mb-2">No contract folders available</p>
        <p className="text-xs text-muted-foreground">You may not have permission to view contract folders, or they haven't been created yet.</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setHeaderOpen((v) => !v)}
          className="w-full px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
        >
          <h3 className="text-sm font-medium text-foreground">Contracts Folder Structure</h3>
          {headerOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {headerOpen && (
          <>
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
                  onRevisionClick={(doc) => setRevisionDoc(doc)}
                />
              ))}
            </div>

            {(documents ?? []).some((d) => !d.folderId) && (
              <div className="border-t-2 border-border">
                <div className="px-4 py-2 bg-muted/20">
                  <p className="text-xs font-medium text-foreground">
                    Unfiled Contracts ({(documents ?? []).filter((d) => !d.folderId).length})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded before folder structure was set up. Re-upload to file under a specific folder.
                  </p>
                </div>
                {(documents ?? []).filter((d) => !d.folderId).map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center gap-2 py-2 px-4 hover:bg-muted/40 cursor-pointer transition-colors border-t border-border/50 group/doc"
                    onClick={() => onDocumentClick?.(doc._id)}
                  >
                    <File className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-6" />
                    <span className="text-sm text-foreground truncate flex-1">{doc.name}</span>
                    {doc.reference && <span className="text-xs text-muted-foreground font-mono">{doc.reference}</span>}
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 px-2 text-xs opacity-0 group-hover/doc:opacity-100 transition-opacity ml-1 shrink-0"
                      onClick={(e) => { e.stopPropagation(); setRevisionDoc(doc); }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />Revision
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 py-3 bg-muted/20 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{folders.length}</span> top-level folders.
                This structure is automatically seeded and cannot be modified.
              </p>
            </div>
          </>
        )}
      </div>

      <VersionUploadModal
        isOpen={!!revisionDoc}
        onClose={() => setRevisionDoc(null)}
        document={revisionDoc}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
          setRevisionDoc(null);
        }}
      />
    </>
  );
}
