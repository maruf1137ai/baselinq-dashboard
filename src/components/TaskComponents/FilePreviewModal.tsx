import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X } from "lucide-react";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";

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

/** Prefer streamUrl (backend proxy) for preview/download to avoid S3 CORS. */
function getViewUrl(file: NonNullable<FilePreviewModalProps["file"]>): string {
  return file.streamUrl || (file as { stream_url?: string }).stream_url || file.url;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onOpenChange,
  file,
}) => {
  if (!file) return null;

  const viewUrl = getViewUrl(file);

  const handleDownload = async () => {
    try {
      const response = await fetch(viewUrl);
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
      window.location.href = viewUrl;
    }
  };

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  const fileType = getFileExtension(file.name);
  const isVideo = ["mp4", "webm", "ogg", "mov"].includes(fileType);

  const renderPreview = () => {
    if (isVideo) {
      return (
        <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
          <video controls className="max-w-full max-h-[70vh]" src={viewUrl}>
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    const docs = [
      {
        uri: viewUrl,
        fileName: file.name,
        fileType: file.fileType || fileType,
      },
    ];

    return (
      <div className="w-full h-[70vh] bg-gray-50 rounded-lg overflow-auto border border-gray-200">
        <DocViewer
          documents={docs}
          pluginRenderers={DocViewerRenderers}
          theme={{
            disableThemeScrollbar: false,
          }}
          config={{
            header: {
              disableHeader: true,
              disableFileName: true,
            },
          }}
          style={{ height: "100%" }}
        />
      </div>
    );
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
                onClick={() => window.open(viewUrl, "_blank")}>
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
        <div className="p-4 bg-gray-50">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
};
