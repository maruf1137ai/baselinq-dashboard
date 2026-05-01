import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { postData, fetchData } from '@/lib/Api';
import { useS3Upload } from '@/hooks/useS3Upload';
import { UploadWizardSteps } from '@/components/documents/UploadWizardSteps';
import { UploadStep1TabDiscipline } from '@/components/documents/UploadStep1TabDiscipline';
import { UploadStep2FolderPicker } from '@/components/documents/UploadStep2FolderPicker';
import { UploadStep3FileMetadata, type UploadFormData } from '@/components/documents/UploadStep3FileMetadata';
import type { FolderTab, Folder } from '@/types/folder';

/**
 * Upload Document Wizard (PR 5)
 *
 * 3-step guided upload process:
 * 1. Select Tab & Discipline
 * 2. Select/Create Folder
 * 3. Upload Files & Metadata
 */
export default function UploadDocumentWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = localStorage.getItem('selectedProjectId') || '';
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Wizard state
  const [selectedTab, setSelectedTab] = useState<FolderTab | ''>('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [isNewFolder, setIsNewFolder] = useState(false);

  const s3Upload = useS3Upload('project-documents/pending');

  // Query param pre-fill
  const tabParam = searchParams.get('tab') as FolderTab | null;
  const folderIdParam = searchParams.get('folder_id');
  const disciplineParam = searchParams.get('discipline');

  // Initialize wizard state from URL params
  useEffect(() => {
    const initializeFromParams = async () => {
      // Priority 1: folder_id (skip to Step 3)
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
          setCurrentStep(3);
          return;
        } catch (err) {
          toast.error('Failed to load folder details');
          console.error(err);
        }
      }

      // Priority 2: tab param (start at Step 1 with tab pre-filled)
      if (tabParam && (tabParam === 'contracts' || tabParam === 'drawings' || tabParam === 'documents')) {
        setSelectedTab(tabParam);
      }

      // Priority 3: discipline param (pre-fill discipline in Step 1)
      if (disciplineParam) {
        setSelectedDiscipline(disciplineParam);
      }
    };

    initializeFromParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Step navigation handlers
  const handleStep1Next = () => {
    if (!selectedTab) {
      toast.error('Please select a tab');
      return;
    }
    if ((selectedTab === 'drawings' || selectedTab === 'documents') && !selectedDiscipline) {
      toast.error('Please select a discipline');
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedFolderId && !selectedFolderName) {
      toast.error('Please select or enter a folder name');
      return;
    }
    setCurrentStep(3);
  };

  const handleFolderSelect = (folderId: string, folderName: string, isNew: boolean) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setIsNewFolder(isNew);
  };

  const handleStepClick = (step: 1 | 2 | 3) => {
    // Allow navigation back to completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const handleSubmit = async (formData: UploadFormData) => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    setSubmitting(true);

    try {
      let folderId = selectedFolderId;

      // Create folder if new (for Drawings/Documents)
      if (isNewFolder && selectedTab !== 'contracts') {
        console.log('[UploadWizard] Creating new folder with data:', {
          projectId: parseInt(projectId),
          tab: selectedTab,
          name: selectedFolderName,
          discipline: selectedDiscipline,
          visibility: formData.visibility || 'all',
          visibilityUsers: formData.visibilityUsers || [],
        });

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

      // Wait for all S3 uploads to complete
      const ids = formData.s3Entries.map(e => e.id);
      const s3Keys = await s3Upload.waitForAll(ids);

      // Upload document(s)
      if (formData.s3Entries.length > 1) {
        // Batch upload
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
        // Single file upload
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

  return (
    <DashboardLayout>
      {/* Canonical page wrapper — DashboardLayout supplies p-6, no max-w. */}
      <div className="space-y-4">
        {/* Header — canonical (text-2xl title, h-8 buttons, no subtitle) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/documents')}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-white hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <h1 className="text-2xl font-normal tracking-tight text-foreground">Upload Document</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/documents')}
              className="h-8 text-xs rounded-lg border-border text-foreground"
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Wizard Steps Indicator (the 3-step indicator at the top — your
            approved layout) */}
        <div className="bg-white rounded-xl border border-border px-4 py-3">
          <UploadWizardSteps currentStep={currentStep} onStepClick={handleStepClick} />
        </div>

        {/* Step Content — height driven by content (no min-h forcing dead
            space) */}
        <div className="bg-white rounded-xl border border-border p-5">
          {currentStep === 1 && (
            <UploadStep1TabDiscipline
              selectedTab={selectedTab}
              selectedDiscipline={selectedDiscipline}
              onTabChange={setSelectedTab}
              onDisciplineChange={setSelectedDiscipline}
              onNext={handleStep1Next}
            />
          )}

          {currentStep === 2 && (
            <UploadStep2FolderPicker
              projectId={projectId}
              selectedTab={selectedTab as FolderTab}
              selectedDiscipline={selectedDiscipline}
              selectedFolderId={selectedFolderId}
              selectedFolderName={selectedFolderName}
              onFolderSelect={handleFolderSelect}
              onBack={() => setCurrentStep(1)}
              onNext={handleStep2Next}
            />
          )}

          {currentStep === 3 && (
            <UploadStep3FileMetadata
              projectId={projectId}
              selectedTab={selectedTab as FolderTab}
              selectedFolderId={selectedFolderId}
              selectedFolderName={selectedFolderName}
              isNewFolder={isNewFolder}
              s3Upload={s3Upload}
              onBack={() => setCurrentStep(2)}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
