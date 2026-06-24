import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patchData } from '@/lib/Api';
import type { ApiDocument } from '@/components/documents/DocumentTable';

interface RenameDocumentDialogProps {
  doc: ApiDocument | null;
  projectId: string;
  onClose: () => void;
}

/** Lightweight single-field dialog to rename a document (PATCH `name`). */
export const RenameDocumentDialog: React.FC<RenameDocumentDialogProps> = ({
  doc,
  projectId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  useEffect(() => {
    if (doc) setName(doc.name ?? '');
  }, [doc]);

  const { mutate, isPending } = useMutation({
    mutationFn: (newName: string) =>
      patchData({ url: `documents/${doc!._id}/?project_id=${projectId}`, data: { name: newName } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents-summary', projectId] });
      if (doc) queryClient.invalidateQueries({ queryKey: ['document', doc._id] });
      toast.success('Document renamed.');
      onClose();
    },
    onError: () => toast.error('Failed to rename document.'),
  });

  const trimmed = name.trim();
  const unchanged = trimmed === (doc?.name ?? '').trim();
  const canSave = !!trimmed && !unchanged && !isPending;

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border shadow-xl rounded-xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <Pencil className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-medium text-foreground">Rename document</DialogTitle>
              {doc && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.name}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3">
          <div>
            <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">New name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSave) mutate(trimmed);
              }}
              className="h-10 border-border rounded-lg"
              placeholder="Document name"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/30 flex gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}
            className="h-8 text-xs rounded-lg border-border text-foreground">
            Cancel
          </Button>
          <Button onClick={() => mutate(trimmed)} disabled={!canSave}
            className="h-8 text-xs rounded-lg">
            {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving…</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
