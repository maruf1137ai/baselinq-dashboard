import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { XlsxPreview } from "@/components/documents/XlsxPreview";

interface FilePreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    name: string;
    url: string;
    streamUrl?: string;
    fileType?: string;
  } | null;
}

/**
 * Static, reference-stable props for <DocViewer>.
 *
 * DocViewer runs an effect keyed on [documents, config, initialActiveDocument]
 * that calls setAllDocuments(...), which resets currentDocument to a brand-new
 * object and forces the active renderer back into documentLoading: true. If
 * `config`/`theme` are fresh object literals each render, that effect re-fires
 * on every parent re-render (e.g. chat's 2.5s poll) and the preview is stuck
 * "loading" forever. Hoisting these to module scope makes them stable.
 */
const DOC_VIEWER_THEME = {
  disableThemeScrollbar: false,
} as const;

const DOC_VIEWER_CONFIG = {
  header: {
    disableHeader: true,
    disableFileName: true,
  },
} as const;

const VIDEO_EXTS = ["mp4", "webm", "ogg", "mov"];
const XLSX_EXTS = ["xlsx", "xls"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"];
const PDF_EXTS = ["pdf"];

// No reliable load/error callback exists for DocViewer's office-doc renderers,
// so cap how long we show its spinner before offering an escape hatch.
const PREVIEW_TIMEOUT_MS = 15000;

/** Prefer streamUrl (same-origin backend proxy) for preview to avoid S3 CORS. */
function getViewUrl(file: NonNullable<FilePreviewModalProps["file"]>): string {
  return file.streamUrl || (file as { stream_url?: string }).stream_url || file.url;
}

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/** Inline error / "can't render" state with escape hatches. */
const PreviewFallback: React.FC<{
  message: string;
  externalUrl: string;
  onDownload: () => void;
}> = ({ message, externalUrl, onDownload }) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center text-gray-500">
    <FileText className="h-10 w-10" strokeWidth={1.5} />
    <p className="text-sm max-w-sm">{message}</p>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(externalUrl, "_blank", "noopener")}
      >
        <ExternalLink className="h-4 w-4 mr-1.5" /> Open in new tab
      </Button>
      <Button size="sm" onClick={onDownload}>
        <Download className="h-4 w-4 mr-1.5" /> Download
      </Button>
    </div>
  </div>
);

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
  </div>
);

/**
 * Renders the actual file. Owns the loading/error state so the modal can never
 * spin forever. Mounted with key={url} by the parent, so it remounts cleanly
 * per file; the `docs` array is still memoized on primitives so DocViewer does
 * not re-enter its loading loop on the parent's 2.5s re-render.
 */
