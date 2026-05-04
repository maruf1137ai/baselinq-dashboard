import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AiIcon from '@/components/icons/AiIcon';
import { useS3Upload } from '@/hooks/useS3Upload';
import { validateFile, postData } from '@/lib/Api';
import useFetch from '@/hooks/useFetch';
import { CATEGORY_TO_TYPES, type DocCategory } from '@/lib/documentTaxonomy';
import type { FolderTab, FolderVisibility } from '@/types/folder';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UserMultiSelect } from './UserMultiSelect';

interface UploadStep3Props {
  projectId: string;
  selectedTab: FolderTab;
  selectedFolderId: string;
  selectedFolderName: string;
  isNewFolder: boolean;
  s3Upload: ReturnType<typeof useS3Upload>;
  onBack: () => void;
  onSubmit: (data: UploadFormData) => Promise<void>;
  submitting: boolean;
}

export interface UploadFormData {
  name: string;
  reference: string;
  description: string;
  docType: string;
  certificateSubtype: string;
  runAiAnalysis: boolean;
  notifyTeam: boolean;
  linkIds: Array<{ type: string; id: string }>;
  s3Entries: Array<{ id: string; file: File }>;
  visibility: FolderVisibility;
  visibilityUsers: string[];
  issuedTo: string;
  issueStatus: string;
}

const DONE_STATUSES = ['done', 'Done', 'DONE', 'Closed', 'closed', 'CLOSED', 'Approved', 'approved'];
const TYPE_FILTERS = ['All', 'VO', 'RFI', 'SI', 'DC', 'CPI'];

const ISSUE_STATUSES = [
  'For Information',
  'For Approval',
  'For Construction',
  'For Tender',
  'For Construction Issue',
];

/**
 * Step 3: File Upload and Metadata
 *
 * Handles file selection, document details, AI analysis, and task linking.
 */
