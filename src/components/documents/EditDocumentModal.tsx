import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pencil, FolderIcon, AlertCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchData, patchData } from '@/lib/Api';
import { toast } from 'sonner';
import { CATEGORIES, CATEGORY_TO_TYPES, DISCIPLINES, type DocCategory } from '@/lib/documentTaxonomy';
import { useFolders } from '@/hooks/useFolders';
import { cn } from '@/lib/utils';
import type { Folder, FolderTab } from '@/types/folder';

const STATUSES = ['Active', 'Under Review', 'Archived'] as const;

// User-facing Category label <-> backend `tab` slug. The backend stores
// `contracts | drawings | documents` on the Folder; we present "Contracts"
// etc. in the UI.
const CATEGORY_TO_TAB: Record<DocCategory, FolderTab> = {
  Contracts: 'contracts',
  Drawings: 'drawings',
  Documents: 'documents',
};

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

/**
 * Edit Document Modal
 *
 * Lets the user fix the categorical metadata that was set at upload time:
 *   - Name, Reference, Description (free text)
 *   - Category (Contracts / Drawings / Documents) — the top-level tab
 *   - Type — drawn from CATEGORY_TO_TYPES so it always matches what the
 *     upload wizard offers (no more stale 5-item drift)
 *   - Discipline (Architectural, Structural, MEP, etc.)
 *   - Folder — when Category changes, folder is force-cleared so the user
 *     re-picks. Prevents orphan state (Drawings doc filed under a
 *     Contracts folder).
 *   - Status
 *
 * Backend: a single PATCH on /documents/<id>/ — fields are exactly the
 * ones the upload wizard already sends, no new endpoints needed.
 */
export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({ isOpen, onClose, document: doc }) => {
  const queryClient = useQueryClient();
  const projectId = localStorage.getItem('selectedProjectId') || '';

  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocCategory>('Documents');
  const [docType, setDocType] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [folderId, setFolderId] = useState('');

  // Track the original category so we know when the user actually changed
  // it (and therefore needs to re-pick a folder).
  const [originalCategory, setOriginalCategory] = useState<DocCategory>('Documents');

  // Hydrate from the doc when the modal opens.
  useEffect(() => {
    if (!doc || !isOpen) return;
    const docCategory: DocCategory =
      (doc.category as DocCategory) ||
      (doc.folderTab === 'drawings' ? 'Drawings'
        : doc.folderTab === 'contracts' ? 'Contracts'
          : 'Documents');
    setName(doc.name || '');
    setCategory(docCategory);
    setOriginalCategory(docCategory);
    setDocType(doc.type || '');
    setDiscipline(doc.discipline || '');
    setReference(doc.reference || '');
    setDescription(doc.description || '');
    setStatus(doc.status || 'Active');
    setFolderId(doc.folderId || '');
  }, [doc, isOpen]);

  // When category changes, clamp the type to one of the allowed types
  // for that category and force-clear folder so the user re-picks.
  const handleCategoryChange = (next: DocCategory) => {
    setCategory(next);
    const allowed = CATEGORY_TO_TYPES[next];
    if (!allowed.includes(docType)) {
      setDocType(allowed.length === 1 ? allowed[0] : '');
    }
    if (next !== originalCategory) {
      setFolderId('');
    }
  };

  const typeOptions = CATEGORY_TO_TYPES[category];
  const folderTab = CATEGORY_TO_TAB[category];

  // Folder list for the chosen category. Re-fetches on category change.
  const { data: foldersData } = useFolders({
    projectId,
    tab: folderTab,
    enabled: isOpen,
  });
  const folders: Folder[] = useMemo(() => {
    // Flatten in case Contracts has nested folders.
    const flat: Folder[] = [];
    const walk = (nodes: Folder[]) => {
      nodes.forEach((f) => {
        flat.push(f);
        if (f.children?.length) walk(f.children);
      });
    };
    walk(Array.isArray(foldersData) ? foldersData : []);
    return flat;
  }, [foldersData]);

  const folderChanged = category !== originalCategory;
  const needsFolderReselection = folderChanged && !folderId;

  const { mutate: updateDocument, isPending } = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      patchData({ url: `documents/${doc?._id}/?project_id=${projectId}`, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', doc?._id] });
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['folders', projectId] });
      toast.success('Document updated.');
      onClose();
    },
    onError: () => toast.error('Failed to update document.'),
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Document name is required');
      return;
    }
    if (!docType) {
      toast.error('Please select a document type');
      return;
    }
    if (needsFolderReselection) {
      toast.error('Please pick a folder for the new category');
      return;
    }

    // Send only changed fields.
    const data: Record<string, unknown> = {};
    if (name !== doc.name) data.name = name.trim();
    if (docType !== doc.type) data.type = docType;
    if (discipline !== doc.discipline) data.discipline = discipline;
    if (reference !== doc.reference) data.reference = reference.trim();
    if (description !== doc.description) data.description = description;
    if (status !== doc.status) data.status = status;
    if (folderId !== (doc.folderId || '')) data.folder_id = folderId || null;

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }
    updateDocument(data);
  };

  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-white border border-border shadow-xl rounded-xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <Pencil className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-medium text-foreground">Edit Document</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.reference}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">
              Document Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 border-border rounded-lg"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select value={category} onValueChange={(v) => handleCategoryChange(v as DocCategory)}>
              <SelectTrigger className="h-10 border-border rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type + Discipline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">
                Type <span className="text-red-500">*</span>
              </Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-10 border-border rounded-lg">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">Discipline</Label>
              <Select value={discipline} onValueChange={setDiscipline}>
                <SelectTrigger className="h-10 border-border rounded-lg">
                  <SelectValue placeholder="Select discipline" />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Folder */}
          <div>
            <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">
              Folder
              {folderChanged && <span className="text-red-500"> *</span>}
            </Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger className={cn(
                "h-10 border-border rounded-lg",
                needsFolderReselection && "border-red-300 ring-1 ring-red-200"
              )}>
                <SelectValue placeholder={folders.length === 0 ? 'No folders available' : 'Select a folder'} />
              </SelectTrigger>
              <SelectContent>
                {folders.map((f) => (
                  <SelectItem key={f._id} value={f._id}>
                    <span className="flex items-center gap-2">
                      <FolderIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      {f.name.replace(/_/g, ' ')}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {folderChanged && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
                You changed the category — please pick a folder for the new category.
              </p>
            )}
          </div>

          {/* Reference + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. ARC-DWG-0042"
                className="h-10 border-border rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 border-border rounded-lg">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-normal text-muted-foreground mb-1.5 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the document contents…"
              className="min-h-[72px] border-border rounded-lg resize-none"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/30 flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="h-8 text-xs rounded-lg border-border text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || needsFolderReselection}
            className="h-8 text-xs rounded-lg bg-primary text-white hover:opacity-90"
          >
            {isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
