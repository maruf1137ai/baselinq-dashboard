import React, { useState, useMemo, useCallback } from 'react';
import { ProjectStatusCard } from '../ProjectStatusCard';
import CashIcon from '../icons/CashIcon';

import CostLedgerTable from './costLadgerTable';
import { FinanceToolbar } from './FinanceToolbar';
import { FilterIcon, ExportIcon, ChevronDownIcon } from '../icons/icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { CostLedgerDrawer } from './costLedgerDrawer';
import useFetchAllPages from '@/hooks/useFetchAllPages';
import { PlusIcon, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { AwesomeLoader } from '../commons/AwesomeLoader';
import { usePermission } from '@/hooks/usePermission';
import { EmptyState } from '@/components/ui/empty-state';
import { useProjectCommercials } from '@/hooks/useProjectCommercials';
import { financialOverview } from '@/lib/projectPosition';

export enum Category {
  Subcontractor = 'Subcontractor',
  Materials = 'Materials',
  PlantEquipment = 'Plant & Equipment',
  Labour = 'Labour',
  ProfessionalFees = 'Professional Fees',
  Preliminaries = 'Preliminaries',
  Contingency = 'Contingency',
  Other = 'Other',
}

export interface LedgerEntry {
  id: number;
  date: string;
  dateRaw?: string;
  supplier: string;
  supplierShort?: string;
  ref: string;
  period: string;
  net: number;
  total: number;
  linkedVO: string;
  linkedPC: string;
  linkedVOOrPC: string;
  linkedVOId: number | null;
  linkedPCId: number | null;
  entryType: string;
  category: Category;
}

interface LedgerApiEntry {
  id: number;
  date: string;
  supplier: string;
  ref: string;
  period: string;
  net: number;
  total: number;
  linkedVO: string;
  linkedVOId: number | null;
  linkedPC: string;
  linkedPCId: number | null;
  linkedVOOrPC: string;
  category: string;
  entryType: string;
  createdAt: string;
  updatedAt: string;
}

/** Format API date YYYY-MM-DD to DD/MM/YY for display */
const formatLedgerDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(2);
  return `${day}/${month}/${year}`;
};

