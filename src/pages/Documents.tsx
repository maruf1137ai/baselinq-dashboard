import { DashboardLayout } from '@/components/DashboardLayout';
import { ContractsTree } from '@/components/documents/ContractsTree';
import { FoldersView } from '@/components/documents/FoldersView';
import { AskRegulationsDrawer } from '@/components/documents/AskRegulationsDrawer';
import { DocumentSearchResults } from '@/components/documents/DocumentSearchResults';
import { IssueRegisterModal } from '@/components/documents/IssueRegisterModal';
import { PrimaryContractCard } from '@/components/documents/PrimaryContractCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Plus, ChevronDown } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { VersionUploadModal } from '@/components/documents/VersionUploadModal';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchData, deleteData } from '@/lib/Api';
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
import { Loader2 } from 'lucide-react';
import type { ApiDocument } from '@/components/documents/DocumentTable';
import {
  DocumentClipboardProvider,
  useDocumentClipboard,
} from '@/components/documents/DocumentClipboardContext';
import { RenameDocumentDialog } from '@/components/documents/RenameDocumentDialog';
import { DragGhost } from '@/components/documents/DragGhost';
import {
  getCategoryForDoc,
  TAB_TO_CATEGORY,
  type DocCategory,
} from '@/lib/documentTaxonomy';
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { usePermissions } from '@/hooks/usePermissions';

const SORT_OPTIONS = [
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'name_az', label: 'Name A–Z' },
  { value: 'most_ai_flags', label: 'Most AI flags' },
  { value: 'oldest', label: 'Oldest first' },
];

const TAB_VALUES: DocCategory[] = ['Contracts', 'Drawings', 'Documents'];
const SPRING_TAB_DELAY = 600;

/** A TabsTrigger that is also a drop target — hovering it mid-drag (see
 *  handleDragOver in DocumentsBrowser) spring-loads a tab switch. */
