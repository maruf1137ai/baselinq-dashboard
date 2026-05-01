import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FolderTab } from '@/types/folder';
import { useFolderSuggestions } from '@/hooks/useFolderSuggestions';

interface UploadStep1Props {
  selectedTab: FolderTab | '';
  selectedDiscipline: string;
  onTabChange: (tab: FolderTab) => void;
  onDisciplineChange: (discipline: string) => void;
  onNext: () => void;
}

// Neutral active state — per-tab amber/blue/slate clashed with the brand
// design system (purple primary, stone neutrals). Tabs stay distinguishable
// by label + description.
const TAB_CONFIG: Record<FolderTab, { label: string; description: string }> = {
  contracts: { label: 'Contracts', description: 'Signed agreements & tender documents' },
  drawings: { label: 'Drawings', description: 'Architectural & engineering drawings' },
  documents: { label: 'Documents', description: 'Reports, specifications & certificates' },
};

/**
 * Step 1: Tab and Discipline Selection
 *
 * Users select which tab they're uploading to (Contracts/Drawings/Documents)
 * and optionally select a discipline (required for Drawings/Documents,
 * skipped for Contracts).
 */
export function UploadStep1TabDiscipline({
  selectedTab,
  selectedDiscipline,
  onTabChange,
  onDisciplineChange,
  onNext,
}: UploadStep1Props) {
  const { data: suggestions, isLoading } = useFolderSuggestions();

  const disciplines = suggestions?.disciplines || [];

  // Contracts don't require discipline at this step (it's inferred from folder path)
  const requiresDiscipline = selectedTab === 'drawings' || selectedTab === 'documents';

  const canProceed = selectedTab && (!requiresDiscipline || selectedDiscipline);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-normal text-foreground">Choose Upload Location</h2>
        <p className="text-sm text-muted-foreground">
          Select which tab you're uploading to and the discipline category
        </p>
      </div>

      {/* Tab Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-normal text-muted-foreground">
          Tab <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(TAB_CONFIG) as FolderTab[]).map((tab) => {
            const config = TAB_CONFIG[tab];
            const isActive = selectedTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={cn(
                  "px-4 py-3 rounded-lg border transition-colors text-center",
                  isActive
                    ? "bg-primary/5 border-primary/40"
                    : "bg-white border-border hover:border-primary/30"
                )}
              >
                <p className={cn(
                  "text-sm font-medium",
                  isActive ? "text-primary" : "text-foreground"
                )}>
                  {config.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Discipline Selection (Drawings/Documents only) */}
      {requiresDiscipline && (
        <div className="space-y-2">
          <Label className="text-sm font-normal text-muted-foreground">
            Discipline <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedDiscipline}
            onValueChange={onDisciplineChange}
            disabled={isLoading}
          >
            <SelectTrigger className="h-10 border-border rounded-lg">
              <SelectValue placeholder={isLoading ? "Loading disciplines..." : "Select discipline"} />
            </SelectTrigger>
            <SelectContent>
              {disciplines.map((disc) => (
                <SelectItem key={disc} value={disc}>
                  {disc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the primary discipline (e.g., Architectural, Structural)
          </p>
        </div>
      )}

      {/* Contracts Info Note — neutral, no amber */}
      {selectedTab === 'contracts' && (
        <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
          <span className="text-foreground font-medium">Contracts:</span>{' '}
          you'll select from pre-defined folders in the next step. Discipline will be inferred from your folder selection.
        </p>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="h-9 px-5 gap-2 font-normal"
        >
          Next: Select Folder
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