const CostLadger = () => {
  const projectId = localStorage.getItem('selectedProjectId') || '';

  // Use permission matrix instead of hardcoded true
  const projectIdNum = parseInt(projectId) || null;
  const canEdit = usePermission("finance.edit", projectIdNum);
  const canCreate = usePermission("finance.edit", projectIdNum);
  // Exporting hands over the entire ledger as a file, so it is gated on the
  // same read permission that gates the tab rather than left open to anyone
  // who happens to reach the page.
  const canView = usePermission("finance.view", projectIdNum);
  const canExport = canView || canEdit;

  // Search lives here, alongside the filter and the actions, so all three sit
  // on one toolbar row above the table rather than in three stacked strips.
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

  const listUrl = projectId
    ? `cost-ledger/?project_id=${projectId}`
    : '';

  const { data: listData, isLoading } = useFetchAllPages<LedgerApiEntry>(listUrl);

  // Same derivation Project Health's Commercial position tab uses, so this
  // tab's "Financial overview" cannot drift from that one — see
  // useProjectCommercials's own header on why it's safe to call a second time.
  const commercials = useProjectCommercials(projectId || undefined);
  const overviewRows = useMemo(
    () => financialOverview(commercials.money, commercials.certificateBasis),
    [commercials.money, commercials.certificateBasis],
  );

  const availableCategories = useMemo(() => {
    if (!listData?.results) return [];
    const cats = new Set(listData.results.map((e) => e.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [listData]);

  const ledgerData: LedgerEntry[] = useMemo(() => {
    if (!listData?.results) return [];
    const filtered =
      selectedCategories.length > 0
        ? listData.results.filter((e) => selectedCategories.includes(e.category))
        : listData.results;
    return filtered.map((entry) => ({
      ...entry,
      date: formatLedgerDate(entry.date),
      dateRaw: entry.date,
      category: (entry.category || 'Other') as Category,
      entryType: entry.entryType || 'debit',
    }));
  }, [listData, selectedCategories]);

  const handleFilterChange = useCallback((category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const handleEditEntry = useCallback((entry: LedgerEntry) => {
    setEditingEntry(entry);
    setIsCreateOpen(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setEditingEntry(null);
    setIsCreateOpen(true);
  }, []);

  const exportToCSV = useCallback(async () => {
    if (!projectId) {
      toast.error('Select a project first');
      return;
    }
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const url = `${baseUrl}/cost-ledger/export/?project_id=${projectId}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'cost_ledger.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Export downloaded');
    } catch (e) {
      toast.error('Failed to export CSV');
      console.error(e);
    }
  }, [projectId]);

  const activeFilterCount = selectedCategories.length;

  return (
    <main className="pt-6 space-y-4">
      {(commercials.variationsTruncated || commercials.variationsFailed) && (
        <p className="text-xs text-muted-foreground">Variations may be short</p>
      )}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {overviewRows.map((r) => (
          <ProjectStatusCard
            key={r.key}
            icon={<CashIcon />}
            title={r.label}
            value={r.value ?? '—'}
            subtitle={r.formula}
            badgeText=""
            badgeVariant="default"
            actionText=""
            valueClassName={r.derived ? 'font-medium' : undefined}
          />
        ))}
      </div>

      {/* One toolbar row: search grows on the left, filter and actions sit
          right-aligned on the same line. */}
      <FinanceToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by supplier, ref, category..."
      >
        <>
          {/* New Entry Button — visible to all project members */}
          {canCreate && (
            <button
              className="flex items-center gap-2 h-8 px-4 rounded-lg text-xs text-primary-foreground bg-primary hover:opacity-90 transition-all"
              onClick={handleCreateNew}
            >
              <PlusIcon className="h-4 w-4" />
              <span>New Entry</span>
            </button>
          )}

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-2 h-8 px-4 rounded-lg text-xs transition-all border ${activeFilterCount > 0
                  ? 'bg-card text-foreground border-foreground'
                  : 'bg-card text-foreground border-border hover:bg-muted'
                  }`}
              >
                <FilterIcon className="h-4 w-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="bg-foreground text-background text-xs font-medium ml-1 px-2 py-0.5 rounded-full tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableCategories.map(category => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => handleFilterChange(category)}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={clearFilters}
                    className="text-primary focus:bg-primary/10 focus:text-primary justify-center"
                  >
                    Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export CSV Button */}
          {canExport && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 h-8 px-4 rounded-lg text-xs bg-card text-foreground border border-border hover:bg-muted transition-all"
            >
              <ExportIcon className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          )}
        </>
      </FinanceToolbar>

      <main>
        {!projectId ? (
          <EmptyState
            icon={Receipt}
            title="No project selected"
            description="Cost is recorded per project. Select a project to view its cost ledger."
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <AwesomeLoader message="Processing ledger data" />
          </div>
        ) : ledgerData.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={
              selectedCategories.length > 0
                ? 'No ledger entries match these filters'
                : 'No cost ledger entries yet'
            }
            description={
              selectedCategories.length > 0
                ? 'Try clearing the category filters — it may sit under another cost head.'
                : 'Entries are created when a variation is approved or a certificate issued.'
            }
            action={
              <button
                onClick={handleCreateNew}
                className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
              >
                Add an entry manually
              </button>
            }
          />
        ) : (
          <CostLedgerTable
            entries={ledgerData}
            onEditEntry={handleEditEntry}
            canEdit={canEdit}
            search={search}
          />
        )}
      </main>

      <CostLedgerDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId}
        editEntry={editingEntry}
      />
    </main>
  );
};

export default CostLadger;
