import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import useFetch from '@/hooks/useFetch';

export interface LinkItem {
  type: string;
  taskId: number;
}

interface LinkDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (items: LinkItem[]) => void;
  alreadyLinkedIds?: string[];
}

const DONE_STATUSES = ['done', 'Done', 'DONE', 'Closed', 'closed', 'CLOSED', 'Approved', 'approved'];

const typeColors: Record<string, string> = {
  VO: 'bg-blue-50 text-blue-700 border-blue-100',
  RFI: 'bg-purple-50 text-purple-700 border-purple-100',
  SI: 'bg-amber-50 text-amber-700 border-amber-100',
  DC: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  CPI: 'bg-rose-50 text-rose-700 border-rose-100',
  GI: 'bg-gray-50 text-gray-700 border-gray-100',
};

const FILTERS = ['All', 'VO', 'RFI', 'SI', 'DC', 'CPI'];

export const LinkDocumentModal: React.FC<LinkDocumentModalProps> = ({
  isOpen,
  onClose,
  onLink,
  alreadyLinkedIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const projectId = localStorage.getItem('selectedProjectId');

  const { data: taskResponse, isLoading } = useFetch<{ tasks: any[] }>(
    projectId ? `projects/${projectId}/tasks/` : '',
    { enabled: !!projectId && isOpen },
  );

  const tasks = useMemo(() => {
    const raw = taskResponse?.tasks || [];
    return raw
      .filter((item: any) => !DONE_STATUSES.includes(item.status || ''))
      .map((item: any) => ({
        id: `${item.taskType}-${String(item.taskId).padStart(3, '0')}`,
        taskId: item.taskId,
        title: item.task?.subject || item.task?.title || item.task?.taskActivityName || '—',
        type: item.taskType || 'GI',
        status: item.status || 'Open',
        createdAt: item.created_at || item.task?.createdAt || '',
      }));
  }, [taskResponse]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = activeFilter === 'All' || t.type === activeFilter;
      return matchesSearch && matchesType;
    });
  }, [tasks, searchTerm, activeFilter]);

  const toggleSelect = (id: string) => {
    if (alreadyLinkedIds.includes(id)) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLink = () => {
    const linkItems = selectedIds
      .map(id => {
        const task = tasks.find(t => t.id === id);
        return task ? { type: task.type, taskId: task.taskId } : null;
      })
      .filter((item): item is LinkItem => item !== null);
    onLink(linkItems);
    toast.success(`${linkItems.length} task${linkItems.length > 1 ? 's' : ''} linked successfully.`);
    setSelectedIds([]);
    onClose();
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchTerm('');
    setActiveFilter('All');
    onClose();
  };

  const formatDate = (val: string) => {
    if (!val) return '';
    try {
      return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return val;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white flex flex-col max-h-[90vh]">
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <DialogTitle className="text-xl font-normal text-foreground">Link to Task</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by reference or title..."
              className="pl-12 h-12 border-gray-200 rounded-xl focus:ring-primary/20 font-normal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs transition-all border font-normal',
                  activeFilter === filter
                    ? 'bg-[#3A6FF7] text-white border-[#3A6FF7]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-normal">Loading tasks...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 font-normal">
                  {searchTerm ? `No tasks found matching "${searchTerm}"` : 'No open tasks found'}
                </p>
              </div>
            ) : (
              filtered.map((task) => {
                const isAlreadyLinked = alreadyLinkedIds.includes(task.id);
                const isSelected = selectedIds.includes(task.id);

                return (
                  <div
                    key={task.id}
                    onClick={() => !isAlreadyLinked && toggleSelect(task.id)}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-2xl border transition-all select-none',
                      isAlreadyLinked
                        ? 'bg-gray-50 opacity-60 cursor-not-allowed border-gray-100'
                        : 'bg-white cursor-pointer border-gray-100 hover:border-primary/30 hover:shadow-sm',
                      isSelected && 'border-primary/50 bg-primary/[0.02]'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {isAlreadyLinked ? (
                          <CheckCircle2 className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(task.id)}
                            className="rounded-md border-gray-300 data-[state=checked]:bg-[#3A6FF7] data-[state=checked]:border-[#3A6FF7]"
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs px-1.5 py-0 font-normal rounded-md uppercase',
                              typeColors[task.type] || typeColors.GI
                            )}
                          >
                            {task.type}
                          </Badge>
                          <span className="text-sm font-normal text-gray-900">{task.id}</span>
                          <span className="text-gray-300 text-xs">•</span>
                          <span className="text-sm font-normal text-foreground truncate max-w-[180px]">{task.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{task.status}</span>
                          {task.createdAt && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-gray-300" />
                              <span>Created {formatDate(task.createdAt)}</span>
                            </>
                          )}
                          {isAlreadyLinked && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-gray-300" />
                              <span className="text-gray-400 italic">Already linked</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-gray-50/50 flex items-center justify-between sm:justify-between">
          <div className="text-sm text-gray-500 font-normal">
            {selectedIds.length > 0 ? (
              <span className="text-primary">{selectedIds.length} selected</span>
            ) : (
              'No items selected'
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="font-normal h-11 border-gray-200 px-6 bg-white">
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={selectedIds.length === 0}
              className="font-normal h-11 px-8 shadow-lg shadow-primary/20 bg-[#3A6FF7] hover:bg-[#3A6FF7]/90"
            >
              Link Selected
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
