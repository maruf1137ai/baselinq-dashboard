import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface DocumentsLoadMoreProps {
  /** Rows loaded so far. */
  shown: number;
  /** The server's count of rows that match. */
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  /** The last "Load more" failed; what is on screen stays. */
  failed: boolean;
  onLoadMore: () => void;
  /** Folder trees add a caveat that their per-folder numbers are partial. */
  inTree?: boolean;
}

/**
 * "Showing 200 of 1,240 documents · Load more". Renders nothing once every
 * row is on screen: the tab badge and header already carry the total.
 */
export function DocumentsLoadMore({
  shown,
  total,
  hasMore,
  isLoadingMore,
  failed,
  onLoadMore,
  inTree = false,
}: DocumentsLoadMoreProps) {
  if (!hasMore && !failed) return null;

  return (
    <div
      className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
      data-testid="documents-load-more"
    >
      <p className="text-xs text-muted-foreground" role="status">
        Showing {shown.toLocaleString('en-ZA')} of {total.toLocaleString('en-ZA')} documents.
        {inTree && ' Folder counts cover the documents loaded so far.'}
        {failed && <span className="text-destructive"> The next page didn't load.</span>}
      </p>
      <Button
        variant="outline"
        className="h-8 shrink-0 rounded-lg text-xs"
        onClick={onLoadMore}
        disabled={isLoadingMore}
      >
        {isLoadingMore ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Loading…
          </>
        ) : failed ? (
          'Try again'
        ) : (
          'Load more'
        )}
      </Button>
    </div>
  );
}