export function UploadStep3FileMetadata({
  projectId,
  selectedTab,
  selectedFolderId,
  selectedFolderName,
  isNewFolder,
  s3Upload,
  onBack,
  onSubmit,
  submitting,
}: UploadStep3Props) {
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [showLinking, setShowLinking] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [docType, setDocType] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [runAiAnalysis, setRunAiAnalysis] = useState(true);
  const [notifyTeam, setNotifyTeam] = useState(false);
  const [certificateSubtype, setCertificateSubtype] = useState('');
  const [isReferenceManuallyEdited, setIsReferenceManuallyEdited] = useState(false);
  const [visibility, setVisibility] = useState<FolderVisibility>('all');
  const [visibilityUsers, setVisibilityUsers] = useState<string[]>([]);
  const [issuedTo, setIssuedTo] = useState('All');
  const [issueStatus, setIssueStatus] = useState('For Information');

  // Linking
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');

  // Auto-generate reference from name
  useEffect(() => {
    if (!isReferenceManuallyEdited) {
      if (name.trim()) {
        const words = name.trim().split(/[\s\-_]+/);
        const initials = words
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '');
        if (initials) {
          setReference(`${initials}-01`);
        } else {
          setReference('');
        }
      } else {
        setReference('');
      }
    }
  }, [name, isReferenceManuallyEdited]);

  // Reset cert subtype when docType changes
  useEffect(() => {
    if (docType !== 'Certificate') setCertificateSubtype('');
  }, [docType]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) return;
      s3Upload.startUpload(`${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, file);
    });
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) return;
      s3Upload.startUpload(`${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, file);
    });
  }, [s3Upload]);

  // Map tab to category
  const category: DocCategory = selectedTab === 'contracts' ? 'Contracts' :
    selectedTab === 'drawings' ? 'Drawings' : 'Documents';

  const typeOptions = CATEGORY_TO_TYPES[category].filter((t) =>
    uploadableDocTypes.length === 0 ? true : uploadableDocTypes.includes(t)
  );

  // Auto-select docType when the user shouldn't see the dropdown.
  //
  //   Drawings  -> always "Drawing" (only one type).
  //   Contracts -> default to "Contract". Folder path carries the real
  //                filing meaning (Tender Docs / Variation Orders /
  //                Signed Contract / etc.); the legacy Contract vs
  //                Contract Agreement enum split is not Werner's
  //                taxonomy. Power-users can still flip this in the
  //                Edit modal post-upload.
  //   Documents -> user picks from typeOptions (Spec / Report / Cert)
  //                because that's a genuine choice the folder doesn't
  //                determine.
  useEffect(() => {
    if (docType) return;
    if (selectedTab === 'drawings' && typeOptions.includes('Drawing')) {
      setDocType('Drawing');
    } else if (selectedTab === 'contracts' && typeOptions.includes('Contract')) {
      setDocType('Contract');
    } else if (typeOptions.length === 1) {
      setDocType(typeOptions[0]);
    }
  }, [selectedTab, typeOptions, docType]);

  const missingType = !docType;
  const missingName = !name.trim();
  // Drawings — Issued To and Status are required per the documents-folder plan
  const missingIssuedTo = selectedTab === 'drawings' && !issuedTo.trim();
  const missingIssueStatus = selectedTab === 'drawings' && !issueStatus;
  const showFieldErrors = attemptedSubmit;
  const canSubmit =
    !missingType &&
    !missingName &&
    !missingIssuedTo &&
    !missingIssueStatus &&
    s3Upload.entries.length > 0 &&
    !s3Upload.hasUploading;

  const errCls = (missing: boolean) =>
    showFieldErrors && missing ? 'border-red-400 ring-1 ring-red-300' : '';

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    if (!canSubmit) return;

    const linkIds = allTasks
      .filter((t: any) => selectedLinkIds.includes(t.id))
      .map((t: any) => ({ type: t.type, id: t.id }));

    await onSubmit({
      name: name.trim(),
      reference,
      description,
      docType,
      certificateSubtype,
      runAiAnalysis,
      notifyTeam,
      linkIds,
      s3Entries: s3Upload.entries,
      visibility,
      visibilityUsers,
      issuedTo: issuedTo.trim() || 'All',
      issueStatus,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-normal text-foreground">Upload Files & Details</h2>
        <p className="text-sm text-muted-foreground">
          Uploading to: <strong>{selectedFolderName.replace(/_/g, ' ')}</strong>
          {isNewFolder && <span className="text-primary ml-1">(New folder)</span>}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4 items-start">
        {/* Left: File Upload */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-normal text-foreground">Files</h3>

            <div
              className="border border-dashed border-border rounded-xl px-6 py-5 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => document.getElementById('file-upload-step3')?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <input
                id="file-upload-step3"
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <div className="h-9 w-9 bg-white rounded-lg shadow-sm border border-border flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-normal text-foreground">Drop your documents here</p>
              <p className="text-xs text-muted-foreground mt-0.5">PDF, XLSX, images up to 20MB</p>
              <Button variant="outline" className="mt-3 h-7 text-xs font-normal border-border bg-white" type="button">
                Browse Files
              </Button>
            </div>

            {s3Upload.entries.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {s3Upload.entries.length} file{s3Upload.entries.length !== 1 ? 's' : ''} selected
                </p>
                {s3Upload.entries.map(entry => (
                  <div key={entry.id} className="rounded-lg border border-border bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 bg-primary/5 rounded-lg flex items-center justify-center shrink-0">
                          {entry.status === 'error'
                            ? <AlertCircle className="h-4 w-4 text-red-500" />
                            : <FileText className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{entry.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(entry.file.size / (1024 * 1024)).toFixed(2)} MB
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
        </div>

        {/* Right: Metadata */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-normal text-foreground">Document Details</h3>

            {/* Document Name — full width */}
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

            {/* Reference + Type
                ─────────────────
                Per Werner's redesign proposal (docs/DOCUMENTS_REDESIGN_PROPOSAL.md),
                the FOLDER PATH is the filing taxonomy. A doc dropped into
                "Tender Docs" is a tender document by virtue of where it
                sits — asking the user to additionally pick a "Type" from
                a stale 6-value enum (Contract / Contract Agreement /
                Drawing / Specification / Report / Certificate) is
                redundant noise.

                Type field shows ONLY when there's a genuine choice the
                folder doesn't carry:
                  - Drawings:  always "Drawing" (auto-set, hidden).
                  - Contracts: defaulted to "Contract" (auto-set, hidden) —
                               folder path identifies it (Tender Docs vs
                               Variation Orders vs Signed Contract etc.).
                  - Documents: 3 distinct values (Spec / Report / Cert)
                               that aren't determined by discipline folder,
                               so the dropdown stays visible. */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-normal text-muted-foreground">Reference</Label>
                <Input
                  placeholder="e.g. ARC-DWG-0042"
                  value={reference}
                  onChange={e => {
                    setReference(e.target.value);
                    setIsReferenceManuallyEdited(true);
                  }}
                  className="h-10 border-border rounded-lg"
                />
              </div>

              {selectedTab === 'documents' && typeOptions.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-muted-foreground">
                    Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className={cn("h-10 border-border rounded-lg", errCls(missingType))}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Certificate subtype — only for Certificate doc type */}
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

            {/* Description — full width */}
            <div className="space-y-2">
              <Label className="text-sm font-normal text-muted-foreground">Description (Optional)</Label>
              <Textarea
                placeholder="Enter a brief description of the document"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="min-h-[56px] border-border rounded-lg resize-none"
              />
            </div>

            {/* Issue Register fields — required for drawings, optional otherwise */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-normal text-muted-foreground">
                  Issued To
                  {selectedTab === 'drawings' && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  placeholder="e.g. Contractor, All, Architect"
                  value={issuedTo}
                  onChange={e => setIssuedTo(e.target.value)}
                  className={cn("h-10 border-border rounded-lg", errCls(missingIssuedTo))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-normal text-muted-foreground">
                  Status
                  {selectedTab === 'drawings' && <span className="text-red-500"> *</span>}
                </Label>
                <Select value={issueStatus} onValueChange={setIssueStatus}>
                  <SelectTrigger className={cn("h-10 border-border rounded-lg", errCls(missingIssueStatus))}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/10 px-4 py-2.5">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-border flex items-center justify-center text-primary">
                  <AiIcon size={16} />
                </div>
                <div>
                  <p className="text-sm font-normal text-foreground">Run AI Analysis</p>
                  <p className="text-xs text-muted-foreground">Extract obligations, flags, and clauses.</p>
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

            {/* Notify Team */}
            <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/10 px-4 py-2.5">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-border flex items-center justify-center text-primary">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-normal text-foreground">Notify Team</p>
                  <p className="text-xs text-muted-foreground">Send notification to all project members.</p>
                </div>
              </div>
              <Switch
                checked={notifyTeam}
                onCheckedChange={setNotifyTeam}
              />
            </div>
          </div>

          {/* Folder Visibility — only when creating a NEW folder in Drawings/Documents.
              Contracts tree is locked (cannot create new folders), so never show here. */}
          {isNewFolder && selectedTab !== 'contracts' && (
            <div className="bg-white rounded-xl border border-border p-4 space-y-3">
              <div>
                <h3 className="text-sm font-normal text-foreground">Folder Visibility</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Control who can access documents in this folder
                </p>
              </div>

              <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as FolderVisibility)}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="all" id="vis-all" />
                    <Label htmlFor="vis-all" className="flex-1 cursor-pointer">
                      <span className="text-sm font-normal text-foreground">All project members</span>
                      <p className="text-xs text-muted-foreground">Everyone in the project can view</p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="professional_team" id="vis-prof" />
                    <Label htmlFor="vis-prof" className="flex-1 cursor-pointer">
                      <span className="text-sm font-normal text-foreground">Professional team only</span>
                      <p className="text-xs text-muted-foreground">Client, PM, architects, engineers, consultants</p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="contractor" id="vis-contractor" />
                    <Label htmlFor="vis-contractor" className="flex-1 cursor-pointer">
                      <span className="text-sm font-normal text-foreground">Contractor only</span>
                      <p className="text-xs text-muted-foreground">Construction manager, site engineers, supervisors</p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="individual" id="vis-individual" />
                    <Label htmlFor="vis-individual" className="flex-1 cursor-pointer">
                      <span className="text-sm font-normal text-foreground">Specific users</span>
                      <p className="text-xs text-muted-foreground">Select individual team members</p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {visibility === 'individual' && (
                <div className="pt-3 border-t border-border">
                  <Label className="text-sm font-normal text-muted-foreground mb-3 block">
                    Select users with access
                  </Label>
                  <UserMultiSelect
                    projectId={projectId}
                    value={visibilityUsers}
                    onChange={setVisibilityUsers}
                  />
                </div>
              )}
            </div>
          )}

          {/* Task Linking (collapsed by default) */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLinking(!showLinking)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-normal text-foreground">Link to Existing Documents</span>
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showLinking && "rotate-90")} />
            </button>

            {showLinking && (
              <div className="px-4 pb-4 space-y-3 border-t border-border">
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search VOs, RFIs, or other documents..."
                    value={linkSearch}
                    onChange={e => setLinkSearch(e.target.value)}
                    className="pl-10 h-9 border-border rounded-lg"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {TYPE_FILTERS.map(filter => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs uppercase tracking-wide transition-all border font-normal',
                        activeFilter === filter
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-white text-muted-foreground border-border hover:border-foreground/30'
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading tasks...</span>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-1 text-muted-foreground">
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
                            "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all",
                            isSelected
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-white hover:border-border hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-lg bg-muted border border-border flex items-center justify-center">
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
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-2">
        <Button
          onClick={onBack}
          variant="outline"
          className="h-9 px-5 gap-2 font-normal"
          disabled={submitting}
        >
          <ChevronLeft className="w-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleSubmit}
          className="h-9 px-5 gap-2 font-normal"
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
  );
}
