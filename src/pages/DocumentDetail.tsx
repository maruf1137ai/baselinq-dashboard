import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Share2,
  ChevronRight,
  Link2,
  FileClock,
  User,
  ArrowLeft,
  AlertCircle,
  Loader2,
  FileText,
  Trash2,
  Eye,
  Pencil,
  Plus,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import AiIcon from '@/components/icons/AiIcon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FilePreviewModal } from '@/components/TaskComponents/FilePreviewModal';
import { LinkDocumentModal } from '@/components/documents/LinkDocumentModal';
import { VersionHistoryModal } from '@/components/documents/VersionHistoryModal';
import { VersionUploadModal } from '@/components/documents/VersionUploadModal';
import { EditDocumentModal } from '@/components/documents/EditDocumentModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchData, postData, patchData, deleteData } from '@/lib/Api';
import type { LinkItem } from '@/components/documents/LinkDocumentModal';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';

const DocumentDetail = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isVersionUploadOpen, setIsVersionUploadOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<{ id: string; ref: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);

  // Obligation state
  const [showObligationForm, setShowObligationForm] = useState(false);
  const [obligationTitle, setObligationTitle] = useState('');
  const [obligationDueDate, setObligationDueDate] = useState('');
  const [obligationRole, setObligationRole] = useState('');
  const [editingObligation, setEditingObligation] = useState<any>(null);

  const queryClient = useQueryClient();

  const projectId = localStorage.getItem('selectedProjectId');

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ['document', docId, projectId],
    queryFn: () => fetchData(`documents/${docId}/?project_id=${projectId}`),
    enabled: !!docId && !!projectId,
    refetchOnWindowFocus: false,
  });

  const { data: findingsData, isLoading: findingsLoading } = useQuery({
    queryKey: ['findings', docId, projectId],
    queryFn: () => fetchData(`documents/${docId}/findings/?project_id=${projectId}`),
    enabled: !!docId && !!doc && !!projectId,
    // refetchInterval: doc?.aiStatus === 'running' ? 3000 : false,
    refetchOnWindowFocus: false,
    select: (data) => (Array.isArray(data) ? data : data?.results ?? []),
  });

  const findings = findingsData ?? [];

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['versions', docId, projectId],
    queryFn: () => fetchData(`documents/${docId}/versions/?project_id=${projectId}`),
    enabled: !!docId && !!projectId,
    refetchOnWindowFocus: false,
    select: (data) => (Array.isArray(data) ? data : data?.results ?? []),
  });

  const versions = versionsData ?? [];

  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ['links', docId, projectId],
    queryFn: () => fetchData(`documents/${docId}/links/?project_id=${projectId}`),
    enabled: !!docId && !!projectId,
    refetchOnWindowFocus: false,
  });

  const links = Array.isArray(linksData) ? linksData : linksData?.results ?? [];

  const { data: obligationsData, isLoading: obligationsLoading } = useQuery({
    queryKey: ['obligations', docId, projectId],
    queryFn: () => fetchData(`documents/${docId}/obligations/?project_id=${projectId}`),
    enabled: !!docId && !!projectId,
    refetchOnWindowFocus: false,
    select: (data) => (Array.isArray(data) ? data : data?.results ?? []),
  });

  const obligations = obligationsData ?? [];

  const { mutate: runAnalysis, isPending: isAnalysisRunning } = useMutation({
    mutationFn: () => postData({ url: `documents/${docId}/analyze/?project_id=${projectId}`, data: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
      queryClient.invalidateQueries({ queryKey: ['findings', docId] });
    },
  });

  const { mutate: addLinks, isPending: isLinking } = useMutation({
    mutationFn: (items: LinkItem[]) =>
      postData({ url: `documents/${docId}/links/?project_id=${projectId}`, data: { items } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', docId] });
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
      toast.success('Links added successfully.');
      setIsLinkModalOpen(false);
    },
    onError: () => toast.error('Failed to add links.'),
  });

  const { mutate: deleteLink, isPending: isDeleting } = useMutation({
    mutationFn: (linkId: string) =>
      deleteData({ url: `documents/${docId}/links/${linkId}/?project_id=${projectId}`, data: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', docId] });
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
      toast.success('Link removed.');
      setLinkToDelete(null);
    },
    onError: () => toast.error('Failed to remove link.'),
  });

  const { mutate: resolveFinding } = useMutation({
    mutationFn: (findingId: string) =>
      patchData({ url: `documents/${docId}/findings/${findingId}/resolve/`, data: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings', docId] });
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
    },
  });

  const { mutate: deleteDocument, isPending: isDeletingDoc } = useMutation({
    mutationFn: () =>
      deleteData({ url: `documents/${docId}/?project_id=${projectId}`, data: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      toast.success('Document deleted.');
      navigate('/documents');
    },
    onError: () => toast.error('Failed to delete document.'),
  });

  const { mutate: createObligation, isPending: isCreatingObligation } = useMutation({
    mutationFn: (data: { title: string; due_date?: string; responsible_role?: string }) =>
      postData({ url: `documents/${docId}/obligations/?project_id=${projectId}`, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obligations', docId] });
      toast.success('Obligation created.');
      setShowObligationForm(false);
      setObligationTitle('');
      setObligationDueDate('');
      setObligationRole('');
    },
    onError: () => toast.error('Failed to create obligation.'),
  });

  const { mutate: updateObligation } = useMutation({
    mutationFn: ({ obligationId, data }: { obligationId: string; data: Record<string, any> }) =>
      patchData({ url: `documents/${docId}/obligations/${obligationId}/?project_id=${projectId}`, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obligations', docId] });
      toast.success('Obligation updated.');
      setEditingObligation(null);
    },
    onError: () => toast.error('Failed to update obligation.'),
  });

  const DetailItem = ({
    label,
    value,
    isActionable = false,
  }: {
    label: string;
    value?: string | null;
    isActionable?: boolean;
  }) => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors px-2 rounded-lg">
        <span className="text-xs text-gray-500 font-normal uppercase tracking-wider">{label}</span>
        <span className={cn(
          "text-sm font-normal",
          isActionable ? "text-[#B45309] hover:underline cursor-pointer" : "text-[#1A1A1A]",
        )}>
          {value}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <AwesomeLoader message="Loading Document" />
      </DashboardLayout>
    );
  }

  if (isError || !doc) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-3 text-gray-400">
          <FileText className="w-10 h-10" />
          <p className="text-sm">Document not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/documents')}>
            Back to Documents
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const uploadedAgo = doc.createdAt
    ? formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true }).replace('about ', '')
    : null;
  const fileSizeMB = doc.fileSize ? `${(doc.fileSize / (1024 * 1024)).toFixed(2)} MB` : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4">

        {/* Breadcrumbs */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <button
              onClick={() => navigate('/documents')}
              className="hover:text-[#1A1A1A] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Documents
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-400">{doc.discipline || '—'}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-[#1A1A1A] font-normal">{doc.reference}</span>
          </nav>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 flex-1">
            <h1 className="text-4xl font-normal tracking-tight text-[#1A1A1A] leading-tight">
              {doc.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge className="bg-amber-50 text-[#B45309] border-amber-100 px-3 py-1 font-normal">
                {doc.reference}
              </Badge>
              <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600 px-3 py-1 font-normal">
                {doc.type}
              </Badge>
              {doc.discipline && (
                <Badge variant="outline" className="bg-purple-50 border-purple-100 text-[#6D28D9] px-3 py-1 font-normal">
                  {doc.discipline}
                </Badge>
              )}
              <Badge className={cn(
                "px-3 py-1 font-normal flex items-center gap-1.5 border-0",
                doc.status === 'Active' ? "bg-emerald-50 text-emerald-700" :
                  doc.status === 'Archived' ? "bg-gray-100 text-gray-500" :
                    "bg-amber-50 text-amber-700"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  doc.status === 'Active' ? "bg-emerald-500" :
                    doc.status === 'Archived' ? "bg-gray-400" : "bg-amber-500"
                )} />
                {doc.status}
              </Badge>
              {doc.isGated && (
                <Badge className="bg-amber-50 text-[#B45309] border-amber-100 px-3 py-1 font-normal">
                  Finance Gated
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-white border-gray-200 text-[#1A1A1A] hover:bg-gray-50 h-9 px-4 rounded-lg transition-all flex gap-2"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Pencil className="w-4 h-4" /> Edit
              </Button>
              <Button
                variant="outline"
                className="bg-white border-gray-200 text-[#1A1A1A] hover:bg-gray-50 h-9 px-4 rounded-lg transition-all flex gap-2"
                onClick={() => doc.downloadUrl && window.open(doc.downloadUrl, '_blank')}
                disabled={!doc.downloadUrl}
              >
                <Download className="w-4 h-4" /> Download
              </Button>
              <Button variant="outline" className="bg-white border-gray-200 text-[#1A1A1A] hover:bg-gray-50 h-9 px-4 rounded-lg transition-all flex gap-2">
                <Share2 className="w-4 h-4" /> Share
              </Button>
              <Button
                variant="outline"
                className="bg-white border-red-200 text-red-600 hover:bg-red-50 h-9 px-4 rounded-lg transition-all flex gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <Button
                className="bg-primary text-white hover:opacity-90 h-9 px-4 rounded-lg transition-all font-normal"
                onClick={() => setIsVersionUploadOpen(true)}
              >
                Upload revision
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full border border-gray-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-normal text-gray-700">{doc.currentVersion}, current</span>
              </div>
              {doc.uploadedBy && (
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  {uploadedAgo ? `Uploaded ${uploadedAgo} by ${doc.uploadedBy.name}` : `Uploaded by ${doc.uploadedBy.name}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-100 pt-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-8 border-b-0">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'ai', label: 'AI Analysis', count: doc.aiFlags > 0 ? doc.aiFlags : undefined, severity: doc.aiSeverity },
                { id: 'linked', label: 'Linked', count: doc.linkedCount > 0 ? doc.linkedCount : undefined },
                { id: 'obligations', label: 'Obligations' },
                { id: 'versions', label: 'Versions' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "px-0 py-4 border-b-2 border-transparent text-[#6B7280] bg-transparent font-normal shadow-none rounded-none transition-all",
                    "data-[state=active]:border-primary data-[state=active]:text-[#1A1A1A] flex items-center gap-2"
                  )}
                >
                  {tab.label}
                  {(tab as any).count !== undefined && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-normal",
                      (tab as any).severity === 'high' ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
                    )}>
                      {(tab as any).count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    <h3 className="text-sm font-normal text-[#1A1A1A] uppercase tracking-widest">Document Details</h3>
                  </div>
                  <div className="space-y-1">
                    <DetailItem label="Reference" value={doc.reference} isActionable />
                    <DetailItem label="Document type" value={doc.type} />
                    <DetailItem label="Discipline" value={doc.discipline} />
                    <DetailItem label="Description" value={doc.description} />
                    <DetailItem label="File name" value={doc.fileName} />
                    <DetailItem label="File size" value={fileSizeMB} />
                    <DetailItem label="Standard" value={null} />
                    <DetailItem label="Parties" value={null} />
                    <DetailItem label="Contract value" value={null} />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-6 bg-amber-400 rounded-full" />
                    <h3 className="text-sm font-normal text-[#1A1A1A] uppercase tracking-widest">Key Dates</h3>
                  </div>
                  <div className="space-y-1">
                    <DetailItem label="Executed" value={null} />
                    <DetailItem label="Commencement" value={null} />
                    <DetailItem label="Practical completion" value={null} />
                    <DetailItem label="Defects liability" value={null} />
                    <DetailItem label="Next obligation due" value={null} isActionable />
                    <DetailItem label="Uploaded" value={doc.createdAt ? formatDate(doc.createdAt) : null} />
                    <DetailItem label="Last updated" value={doc.updatedAt ? formatDate(doc.updatedAt) : null} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* AI Analysis */}
            <TabsContent value="ai" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-normal text-gray-400 uppercase tracking-widest">
                  Findings ({findings.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-primary font-normal hover:bg-primary/5 gap-1.5"
                  onClick={() => runAnalysis()}
                  disabled={isAnalysisRunning || doc.aiStatus === 'running'}
                >
                  {(isAnalysisRunning || doc.aiStatus === 'running')
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
                    : <><AiIcon size={14} /> Re-run Analysis</>
                  }
                </Button>
              </div>

              {doc.aiStatus === 'running' && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50 text-amber-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-normal">AI analysis is currently running...</span>
                </div>
              )}

              {findingsLoading && doc.aiStatus !== 'running' && (
                <AwesomeLoader message="Loading Findings" />
              )}

              {!findingsLoading && findings.length === 0 && doc.aiStatus !== 'running' && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <AiIcon size={32} />
                  <p className="text-sm">No AI findings for this document.</p>
                </div>
              )}

              {findings.length > 0 && (
                <div className="space-y-3">
                  {findings.map((finding: any) => (
                    <div
                      key={finding._id}
                      className={cn(
                        "p-5 rounded-xl border bg-white transition-all",
                        finding.isResolved
                          ? "border-gray-100 opacity-60"
                          : finding.severity === 'high'
                            ? "border-red-100"
                            : finding.severity === 'medium'
                              ? "border-amber-100"
                              : "border-gray-100"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-normal capitalize",
                              finding.severity === 'high' ? "bg-red-50 text-red-600" :
                                finding.severity === 'medium' ? "bg-amber-50 text-[#B45309]" :
                                  "bg-gray-100 text-gray-500"
                            )}>
                              {finding.severity}
                            </span>
                            {finding.clauseReference && (
                              <span className="text-xs text-gray-400 font-normal">{finding.clauseReference}</span>
                            )}
                          </div>
                          <p className={cn(
                            "text-sm font-normal text-[#1A1A1A]",
                            finding.isResolved && "line-through text-gray-400"
                          )}>
                            {finding.title}
                          </p>
                          {finding.description && (
                            <p className="text-xs text-gray-500 font-normal leading-relaxed">{finding.description}</p>
                          )}
                          {finding.isResolved && finding.resolvedBy && (
                            <p className="text-xs text-gray-400 font-normal mt-1">
                              Resolved by {finding.resolvedBy.name ?? finding.resolvedBy}
                              {finding.resolvedAt ? ` · ${formatDistanceToNow(new Date(finding.resolvedAt), { addSuffix: true }).replace('about ', '')}` : ''}
                            </p>
                          )}
                        </div>
                        {!finding.isResolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-normal border-gray-200 rounded-lg shrink-0"
                            onClick={() => resolveFinding(finding._id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Linked */}
            <TabsContent value="linked" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-normal text-gray-400 uppercase tracking-widest">Linked Items ({links.length})</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-lg"
                  onClick={() => setIsLinkModalOpen(true)}
                >
                  <Link2 className="h-3.5 w-3.5" /> Add Link
                </Button>
              </div>

              {linksLoading ? (
                <AwesomeLoader message="Loading Links" />
              ) : links.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <Link2 className="w-8 h-8" />
                  <p className="text-sm">No linked items yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {links.map((link: any) => (
                    <div key={link._id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all group/link">
                      <div className="flex items-center gap-4 cursor-pointer flex-1">
                        <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover/link:bg-primary/5 transition-colors">
                          <span className="text-primary text-xs font-normal">{link.itemType}</span>
                        </div>
                        <div>
                          <p className="text-sm font-normal text-[#1A1A1A]">{link.itemReference}</p>
                          <p className="text-xs text-gray-400 font-normal">{link.itemTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLinkToDelete({ id: link._id, ref: link.itemReference })}
                          className="opacity-0 group-hover/link:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover/link:text-primary transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Obligations */}
            <TabsContent value="obligations" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-normal text-gray-400 uppercase tracking-widest">
                  Obligations ({obligations.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-normal border-0 text-xs">
                    Auto-synced to Programme
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-lg"
                    onClick={() => { setShowObligationForm(true); setEditingObligation(null); setObligationTitle(''); setObligationDueDate(''); setObligationRole(''); }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Obligation
                  </Button>
                </div>
              </div>

              {showObligationForm && (
                <div className="p-5 rounded-xl border border-primary/20 bg-primary/[0.02] space-y-4">
                  <div>
                    <label className="text-xs font-normal text-gray-400 uppercase block mb-1.5">Title <span className="text-red-500">*</span></label>
                    <input
                      value={obligationTitle}
                      onChange={(e) => setObligationTitle(e.target.value)}
                      placeholder="e.g. Submit monthly progress report"
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-normal text-gray-400 uppercase block mb-1.5">Due Date</label>
                      <input
                        type="date"
                        value={obligationDueDate}
                        onChange={(e) => setObligationDueDate(e.target.value)}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-normal text-gray-400 uppercase block mb-1.5">Responsible Role</label>
                      <input
                        value={obligationRole}
                        onChange={(e) => setObligationRole(e.target.value)}
                        placeholder="e.g. Contractor"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowObligationForm(false)} className="h-8 text-xs font-normal">Cancel</Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-normal gap-1.5"
                      disabled={!obligationTitle.trim() || isCreatingObligation}
                      onClick={() => {
                        const data: any = { title: obligationTitle.trim() };
                        if (obligationDueDate) data.due_date = obligationDueDate;
                        if (obligationRole.trim()) data.responsible_role = obligationRole.trim();
                        createObligation(data);
                      }}
                    >
                      {isCreatingObligation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Create
                    </Button>
                  </div>
                </div>
              )}

              {obligationsLoading ? (
                <AwesomeLoader message="Loading Obligations" />
              ) : obligations.length === 0 && !showObligationForm ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm">No obligations extracted yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {obligations.map((ob: any) => (
                    <div key={ob._id} className="p-5 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all">
                      {editingObligation?._id === ob._id ? (
                        <div className="space-y-3">
                          <input
                            value={editingObligation.title}
                            onChange={(e) => setEditingObligation({ ...editingObligation, title: e.target.value })}
                            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/20"
                          />
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              type="date"
                              value={editingObligation.due_date || ''}
                              onChange={(e) => setEditingObligation({ ...editingObligation, due_date: e.target.value })}
                              className="h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/20"
                            />
                            <input
                              value={editingObligation.responsible_role || ''}
                              onChange={(e) => setEditingObligation({ ...editingObligation, responsible_role: e.target.value })}
                              placeholder="Responsible role"
                              className="h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/20"
                            />
                            <select
                              value={editingObligation.status || 'pending'}
                              onChange={(e) => setEditingObligation({ ...editingObligation, status: e.target.value })}
                              className="h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/20"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditingObligation(null)} className="h-7 text-xs">Cancel</Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => updateObligation({
                                obligationId: ob._id,
                                data: {
                                  title: editingObligation.title,
                                  due_date: editingObligation.due_date || undefined,
                                  responsible_role: editingObligation.responsible_role || undefined,
                                  status: editingObligation.status,
                                },
                              })}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1.5">
                            <p className="text-sm font-normal text-[#1A1A1A]">{ob.title}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {ob.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Due: {ob.due_date}
                                </span>
                              )}
                              {ob.responsible_role && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" /> {ob.responsible_role}
                                </span>
                              )}
                              <Badge className={cn(
                                "text-xs font-normal border-0 px-2 py-0.5",
                                ob.status === 'completed' ? "bg-emerald-50 text-emerald-700" :
                                ob.status === 'overdue' ? "bg-red-50 text-red-600" :
                                ob.status === 'in_progress' ? "bg-blue-50 text-blue-600" :
                                "bg-gray-100 text-gray-500"
                              )}>
                                {ob.status || 'pending'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-normal border-gray-200 rounded-lg shrink-0"
                            onClick={() => setEditingObligation({ ...ob })}
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Versions */}
            <TabsContent value="versions" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-normal text-gray-400 uppercase tracking-widest">Version History ({versions.length})</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-lg"
                  onClick={() => setIsVersionHistoryOpen(true)}
                >
                  <FileClock className="w-3.5 h-3.5" /> Full Audit Log
                </Button>
              </div>

              {versionsLoading ? (
                <AwesomeLoader message="Loading Versions" />
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <FileClock className="w-8 h-8" />
                  <p className="text-sm">No versions found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((v: any) => {
                    const sizeMB = v.fileSize ? `${(v.fileSize / (1024 * 1024)).toFixed(2)} MB` : null;
                    return (
                      <div key={v._id} className={cn(
                        "flex flex-col p-4 rounded-xl border bg-white shadow-sm",
                        v.isCurrent ? "border-primary/20" : "border-gray-100"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-normal",
                              v.isCurrent ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                            )}>
                              v{v.versionNumber}
                            </div>
                            <div>
                              <p className="text-sm font-normal text-[#1A1A1A]">{formatDate(v.createdAt)}</p>
                              {v.uploadedBy && (
                                <p className="text-xs text-gray-500 font-normal flex items-center gap-1.5 mt-0.5">
                                  <User className="h-3 w-3" /> {v.uploadedBy.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.isCurrent && (
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 text-xs font-normal uppercase py-1">
                                Current
                              </Badge>
                            )}
                            {v.downloadUrl && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs font-normal border-gray-200 rounded-lg gap-1.5"
                                  onClick={() => setPreviewFile({ name: v.fileName, url: v.downloadUrl })}
                                >
                                  <Eye className="w-3 h-3" /> View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs font-normal border-gray-200 rounded-lg gap-1.5"
                                  onClick={() => window.open(v.downloadUrl, '_blank')}
                                >
                                  <Download className="w-3 h-3" /> Download
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="mt-4 text-xs text-gray-500 font-normal bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
                          {v.fileName}{sizeMB ? ` · ${sizeMB}` : ''}{v.changelog ? ` · ${v.changelog}` : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <LinkDocumentModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onLink={(items) => addLinks(items)}
        isLinking={isLinking}
        alreadyLinked={links.map((l: any) => ({ type: l.itemType, itemId: l.itemId }))}
      />

      <AlertDialog open={!!linkToDelete} onOpenChange={(open) => !open && setLinkToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the link to <span className="font-medium text-[#1A1A1A]">{linkToDelete?.ref}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={isDeleting}
              onClick={() => { if (linkToDelete) deleteLink(linkToDelete.id); }}
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Removing...</> : 'Remove'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        document={doc}
        versions={versions}
        isLoading={versionsLoading}
      />

      <VersionUploadModal
        isOpen={isVersionUploadOpen}
        onClose={() => setIsVersionUploadOpen(false)}
        document={doc}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['versions', docId] });
          queryClient.invalidateQueries({ queryKey: ['document', docId] });
          setIsVersionUploadOpen(false);
        }}
      />

      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        document={doc}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(false)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-[#1A1A1A]">{doc.name}</span> and all its versions, findings, and obligations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDoc}>Cancel</AlertDialogCancel>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={isDeletingDoc}
              onClick={() => deleteDocument()}
            >
              {isDeletingDoc ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deleting...</> : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilePreviewModal
        isOpen={!!previewFile}
        onOpenChange={(open) => { if (!open) setPreviewFile(null); }}
        file={previewFile}
      />
    </DashboardLayout>
  );
};

export default DocumentDetail;
