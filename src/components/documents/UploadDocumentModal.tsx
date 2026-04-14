import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Upload,
  X,
  FileText,
  Link2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import AiIcon from '@/components/icons/AiIcon';
import { useS3Upload } from '@/hooks/useS3Upload';
import { validateFile, postData } from '@/lib/Api';
import { toast } from 'sonner';
import useFetch from '@/hooks/useFetch';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DOCUMENT_TYPES = ['Contract', 'Drawing', 'Specification', 'Report', 'Certificate', 'Contract Agreement'] as const;
const DISCIPLINES = ['Architectural', 'Structural', 'MEP', 'Civil', 'Environmental'] as const;

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [showLinking, setShowLinking] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [docType, setDocType] = useState<string>('');
  const [discipline, setDiscipline] = useState<string>('');
  const [reference, setReference] = useState('');
  const [referenceEdited, setReferenceEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [runAiAnalysis, setRunAiAnalysis] = useState(true);

  // Auto-generate reference from name unless user has manually edited it
  useEffect(() => {
    if (referenceEdited) return;
    if (!name.trim()) { setReference(''); return; }
    const initials = name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('');
    const suffix = String(Math.floor(Math.random() * 900) + 100);
    setReference(`${initials}-${suffix}`);
  }, [name]);

  // Step 3 — linking (optional)
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const projectId = localStorage.getItem('selectedProjectId');
  const [certificateSubtype, setCertificateSubtype] = useState<string>('');

  // Fetch user's uploadable document types
  const { data: capabilities } = useFetch<{
    documentTypes: string[];
    certificateSubtypes: string[];
  }>(
    projectId ? `documents/user-capabilities/?project_id=${projectId}` : '',
    { enabled: !!projectId && isOpen },
  );

  const uploadableDocTypes = capabilities?.documentTypes || [];
  const uploadableCertSubtypes = capabilities?.certificateSubtypes || [];

  const DONE_STATUSES = ['done', 'Done', 'DONE', 'Closed', 'closed', 'CLOSED', 'Approved', 'approved'];
  const TYPE_FILTERS = ['All', 'VO', 'RFI', 'SI', 'DC', 'CPI'];

  const { data: taskResponse, isLoading: tasksLoading } = useFetch<{ tasks: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : '',
    { enabled: !!projectId && showLinking },
  );

  // console.log({ taskResponse })

  const allTasks = (taskResponse?.tasks || [])
    .filter((item: any) => !DONE_STATUSES.includes(item.status || ''))
    .map((item: any) => ({
      id: item?.task?._id,
      rawId: `${item.taskType}-${String(item.taskId).padStart(3, '0')}`,
      title: item.task?.subject || item.task?.title || item.task?.taskActivityName || '—',
      type: item.taskType || 'GI',
      status: item.status || 'Open',
    }));

  const filteredTasks = allTasks.filter((t: any) => {
    const matchesSearch =
      t.id.toLowerCase().includes(linkSearch.toLowerCase()) ||
      t.title.toLowerCase().includes(linkSearch.toLowerCase());
    const matchesType = activeFilter === 'All' || t.type === activeFilter;
    return matchesSearch && matchesType;
  });

  const toggleLink = (id: string) => {
    setSelectedLinkIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const s3Upload = useS3Upload('project-documents/pending');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      s3Upload.startUpload(id, file);
    });
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      s3Upload.startUpload(id, file);
    });
  }, [s3Upload]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Document name is required');
      return;
    }
    if (!docType) {
      toast.error('Document type is required');
      return;
    }
    if (docType === 'Certificate' && !certificateSubtype) {
      toast.error('Certificate type is required');
      return;
    }
    if (s3Upload.entries.length === 0) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    setSubmitting(true);

    try {
      // Wait for all S3 uploads to complete
      const ids = s3Upload.entries.map((e) => e.id);
      const s3Keys = await s3Upload.waitForAll(ids);

      const linkIds = allTasks
        .filter((t: any) => selectedLinkIds.includes(t.id))
        .map((t: any) => ({ type: t.type, id: t.id }));

      // Use batch upload endpoint when multiple files
      if (s3Upload.entries.length > 1) {
        const files = s3Upload.entries
          .map((entry) => {
            const s3Key = s3Keys.get(entry.id);
            if (!s3Key) return null;
            return { s3Key, fileName: entry.file.name, fileSize: entry.file.size };
          })
          .filter(Boolean);

        if (files.length === 0) {
          toast.error('All file uploads failed');
          return;
        }

        await postData({
          url: 'documents/new-upload/',
          data: {
            projectId: parseInt(projectId),
            files,
            type: docType,
            certificateSubtype: certificateSubtype || undefined,
            discipline: discipline || '',
            reference: reference || '',
            description: description || '',
            runAiAnalysis: runAiAnalysis,
            linkIds,
          },
        });
      } else {
        // Single file — use original endpoint
        const entry = s3Upload.entries[0];
        const s3Key = s3Keys.get(entry.id);
        if (!s3Key) {
          toast.error(`Failed to upload ${entry.file.name}`);
          return;
        }

        await postData({
          url: 'documents/',
          data: {
            project_id: parseInt(projectId),
            name: name.trim(),
            type: docType,
            certificate_subtype: certificateSubtype || undefined,
            discipline: discipline || '',
            description: description || '',
            reference: reference || '',
            s3_key: s3Key,
            file_name: entry.file.name,
            file_size: entry.file.size,
            run_ai_analysis: runAiAnalysis,
            link_ids: linkIds,
          },
        });
      }

      toast.success('Document uploaded successfully');
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to upload document';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowLinking(false);
    setName('');
    setDocType('');
    setCertificateSubtype('');
    setDiscipline('');
    setReference('');
    setReferenceEdited(false);
    setDescription('');
    setRunAiAnalysis(true);
    setLinkSearch('');
    setSelectedLinkIds([]);
    setActiveFilter('All');
    onClose();
  };

  // Reset certificate subtype when document type changes
  useEffect(() => {
    if (docType !== 'Certificate') {
      setCertificateSubtype('');
    }
  }, [docType]);

  const canProceedStep1 = s3Upload.entries.length > 0 && !s3Upload.hasUploading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-normal text-[#1A1F36]">Upload Documents</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Fill in the details below to add your project documents.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar space-y-8">
          {/* Section 1 — File selection */}
          <div className="space-y-6">
            <div
              className="border border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50/30 hover:bg-gray-50/50 hover:border-primary/20 transition-all cursor-pointer group"
              onClick={() => document.getElementById('file-upload')?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                id="file-upload"
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-base font-normal text-gray-900">Drop your documents here</h4>
              <p className="text-xs text-gray-400 mt-0.5">PDF, XLSX, DOCX, DWG up to 20MB</p>
              <Button variant="outline" className="mt-3 font-normal h-8 text-xs border-gray-100 bg-white shadow-sm" type="button">
                Browse Files
              </Button>
            </div>

            {s3Upload.entries.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-normal text-gray-400 normal-case">
                  Selected Files ({s3Upload.entries.length})
                </h4>
                {s3Upload.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col gap-3"
                  >
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
                          <p className="text-sm font-normal text-gray-900 truncate max-w-[300px]">
                            {entry.file.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(entry.file.size / (1024 * 1024)).toFixed(2)} MB
                            {entry.status === 'error' && (
                              <span className="text-red-500 ml-2">{entry.error}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => s3Upload.removeEntry(entry.id)}
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
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 w-full" />

          {/* No Permission Message */}
          {uploadableDocTypes.length === 0 && (
            <div className="p-6 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">No Upload Permission</p>
                  <p className="text-xs text-amber-700">
                    You do not have permission to upload any document types in this project.
                    Please contact your project manager for access.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2 — Details & AI */}
          {uploadableDocTypes.length > 0 && (
          <div className="space-y-6 text-left">
            <div>
              <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">
                Document Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Main Contract Agreement"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 border-gray-200 rounded-xl focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">
                  Document Type <span className="text-red-500">*</span>
                </Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-primary/20">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.filter(t => uploadableDocTypes.includes(t)).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">Discipline</Label>
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-primary/20">
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {docType === 'Certificate' && uploadableCertSubtypes.length > 0 && (
              <div>
                <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">
                  Certificate Type <span className="text-red-500">*</span>
                </Label>
                <Select value={certificateSubtype} onValueChange={setCertificateSubtype}>
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-primary/20">
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadableCertSubtypes.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>{subtype} Certificate</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">
                Reference Number
              </Label>
              <Input
                placeholder="Auto-generated from name"
                value={reference}
                onChange={(e) => { setReferenceEdited(true); setReference(e.target.value); }}
                className="h-12 border-gray-200 rounded-xl focus:ring-primary/20"
              />
            </div>

            <div>
              <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">
                Description (Optional)
              </Label>
              <Textarea
                placeholder="Brief summary of the document contents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] border-gray-200 rounded-xl focus:ring-primary/20 p-4"
              />
            </div>

            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                  <AiIcon size={24} />
                </div>
                <div>
                  <p className="text-sm font-normal text-gray-900">Run AI Analysis</p>
                  <p className="text-xs text-gray-500 max-w-[280px]">
                    Automatically extract obligations, flags, and clause references.
                  </p>
                </div>
              </div>
              <Switch
                checked={runAiAnalysis}
                onCheckedChange={(checked) => {
                  setRunAiAnalysis(checked);
                  postData({ url: 'documents/run-ai/', data: { runAiAnalysis: checked } }).catch(() => {});
                }}
              />
            </div>
          </div>
          )}

          <div className="h-px bg-gray-100 w-full" />

          {/* Section 3 — Linking (Collapsible) */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowLinking(!showLinking)}
              className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-900">Link to Existing Documents (Optional)</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", showLinking && "rotate-90")} />
            </button>

            {showLinking && (
              <div className="bg-gray-50/50 rounded-2xl p-6 space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search VOs, RFIs, or other documents..."
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    className="pl-12 h-12 bg-white border-gray-200 rounded-xl shadow-sm focus:ring-primary/20 font-normal"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {TYPE_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        'px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider transition-all border font-medium',
                        activeFilter === filter
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3">
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading tasks...</span>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-1">
                      <Search className="h-6 w-6" />
                      <p className="text-sm">{linkSearch.trim() ? `No tasks found matching "${linkSearch}"` : 'No open tasks found.'}</p>
                    </div>
                  ) : (
                    filteredTasks.map((task: any) => {
                      const isSelected = selectedLinkIds.includes(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => toggleLink(task.id)}
                          className="p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-1 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer group bg-white shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-gray-50 rounded flex items-center justify-center border border-gray-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                              <Link2 className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-normal text-gray-900">{task.rawId}</p>
                              <p className="text-xs text-gray-500">{task.title}</p>
                            </div>
                          </div>
                          <div className={cn(
                            "!min-h-6 !min-w-6 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "border-primary" : "border-gray-200 group-hover:border-primary"
                          )}>
                            <div className={cn(
                              "h-3 w-3 rounded-full bg-primary transition-opacity",
                              isSelected ? "opacity-100" : "opacity-0"
                            )} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-gray-50/50 flex gap-3 sm:justify-end items-center shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="font-normal h-10 border-gray-200 px-6"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="font-normal h-10 px-6 gap-2"
            disabled={submitting || s3Upload.entries.length === 0 || s3Upload.hasUploading}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Finish Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
