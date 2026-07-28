/**
 * DocumentEmptyState — thin wrapper over the shared EmptyState.
 *
 * This used to be a hand-rolled near-duplicate of `@/components/ui/empty-state`
 * with its own padding, border radius and icon treatment. It now delegates so
 * the documents area looks like the rest of the app; only the copy and the
 * actions live here.
 */
import React from 'react';
import { Upload, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

interface EmptyStateProps {
  type: 'no-docs' | 'no-results';
  onAction?: () => void;
  onClearFilters?: () => void;
}

export const DocumentEmptyState: React.FC<EmptyStateProps> = ({ type, onAction, onClearFilters }) => {
  if (type === 'no-results') {
    return (
      <EmptyState
        className="mt-6"
        icon={FilterX}
        title="No documents match these filters"
        description="Try clearing the filters or widening the date range — the document may be filed under another discipline or revision."
        action={
          onClearFilters ? (
            <Button variant="outline" size="sm" className="font-normal" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      className="mt-6"
      icon={Upload}
      title="No documents yet"
      description="Upload the contract, drawings and specifications for this project. Each one is versioned and referenced, so you can show what was issued and when."
      action={
        onAction ? (
          <Button size="sm" className="font-normal" onClick={onAction}>
            <Upload className="h-4 w-4 mr-2" /> Upload first document
          </Button>
        ) : undefined
      }
    />
  );
};
