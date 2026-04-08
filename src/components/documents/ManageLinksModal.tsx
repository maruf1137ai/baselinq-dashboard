import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Link2,
  Plus,
  RotateCcw,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LinkDocumentModal } from './LinkDocumentModal';

interface ManageLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

const mockLinks = [
  { id: 'VO-065', title: 'Additional Waterproofing', type: 'VO', date: 'Oct 21' },
  { id: 'RFI-083', title: 'Basement B2 Waterproofing', type: 'RFI', date: 'Oct 21' },
  { id: 'SI-108', title: 'Revised Slab Level', type: 'SI', date: 'Oct 21' },
  { id: 'RFI-080', title: 'Structural Beam Detail', type: 'RFI', date: 'Oct 21' },
  { id: 'DC-042', title: 'Unforeseen Ground Conditions', type: 'DC', date: 'Oct 21' },
];

const typeColors: Record<string, string> = {
  'VO': 'bg-blue-50 text-blue-700 border-blue-100',
  'RFI': 'bg-purple-50 text-purple-700 border-purple-100',
  'SI': 'bg-amber-50 text-amber-700 border-amber-100',
  'DC': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'CPI': 'bg-rose-50 text-rose-700 border-rose-100',
};

export const ManageLinksModal: React.FC<ManageLinksModalProps> = ({
  isOpen,
  onClose,
  document
}) => {
  const [links, setLinks] = useState(mockLinks);
  const [markedForRemoval, setMarkedForRemoval] = useState<string[]>([]);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);

  if (!document) return null;

  const toggleRemoval = (id: string) => {
    setMarkedForRemoval(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddLinks = (selectedIds: string[]) => {
    // In a real app we'd fetch these from the API or add the mock objects
    toast.success(`${selectedIds.length} items added to staging.`);
  };

  const handleSave = () => {
    const removalsCount = markedForRemoval.length;
    toast.success(`Updated links for ${document.reference}: 0 added, ${removalsCount} removed.`);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white flex flex-col max-h-[90vh]">
          <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-xl font-normal text-foreground">Manage Links, {document.reference}</DialogTitle>
              <p className="text-sm text-gray-500 font-normal">{document.name}</p>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-8 py-6 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-normal text-gray-400 normal-case">Linked Items ({links.length})</h4>
                <Button
                  onClick={() => setIsAddLinkModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 gap-2 border-primary/20 text-primary hover:bg-primary/5 rounded-full font-normal"
                >
                  <Plus className="h-4 w-4" /> Add Link
                </Button>
              </div>

              <div className="space-y-3">
                {links.map(link => {
                  const isRemoved = markedForRemoval.includes(link.id);
                  return (
                    <div
                      key={link.id}
                      className={cn(
                        "group flex items-center justify-between p-4 rounded-2xl border transition-all",
                        isRemoved
                          ? "bg-red-50/30 border-red-100 opacity-80"
                          : "bg-white border-gray-100 hover:border-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors",
                          isRemoved ? "bg-red-100/50 border-red-100" : "bg-gray-50 border-gray-100"
                        )}>
                          <Link2 className={cn("h-5 w-5", isRemoved ? "text-red-400" : "text-gray-400")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-xs px-1.5 py-0 font-normal rounded-md uppercase", typeColors[link.type])}>
                              {link.type}
                            </Badge>
                            <span className={cn(
                              "text-sm font-normal transition-all",
                              isRemoved ? "text-red-400 line-through" : "text-gray-900"
                            )}>
                              {link.id} · {link.title}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 font-normal">Linked on {link.date}</p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {isRemoved ? (
                          <Button
                            onClick={() => toggleRemoval(link.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-primary font-normal hover:bg-primary/5 gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Undo
                          </Button>
                        ) : (
                          <Button
                            onClick={() => toggleRemoval(link.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all font-normal gap-1.5"
                          >
                            Unlink <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {markedForRemoval.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 font-normal leading-relaxed">
                    You have marked {markedForRemoval.length} item(s) to be unlinked. These changes will be applied once you save.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-8 py-6 border-t bg-gray-50/50 flex gap-3 sm:justify-between items-center">
            <Button variant="outline" onClick={onClose} className="font-normal h-11 border-gray-200 px-6 bg-white">
              Close
            </Button>
            <Button
              onClick={handleSave}
              className="font-normal h-11 px-8 shadow-lg shadow-primary/20 bg-[#3A6FF7] hover:bg-[#3A6FF7]/90"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LinkDocumentModal
        isOpen={isAddLinkModalOpen}
        onClose={() => setIsAddLinkModalOpen(false)}
        onLink={handleAddLinks}
        alreadyLinkedIds={links.map(l => l.id)}
      />
    </>
  );
};
