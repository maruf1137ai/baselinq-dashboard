import React from 'react';
import { FileText } from 'lucide-react';
import type { ApiDocument } from '@/components/documents/DocumentTable';

/** Compact ghost shown under the cursor while dragging a document. */
export function DragGhost({ doc }: { doc: ApiDocument }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-primary/40 rounded-md shadow-lg px-3 py-2 max-w-xs">
      <div className="h-6 w-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <FileText className="w-3 h-3 text-primary" />
      </div>
      <span className="text-sm text-foreground truncate">{doc.name}</span>
      {doc.reference && (
        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded shrink-0">
          {doc.reference}
        </span>
      )}
    </div>
  );
}
