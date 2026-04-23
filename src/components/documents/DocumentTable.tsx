import React from 'react';
import {
  MoreVertical,
  Download,
  Upload,
  Eye,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';
import AiIcon from '@/components/icons/AiIcon';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCategoryForDoc, SUBCATEGORY_LABEL } from '@/lib/documentTaxonomy';

export interface ApiDocument {
  _id: string;
  projectId: string;
  name: string;
  type: string;
  reference: string;
  discipline: string;
  description: string;
  status: string;
  currentVersion: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  linkedCount: number;
  aiFlags: number;
  aiSeverity: string;
  aiStatus: string;
  isNew: boolean;
  isGated: boolean;
  uploadedBy: { userId: string; name: string };
  createdAt: string;
  updatedAt: string;
  userPermissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canDownload: boolean;
    canUploadVersion: boolean;
    canChat: boolean;
    canResolve: boolean;
  };
}


interface DocumentTableProps {
  documents: ApiDocument[];
  isLoading?: boolean;
  onRowClick: (id: string | number) => void;
  onVersionUpload?: (doc: ApiDocument) => void;
  onDelete?: (doc: ApiDocument) => void;
  // Retained for backwards compat; no longer used (discipline grouping removed).
  customDisciplines?: string[];
  onUploadToDiscipline?: (discipline: string) => void;
}

// Discipline chip colors — kept subtle so they don't overpower the table.
const DISCIPLINE_CHIP: Record<string, { bg: string; fg: string; border: string }> = {
  Architectural:            { bg: 'bg-amber-50',   fg: 'text-amber-700',   border: 'border-amber-100' },
  Structural:               { bg: 'bg-blue-50',    fg: 'text-blue-700',    border: 'border-blue-100' },
  Civil:                    { bg: 'bg-slate-50',   fg: 'text-slate-700',   border: 'border-slate-200' },
  'Mechanical (MEP)':       { bg: 'bg-emerald-50', fg: 'text-emerald-700', border: 'border-emerald-100' },
  'Electrical (MEP)':       { bg: 'bg-teal-50',    fg: 'text-teal-700',    border: 'border-teal-100' },
  'Plumbing (MEP)':         { bg: 'bg-cyan-50',    fg: 'text-cyan-700',    border: 'border-cyan-100' },
  'Quantity Surveying':     { bg: 'bg-violet-50',  fg: 'text-violet-700',  border: 'border-violet-100' },
  'Project Management':     { bg: 'bg-indigo-50',  fg: 'text-indigo-700',  border: 'border-indigo-100' },
  'Fire Safety':            { bg: 'bg-red-50',     fg: 'text-red-700',     border: 'border-red-100' },
  Landscape:                { bg: 'bg-lime-50',    fg: 'text-lime-700',    border: 'border-lime-100' },
  'Interior Design':        { bg: 'bg-pink-50',    fg: 'text-pink-700',    border: 'border-pink-100' },
  Environmental:            { bg: 'bg-green-50',   fg: 'text-green-700',   border: 'border-green-100' },
  Geotechnical:             { bg: 'bg-stone-50',   fg: 'text-stone-700',   border: 'border-stone-200' },
  'Health & Safety':        { bg: 'bg-orange-50',  fg: 'text-orange-700',  border: 'border-orange-100' },
  Legal:                    { bg: 'bg-purple-50',  fg: 'text-purple-700',  border: 'border-purple-100' },
};

const getDisciplineChip = (d?: string) =>
  DISCIPLINE_CHIP[d ?? ''] ?? { bg: 'bg-gray-50', fg: 'text-gray-700', border: 'border-gray-100' };

const CATEGORY_CHIP: Record<string, string> = {
  Drawings:  'bg-blue-50 text-blue-700 border-blue-100',
  Documents: 'bg-slate-50 text-slate-700 border-slate-200',
  Contracts: 'bg-amber-50 text-amber-700 border-amber-100',
};

