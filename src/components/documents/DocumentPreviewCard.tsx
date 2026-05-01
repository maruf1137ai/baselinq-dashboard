import React from 'react';
import { FileText, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentPreviewCardProps {
  doc: {
    fileName?: string;
    downloadUrl?: string;
    streamUrl?: string;
    [k: string]: unknown;
  };
  /** Click "Open" / preview — host opens the FilePreviewModal. */
  onPreview: (file: { name: string; url: string; streamUrl?: string }) => void;
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const PDF_EXTS = new Set(['pdf']);

/**
 * Inline file preview card for the Document Detail Overview tab.
 *
 * Renders a thumbnail/preview of the file based on extension:
 *   - Images: <img> with the stream URL.
 *   - PDFs:   <iframe> (browser native PDF viewer).
 *   - Other:  generic file icon + "Open" button.
 *
 * Hosts the file as the visual hero of the Overview tab — previously the
 * actual document was hidden behind a Download click. Falls back gracefully
 * when the URL isn't available yet.
 */
export const DocumentPreviewCard: React.FC<DocumentPreviewCardProps> = ({ doc, onPreview }) => {
  const fileName = (doc.fileName as string) || 'document';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const url = (doc.streamUrl as string) || (doc.downloadUrl as string) || '';

  const isImage = IMAGE_EXTS.has(ext);
  const isPdf = PDF_EXTS.has(ext);

  const handleOpen = () => {
    if (!url) return;
    onPreview({
      name: fileName,
      url: doc.downloadUrl as string,
      streamUrl: doc.streamUrl as string,
    });
  };

  const handleDownload = () => {
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Header strip — file name + quick actions */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground truncate">{fileName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {url && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpen}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="w-3.5 h-3.5 mr-1.5" /> Full view
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preview body — content adapts to file type */}
      <div className="bg-muted/10">
        {!url && (
          <EmptyState message="Preview unavailable — file URL not loaded yet." />
        )}
        {url && isImage && (
          <div className="flex items-center justify-center min-h-[420px] max-h-[640px] p-4">
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-[600px] object-contain rounded-md cursor-zoom-in"
              onClick={handleOpen}
            />
          </div>
        )}
        {url && isPdf && (
          <iframe
            src={`${url}#toolbar=0&navpanes=0`}
            title={fileName}
            className="w-full h-[640px] border-0"
          />
        )}
        {url && !isImage && !isPdf && (
          <EmptyState message={`No inline preview for .${ext || 'unknown'} files. Use Full view or Download.`} />
        )}
      </div>
    </div>
  );
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-3 text-muted-foreground">
      <FileText className="w-8 h-8" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
