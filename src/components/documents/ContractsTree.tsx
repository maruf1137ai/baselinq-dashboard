import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen, Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContractsFolders } from '@/hooks/useFolders';
import type { Folder } from '@/types/folder';
import { Button } from '@/components/ui/button';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ContractsTreeProps {
  projectId: string;
  onViewRegister?: (folderId: string, folderName: string) => void;
}

interface FolderNodeProps {
  folder: Folder;
  depth: number;
  projectId: string;
  onViewRegister?: (folderId: string, folderName: string) => void;
}

/**
 * Recursive folder node component.
 * Renders a single folder with collapsible children.
 */
function FolderNode({ folder, depth, projectId, onViewRegister }: FolderNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const hasChildren = folder.children && folder.children.length > 0;
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

  return (
    <div className="border-b border-border last:border-b-0">
      {hasChildren ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 py-3 px-4 hover:bg-amber-50 cursor-pointer transition-colors group",
                isOpen && "bg-amber-50/50"
              )}
              style={indentStyle}
            >
              {/* Chevron icon */}
              <div className="flex-shrink-0 text-muted-foreground">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 transition-transform" />
                )}
              </div>

              {/* Folder icon */}
              <div className="flex-shrink-0 text-amber-600">
                {isOpen ? (
                  <FolderOpen className="w-5 h-5" />
                ) : (
                  <FolderIcon className="w-5 h-5" />
                )}
              </div>

              {/* Folder name */}
              <span className="font-medium text-sm text-foreground flex-1">
                {folder.name.replace(/_/g, ' ')}
              </span>

              {/* File count badge (placeholder for future PR) */}
              <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                0
              </span>
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
                  onViewRegister={onViewRegister}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        // Leaf folder - no collapsible, just a row with upload button
        <div
          className="flex items-center gap-2 py-3 px-4 hover:bg-amber-50 transition-colors group"
          style={indentStyle}
        >
          {/* Spacer for alignment with parent folders */}
          <div className="flex-shrink-0 w-4" />

          {/* Folder icon (closed, no chevron) */}
          <div className="flex-shrink-0 text-amber-600">
            <FolderIcon className="w-5 h-5" />
          </div>

          {/* Folder name */}
          <span className="text-sm text-foreground flex-1">
            {folder.name.replace(/_/g, ' ')}
          </span>

          {/* File count badge (placeholder) */}
          <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
            0
          </span>

          {/* Action buttons (visible on hover) */}
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
export function ContractsTree({ projectId, onViewRegister }: ContractsTreeProps) {
  const { data, isLoading, error } = useContractsFolders(projectId);

  // DEBUG: Log the state
  console.log('🔍 ContractsTree Debug:', {
    projectId,
    isLoading,
    error,
    data,
    dataType: typeof data,
    isArray: Array.isArray(data),
  });

  // Ensure folders is always an array
  const folders = Array.isArray(data) ? data : [];

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
            onViewRegister={onViewRegister}
          />
        ))}
      </div>

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
