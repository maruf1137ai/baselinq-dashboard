import { useRef } from "react";
import { Check, X, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useS3Upload } from "@/hooks/useS3Upload";
import { validateFile } from "@/lib/Api";
import { toast } from "sonner";

interface Props {
  /** Pass the return value of useS3Upload() from the parent form. */
  s3Upload: ReturnType<typeof useS3Upload>;
  /** Unique id for the hidden file input (avoids DOM id collisions). */
  inputId: string;
  label?: string;
}

/**
 * Reusable drop-zone + file list that starts S3 uploads immediately on file selection.
 * The parent form calls s3Upload.waitForAll(ids) at submit time to get s3Keys, then
 * registers each file with its respective backend endpoint.
 */
export function S3AttachmentSection({ s3Upload, inputId, label = "Attachments" }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: File[]) => {
    files.forEach((file) => {
      const result = validateFile(file);
      if (!result.valid) {
        toast.error(`${file.name}: ${result.error}`);
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      s3Upload.startUpload(id, file);
    });
  };

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          if (e.target.files) addFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />

      {/* Drop zone */}
      <div
        className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <p className="text-sm text-muted-foreground">Drag and drop your file here</p>
        <p className="text-sm text-muted-foreground">or click to browse</p>
      </div>

      {/* File list */}
      {s3Upload.entries.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {s3Upload.entries.map((entry) => (
            <div key={entry.id} className="border rounded p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm truncate">{entry.file.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {entry.status === "error" && (
                    <button
                      type="button"
                      onClick={() => s3Upload.retryUpload(entry.id)}
                      className="text-xs text-blue-500 hover:underline px-1"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => s3Upload.removeEntry(entry.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {entry.status === "uploading" && (
                <div className="mt-1.5">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{entry.progress}%</p>
                </div>
              )}

              {entry.status === "done" && (
                <div className="mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">Uploaded</span>
                </div>
              )}

              {entry.status === "error" && (
                <p className="text-xs text-red-500 mt-1">{entry.error ?? "Upload failed"}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
