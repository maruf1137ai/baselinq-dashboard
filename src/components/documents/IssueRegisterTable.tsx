import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/Api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';

export interface IssueRegisterRow {
  id: string;
  number: string;
  title: string;
  discipline: string;
  revision: string;
  issueDate: string;
  status: string;
  issuedTo: string;
  uploadedBy: string;
  fileSize: number;
  fileName: string;
  docType: string;
}

interface IssueRegisterTableProps {
  folderId: string;
  projectId: string;
}

type SortField = 'number' | 'title' | 'issueDate' | 'revision';
type SortDirection = 'asc' | 'desc' | null;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

export function IssueRegisterTable({ folderId, projectId }: IssueRegisterTableProps) {
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: rows, isLoading, error } = useQuery<IssueRegisterRow[]>({
    queryKey: ['issue-register', folderId, projectId],
    queryFn: () =>
      fetchData(`documents/folders/${folderId}/register/?project_id=${projectId}`),
    enabled: !!folderId && !!projectId,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField('number'); // Reset to default
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    if (sortDirection === 'asc') return <ArrowUp className="ml-1 h-3 w-3 text-primary" />;
    if (sortDirection === 'desc') return <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
  };

  const sortedRows = rows ? [...rows].sort((a, b) => {
    if (!sortDirection) return 0;

    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortField) {
      case 'number':
        aVal = a.number;
        bVal = b.number;
        break;
      case 'title':
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case 'issueDate':
        aVal = a.issueDate || '';
        bVal = b.issueDate || '';
        break;
      case 'revision':
        aVal = a.revision;
        bVal = b.revision;
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load issue register. Please try again.
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No documents found in this folder.</p>
        <p className="text-xs mt-1">Upload documents to see them in the register.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead
              className="cursor-pointer hover:bg-muted transition-colors select-none"
              onClick={() => handleSort('number')}
            >
              <div className="flex items-center">
                Drawing No.
                {getSortIcon('number')}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted transition-colors select-none"
              onClick={() => handleSort('title')}
            >
              <div className="flex items-center">
                Title
                {getSortIcon('title')}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted transition-colors select-none"
              onClick={() => handleSort('revision')}
            >
              <div className="flex items-center">
                Rev
                {getSortIcon('revision')}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted transition-colors select-none"
              onClick={() => handleSort('issueDate')}
            >
              <div className="flex items-center">
                Issue Date
                {getSortIcon('issueDate')}
              </div>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Issued To</TableHead>
            <TableHead>Uploaded By</TableHead>
            <TableHead className="text-right">Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/30">
              <TableCell className="font-mono text-sm font-medium">
                {row.number}
              </TableCell>
              <TableCell className="max-w-md">
                <div className="truncate" title={row.title}>
                  {row.title}
                </div>
                <div className="text-xs text-muted-foreground truncate" title={row.fileName}>
                  {row.fileName}
                </div>
              </TableCell>
              <TableCell className="text-sm">{row.revision}</TableCell>
              <TableCell className="text-sm">
                {row.issueDate ? format(new Date(row.issueDate), 'dd MMM yyyy') : '-'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.issuedTo}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.uploadedBy}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {formatFileSize(row.fileSize)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
        Showing {sortedRows.length} document{sortedRows.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
