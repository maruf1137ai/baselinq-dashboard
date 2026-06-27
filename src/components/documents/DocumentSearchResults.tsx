import React from 'react';
import { ChevronRight, FileText, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/dateUtils';
import type { ApiDocument } from '@/components/documents/DocumentTable';
import {
  getCategoryForDoc,
  CATEGORY_COLORS,
} from '@/lib/documentTaxonomy';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';

interface DocumentSearchResultsProps {
  /** Documents matching the active search query (already filtered server-side). */
  documents: ApiDocument[];
  /** The query that produced these results — echoed in the empty state. */
  query: string;
  isLoading?: boolean;
  onDocumentClick?: (id: string) => void;
}

/** Compact relative-time formatter — matches the folder views. */
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
 * Flat search-results list for the Documents page.
 *
 * When the user searches, we want to show ONLY the matching documents —
 * not the full folder tree with matches buried in collapsed folders. This
 * renders every match (across all categories) as a single flat list, with
 * a category badge so the user still knows which tab each result lives in.
 */
export function DocumentSearchResults({
  documents,
  query,
  isLoading,
  onDocumentClick,
}: DocumentSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <AwesomeLoader />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border py-12 text-center">
        <SearchX className="w-6 h-6 mx-auto mb-3 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-foreground mb-1">No documents found</p>
        <p className="text-xs text-muted-foreground">
          Nothing matches “{query}”. Try a different name, reference, or type.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
        <p className="text-xs text-muted-foreground tabular-nums">
          {documents.length} result{documents.length !== 1 ? 's' : ''} for “{query}”
        </p>
      </div>

      {documents.map((doc, idx) => {
        const category = getCategoryForDoc(doc as any);
        const colors = CATEGORY_COLORS[category];
        return (
          <div
            key={doc._id}
            className={cn(
              'flex items-center gap-3 py-2 pr-4 pl-4 bg-white hover:bg-primary/[0.03] cursor-pointer transition-colors group/doc relative',
              idx > 0 && 'border-t border-border/40',
            )}
            onClick={() => onDocumentClick?.(doc._id)}
          >
            {/* Primary accent stripe on the left — consistent with folder views. */}
            <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-primary/40 group-hover/doc:bg-primary transition-colors" />
            <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover/doc:bg-primary/15 transition-colors">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>

            <p className="text-sm truncate flex-1 min-w-0">
              <span className="text-foreground group-hover/doc:text-primary transition-colors">
                {doc.name}
              </span>
              <span className="text-muted-foreground ml-2 hidden sm:inline">
                {' · '}{doc.type || '—'}
                {doc.discipline && <>{' · '}{doc.discipline}</>}
                {doc.uploadedBy?.name && <>{' · '}{doc.uploadedBy.name}</>}
                {doc.createdAt && <>{' · '}{formatRelative(doc.createdAt)}</>}
              </span>
            </p>

            {/* Category badge — keeps the tab context the flat list otherwise loses. */}
            <span
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full border shrink-0',
                colors.bg, colors.fg, colors.border,
              )}
            >
              {category}
            </span>

            {doc.reference && (
              <span className="font-mono text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-md shrink-0">
                {doc.reference}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover/doc:text-primary shrink-0 transition-colors" />
          </div>
        );
      })}
    </div>
  );
}
