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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  FileClock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useS3Upload } from '@/hooks/useS3Upload';
import { validateFile, postData } from '@/lib/Api';
import { toast } from 'sonner';

interface VersionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  onSuccess?: () => void;
}

export const VersionUploadModal: React.FC<VersionUploadModalProps> = ({ isOpen, onClose, document: doc, onSuccess }) => {
  const [versionName, setVersionName] = useState('');
  const [changelog, setChangelog] = useState('');
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const projectId = localStorage.getItem('selectedProjectId');
  const s3Upload = useS3Upload('project-documents/versions');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    // Remove any existing entry first
    s3Upload.entries.forEach((entry) => s3Upload.removeEntry(entry.id));
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    s3Upload.startUpload(id, file);
    e.target.value = '';
  };

  const handleClose = () => {
    s3Upload.entries.forEach((entry) => s3Upload.removeEntry(entry.id));
    setVersionName('');
    setChangelog('');
    setNotifyTeam(true);
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!versionName.trim()) { toast.error('Version name is required'); return; }
    if (s3Upload.entries.length === 0) return;
    const entry = s3Upload.entries[0];
    if (entry.status !== 'done' || !entry.s3Key) {
      toast.error('File is still uploading. Please wait.');
      return;
    }

    setSubmitting(true);
    try {
      await postData({
        url: `documents/${doc._id}/versions/?project_id=${projectId}`,
        data: {
          s3_key: entry.s3Key,
          file_name: entry.file.name,
          file_size: entry.file.size,
          version_name: versionName.trim() || undefined,
          changelog: changelog.trim() || undefined,
          notify_team: notifyTeam,
        },
      });
      toast.success('New version uploaded successfully.');
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to upload version';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!doc) return null;

  const entry = s3Upload.entries[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <FileClock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-normal text-foreground">Upload New Version</DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">Updating: {doc.reference}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            {!entry ? (
              <div
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/30 hover:bg-gray-50/50 hover:border-primary/20 transition-all cursor-pointer group"
                onClick={() => window.document.getElementById('version-file-upload')?.click()}
              >
                <input
                  id="version-file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
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
                      {entry.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-normal text-gray-900 truncate max-w-[280px]">{entry.file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(entry.file.size / (1024 * 1024)).toFixed(2)} MB
                        {entry.status === 'error' && <span className="text-red-500 ml-2">{entry.error}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { s3Upload.removeEntry(entry.id); }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={entry.progress} className="h-1 flex-1" />
                  <span className="text-xs font-normal text-gray-400 min-w-[30px]">
                    {entry.status === 'done' ? '✓' : `${Math.round(entry.progress)}%`}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-normal text-muted-foreground block">
                Version Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="e.g. Rev A, Issue 1, P1"
                className="h-10 border-border rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-normal text-muted-foreground block">Changelog</Label>
              <Textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="What changed in this version? (e.g., Updated structural calculations...)"
                className="min-h-[80px] border-gray-200 rounded-xl focus:ring-primary/20 p-3 text-sm"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-normal text-gray-900">Notify Team</p>
                <p className="text-xs text-gray-500">Alert all linked stakeholders about this revision.</p>
              </div>
              <Switch checked={notifyTeam} onCheckedChange={setNotifyTeam} />
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-gray-50/50 flex gap-3 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={submitting} className="flex-1 font-normal h-11 border-gray-200 bg-white">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!entry || entry.status !== 'done' || submitting || !versionName.trim()}
            className="flex-1 font-normal h-11 shadow-lg shadow-primary/20 gap-2"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><CheckCircle2 className="h-4 w-4" /> Finish</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
