import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useS3Upload } from '@/hooks/useS3Upload';
import { validateFile, postData } from '@/lib/Api';
import { toast } from 'sonner';

const TAB_TO_DOC_TYPE: Record<string, string> = {
  contracts: 'Contract',
  drawings: 'Drawing',
  documents: 'Specification',
};

interface BulkFolderUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  folderDiscipline?: string;
  tab: string;
  projectId: string;
}

export function BulkFolderUploadModal({
  isOpen, onClose, folderId, folderName, folderDiscipline, tab, projectId,
}: BulkFolderUploadModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const s3Upload = useS3Upload('project-documents');

  const addFiles = (files: File[]) => {
    files.forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) { toast.error(`${file.name}: ${validation.error}`); return; }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      s3Upload.startUpload(id, file);
    });
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleClose = () => {
    s3Upload.entries.forEach((entry) => s3Upload.removeEntry(entry.id));
    setSubmitting(false);
    onClose();
  };

  const allDone = s3Upload.entries.length > 0 && s3Upload.entries.every((e) => e.status === 'done');
  const hasError = s3Upload.entries.some((e) => e.status === 'error');

  const handleSubmit = async () => {
    if (!allDone) return;
    setSubmitting(true);
    try {
      const files = s3Upload.entries.map((e) => ({
        s3Key: e.s3Key,
        fileName: e.file.name,
        fileSize: e.file.size,
      }));
      await postData({
        url: 'documents/new-upload/',
        data: {
          projectId: parseInt(projectId),
          folderId: parseInt(folderId),
          files,
          type: TAB_TO_DOC_TYPE[tab] ?? 'Specification',
          discipline: folderDiscipline || '',
        },
      });
      const count = files.length;
      toast.success(`${count} file${count !== 1 ? 's' : ''} added to ${folderName}`);
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents-summary', projectId] });
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-normal text-foreground">Add Files to Folder</DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">{folderName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-4">
          <div
            className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50/30 hover:bg-gray-50/50 hover:border-primary/20 transition-all cursor-pointer group"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('bulk-folder-upload')?.click()}
          >
            <input
              id="bulk-folder-upload"
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.dwg,.dwf,.docx,.doc"
              onChange={handleFilesChange}
            />
            <Upload className="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-normal text-gray-700">Drop files here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">PDF, DWG, XLSX, Images — multiple files supported</p>
          </div>

          {s3Upload.entries.length > 0 && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {s3Upload.entries.map((entry) => (
                <div key={entry.id} className="p-3 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        {entry.status === 'error'
                          ? <AlertCircle className="h-4 w-4 text-red-500" />
                          : <FileText className="h-4 w-4 text-purple-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-normal text-gray-900 truncate max-w-[280px]">{entry.file.name}</p>
                        <p className="text-xs text-gray-400">{(entry.file.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {entry.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {entry.status === 'uploading' && (
                        <span className="text-xs text-muted-foreground">{Math.round(entry.progress)}%</span>
                      )}
                      <button
                        onClick={() => s3Upload.removeEntry(entry.id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {entry.status === 'uploading' && <Progress value={entry.progress} className="h-1" />}
                  {entry.status === 'error' && <p className="text-xs text-red-500">{entry.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-gray-50/50 flex gap-3 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={submitting} className="flex-1 font-normal h-11 border-gray-200 bg-white">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allDone || submitting || hasError}
            className="flex-1 font-normal h-11 shadow-lg shadow-primary/20 gap-2"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
              : <><CheckCircle2 className="h-4 w-4" /> Add {s3Upload.entries.length > 0 ? `${s3Upload.entries.length} File${s3Upload.entries.length !== 1 ? 's' : ''}` : 'Files'}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
