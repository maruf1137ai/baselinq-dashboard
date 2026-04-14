import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  MoreVertical,
  ChevronDown,
  Plus,
  Download,
  Upload,
  Eye,
  Archive,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface TooltipWrapperProps {
  children: React.ReactNode;
  content: string;
}

const TooltipWrapper = ({ children, content }: TooltipWrapperProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="bg-[#1e293b] text-white border-0 text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Generate version history from a version string like "v3" → ["v1", "v2", "v3"]
const generateVersionHistory = (version: string): string[] => {
  if (!version) return ['v1'];
  const match = version.match(/^v(\d+)$/i);
  if (!match) return [version];
  const num = parseInt(match[1], 10);
  return Array.from({ length: num }, (_, i) => `v${i + 1}`);
};

// Universal revision pills — works for both drawings (letters) and other docs (versions)
const RevisionPills = ({ doc }: { doc: Document }) => {
  const history = (doc as any).revisionHistory ?? generateVersionHistory((doc as any).version ?? (doc as any).currentVersion);
  const current = (doc as any).revision ?? history[history.length - 1];
  const overflow = Math.max(0, history.length - 3);
  const visible = history.slice(-3);

  return (
    <TooltipWrapper content={`Revisions: ${history.join(' → ')}`}>
      <div className="flex items-center gap-1">
        {overflow > 0 && (
          <span className="text-xs text-muted-foreground font-medium">+{overflow}</span>
        )}
        {visible.map((rev) => (
          <div
            key={rev}
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border transition-all',
              rev === current
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-muted-foreground border-border'
            )}
          >
            {rev}
          </div>
        ))}
      </div>
    </TooltipWrapper>
  );
};

interface DocumentTableProps {
  documents: ApiDocument[];
  isLoading?: boolean;
  onRowClick: (id: string | number) => void;
  onVersionUpload?: (doc: ApiDocument) => void;
  onDelete?: (doc: ApiDocument) => void;
  customDisciplines?: string[];
}

const getDisciplineColor = (disp: string) => {
  switch (disp) {
    case 'Legal': return '#A78BFA';
    case 'Structural': return '#3B82F6';
    case 'Architectural': return '#F59E0B';
    case 'MEP': return '#10B981';
    case 'Civil': return '#6B7280';
    case 'Environmental': return '#84CC16';
    default: return '#9CA3AF';
  }
};

const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  isLoading = false,
  onRowClick,
  onVersionUpload,
  onDelete,
  customDisciplines = [],
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleDiscipline = (discipline: string) => {
    setCollapsed(prev => ({ ...prev, [discipline]: !prev[discipline] }));
  };

  const groupedDocs = documents.reduce<Record<string, ApiDocument[]>>((acc, doc) => {
    const key = doc.discipline || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const disciplines = Object.keys(groupedDocs);

  if (isLoading) {
    return <AwesomeLoader message="Loading Documents" />;
  }

  if (!isLoading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
        <p className="text-sm">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Table Header — rendered once */}
      <div className="bg-muted/50 px-4 py-2.5 flex items-center text-xs text-muted-foreground font-normal border border-border rounded-t-lg">
        <span className="flex-1 min-w-0">Document</span>
        <span className="w-32 shrink-0">AI Flags</span>
        <span className="w-28 shrink-0">Version</span>
        <span className="w-28 shrink-0 text-right">Last Updated</span>
        <span className="w-10 shrink-0" />
      </div>

      {/* Discipline groups */}
      {disciplines.map((discipline) => {
        const isCollapsed = collapsed[discipline] ?? false;
        return (
          <div key={discipline} className="bg-white border border-border border-t-0 overflow-hidden last:rounded-b-lg">
            {/* Group Header */}
            <div
              className="bg-sidebar px-4 py-3 flex items-center justify-between cursor-pointer"
              onClick={() => toggleDiscipline(discipline)}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: getDisciplineColor(discipline) + '20' }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: getDisciplineColor(discipline) }}
                  />
                </div>
                <span className="text-sm font-normal text-foreground">{discipline}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {groupedDocs[discipline].length}
                </span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isCollapsed && 'rotate-180')} />
            </div>

            {/* Document Rows */}
            {!isCollapsed && (
              <div className="divide-y divide-border/50">
                {groupedDocs[discipline].map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => onRowClick(doc._id)}
                    className="px-4 py-2.5 flex items-center hover:bg-muted transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground text-sm font-normal transition-colors block truncate">
                        {doc.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-amber-700 text-xs font-normal tracking-tight">
                          {doc.reference}
                        </span>
                        <span className="text-muted-foreground text-xs font-normal">
                          {doc.type}
                        </span>
                      </div>
                    </div>

                    <div className="w-32 shrink-0">
                      {doc.aiFlags > 0 && (
                        <div className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-amber-100 w-fit">
                          <AiIcon size={12} />
                          <span className="text-xs font-normal">{doc.aiFlags} {doc.aiSeverity}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-28 shrink-0">
                      <RevisionPills doc={doc as any} />
                    </div>

                    <span className="text-muted-foreground text-sm w-28 shrink-0 text-right font-normal whitespace-nowrap">
                      {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true }).replace('about ', '')}
                    </span>

                    <div className="w-10 shrink-0 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-muted rounded-lg">
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
                          {(doc.userPermissions?.canDelete !== false || doc.userPermissions?.canUploadVersion !== false) && <DropdownMenuSeparator />}
                          {onDelete && doc.userPermissions?.canDelete !== false && (
                            <DropdownMenuItem onClick={() => onDelete(doc)} className="gap-2 text-sm font-normal text-red-600 focus:text-red-600">
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom (empty) discipline groups */}
      {customDisciplines.map((discipline) => (
        <div key={discipline} className="bg-white rounded-[14px] border border-dashed border-gray-200 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-dashed border-gray-100">
            <div className="flex items-center gap-3">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
              <div
                className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30"
              />
              <span className="text-foreground font-normal">{discipline}</span>
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full ml-1">
                0
              </span>
            </div>
          </div>
          <div className="px-6 py-8 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground font-normal">No documents in this segment yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-normal border-border text-muted-foreground gap-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload to {discipline}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentTable;
