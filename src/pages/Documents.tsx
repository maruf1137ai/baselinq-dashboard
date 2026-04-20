import { DashboardLayout } from '@/components/DashboardLayout';
import DocumentTable from '@/components/documents/DocumentTable';
import { AskRegulationsDrawer } from '@/components/documents/AskRegulationsDrawer';
import { Button } from '@/components/ui/button';
import { Search, Plus, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { VersionUploadModal } from '@/components/documents/VersionUploadModal';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchData, deleteData, postData } from '@/lib/Api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, FileText, AlertCircle, Calendar } from 'lucide-react';
import type { ApiDocument } from '@/components/documents/DocumentTable';

const SORT_OPTIONS = [
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'name_az', label: 'Name A–Z' },
  { value: 'most_ai_flags', label: 'Most AI flags' },
  { value: 'oldest', label: 'Oldest first' },
];

const Documents = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = localStorage.getItem('selectedProjectId');

  const [isAskOpen, setIsAskOpen] = useState(false);
  const [isVersionUploadModalOpen, setIsVersionUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [docToDelete, setDocToDelete] = useState<any>(null);

  // Fetch custom disciplines from API
  const { data: disciplinesData } = useQuery({
    queryKey: ['project-disciplines', projectId],
    queryFn: () => fetchData(`projects/${projectId}/disciplines/`),
    enabled: !!projectId,
  });

  const customDisciplines = useMemo(() => {
    return disciplinesData?.custom?.map((d: any) => d.name) || [];
  }, [disciplinesData]);

  // Summary stats from backend
  const { data: summaryData } = useQuery({
    queryKey: ['documents-summary', projectId],
    queryFn: () => fetchData(`documents/summary/?project_id=${projectId}`),
    enabled: !!projectId,
  });

  // Fetch user's upload capabilities
  const { data: capabilities } = useQuery({
    queryKey: ['document-capabilities', projectId],
    queryFn: () => fetchData(`documents/user-capabilities/?project_id=${projectId}`),
    enabled: !!projectId,
  });

  const canUploadAny = (capabilities?.documentTypes?.length || 0) > 0;

  const { mutate: handleDeleteDoc, isPending: isDeletingDoc } = useMutation({
    mutationFn: (docId: string) =>
      deleteData({ url: `documents/${docId}/?project_id=${projectId}`, data: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents-summary', projectId] });
      toast.success('Document deleted.');
      setDocToDelete(null);
    },
    onError: () => toast.error('Failed to delete document.'),
  });

  // Add segment mutation
  const { mutate: addCustomDiscipline, isPending: isAddingDiscipline } = useMutation({
    mutationFn: (name: string) =>
      postData({ url: `projects/${projectId}/disciplines/`, data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-disciplines', projectId] });
      toast.success('Segment added successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to add segment.');
    },
  });

  // Delete segment mutation
  const { mutate: deleteCustomDiscipline, isPending: isDeletingDiscipline } = useMutation({
    mutationFn: (name: string) =>
      deleteData({ url: `projects/${projectId}/disciplines/${encodeURIComponent(name)}/`, data: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-disciplines', projectId] });
      toast.success('Segment removed successfully.');
    },
    onError: () => toast.error('Failed to remove segment.'),
  });

  // Filter & sort state
  const [selectedDiscipline, setSelectedDiscipline] = useState('All');
  const [showAiFlagged, setShowAiFlagged] = useState(false);
  const [sortBy, setSortBy] = useState('recently_updated');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Unfiltered query — for discipline pills + needs-action stats
  const { data: allData } = useQuery({
    queryKey: ['documents', projectId, 'all'],
    queryFn: () => fetchData(`documents/?project_id=${projectId}`),
    enabled: !!projectId,
  });

  const allDocuments: ApiDocument[] = allData?.results ?? [];

  // Build filtered URL params
  const filteredParams = useMemo(() => {
    const p = new URLSearchParams({ project_id: projectId ?? '' });
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (sortBy !== 'recently_updated') p.set('sort', sortBy);
    if (selectedDiscipline !== 'All') p.set('discipline', selectedDiscipline);
    if (showAiFlagged) p.set('aiStatus', 'Has Flags');
    return p.toString();
  }, [projectId, debouncedSearch, sortBy, selectedDiscipline, showAiFlagged]);

  // Filtered query — drives the document table
  const { data, isLoading } = useQuery({
    queryKey: ['documents', projectId, 'filtered', filteredParams],
    queryFn: () => fetchData(`documents/?${filteredParams}`),
    enabled: !!projectId,
  });

  const documents: ApiDocument[] = data?.results ?? [];
  const totalCount = data?.count ?? 0;

  // Discipline pills derived from unfiltered data
  const disciplines = useMemo(() => {
    const unique = Array.from(new Set(allDocuments.map(d => d.discipline).filter(Boolean)));
    return ['All', ...unique.sort()];
  }, [allDocuments]);

  // Needs-action stats from unfiltered data
  const stats = useMemo(() => {
    const totalAiFlags = allDocuments.reduce((s, d) => s + (d.aiFlags ?? 0), 0);
    const highAiFlags = allDocuments.filter(d => d.aiSeverity === 'high').reduce((s, d) => s + d.aiFlags, 0);
    const gated = allDocuments.filter(d => d.isGated);
    const pendingReview = allDocuments.filter(d => d.aiStatus === 'pending' || d.aiStatus === 'running');
    return { totalAiFlags, highAiFlags, gated, pendingReview };
  }, [allDocuments]);

  const handleOpenDetail = (id: string | number) => {
    navigate(`/documents/${id}`);
  };

  const handleVersionUpload = (doc: any) => {
    setSelectedDoc(doc);
    setIsVersionUploadModalOpen(true);
  };

  const handleAddSegment = () => {
    const name = newSegmentName.trim();
    if (!name) {
      return;
    }
    if (disciplines.includes(name) || customDisciplines.includes(name)) {
      toast.error('This segment already exists.');
      return;
    }
    addCustomDiscipline(name);
    setNewSegmentName('');
    setIsAddingSegment(false);
  };

  const handleRemoveSegment = (name: string) => {
    deleteCustomDiscipline(name);
  };

  const handleOpenUploadWithDiscipline = (disciplineName: string) => {
    navigate(`/documents/upload?discipline=${encodeURIComponent(disciplineName)}`);
  };


  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Recently updated';

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-4 p-4">
        <AskRegulationsDrawer
          isOpen={isAskOpen}
          onClose={() => setIsAskOpen(false)}
        />

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-normal tracking-tight text-foreground">Documents</h1>
            <span className="text-muted-foreground text-lg mt-1">
              {isLoading ? '...' : `${totalCount} document${totalCount !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white border border-border rounded-lg py-2.5 pl-10 pr-4 w-[300px] text-sm focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                placeholder="Search by name, ref, or type"
              />
            </div>
            <Button
              variant="outline"
              className="bg-white border-border text-foreground hover:bg-muted transition-all rounded-lg h-9 px-4 font-normal"
              onClick={() => setIsAskOpen(true)}
            >
              Ask AI
            </Button>
            {canUploadAny && (
              <Button
                className="bg-primary text-white hover:opacity-90 transition-all rounded-lg h-9 px-4 font-normal"
                onClick={() => navigate('/documents/upload')}
              >
                <Plus className="w-5 h-5 mr-1" />
                Upload
              </Button>
            )}
          </div>
        </div>

        {/* Needs Action Ribbon — dynamic */}
        {!isLoading && (stats.totalAiFlags > 0 || stats.gated.length > 0 || stats.pendingReview.length > 0) && (
          <div className="flex items-center gap-3 p-1.5 px-4 bg-muted/50 rounded-full w-fit border border-border">
            <span className="text-xs font-normal text-muted-foreground uppercase tracking-wider mr-2">Needs action</span>
            <div className="flex gap-2">
              {stats.totalAiFlags > 0 && (
                <button
                  onClick={() => setShowAiFlagged(true)}
                  className="bg-white border border-amber-100 rounded-full px-3 py-1 flex items-center gap-2 hover:shadow-sm transition-all text-amber-700"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-normal">
                    {stats.totalAiFlags} AI flag{stats.totalAiFlags !== 1 ? 's' : ''}
                    {stats.highAiFlags > 0 && ` (${stats.highAiFlags} high)`}
                  </span>
                </button>
              )}
              {stats.gated.length > 0 && (
                <button className="bg-white border border-orange-100 rounded-full px-3 py-1 flex items-center gap-2 hover:shadow-sm transition-all text-red-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="text-xs font-normal">
                    {stats.gated.length} finance gated
                    {stats.gated[0] ? `, ${stats.gated[0].reference}` : ''}
                  </span>
                </button>
              )}
              {stats.pendingReview.length > 0 && (
                <button className="bg-white border border-blue-100 rounded-full px-3 py-1 flex items-center gap-2 hover:shadow-sm transition-all text-blue-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-normal">
                    {stats.pendingReview.length} pending AI analysis
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {/* {summaryData && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-normal text-foreground">{summaryData.totalDocs ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Documents</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-normal text-foreground">{summaryData.withAiFlags ?? 0}</p>
                <p className="text-xs text-muted-foreground">AI Flagged</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-normal text-foreground">{summaryData.overdueObligations ?? 0}</p>
                <p className="text-xs text-muted-foreground">Overdue Obligations</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-normal text-foreground">{summaryData.nextDueDate ? new Date(summaryData.nextDueDate).toLocaleDateString() : '—'}</p>
                <p className="text-xs text-muted-foreground">Next Due Date</p>
              </div>
            </div>
          </div>
        )} */}

        {/* Filters & Discipline Pills — dynamic */}
        <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-6 justify-between items-start">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-sm text-muted-foreground mr-2 font-normal">Discipline</span>

            {disciplines.map((discipline) => (
              <button
                key={discipline}
                onClick={() => setSelectedDiscipline(discipline)}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm transition-all whitespace-nowrap border font-normal",
                  selectedDiscipline === discipline
                    ? "bg-foreground border-transparent text-white"
                    : "bg-white border-border text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {discipline}
              </button>
            ))}

            {customDisciplines.filter(d => !disciplines.includes(d)).map((discipline) => (
              <div
                key={discipline}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm transition-all whitespace-nowrap border font-normal group cursor-pointer",
                  selectedDiscipline === discipline
                    ? "bg-foreground border-transparent text-white"
                    : "bg-white border-border text-muted-foreground hover:border-border hover:text-foreground"
                )}
                onClick={() => setSelectedDiscipline(discipline)}
              >
                {discipline}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveSegment(discipline); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {isAddingSegment ? (
              <div className="flex items-center gap-1.5 border border-dashed border-primary/40 rounded-lg px-3 py-1.5 bg-primary/5">
                <input
                  ref={inputRef}
                  autoFocus
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSegment();
                    if (e.key === 'Escape') { setIsAddingSegment(false); setNewSegmentName(''); }
                  }}
                  placeholder="Segment name..."
                  className="outline-none bg-transparent text-sm text-foreground w-32 placeholder:text-muted-foreground"
                />
                <button onClick={handleAddSegment} className="text-primary hover:opacity-80">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setIsAddingSegment(false); setNewSegmentName(''); }} className="text-muted-foreground hover:text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingSegment(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-dashed border-border text-muted-foreground hover:border-gray-400 hover:text-muted-foreground transition-all whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add segment
              </button>
            )}
          </div>

          {/* <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => setShowAiFlagged(v => !v)}
                className={cn(
                  "rounded-lg px-5 py-2.5 text-sm font-normal transition-all",
                  showAiFlagged
                    ? "bg-amber-50 border border-amber-200 text-amber-700"
                    : "bg-white border border-border text-foreground hover:bg-muted"
                )}
              >
                AI flagged
                {stats.totalAiFlags > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({stats.totalAiFlags})</span>
                )}
              </button>
              <button className="bg-white border border-border rounded-lg px-5 py-2.5 text-sm font-normal hover:bg-muted transition-all text-foreground">
                IFC only
              </button>
            </div>

          </div> */}
          <div className="relative flex items-center gap-2 shrink-0 pt-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <button
              onClick={() => setShowSortMenu(v => !v)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-normal whitespace-nowrap"
            >
              {currentSortLabel} <ChevronDown className="w-4 h-4" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-8 bg-white border border-border rounded-xl shadow-lg z-10 py-1 w-48">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      sortBy === opt.value ? "text-primary font-normal" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Grouped Document List */}
        <div className="mt-4">
          <DocumentTable
            documents={documents}
            isLoading={isLoading}
            onRowClick={handleOpenDetail}
            onVersionUpload={handleVersionUpload}
            onDelete={(doc) => setDocToDelete(doc)}
            customDisciplines={selectedDiscipline === 'All' ? customDisciplines : []}
            onUploadToDiscipline={handleOpenUploadWithDiscipline}
          />
        </div>
      </div>

      <VersionUploadModal
        isOpen={isVersionUploadModalOpen}
        onClose={() => setIsVersionUploadModalOpen(false)}
        document={selectedDoc}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
          setIsVersionUploadModalOpen(false);
        }}
      />

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-[#1A1A1A]">{docToDelete?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDoc}>Cancel</AlertDialogCancel>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={isDeletingDoc}
              onClick={() => { if (docToDelete) handleDeleteDoc(docToDelete._id); }}
            >
              {isDeletingDoc ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deleting...</> : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Documents;
