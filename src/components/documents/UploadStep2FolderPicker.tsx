import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronLeft, Folder, FolderPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FolderTab, Folder as FolderType } from '@/types/folder';
import { useFolders } from '@/hooks/useFolders';
import { useFolderSuggestions } from '@/hooks/useFolderSuggestions';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';

interface UploadStep2Props {
  projectId: string;
  selectedTab: FolderTab;
  selectedDiscipline: string;
  selectedFolderId: string;
  selectedFolderName: string;
  onFolderSelect: (folderId: string, folderName: string, isNew: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  hideNav?: boolean;
}

/**
 * Recursive folder tree component for Contracts tab.
 * User clicks a leaf folder to select it.
 */
function FolderTreePicker({
  folders,
  selectedId,
  onSelect,
  depth = 0,
}: {
  folders: FolderType[];
  selectedId: string;
  onSelect: (folder: FolderType) => void;
  depth?: number;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-border pl-2' : ''}>
      {folders.map(folder => {
        const hasChildren = folder.children && folder.children.length > 0;
        const isExpanded = expandedIds.has(folder._id);
        const isSelected = folder._id === selectedId;
        const isLeaf = !hasChildren;

        return (
          <div key={folder._id}>
            <div
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors",
                isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted",
                isLeaf && "cursor-pointer"
              )}
              onClick={() => {
                if (isLeaf) {
                  onSelect(folder);
                } else {
                  toggleExpand(folder._id);
                }
              }}
            >
              {hasChildren && (
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                    isExpanded && "rotate-90"
                  )}
                />
              )}
              {!hasChildren && <div className="w-4" />}

              <Folder className={cn(
                "w-4 h-4 shrink-0",
                isSelected ? "text-primary" : "text-muted-foreground"
              )} />

              <span className={cn(
                "text-sm flex-1 truncate",
                isSelected ? "text-primary font-medium" : "text-foreground"
              )}>
                {folder.name.replace(/_/g, ' ')}
              </span>

              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
            </div>

            {hasChildren && isExpanded && (
              <FolderTreePicker
                folders={folder.children}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Step 2: Folder Picker
 *
 * For Contracts: Shows tree picker of seeded folders
 * For Drawings/Documents: Shows combobox with suggestions + custom input
 */
export function UploadStep2FolderPicker({
  projectId,
  selectedTab,
  selectedDiscipline,
  selectedFolderId,
  selectedFolderName,
  onFolderSelect,
  onBack,
  onNext,
  hideNav = false,
}: UploadStep2Props) {
  const { data: foldersData, isLoading: foldersLoading } = useFolders({
    projectId,
    tab: selectedTab,
  });

  // Ensure folders is always an array
  const folders = Array.isArray(foldersData) ? foldersData : [];

  const { data: suggestions } = useFolderSuggestions();

  const [customInput, setCustomInput] = useState(selectedFolderName);

  // Get suggestions based on tab
  const folderSuggestions = useMemo(() => {
    if (selectedTab === 'drawings') {
      return suggestions?.drawingSubfolders || [];
    } else if (selectedTab === 'documents') {
      return suggestions?.documentSubfolders || [];
    }
    return [];
  }, [selectedTab, suggestions]);

  // For Drawings/Documents: check if the entered folder name exists
  const existingFolder = useMemo(() => {
    if (selectedTab === 'contracts' || !customInput.trim()) return null;
    const normalizedInput = customInput.trim().replace(/\s+/g, '_');
    return folders.find(f => f.name === normalizedInput);
  }, [folders, customInput, selectedTab]);

  const isNewFolder = selectedTab !== 'contracts' && customInput.trim() && !existingFolder;

  const handleSuggestionClick = (suggestion: string) => {
    setCustomInput(suggestion);
    const normalizedSuggestion = suggestion.replace(/\s+/g, '_');
    const existing = folders.find(f => f.name === normalizedSuggestion);
    onFolderSelect(existing?._id || '', normalizedSuggestion, !existing);
  };

  const handleCustomInputChange = (value: string) => {
    setCustomInput(value);
    const normalizedValue = value.trim().replace(/\s+/g, '_');
    const existing = folders?.find(f => f.name === normalizedValue);
    onFolderSelect(existing?._id || '', normalizedValue, !existing);
  };

  const handleContractsFolderSelect = (folder: FolderType) => {
    onFolderSelect(folder._id, folder.name, false);
  };

  const canProceed = selectedTab === 'contracts'
    ? !!selectedFolderId
    : !!customInput.trim();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-normal text-foreground">Select Folder</h2>
        <p className="text-sm text-muted-foreground">
          {selectedTab === 'contracts'
            ? 'Choose a folder from the contracts structure'
            : `Pick a suggested folder or create a custom one for ${selectedDiscipline}`}
        </p>
      </div>

      {/* Contracts: Tree Picker */}
      {selectedTab === 'contracts' && (
        <div className="bg-white rounded-xl border border-border p-6 max-h-[500px] overflow-y-auto">
          {foldersLoading ? (
            <div className="flex items-center justify-center py-12">
              <AwesomeLoader />
            </div>
          ) : folders && folders.length > 0 ? (
            <>
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Click on a leaf folder (folders without children) to select it.
                </p>
              </div>
              <FolderTreePicker
                folders={folders}
                selectedId={selectedFolderId}
                onSelect={handleContractsFolderSelect}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              No folders found. Please contact support.
            </p>
          )}
        </div>
      )}

      {/* Drawings/Documents: Suggestions + Custom Input */}
      {selectedTab !== 'contracts' && (
        <div className="space-y-4">
          {/* Suggestions */}
          {folderSuggestions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-normal text-muted-foreground">
                Quick Select (Suggested Folders)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {folderSuggestions.map(suggestion => {
                  const existing = folders?.find(f => f.name === suggestion);
                  const isSelected = customInput === suggestion;

                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left hover:scale-[1.02]",
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "bg-white border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {existing ? (
                          <Folder className={cn(
                            "w-4 h-4 shrink-0",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                        ) : (
                          <FolderPlus className={cn(
                            "w-4 h-4 shrink-0",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                        )}
                        <span className={cn(
                          "text-sm truncate",
                          isSelected ? "text-primary font-medium" : "text-foreground"
                        )}>
                          {suggestion.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {!existing && (
                        <p className="text-xs text-muted-foreground mt-1">Will create new</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Input */}
          <div className="space-y-3">
            <Label className="text-sm font-normal text-muted-foreground">
              Or Enter Custom Folder Name
            </Label>
            <Input
              value={customInput}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              placeholder="e.g., Site_Photos, Meeting_Minutes"
              className="h-12 border-border rounded-xl"
            />
            {isNewFolder && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <FolderPlus className="w-4 h-4" />
                <span>Will create new folder: <strong>{customInput}</strong></span>
              </div>
            )}
            {existingFolder && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Folder className="w-4 h-4" />
                <span>Folder already exists: <strong>{customInput}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {!hideNav && (
        <div className="flex justify-between items-center pt-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="h-11 px-6 gap-2 font-normal"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="h-11 px-6 gap-2 font-normal"
          >
            Next: Upload Files
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
