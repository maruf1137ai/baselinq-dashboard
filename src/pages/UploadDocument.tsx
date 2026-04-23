import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  X,
  FileText,
  Link2,
  CheckCircle2,
  ChevronRight,
  Search,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AiIcon from '@/components/icons/AiIcon';
import { useS3Upload } from '@/hooks/useS3Upload';
import { validateFile, postData } from '@/lib/Api';
import { toast } from 'sonner';
import useFetch from '@/hooks/useFetch';
import {
  CATEGORIES,
  CATEGORY_TO_TYPES,
  DISCIPLINES,
  type DocCategory,
} from '@/lib/documentTaxonomy';

const DONE_STATUSES = ['done', 'Done', 'DONE', 'Closed', 'closed', 'CLOSED', 'Approved', 'approved'];
const TYPE_FILTERS = ['All', 'VO', 'RFI', 'SI', 'DC', 'CPI'];

export default function UploadDocument() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = localStorage.getItem('selectedProjectId');
  const [searchParams] = useSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [showLinking, setShowLinking] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Form fields
  const [category, setCategory] = useState<DocCategory | ''>('');
  const [name, setName] = useState('');
  const [docType, setDocType] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [runAiAnalysis, setRunAiAnalysis] = useState(true);
  const [certificateSubtype, setCertificateSubtype] = useState('');

  // Linking
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');

  // Read discipline from URL parameter (for pre-fill from segment upload)
  const disciplineParam = searchParams.get('discipline');

  useEffect(() => {
    if (docType !== 'Certificate') setCertificateSubtype('');
  }, [docType]);

  // Pre-fill discipline from URL parameter
  useEffect(() => {
    if (disciplineParam && !discipline) {
      setDiscipline(disciplineParam);
    }
  }, [disciplineParam]);

  // Reset docType if the selected category no longer allows it
  useEffect(() => {
    if (!category) return;
    const allowed = CATEGORY_TO_TYPES[category];
    if (docType && !allowed.includes(docType)) {
      setDocType('');
    }
    if (!docType && allowed.length === 1) {
      setDocType(allowed[0]);
    }
  }, [category]);

  const { data: capabilities } = useFetch<{
    documentTypes: string[];
    certificateSubtypes: string[];
  }>(projectId ? `documents/user-capabilities/?project_id=${projectId}` : '');

  const uploadableDocTypes = capabilities?.documentTypes || [];
  const uploadableCertSubtypes = capabilities?.certificateSubtypes || [];

  const { data: taskResponse, isLoading: tasksLoading } = useFetch<{ tasks: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : '',
    { enabled: !!projectId && showLinking },
  );

  const allTasks = (taskResponse?.tasks || [])
    .filter((item: any) => !DONE_STATUSES.includes(item.status || ''))
    .map((item: any) => ({
      id: item?.task?._id,
      rawId: `${item.taskType}-${String(item.taskId).padStart(3, '0')}`,
      title: item.task?.subject || item.task?.title || item.task?.taskActivityName || '—',
      type: item.taskType || 'GI',
    }));

  const filteredTasks = allTasks.filter((t: any) => {
    const matchesSearch =
      t.id?.toLowerCase().includes(linkSearch.toLowerCase()) ||
      t.title.toLowerCase().includes(linkSearch.toLowerCase());
    const matchesType = activeFilter === 'All' || t.type === activeFilter;
    return matchesSearch && matchesType;
  });

  const toggleLink = (id: string) =>
    setSelectedLinkIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const s3Upload = useS3Upload('project-documents/pending');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) { toast.error(`${file.name}: ${validation.error}`); return; }
      s3Upload.startUpload(`${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, file);
    });
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) { toast.error(`${file.name}: ${validation.error}`); return; }
      s3Upload.startUpload(`${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, file);
    });
  }, [s3Upload]);

  const missingCategory = !category;
  const missingType = !docType;
  const missingDiscipline = !discipline;
  const missingName = !name.trim();
  const showFieldErrors = attemptedSubmit;
  const canSubmit =
    !missingCategory &&
    !missingType &&
    !missingDiscipline &&
    !missingName &&
    s3Upload.entries.length > 0 &&
    !s3Upload.hasUploading;

  const errCls = (missing: boolean) =>
    showFieldErrors && missing ? 'border-red-400 ring-1 ring-red-300' : '';

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    if (missingName) { toast.error('Document name is required'); return; }
    if (missingCategory) { toast.error('Category is required'); return; }
    if (missingType) { toast.error('Type is required'); return; }
    if (missingDiscipline) { toast.error('Discipline is required'); return; }
    if (docType === 'Certificate' && uploadableCertSubtypes.length > 0 && !certificateSubtype) {
      toast.error('Certificate type is required'); return;
    }
    if (s3Upload.entries.length === 0) { toast.error('Please select a file to upload'); return; }
    if (!projectId) { toast.error('No project selected'); return; }

    setSubmitting(true);
    try {
      const ids = s3Upload.entries.map(e => e.id);
      const s3Keys = await s3Upload.waitForAll(ids);
      const linkIds = allTasks
        .filter((t: any) => selectedLinkIds.includes(t.id))
        .map((t: any) => ({ type: t.type, id: t.id }));

      if (s3Upload.entries.length > 1) {
        const files = s3Upload.entries
          .map(entry => { const s3Key = s3Keys.get(entry.id); return s3Key ? { s3Key, fileName: entry.file.name, fileSize: entry.file.size } : null; })
          .filter(Boolean);
        if (!files.length) { toast.error('All file uploads failed'); return; }
        await postData({ url: 'documents/new-upload/', data: { projectId: parseInt(projectId), files, type: docType, certificateSubtype: certificateSubtype || undefined, discipline: discipline || '', reference: reference || '', description: description || '', runAiAnalysis, linkIds } });
      } else {
        const entry = s3Upload.entries[0];
        const s3Key = s3Keys.get(entry.id);
        if (!s3Key) { toast.error(`Failed to upload ${entry.file.name}`); return; }
        await postData({ url: 'documents/', data: { project_id: parseInt(projectId), name: name.trim(), type: docType, certificate_subtype: certificateSubtype || undefined, discipline: discipline || '', description: description || '', reference: reference || '', s3_key: s3Key, file_name: entry.file.name, file_size: entry.file.size, run_ai_analysis: runAiAnalysis, link_ids: linkIds } });
      }

      toast.success('Document uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      navigate('/documents');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions = category
    ? CATEGORY_TO_TYPES[category].filter((t) =>
        uploadableDocTypes.length === 0 ? true : uploadableDocTypes.includes(t)
      )
    : [];

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-6 p-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/documents')}
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-white hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-normal tracking-tight text-foreground">Upload Document</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Add documents to your project</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/documents')}
              className="h-9 px-5 font-normal border-border"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="h-9 px-5 font-normal gap-2"
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Finish Upload</>
              )}
            </Button>
          </div>
        </div>

        {/* Main content — two columns */}
        <div className="grid grid-cols-5 gap-6 items-start">

          {/* Left — File upload */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-border p-6 space-y-4">
              <h2 className="text-sm font-normal text-foreground">Files</h2>

              <div
                className="border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => document.getElementById('file-upload-page')?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <input
                  id="file-upload-page"
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                  onChange={handleFileChange}
                />
                <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-normal text-foreground">Drop your documents here</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, XLSX, images up to 20MB</p>
                <Button variant="outline" className="mt-4 h-8 text-xs font-normal border-border bg-white" type="button">
                  Browse Files
                </Button>
              </div>

              {s3Upload.entries.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {s3Upload.entries.length} file{s3Upload.entries.length !== 1 ? 's' : ''} selected
                  </p>
                  {s3Upload.entries.map(entry => (
                    <div key={entry.id} className="rounded-lg border border-border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 bg-primary/5 rounded-lg flex items-center justify-center shrink-0">
                            {entry.status === 'error'
                              ? <AlertCircle className="h-4 w-4 text-red-500" />
                              : <FileText className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{entry.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(entry.file.size / (1024 * 1024)).toFixed(2)} MB
                              {entry.status === 'error' && <span className="text-red-500 ml-2">{entry.error}</span>}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => s3Upload.removeEntry(entry.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={entry.progress} className="h-1 flex-1" />
                        <span className="text-xs text-muted-foreground min-w-[28px]">
                          {entry.status === 'done' ? '✓' : `${Math.round(entry.progress)}%`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI info card */}
            <div className="rounded-xl bg-white border border-border px-5 py-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                <AiIcon size={20} />
              </div>
              <p className="text-sm leading-snug">
                <span className="font-medium text-foreground">AI analysis runs automatically</span>{' '}
                <span className="text-muted-foreground">on upload to extract key clauses</span>
              </p>
            </div>

            {/* No permission notice */}
            {uploadableDocTypes.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-normal text-amber-900">No Upload Permission</p>
                  <p className="text-xs text-amber-700 mt-1">
                    You do not have permission to upload any document types in this project. Please contact your project manager.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right — Details */}
          {uploadableDocTypes.length > 0 && (
            <div className="col-span-3 space-y-4">
              <div className="bg-white rounded-xl border border-border p-6 space-y-6">
                <h2 className="text-sm font-normal text-foreground">Document Details</h2>

                {/* Selected file names */}
                {s3Upload.entries.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Uploading:{' '}
                    <span className="text-foreground">
                      {s3Upload.entries.map(e => e.file.name).join(', ')}
                    </span>
                  </div>
                )}

                {/* Category pill selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-muted-foreground">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <div
                    className={cn(
                      "inline-flex gap-2 p-1 rounded-xl border",
                      showFieldErrors && missingCategory ? "border-red-400" : "border-border"
                    )}
                  >
                    {CATEGORIES.map((c) => {
                      const active = category === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-normal transition-all border",
                            active
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-white border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  {showFieldErrors && missingCategory && (
                    <p className="text-xs text-red-500">Category is required</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-normal text-muted-foreground">
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={docType} onValueChange={setDocType} disabled={!category}>
                      <SelectTrigger className={cn("h-10 border-border rounded-lg", errCls(missingType))}>
                        <SelectValue placeholder={category ? "Select type" : "Select category first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-normal text-muted-foreground">
                      Discipline <span className="text-red-500">*</span>
                    </Label>
                    <Select value={discipline} onValueChange={setDiscipline}>
                      <SelectTrigger className={cn("h-10 border-border rounded-lg", errCls(missingDiscipline))}>
                        <SelectValue placeholder="Select discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCIPLINES.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {docType === 'Certificate' && uploadableCertSubtypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-normal text-muted-foreground">
                      Certificate Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={certificateSubtype} onValueChange={setCertificateSubtype}>
                      <SelectTrigger className="h-10 border-border rounded-lg">
                        <SelectValue placeholder="Select certificate type" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadableCertSubtypes.map(subtype => (
                          <SelectItem key={subtype} value={subtype}>{subtype} Certificate</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-normal text-muted-foreground">
                      Document Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Enter document name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className={cn("h-10 border-border rounded-lg", errCls(missingName))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-normal text-muted-foreground">Reference</Label>
                    <Input
                      placeholder="e.g. ARC-DWG-0042"
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                      className="h-10 border-border rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-normal text-muted-foreground">Description (Optional)</Label>
                  <Textarea
                    placeholder="Enter a brief description of the document"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="min-h-[100px] border-border rounded-lg resize-none"
                  />
                </div>

                {/* AI Analysis */}
                <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-border flex items-center justify-center text-primary">
                      <AiIcon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-normal text-foreground">Run AI Analysis</p>
                      <p className="text-xs text-muted-foreground">Automatically extract obligations, flags, and clause references.</p>
                    </div>
                  </div>
                  <Switch
                    checked={runAiAnalysis}
                    onCheckedChange={checked => {
                      setRunAiAnalysis(checked);
                      postData({ url: 'documents/run-ai/', data: { runAiAnalysis: checked } }).catch(() => {});
                    }}
                  />
                </div>
              </div>

              {/* Link to documents */}
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLinking(!showLinking)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-normal text-foreground">Link to Existing Documents</span>
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showLinking && "rotate-90")} />
                </button>

                {showLinking && (
                  <div className="px-6 pb-6 space-y-4 border-t border-border">
                    <div className="relative mt-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search VOs, RFIs, or other documents..."
                        value={linkSearch}
                        onChange={e => setLinkSearch(e.target.value)}
                        className="pl-10 h-10 border-border rounded-lg"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {TYPE_FILTERS.map(filter => (
                        <button
                          key={filter}
                          onClick={() => setActiveFilter(filter)}
                          className={cn(
                            'px-4 py-1.5 rounded-full text-xs uppercase tracking-wide transition-all border font-normal',
                            activeFilter === filter
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-muted-foreground border-border hover:border-foreground/30'
                          )}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {tasksLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Loading tasks...</span>
                        </div>
                      ) : filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-1 text-muted-foreground">
                          <Search className="h-5 w-5" />
                          <p className="text-sm">{linkSearch.trim() ? `No results for "${linkSearch}"` : 'No open tasks found.'}</p>
                        </div>
                      ) : (
                        filteredTasks.map((task: any) => {
                          const isSelected = selectedLinkIds.includes(task.id);
                          return (
                            <div
                              key={task.id}
                              onClick={() => toggleLink(task.id)}
                              className={cn(
                                "flex items-center justify-between gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                                isSelected
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-border bg-white hover:border-border hover:bg-muted/30"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center">
                                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm text-foreground">{task.rawId}</p>
                                  <p className="text-xs text-muted-foreground">{task.title}</p>
                                </div>
                              </div>
                              <div className={cn(
                                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "border-primary" : "border-border"
                              )}>
                                <div className={cn("h-2.5 w-2.5 rounded-full bg-primary transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
