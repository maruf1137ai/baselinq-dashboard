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
  X,
  FileText,
  Download,
  History,
  CheckCircle2,
  ChevronRight,
  User,
  Calendar
} from 'lucide-react';
import AiIcon from '@/components/icons/AiIcon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

const mockVersions = [
  {
    v: 'v3',
    current: true,
    date: 'Oct 20, 2025',
    user: 'Sarah Chen',
    filename: 'JBCC_PBA_v3.pdf',
    size: '4.2 MB',
    changelog: 'Updated penalty clauses and revised payment terms per addendum 2',
    aiStatus: { flags: 4, high: 1, medium: 3 },
  },
  {
    v: 'v2',
    current: false,
    date: 'Sep 15, 2025',
    user: 'Sarah Chen',
    filename: 'JBCC_PBA_v2.pdf',
    size: '3.8 MB',
    changelog: 'Added schedule of rates and subcontractor clauses',
    aiStatus: { flags: 2, high: 0, medium: 2 },
  },
  {
    v: 'v1',
    current: false,
    date: 'Aug 1, 2025',
    user: 'Mike Johnson',
    filename: 'JBCC_PBA_v1.pdf',
    size: '3.1 MB',
    changelog: 'Initial contract upload',
    aiStatus: { flags: 1, high: 0, medium: 1 },
  },
];

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  if (!document) return null;

  const handleRestore = (version: string) => {
    toast.success(`Restoring ${version}. A new version (v4) will be created.`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white flex flex-col max-h-[90vh]">
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-normal text-foreground">Version History — {document.reference}</DialogTitle>
            <p className="text-sm text-gray-500 font-normal">{document.name}</p>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-8 py-10 relative">
            {/* Timeline logic */}
            <div className="absolute left-[51px] top-10 bottom-10 w-px bg-gray-100" />

            <div className="space-y-12">
              {mockVersions.map((ver, idx) => (
                <div key={ver.v} className="relative pl-16">
                  {/* Timeline Dot */}
                  <div className={cn(
                    "absolute left-[-15px] top-0 h-8 w-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10",
                    ver.current ? "bg-emerald-500" : "bg-gray-200"
                  )}>
                    {ver.current && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-lg font-normal",
                          ver.current ? "text-gray-900" : "text-gray-500"
                        )}>
                          {ver.v} {ver.current && "(Current)"}
                        </span>
                        <span className="text-sm text-gray-400 font-normal">{ver.date}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm font-normal">
                      <div className="flex items-center gap-2 text-gray-500">
                        <User className="h-3.5 w-3.5" />
                        <span>Uploaded by: <span className="text-gray-900">{ver.user}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <FileText className="h-3.5 w-3.5" />
                        <span>File: <span className="text-gray-900">{ver.filename}</span> · {ver.size}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50/80 rounded-2xl p-5 space-y-4 border border-gray-100/50">
                      <div>
                        <p className="text-xs font-normal text-gray-400 uppercase tracking-wider mb-2">Changelog</p>
                        <p className="text-sm text-gray-600 italic font-normal leading-relaxed">
                          "{ver.changelog}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
                        <div className="flex items-center gap-3">
                          <p className="text-xs font-normal text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <AiIcon size={12} className="text-amber-500" /> AI Analysis
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs font-normal border-gray-200 bg-white">
                              {ver.aiStatus.flags} flags
                            </Badge>
                            {ver.aiStatus.high > 0 && (
                              <Badge className="bg-red-50 text-red-600 border-red-100 text-xs font-normal">
                                {ver.aiStatus.high} high
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-normal text-primary hover:bg-primary/5">
                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                          </Button>
                        </div>
                      </div>
                    </div>

                    {!ver.current && (
                      <div className="flex justify-end">
                        <Button
                          onClick={() => handleRestore(ver.v)}
                          variant="outline"
                          size="sm"
                          className="h-9 px-4 gap-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-normal"
                        >
                          <History className="h-4 w-4" /> Restore This Version
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};
