import { DashboardLayout } from '@/components/DashboardLayout';
import DocumentTable from '@/components/documents/DocumentTable';
import { ContractsTree } from '@/components/documents/ContractsTree';
import { FoldersView } from '@/components/documents/FoldersView';
import { AskRegulationsDrawer } from '@/components/documents/AskRegulationsDrawer';
import { IssueRegisterModal } from '@/components/documents/IssueRegisterModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Plus, ChevronDown } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
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
  getCategoryForDoc,
  type DocCategory,
  CATEGORY_COLORS,
} from '@/lib/documentTaxonomy';

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
  const [docToDelete, setDocToDelete] = useState<any>(null);

  // Issue Register modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerFolderId, setRegisterFolderId] = useState('');
  const [registerFolderName, setRegisterFolderName] = useState('');

  // Filter state
  const [activeTab, setActiveTab] = useState<DocCategory>('Contracts');
  const [showAiFlagged, setShowAiFlagged] = useState(false);
  const [sortBy, setSortBy] = useState('recently_updated');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  // Unfiltered query — drives category counts + discipline pill list
  const { data: allData } = useQuery({
    queryKey: ['documents', projectId, 'all'],
    queryFn: () => fetchData(`documents/?project_id=${projectId}`),
    enabled: !!projectId,
  });
  const allDocuments: ApiDocument[] = allData?.results ?? [];

  // Build filtered URL params (search / sort / discipline / aiFlagged)
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

  // Fetch unread notifications to identify unread documents
  const { data: unreadNotifs, refetch: refetchUnread } = useQuery({
    queryKey: ['notifications', projectId, 'unread', 'documents'],
    queryFn: () => fetchData(`notifications/?unread_only=true&project_id=${projectId}`),
    enabled: !!projectId,
  });

  useEffect(() => {
    const handler = () => refetchUnread();
    window.addEventListener("notifications-marked-read", handler);
    return () => window.removeEventListener("notifications-marked-read", handler);
  }, [refetchUnread]);

  const unreadDocIds = useMemo(() => {
    const ids = new Set<string>();
    if (Array.isArray(unreadNotifs)) {
      unreadNotifs.forEach((n: any) => {
        if (n.type === 'document_created' || n.type === 'document_version_created') {
          if (n.data?.documentId) {
            ids.add(String(n.data.documentId));
          }
        }
      });
    }
    return ids;
  }, [unreadNotifs]);

  // Category filter is client-side (derived from Document.type)
  const documents = useMemo(() => {
    return allFilteredDocs.filter(d => getCategoryForDoc(d as any) === activeTab);
  }, [allFilteredDocs, activeTab]);

  // Category counts derived from unfiltered data
  const categoryCounts = useMemo(() => {
    const counts: Record<DocCategory, number> = {
      Drawings: 0,
      Documents: 0,
      Contracts: 0,
    };
    allDocuments.forEach(d => {
      const cat = getCategoryForDoc(d as any);
      counts[cat] += 1;
    });
    return counts;
  }, [allDocuments]);

  const handleOpenDetail = (id: string | number) => {
    navigate(`/documents/${id}`);
  };

  const handleVersionUpload = (doc: any) => {
    setSelectedDoc(doc);
    setIsVersionUploadModalOpen(true);
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
              {isLoading ? '...' : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
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
                onClick={() => navigate(`/documents/upload?tab=${activeTab.toLowerCase()}`)}
              >
                <Plus className="w-5 h-5 mr-1" />
                Upload
              </Button>
            )}
          </div>
        </div>

        {/* Three-tab layout */}
        <div className="flex flex-row gap-6 justify-between items-start">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as DocCategory)}
            className="flex-1"
          >
            <div className="flex justify-between items-center">
              <TabsList className="bg-white border border-border h-10">
                <TabsTrigger
                  value="Contracts"
                  className={cn(
                    "data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700",
                    "data-[state=active]:border data-[state=active]:border-amber-200"
                  )}
                >
                  Contracts
                  {categoryCounts.Contracts > 0 && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {categoryCounts.Contracts}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="Drawings"
                  className={cn(
                    "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700",
                    "data-[state=active]:border data-[state=active]:border-blue-200"
                  )}
                >
                  Drawings
                  {categoryCounts.Drawings > 0 && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {categoryCounts.Drawings}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="Documents"
                  className={cn(
                    "data-[state=active]:bg-slate-50 data-[state=active]:text-slate-700",
                    "data-[state=active]:border data-[state=active]:border-slate-200"
                  )}
                >
                  Documents
                  {categoryCounts.Documents > 0 && (
                    <span className="ml-2 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {categoryCounts.Documents}
                    </span>
                  )}
                </TabsTrigger>
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

            <TabsContent value="Contracts" className="mt-4">
              <ContractsTree
                projectId={projectId}
                documents={documents}
                onDocumentClick={handleOpenDetail}
                onViewRegister={(folderId, folderName) => {
                  setRegisterFolderId(folderId);
                  setRegisterFolderName(folderName);
                  setIsRegisterModalOpen(true);
                }}
              />
            </TabsContent>

            <TabsContent value="Drawings" className="mt-4">
              <FoldersView
                projectId={projectId || ''}
                tab="drawings"
                documents={documents}
                onDocumentClick={(id) => handleOpenDetail(id)}
                onViewRegister={(folderId, folderName) => {
                  setRegisterFolderId(folderId);
                  setRegisterFolderName(folderName);
                  setIsRegisterModalOpen(true);
                }}
              />
            </TabsContent>

            <TabsContent value="Documents" className="mt-4">
              <FoldersView
                projectId={projectId || ''}
                tab="documents"
                documents={documents}
                onDocumentClick={(id) => handleOpenDetail(id)}
                onViewRegister={(folderId, folderName) => {
                  setRegisterFolderId(folderId);
                  setRegisterFolderName(folderName);
                  setIsRegisterModalOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
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

      {/* Issue Register Modal */}
      <IssueRegisterModal
        open={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        folderId={registerFolderId}
        folderName={registerFolderName}
        projectId={projectId || ''}
      />
    </DashboardLayout>
  );
};

export default Documents;
