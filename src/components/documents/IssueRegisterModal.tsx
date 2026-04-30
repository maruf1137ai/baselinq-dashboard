import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IssueRegisterTable, type IssueRegisterRow } from './IssueRegisterTable';
import { Download, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { FolderTab } from '@/types/folder';

interface IssueRegisterModalProps {
  open: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  projectId: string;
  tab?: FolderTab;
}

export function IssueRegisterModal({
  open,
  onClose,
  folderId,
  folderName,
  projectId,
  tab,
}: IssueRegisterModalProps) {
  const navigate = useNavigate();
  const { data: rows } = useQuery<IssueRegisterRow[]>({
    queryKey: ['issue-register', folderId, projectId],
    queryFn: () =>
      fetchData(`documents/folders/${folderId}/register/?project_id=${projectId}`),
    enabled: !!folderId && !!projectId && open,
  });

  const exportToCSV = () => {
    if (!rows || rows.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // CSV headers
      const headers = [
        'Drawing No.',
        'Title',
        'Revision',
        'Issue Date',
        'Status',
        'Issued To',
        'Uploaded By',
        'File Name',
        'File Size (bytes)',
      ];

      // CSV rows
      const csvRows = rows.map((row) => [
        row.number,
        `"${row.title.replace(/"/g, '""')}"`, // Escape quotes in title
        row.revision,
        row.issueDate || '',
        row.status,
        row.issuedTo,
        row.uploadedBy,
        `"${row.fileName.replace(/"/g, '""')}"`, // Escape quotes in filename
        row.fileSize.toString(),
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows.map((row) => row.join(',')),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Issue_Register_${folderName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Issue register exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] p-0 gap-0 bg-white dark:bg-zinc-900 z-[60] shadow-xl border">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Issue Register</DialogTitle>
          <DialogDescription>
            Document register for <span className="font-medium text-foreground">{folderName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 max-h-[calc(90vh-180px)] overflow-auto">
          <IssueRegisterTable folderId={folderId} projectId={projectId} />
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {rows && rows.length > 0 ? (
            <Button onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          ) : (
            <Button
              onClick={() => {
                const params = new URLSearchParams();
                if (tab) params.set('tab', tab);
                params.set('folder_id', folderId);
                navigate(`/documents/upload?${params.toString()}`);
                onClose();
              }}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Documents
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
