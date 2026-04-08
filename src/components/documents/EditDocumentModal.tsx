import React, { useState, useEffect } from 'react';
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
import { Loader2, Pencil } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchData } from '@/lib/Api';
import { toast } from 'sonner';

const DOCUMENT_TYPES = ['Contract', 'Drawing', 'Specification', 'Report', 'Certificate'] as const;
const DISCIPLINES = ['Architectural', 'Structural', 'MEP', 'Civil', 'Environmental'] as const;
const STATUSES = ['Active', 'Under Review', 'Archived'] as const;

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({ isOpen, onClose, document: doc }) => {
  const queryClient = useQueryClient();
  const projectId = localStorage.getItem('selectedProjectId');

  const [name, setName] = useState('');
  const [docType, setDocType] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (doc && isOpen) {
      setName(doc.name || '');
      setDocType(doc.type || '');
      setDiscipline(doc.discipline || '');
      setDescription(doc.description || '');
      setStatus(doc.status || '');
    }
  }, [doc, isOpen]);

  const { mutate: updateDocument, isPending } = useMutation({
    mutationFn: (data: Record<string, string>) =>
      patchData({ url: `documents/${doc?._id}/?project_id=${projectId}`, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', doc?._id] });
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      toast.success('Document updated successfully.');
      onClose();
    },
    onError: () => toast.error('Failed to update document.'),
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Document name is required');
      return;
    }
    const data: Record<string, string> = {};
    if (name !== doc.name) data.name = name.trim();
    if (docType !== doc.type) data.type = docType;
    if (discipline !== doc.discipline) data.discipline = discipline;
    if (description !== doc.description) data.description = description;
    if (status !== doc.status) data.status = status;

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }
    updateDocument(data);
  };

  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-normal text-foreground">Edit Document</DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">{doc.reference}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6">
          <div>
            <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">
              Document Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 border-gray-200 rounded-xl focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-primary/20">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">Discipline</Label>
              <Select value={discipline} onValueChange={setDiscipline}>
                <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-primary/20">
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

          <div>
            <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-primary/20">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-normal text-gray-400 normal-case mb-2 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the document contents..."
              className="min-h-[100px] border-gray-200 rounded-xl focus:ring-primary/20 p-4"
            />
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-gray-50/50 flex gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-1 font-normal h-11 border-gray-200 bg-white">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="flex-1 font-normal h-11 shadow-lg shadow-primary/20 gap-2">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