function DroppableTabTrigger({
  value,
  count,
  children,
}: {
  value: DocCategory;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `tabtrigger:${value}` });
  return (
    <TabsTrigger
      ref={setNodeRef}
      value={value}
      className={cn(
        'data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground font-normal',
        isOver && 'ring-2 ring-primary/40',
      )}
    >
      {children}
      {count > 0 && (
        <span className="ml-2 text-xs bg-muted text-foreground px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}

interface DocumentsBrowserProps {
  projectId: string | null;
  activeTab: DocCategory;
  setActiveTab: (t: DocCategory) => void;
}

/** Inner browser — lives under the DocumentClipboardProvider so it can use the
 *  clipboard context (requestMove for drag-drop, getDocPath for copy-path). */
const DocumentsBrowser = ({ projectId, activeTab, setActiveTab }: DocumentsBrowserProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requestMove } = useDocumentClipboard();

  const [isAskOpen, setIsAskOpen] = useState(false);
  const [isVersionUploadModalOpen, setIsVersionUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ApiDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<ApiDocument | null>(null);
  const [renameDoc, setRenameDoc] = useState<ApiDocument | null>(null);

  // Issue Register modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerFolderId, setRegisterFolderId] = useState('');
  const [registerFolderName, setRegisterFolderName] = useState('');
  const [registerFolderTab, setRegisterFolderTab] = useState<'contracts' | 'drawings' | 'documents'>('contracts');

  // Filter state
  const [showAiFlagged] = useState(false);
  const [sortBy, setSortBy] = useState('recently_updated');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Drag-and-drop (single page-level context so a drag can cross tabs).
  const [activeDoc, setActiveDoc] = useState<ApiDocument | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );
  const hoverTimer = useRef<number | null>(null);
  const hoveredTabRef = useRef<string | null>(null);

  const clearTabTimer = () => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    hoveredTabRef.current = null;
  };

  useEffect(() => () => clearTabTimer(), []);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDoc((e.active.data.current?.doc as ApiDocument) ?? null);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const overId = e.over?.id ? String(e.over.id) : null;
    if (overId && overId.startsWith('tabtrigger:')) {
      const slug = overId.slice('tabtrigger:'.length);
      if (hoveredTabRef.current !== slug) {
        hoveredTabRef.current = slug;
        if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => {
          setActiveTab(slug as DocCategory);
        }, SPRING_TAB_DELAY);
      }
      return;
    }
    clearTabTimer();
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDoc(null);
    clearTabTimer();
    const { active, over } = e;
    const doc = active.data.current?.doc as ApiDocument | undefined;
    if (!over || !doc) return;
    const overId = String(over.id);
    if (overId.startsWith('tabtrigger:')) return; // dropped on a tab header, not a folder
    requestMove({ doc, operation: 'move', destFolderId: overId });
  };

  const handleDragCancel = () => {
    setActiveDoc(null);
    clearTabTimer();
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch user's upload capabilities
  const { data: capabilities } = useQuery({
    queryKey: ['document-capabilities', projectId],
    queryFn: () => fetchData(`documents/user-capabilities/?project_id=${projectId}`),
    enabled: !!projectId,
  });
  const canUploadAny = (capabilities?.documentTypes?.length || 0) > 0;
  const { canUploadDocument } = usePermissions();

  const { mutate: handleDeleteDoc, isPending: isDeletingDoc } = useMutation({
    mutationFn: (docId: string) =>
      deleteData({ url: `documents/${docId}/?project_id=${projectId}`, data: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['folders', projectId] });
      toast.success('Document deleted.');
      setDocToDelete(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      const is403 = msg.includes('403');
      toast.error(is403 ? "You don't have permission to delete this document." : 'Failed to delete document.');
    },
  });

  // Unfiltered query — drives category counts
  const { data: allData } = useQuery({
    queryKey: ['documents', projectId, 'all'],
    queryFn: () => fetchData(`documents/?project_id=${projectId}`),
    enabled: !!projectId,
  });
  const allDocuments: ApiDocument[] = allData?.results ?? [];

  // Build filtered URL params (search / sort / aiFlagged)
  const filteredParams = useMemo(() => {
    const p = new URLSearchParams({ project_id: projectId ?? '' });
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (sortBy !== 'recently_updated') p.set('sort', sortBy);
    if (showAiFlagged) p.set('aiStatus', 'Has Flags');
    return p.toString();
  }, [projectId, debouncedSearch, sortBy, showAiFlagged]);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', projectId, 'filtered', filteredParams],
    queryFn: () => fetchData(`documents/?${filteredParams}`),
    enabled: !!projectId,
  });
  const allFilteredDocs: ApiDocument[] = data?.results ?? [];

  // When a search is active we drop the folder-tree layout and show a flat list.
  const isSearching = debouncedSearch.trim().length > 0;

  // All three tab panels are force-mounted (so cross-tab drag targets stay
  // registered), so each needs its own category-filtered document list.
  const docsByCategory = useMemo(() => {
    const groups: Record<DocCategory, ApiDocument[]> = { Contracts: [], Drawings: [], Documents: [] };
    allFilteredDocs.forEach((d) => {
      groups[getCategoryForDoc(d)].push(d);
    });
    return groups;
  }, [allFilteredDocs]);

  // Category counts derived from unfiltered data
  const categoryCounts = useMemo(() => {
    const counts: Record<DocCategory, number> = { Drawings: 0, Documents: 0, Contracts: 0 };
    allDocuments.forEach((d) => {
      counts[getCategoryForDoc(d)] += 1;
    });
    return counts;
  }, [allDocuments]);

  const handleOpenDetail = (id: string | number) => {
    navigate(`/documents/${id}`);
  };

  const openRegister = (tab: 'contracts' | 'drawings' | 'documents') =>
    (folderId: string, folderName: string) => {
      setRegisterFolderId(folderId);
      setRegisterFolderName(folderName);
      setRegisterFolderTab(tab);
      setIsRegisterModalOpen(true);
    };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Recently updated';
  const activeCount = docsByCategory[activeTab].length;

  return (
    <>
      <div className="space-y-6">
        <AskRegulationsDrawer isOpen={isAskOpen} onClose={() => setIsAskOpen(false)} />

        {projectId && <PrimaryContractCard projectId={projectId} />}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-normal tracking-tight text-foreground">Documents</h1>
            <span className="text-sm text-muted-foreground">
              {isLoading
                ? '…'
                : isSearching
                  ? `${allFilteredDocs.length} result${allFilteredDocs.length !== 1 ? 's' : ''}`
                  : `${activeCount} document${activeCount !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white border border-border rounded-lg h-8 pl-9 pr-3 w-[260px] text-xs focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                placeholder="Search by name, ref, or type"
              />
            </div>
            <Button
              variant="outline"
              className="h-8 text-xs rounded-lg border-border text-foreground"
              onClick={() => setIsAskOpen(true)}
            >
              Ask AI
            </Button>
            {canUploadAny && canUploadDocument && (
              <Button
                className="h-8 text-xs rounded-lg bg-primary text-white"
                onClick={() => navigate(`/documents/upload?tab=${activeTab.toLowerCase()}`)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Upload
              </Button>
            )}
          </div>
        </div>

        {isSearching ? (
          <DocumentSearchResults
            documents={allFilteredDocs}
            query={debouncedSearch}
            isLoading={isLoading}
            onDocumentClick={handleOpenDetail}
          />
        ) : (
          <div className="flex flex-row gap-6 justify-between items-start">
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as DocCategory)}
                className="flex-1"
              >
                <div className="flex justify-between items-center">
                  <TabsList className="bg-white border border-border h-10">
                    {TAB_VALUES.map((tabVal) => (
                      <DroppableTabTrigger key={tabVal} value={tabVal} count={categoryCounts[tabVal]}>
                        {tabVal}
                      </DroppableTabTrigger>
                    ))}
                  </TabsList>

                  <div className="relative flex items-center gap-2 shrink-0">
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

                <TabsContent
                  value="Contracts"
                  forceMount
                  className={cn('mt-4', activeTab !== 'Contracts' && 'hidden')}
                >
                  <ContractsTree
                    projectId={projectId || ''}
                    documents={docsByCategory.Contracts}
                    onDocumentClick={handleOpenDetail}
                    onViewRegister={openRegister('contracts')}
                    onRenameDoc={setRenameDoc}
                    onDeleteDoc={setDocToDelete}
                  />
                </TabsContent>

                <TabsContent
                  value="Drawings"
                  forceMount
                  className={cn('mt-4', activeTab !== 'Drawings' && 'hidden')}
                >
                  <FoldersView
                    projectId={projectId || ''}
                    tab="drawings"
                    documents={docsByCategory.Drawings}
                    onDocumentClick={(id) => handleOpenDetail(id)}
                    onViewRegister={openRegister('drawings')}
                    onRenameDoc={setRenameDoc}
                    onDeleteDoc={setDocToDelete}
                  />
                </TabsContent>

                <TabsContent
                  value="Documents"
                  forceMount
                  className={cn('mt-4', activeTab !== 'Documents' && 'hidden')}
                >
                  <FoldersView
                    projectId={projectId || ''}
                    tab="documents"
                    documents={docsByCategory.Documents}
                    onDocumentClick={(id) => handleOpenDetail(id)}
                    onViewRegister={openRegister('documents')}
                    onRenameDoc={setRenameDoc}
                    onDeleteDoc={setDocToDelete}
                  />
                </TabsContent>
              </Tabs>

              <DragOverlay>{activeDoc ? <DragGhost doc={activeDoc} /> : null}</DragOverlay>
            </DndContext>
          </div>
        )}
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

      <RenameDocumentDialog
        doc={renameDoc}
        projectId={projectId || ''}
        onClose={() => setRenameDoc(null)}
      />

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-[#1A1A1A]">{docToDelete?.name}</span>. This action cannot be undone.
              {(docToDelete?.linkedCount ?? 0) > 0 && (
                <span className="mt-2 block text-amber-700">
                  This document is linked to {docToDelete?.linkedCount} task{(docToDelete?.linkedCount ?? 0) !== 1 ? 's' : ''}/item{(docToDelete?.linkedCount ?? 0) !== 1 ? 's' : ''}. Deleting it will remove those links.
                </span>
              )}
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

      <IssueRegisterModal
        open={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        folderId={registerFolderId}
        folderName={registerFolderName}
        projectId={projectId || ''}
        tab={registerFolderTab}
      />
    </>
  );
};

const Documents = () => {
  const projectId = localStorage.getItem('selectedProjectId');
  const [activeTab, setActiveTab] = useState<DocCategory>('Contracts');

  return (
    <DashboardLayout>
      <DocumentClipboardProvider
        projectId={projectId || ''}
        onMovedToTab={(tab) => setActiveTab(TAB_TO_CATEGORY[tab])}
      >
        <DocumentsBrowser
          projectId={projectId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </DocumentClipboardProvider>
    </DashboardLayout>
  );
};

export default Documents;
