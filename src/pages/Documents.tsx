import { DashboardLayout } from '@/components/DashboardLayout';
import DocumentTable from '@/components/documents/DocumentTable';
import { AskRegulationsDrawer } from '@/components/documents/AskRegulationsDrawer';
import { Button } from '@/components/ui/button';
import { Search, Plus, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { UploadDocumentModal } from '@/components/documents/UploadDocumentModal';
import { VersionUploadModal } from '@/components/documents/VersionUploadModal';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';
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
  const [isUploadDocumentModalOpen, setIsUploadDocumentModalOpen] = useState(false);
  const [isVersionUploadModalOpen, setIsVersionUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [customDisciplines, setCustomDisciplines] = useState<string[]>([]);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (name && !disciplines.includes(name) && !customDisciplines.includes(name)) {
      setCustomDisciplines(prev => [...prev, name]);
    }
    setNewSegmentName('');
    setIsAddingSegment(false);
  };

  const handleRemoveSegment = (name: string) => {
    setCustomDisciplines(prev => prev.filter(d => d !== name));
  };

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
    setIsUploadDocumentModalOpen(false);
  };


  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Recently updated';

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-8 p-4">
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
            <Button
              className="bg-primary text-white hover:opacity-90 transition-all rounded-lg h-9 px-4 font-normal"
              onClick={() => setIsUploadDocumentModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-1" />
              Upload
            </Button>
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

        {/* Filters & Discipline Pills — dynamic */}
        <div className="flex flex-col gap-6 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
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

            {customDisciplines.map((discipline) => (
              <div
                key={discipline}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-dashed border-border bg-muted text-muted-foreground whitespace-nowrap group"
              >
                {discipline}
                <button
                  onClick={() => handleRemoveSegment(discipline)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
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

          <div className="flex items-center justify-between">
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

            <div className="relative flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-normal"
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
            customDisciplines={customDisciplines}
          />
        </div>
      </div>

      <UploadDocumentModal
        isOpen={isUploadDocumentModalOpen}
        onClose={() => setIsUploadDocumentModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      <VersionUploadModal
        isOpen={isVersionUploadModalOpen}
        onClose={() => setIsVersionUploadModalOpen(false)}
        document={selectedDoc}
      />
    </DashboardLayout>
  );
};

export default Documents;
