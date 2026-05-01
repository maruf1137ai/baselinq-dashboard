import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, FolderIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { postData, fetchData } from '@/lib/Api';
import { useS3Upload } from '@/hooks/useS3Upload';
import { useFolderSuggestions } from '@/hooks/useFolderSuggestions';
import { UploadStep2FolderPicker } from '@/components/documents/UploadStep2FolderPicker';
import { UploadStep3FileMetadata, type UploadFormData } from '@/components/documents/UploadStep3FileMetadata';
import type { FolderTab, Folder } from '@/types/folder';

/**
 * Upload Document — single-page form with top tabs.
 * Folder is selected via a modal so the page stays compact.
 */
export default function UploadDocumentWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = localStorage.getItem('selectedProjectId') || '';
  const [searchParams] = useSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  // Form state
  const [selectedTab, setSelectedTab] = useState<FolderTab>('contracts');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<string>('');
  const [isNewFolder, setIsNewFolder] = useState(false);

  // Modal-local picker state — only commits to main state on "Confirm"
  const [pendingFolderId, setPendingFolderId] = useState('');
  const [pendingFolderName, setPendingFolderName] = useState('');
  const [pendingIsNew, setPendingIsNew] = useState(false);

  const s3Upload = useS3Upload('project-documents/pending');
  const { data: suggestions } = useFolderSuggestions();
  const disciplines = suggestions?.disciplines || [];

  // Query param pre-fill
  const tabParam = searchParams.get('tab') as FolderTab | null;
  const folderIdParam = searchParams.get('folder_id');
  const disciplineParam = searchParams.get('discipline');

  const requiresDiscipline = selectedTab === 'drawings' || selectedTab === 'documents';

  // Fetch breadcrumb whenever an existing folder is selected (skip for newly-typed folders).
  useEffect(() => {
    if (!selectedFolderId || isNewFolder || !projectId) {
      setFolderBreadcrumb('');
      return;
    }
    fetchData(`documents/folders/${selectedFolderId}/?project_id=${projectId}`)
      .then((folder: any) => {
        const chain = (folder?.breadcrumb ?? [])
          .map((b: { name: string }) => b.name.replace(/_/g, ' '))
          .join(' / ');
        setFolderBreadcrumb(chain);
      })
      .catch(() => setFolderBreadcrumb(''));
  }, [selectedFolderId, isNewFolder, projectId]);

  // Initialize state from URL params on mount
  useEffect(() => {
    const initializeFromParams = async () => {
      if (folderIdParam) {
        try {
          const folder: Folder = await fetchData(
            `documents/folders/${folderIdParam}/${projectId ? `?project_id=${projectId}` : ''}`
          );
          setSelectedTab(folder.tab);
          setSelectedDiscipline(folder.discipline || '');
          setSelectedFolderId(folder._id);
          setSelectedFolderName(folder.name);
          setIsNewFolder(false);
          return;
        } catch (err) {
          toast.error('Failed to load folder details');
          console.error(err);
        }
      }
      if (tabParam && (tabParam === 'contracts' || tabParam === 'drawings' || tabParam === 'documents')) {
        setSelectedTab(tabParam);
      }
      if (disciplineParam) setSelectedDiscipline(disciplineParam);
    };
    initializeFromParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset folder when the user switches tab — folders don't carry across tabs.
  const handleTabChange = (tab: FolderTab) => {
    if (tab === selectedTab) return;
    setSelectedTab(tab);
    setSelectedFolderId('');
    setSelectedFolderName('');
    setIsNewFolder(false);
    setFolderBreadcrumb('');
  };

  // When the modal is opened, mirror current selection into pending state
  const openFolderModal = () => {
    setPendingFolderId(selectedFolderId);
    setPendingFolderName(selectedFolderName);
    setPendingIsNew(isNewFolder);
    setFolderModalOpen(true);
  };

  const confirmFolderSelection = () => {
    if (!pendingFolderId && !pendingFolderName) {
      toast.error('Please select or enter a folder name');
      return;
    }
    setSelectedFolderId(pendingFolderId);
    setSelectedFolderName(pendingFolderName);
    setIsNewFolder(pendingIsNew);
    setFolderModalOpen(false);
  };

  const handleSubmit = async (formData: UploadFormData) => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }
    if (!selectedFolderId && !selectedFolderName) {
      toast.error('Please choose a folder before uploading');
      return;
    }

    setSubmitting(true);
    try {
      let folderId = selectedFolderId;

      // Create folder if new (Drawings/Documents only)
      if (isNewFolder && selectedTab !== 'contracts') {
        const newFolder: Folder = await postData({
          url: 'documents/folders/',
          data: {
            projectId: parseInt(projectId),
            tab: selectedTab,
            name: selectedFolderName,
            discipline: selectedDiscipline,
            visibility: formData.visibility || 'all',
            visibilityUsers: formData.visibilityUsers || [],
          },
        });
        folderId = newFolder._id;
        toast.success(`Created new folder: ${selectedFolderName.replace(/_/g, ' ')}`);
      }

      const ids = formData.s3Entries.map(e => e.id);
      const s3Keys = await s3Upload.waitForAll(ids);

      if (formData.s3Entries.length > 1) {
        const files = formData.s3Entries
          .map(entry => {
            const s3Key = s3Keys.get(entry.id);
            return s3Key ? { s3Key, fileName: entry.file.name, fileSize: entry.file.size } : null;
          })
          .filter(Boolean);

        if (!files.length) {
          toast.error('All file uploads failed');
          return;
        }

        await postData({
          url: 'documents/new-upload/',
          data: {
            projectId: parseInt(projectId),
            folderId,
            files,
            type: formData.docType,
            certificateSubtype: formData.certificateSubtype || undefined,
            discipline: selectedDiscipline || '',
            reference: formData.reference || '',
            description: formData.description || '',
            runAiAnalysis: formData.runAiAnalysis,
            notifyTeam: formData.notifyTeam,
            linkIds: formData.linkIds,
            issuedTo: formData.issuedTo,
            issueStatus: formData.issueStatus,
          },
        });
      } else {
        const entry = formData.s3Entries[0];
        const s3Key = s3Keys.get(entry.id);
        if (!s3Key) {
          toast.error(`Failed to upload ${entry.file.name}`);
          return;
        }
        await postData({
          url: 'documents/',
          data: {
            project_id: parseInt(projectId),
            folder_id: folderId,
            name: formData.name,
            type: formData.docType,
            certificate_subtype: formData.certificateSubtype || undefined,
            discipline: selectedDiscipline || '',
            description: formData.description || '',
            reference: formData.reference || '',
            s3_key: s3Key,
            file_name: entry.file.name,
            file_size: entry.file.size,
            run_ai_analysis: formData.runAiAnalysis,
            notify_team: formData.notifyTeam,
            link_ids: formData.linkIds,
            issued_to: formData.issuedTo,
            issue_status: formData.issueStatus,
          },
        });
      }

      toast.success('Document uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['folders', projectId] });
      navigate('/documents');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const folderDisplay = folderBreadcrumb
    || (selectedFolderName ? selectedFolderName.replace(/_/g, ' ') : '');
  const folderIsChosen = !!(selectedFolderId || selectedFolderName);
  const noop = () => {};

  return (
    <DashboardLayout>
      <div className="max-w-[1800px] mx-auto space-y-6 p-4">
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
              <p className="text-sm text-muted-foreground mt-0.5">
                Pick the destination, then add document details below.
              </p>
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
          </div>
        </div>

        {/* Single section: Upload Files & Details — with tabs + folder picker inline at the top */}
        <div className="bg-white rounded-xl border border-border p-6">
          <UploadStep3FileMetadata
            projectId={projectId}
            selectedTab={selectedTab}
            selectedFolderId={selectedFolderId}
            selectedFolderName={selectedFolderName}
            isNewFolder={isNewFolder}
            s3Upload={s3Upload}
            onBack={noop}
            onSubmit={handleSubmit}
            submitting={submitting}
            hideBackButton
            headerSlot={
              <div className="space-y-4 w-full">
                <Tabs value={selectedTab} onValueChange={(v) => handleTabChange(v as FolderTab)}>
                  <TabsList className="bg-white border border-border h-10">
                    <TabsTrigger
                      value="contracts"
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground font-normal"
                    >
                      Contracts
                    </TabsTrigger>
                    <TabsTrigger
                      value="drawings"
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground font-normal"
                    >
                      Drawings
                    </TabsTrigger>
                    <TabsTrigger
                      value="documents"
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground font-normal"
                    >
                      Documents
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiresDiscipline && (
                    <div className="space-y-2">
                      <Label className="text-sm font-normal text-muted-foreground">
                        Discipline <span className="text-red-500">*</span>
                      </Label>
                      <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                        <SelectTrigger className="h-10 border-border rounded-lg">
                          <SelectValue placeholder="Select discipline" />
                        </SelectTrigger>
                        <SelectContent>
                          {disciplines.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className={cn('space-y-2', !requiresDiscipline && 'md:col-span-2')}>
                    <Label className="text-sm font-normal text-muted-foreground">
                      Folder <span className="text-red-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={openFolderModal}
                      disabled={requiresDiscipline && !selectedDiscipline}
                      className={cn(
                        'w-full h-10 px-3 rounded-lg border flex items-center justify-between text-left transition-colors',
                        folderIsChosen
                          ? 'bg-white border-border hover:border-primary/50'
                          : 'bg-muted/20 border-border hover:bg-muted/40',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FolderIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className={cn('text-sm truncate', folderIsChosen ? 'text-foreground' : 'text-muted-foreground')}>
                          {folderIsChosen ? folderDisplay : 'Choose a folder…'}
                        </span>
                      </span>
                      <span className="text-xs text-primary shrink-0 ml-2">
                        {folderIsChosen ? 'Change' : 'Select'}
                      </span>
                    </button>
                    {requiresDiscipline && !selectedDiscipline && (
                      <p className="text-xs text-muted-foreground">Pick a discipline first.</p>
                    )}
                  </div>
                </div>
              </div>
            }
          />
        </div>

        {/* Folder picker modal */}
        <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-medium">
                Choose a folder
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground capitalize">{selectedTab}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto -mx-6 px-6">
              <UploadStep2FolderPicker
                projectId={projectId}
                selectedTab={selectedTab}
                selectedDiscipline={selectedDiscipline}
                selectedFolderId={pendingFolderId}
                selectedFolderName={pendingFolderName}
                onFolderSelect={(id, name, isNew) => {
                  setPendingFolderId(id);
                  setPendingFolderName(name);
                  setPendingIsNew(isNew);
                }}
                onBack={noop}
                onNext={noop}
                hideNav
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFolderModalOpen(false)} className="font-normal">
                Cancel
              </Button>
              <Button
                onClick={confirmFolderSelection}
                disabled={!pendingFolderId && !pendingFolderName}
                className="font-normal"
              >
                Confirm folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