const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  isLoading = false,
  onRowClick,
  onVersionUpload,
  onDelete,
}) => {
  if (isLoading) {
    return <AwesomeLoader message="Loading Documents" />;
  }

  if (!isLoading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2 bg-white border border-border rounded-lg">
        <p className="text-sm">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="bg-muted/50 px-4 py-2.5 flex items-center text-[11px] uppercase tracking-wider text-muted-foreground font-normal border-b border-border">
        <span className="flex-1 min-w-0 pr-4">Name</span>
        <span className="w-32 shrink-0">Reference</span>
        <span className="w-28 shrink-0">Category</span>
        <span className="w-32 shrink-0">Type</span>
        <span className="w-40 shrink-0">Discipline</span>
        <span className="w-20 shrink-0">Version</span>
        <span className="w-24 shrink-0">AI Flags</span>
        <span className="w-32 shrink-0 text-right">Last Updated</span>
        <span className="w-10 shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {documents.map((doc) => {
          const category = getCategoryForDoc(doc as any);
          const typeLabel = SUBCATEGORY_LABEL[doc.type] || doc.type || '—';
          const disciplineColor = getDisciplineChip(doc.discipline);
          return (
            <div
              key={doc._id}
              onClick={() => onRowClick(doc._id)}
              className="px-4 py-3 flex items-center hover:bg-muted/40 transition-colors cursor-pointer group"
            >
              {/* Name */}
              <div className="flex-1 min-w-0 pr-4">
                <span className="text-foreground text-sm font-normal block truncate">
                  {doc.name}
                </span>
              </div>

              {/* Reference */}
              <span className="w-32 shrink-0 text-xs font-mono text-muted-foreground truncate pr-2">
                {doc.reference || '—'}
              </span>

              {/* Category chip */}
              <span className="w-28 shrink-0 pr-2">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal border',
                    CATEGORY_CHIP[category] || 'bg-gray-50 text-gray-700 border-gray-100'
                  )}
                >
                  {category}
                </span>
              </span>

              {/* Type */}
              <span className="w-32 shrink-0 text-sm text-muted-foreground truncate pr-2">
                {typeLabel}
              </span>

              {/* Discipline chip */}
              <span className="w-40 shrink-0 pr-2">
                {doc.discipline ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-normal border',
                      disciplineColor.bg,
                      disciplineColor.fg,
                      disciplineColor.border
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', disciplineColor.fg.replace('text-', 'bg-'))} />
                    <span className="truncate max-w-[8rem]">{doc.discipline}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </span>

              {/* Version */}
              <span className="w-20 shrink-0 text-sm text-muted-foreground tabular-nums">
                {doc.currentVersion || '—'}
              </span>

              {/* AI Flags */}
              <span className="w-24 shrink-0">
                {doc.aiFlags > 0 ? (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 text-[11px] font-normal">
                    <AiIcon size={10} />
                    {doc.aiFlags}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </span>

              {/* Last updated */}
              <span className="w-32 shrink-0 text-right text-xs text-muted-foreground font-normal whitespace-nowrap">
                {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true }).replace('about ', '')}
              </span>

              {/* Row menu */}
              <div className="w-10 shrink-0 flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-lg">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onRowClick(doc._id)} className="gap-2 text-sm font-normal">
                      <Eye className="w-4 h-4" /> View Details
                    </DropdownMenuItem>
                    {doc.downloadUrl && doc.userPermissions?.canDownload !== false && (
                      <DropdownMenuItem onClick={() => window.open(doc.downloadUrl, '_blank')} className="gap-2 text-sm font-normal">
                        <Download className="w-4 h-4" /> Download
                      </DropdownMenuItem>
                    )}
                    {onVersionUpload && doc.userPermissions?.canUploadVersion !== false && (
                      <DropdownMenuItem onClick={() => onVersionUpload(doc)} className="gap-2 text-sm font-normal">
                        <Upload className="w-4 h-4" /> Upload Version
                      </DropdownMenuItem>
                    )}
                    {onDelete && doc.userPermissions?.canDelete !== false && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(doc)} className="gap-2 text-sm font-normal text-red-600 focus:text-red-600">
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentTable;
