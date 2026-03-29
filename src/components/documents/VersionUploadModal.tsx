import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  FileClock,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface VersionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export const VersionUploadModal: React.FC<VersionUploadModalProps> = ({ isOpen, onClose, document }) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Simulate progress
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 20;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
        }
        setProgress(p);
      }, 200);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <FileClock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-normal text-foreground">Upload New Version</DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">Updating: {document.reference}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6">
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-xs text-blue-700 leading-relaxed">
              Uploading a new version will increment <strong>{document.version} → v{parseInt(document.version?.replace('v', '') || '1') + 1}</strong>.
              The previous version will be archived and accessible in version history.
            </div>
          </div>

          <div className="space-y-4">
            {!file ? (
              <div
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/30 hover:bg-gray-50/50 hover:border-primary/20 transition-all cursor-pointer group"
                onClick={() => document.getElementById('version-file-upload')?.click()}
              >
                <input
                  id="version-file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Upload className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-normal text-gray-900">Select new version file</h4>
                <p className="text-xs text-gray-400 mt-1">PDF, XLSX, DOCX, DWG up to 20MB</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-normal text-gray-900 truncate max-w-[280px]">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-normal text-gray-400 uppercase block">Changelog</Label>
              <Textarea
                placeholder="What changed in this version? (e.g., Updated structural calculations...)"
                className="min-h-[80px] border-gray-200 rounded-xl focus:ring-primary/20 p-3 text-sm"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-normal text-gray-900">Notify Team</p>
                <p className="text-xs text-gray-500">Alert all linked stakeholders about this revision.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-gray-50/50 flex gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 font-normal h-11 border-gray-200 bg-white">Cancel</Button>
          <Button disabled={!file || progress < 100} className="flex-1 font-normal h-11 shadow-lg shadow-primary/20 gap-2">
            <CheckCircle2 className="h-4 w-4" /> Finish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
