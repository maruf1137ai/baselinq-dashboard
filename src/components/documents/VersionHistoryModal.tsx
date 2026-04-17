import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  History,
  CheckCircle2,
  User,
  Loader2,
} from 'lucide-react';
import AiIcon from '@/components/icons/AiIcon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postData } from '@/lib/Api';
import { formatDate } from '@/lib/utils';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  versions?: any[];
  isLoading?: boolean;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  versions = [],
  isLoading = false,
}) => {
  const queryClient = useQueryClient();
  const projectId = localStorage.getItem('selectedProjectId');

  const { mutate: restoreVersion, isPending: isRestoring } = useMutation({
    mutationFn: (versionId: string) =>
      postData({ url: `documents/${doc?._id}/versions/${versionId}/restore/?project_id=${projectId}`, data: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', doc?._id] });
      queryClient.invalidateQueries({ queryKey: ['document', doc?._id] });
      toast.success('Version restored successfully. A new version has been created.');
      onClose();
    },
    onError: () => toast.error('Failed to restore version.'),
  });

  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white flex flex-col max-h-[90vh]">
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-normal text-foreground">Version History, {doc.reference}</DialogTitle>
            <p className="text-sm text-gray-500 font-normal">{doc.name}</p>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="py-16">
              <AwesomeLoader message="Loading Versions" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <History className="w-8 h-8" />
              <p className="text-sm">No versions found</p>
            </div>
          ) : (
            <div className="px-8 py-10 relative">
              <div className="absolute left-[51px] top-10 bottom-10 w-px bg-gray-100" />
              <div className="space-y-12">
                {versions.map((ver: any) => {
                  const sizeMB = ver.fileSize ? `${(ver.fileSize / (1024 * 1024)).toFixed(2)} MB` : null;
                  return (
                    <div key={ver._id} className="relative pl-16">
                      <div className={cn(
                        "absolute left-[-15px] top-0 h-8 w-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10",
                        ver.isCurrent ? "bg-emerald-500" : "bg-gray-200"
                      )}>
                        {ver.isCurrent && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "text-lg font-normal",
                              ver.isCurrent ? "text-gray-900" : "text-gray-500"
                            )}>
                              v{ver.versionNumber} {ver.isCurrent && "(Current)"}
                            </span>
                            <span className="text-sm text-gray-400 font-normal">
                              {ver.createdAt ? formatDate(ver.createdAt) : ''}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm font-normal">
                          {ver.uploadedBy && (
                            <div className="flex items-center gap-2 text-gray-500">
                              <User className="h-3.5 w-3.5" />
                              <span>Uploaded by: <span className="text-gray-900">{ver.uploadedBy.name}</span></span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-500">
                            <FileText className="h-3.5 w-3.5" />
                            <span>File: <span className="text-gray-900">{ver.fileName}</span>{sizeMB ? ` · ${sizeMB}` : ''}</span>
                          </div>
                        </div>

                        <div className="bg-gray-50/80 rounded-2xl p-5 space-y-4 border border-gray-100/50">
                          {ver.changelog && (
                            <div>
                              <p className="text-xs font-normal text-gray-400 normal-case mb-2">Changelog</p>
                              <p className="text-sm text-gray-600 italic font-normal leading-relaxed">
                                "{ver.changelog}"
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
                            <div className="flex items-center gap-3">
                              <p className="text-xs font-normal text-gray-400 normal-case flex items-center gap-1.5">
                                <AiIcon size={12} className="text-amber-500" /> AI Analysis
                              </p>
                              {ver.aiFlags !== undefined && ver.aiFlags > 0 && (
                                <Badge variant="outline" className="text-xs font-normal border-gray-200 bg-white">
                                  {ver.aiFlags} flags
                                </Badge>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {ver.downloadUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs font-normal text-primary hover:bg-primary/5"
                                  onClick={() => window.open(ver.downloadUrl, '_blank')}
                                >
                                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {!ver.isCurrent && (
                          <div className="flex justify-end">
                            <Button
                              onClick={() => restoreVersion(ver._id)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 gap-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-normal"
                              disabled={isRestoring}
                            >
                              {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
                              Restore This Version
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