const PreviewSurface: React.FC<{
  url: string;
  downloadUrl: string;
  name: string;
  ext: string;
  fileType: string;
  onDownload: () => void;
}> = ({ url, downloadUrl, name, ext, fileType, onDownload }) => {
  const isVideo = VIDEO_EXTS.includes(ext);
  const isXlsx = XLSX_EXTS.includes(ext);
  const isImage = IMAGE_EXTS.includes(ext);
  const isPdf = PDF_EXTS.includes(ext);

  // PDF: fetch bytes and render from a blob URL. This neutralizes any
  // Content-Disposition: attachment header and is more reliable than pdf.js;
  // the same-origin-API streamUrl is fetchable (Django sends CORS headers,
  // unlike S3).
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    if (!isPdf || !url) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setPdfStatus("loading");
    setPdfBlobUrl(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
        setPdfStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) setPdfStatus("error");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isPdf, url]);

  // Image: native <img> with its own load/error.
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">("loading");

  // DocViewer branch (office docs etc.) has no error callback — fall back to an
  // action prompt after a timeout instead of an endless spinner.
  const [docTimedOut, setDocTimedOut] = useState(false);
  const usesDocViewer = !isVideo && !isXlsx && !isImage && !isPdf;
  useEffect(() => {
    if (!usesDocViewer) return;
    setDocTimedOut(false);
    const t = setTimeout(() => setDocTimedOut(true), PREVIEW_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [usesDocViewer, url]);

  // Stable documents array for DocViewer, keyed on primitives.
  const docs = useMemo(
    () => [{ uri: url, fileName: name, fileType }],
    [url, name, fileType]
  );

  if (!url) {
    return (
      <PreviewFallback
        message="Preview unavailable — no file URL."
        externalUrl={downloadUrl}
        onDownload={onDownload}
      />
    );
  }

  if (isVideo) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 h-full">
        <video controls className="max-w-full max-h-[70vh]" src={url}>
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (isXlsx) {
    return (
      <div className="w-full h-[70vh] bg-white rounded-lg overflow-auto border border-gray-200">
        <XlsxPreview url={url} className="h-full" />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="relative w-full h-[70vh] bg-gray-50 rounded-lg overflow-auto border border-gray-200 flex items-center justify-center">
        {imgStatus === "loading" && (
          <div className="absolute inset-0">
            <Spinner />
          </div>
        )}
        {imgStatus === "error" ? (
          <PreviewFallback
            message="Could not load this image."
            externalUrl={downloadUrl}
            onDownload={onDownload}
          />
        ) : (
          <img
            src={url}
            alt={name}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setImgStatus("loaded")}
            onError={() => setImgStatus("error")}
          />
        )}
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="w-full h-[70vh] bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
        {pdfStatus === "loading" && <Spinner />}
        {pdfStatus === "error" && (
          <PreviewFallback
            message="Could not load this PDF preview."
            externalUrl={downloadUrl}
            onDownload={onDownload}
          />
        )}
        {pdfStatus === "loaded" && pdfBlobUrl && (
          <iframe src={pdfBlobUrl} title={name} className="w-full h-full border-0" />
        )}
      </div>
    );
  }

  // Office docs / other types via DocViewer. It has no load/error callback, so
  // after a timeout we show a NON-destructive escape banner (rather than hiding
  // a doc that did load) with Open / Download actions.
  return (
    <div className="relative w-full h-[70vh] bg-gray-50 rounded-lg overflow-auto border border-gray-200">
      <DocViewer
        documents={docs}
        pluginRenderers={DocViewerRenderers}
        theme={DOC_VIEWER_THEME}
        config={DOC_VIEWER_CONFIG}
        style={{ height: "100%" }}
      />
      {docTimedOut && (
        <div className="absolute bottom-0 inset-x-0 bg-white/95 border-t border-gray-200 px-4 py-2 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">Not loading? Open or download it directly.</span>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(downloadUrl, "_blank", "noopener")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
            </Button>
            <Button size="sm" onClick={onDownload}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onOpenChange,
  file,
}) => {
  const viewUrl = file ? getViewUrl(file) : "";
  const name = file?.name ?? "";
  const ext = useMemo(() => getFileExtension(name), [name]);
  const resolvedFileType = file?.fileType || ext;

  if (!file) return null;

  // Download via the direct presigned URL (Content-Disposition: attachment), so
  // it works even if the preview proxy is unavailable. Falls back to the view
  // URL, then to navigation if the fetch is blocked.
  const handleDownload = async () => {
    const downloadUrl = file.url || viewUrl;
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      // Presigned URLs already force a download via their disposition header.
      window.open(downloadUrl, "_blank", "noopener");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white p-0 gap-0 border-none [&>button]:hidden">
        <DialogHeader className="p-4 bg-[#101828] text-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium truncate pr-4 text-white">
              {file.name}
            </DialogTitle>
            <div className="flex flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => window.open(viewUrl, "_blank", "noopener")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white ml-2"
                onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="p-4 bg-gray-50">
          <PreviewSurface
            key={viewUrl}
            url={viewUrl}
            downloadUrl={file.url || viewUrl}
            name={name}
            ext={ext}
            fileType={resolvedFileType}
            onDownload={handleDownload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
