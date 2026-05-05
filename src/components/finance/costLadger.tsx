import React, { useState, useMemo, useCallback } from 'react';
import { ProjectStatusCard } from '../ProjectStatusCard';

import CostLedgerTable from './costLadgerTable';
import { ExternalLinkIcon, FilterIcon, ExportIcon, ChevronDownIcon } from '../icons/icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { ViewFeesDrawer } from './viewFessDrwaer';
import { CostLedgerDrawer } from './costLedgerDrawer';
import CashIcon from '../icons/CashIcon';
import useFetch from '@/hooks/useFetch';
import { PlusIcon } from 'lucide-react';
import { deleteData } from '@/lib/Api';
import { toast } from 'sonner';
import { useUserRoleStore } from '@/store/useUserRoleStore';
import { AwesomeLoader } from '../commons/AwesomeLoader';
import { resolvePermissionCode, NEW_ROLE_DISPLAY_TO_CODE } from '@/lib/roleUtils';
import { usePermission } from '@/hooks/usePermission';

// Roles allowed to update/edit cost ledger entries (mirrors backend COST_LEDGER_UPDATE_ALLOWED_ROLES)
const COST_LEDGER_EDIT_ROLES = new Set(["CQS", "CONTRACTS_MGR", "CPM", "CLIENT"]);

// Maps common display names / legacy strings → role code, mirroring backend get_user_project_role_code
const ROLE_NAME_TO_CODE: Record<string, string> = {
  // Backbone codes pass through
  "CQS": "CQS",
  "CONTRACTS_MGR": "CONTRACTS_MGR",
  "CPM": "CPM",
  "CLIENT": "CLIENT",
  "CLIENT/OWNER": "CLIENT",
  "PM": "PM",
  "CM": "CM",
  "ARCH": "ARCH",
  // Legacy display names → backbone codes
  "Consultant Quantity Surveyor": "CQS",
  "Contracts Manager": "CONTRACTS_MGR",
  "Client Project Manager": "CPM",
  "Client": "CLIENT",
  "Owner": "CLIENT",
  "Client / Owner": "CLIENT",
  "Client/Owner": "CLIENT",
  "CLIENT / OWNER": "CLIENT",
  "Project Manager": "PM",
  "Construction Manager": "CM",
  "Architect": "ARCH",
  // New role codes → backbone
  "ADMIN": "CLIENT",
  "PROJECT_ADMIN": "CPM",
  "SUPER_USER": "CPM",
  "QS": "CQS",
  "LEGAL": "CONTRACTS_MGR",
  // New display names → backbone
  "Administrator": "CLIENT",
  "Project Administrator": "CPM",
  "Super User": "CPM",
  "Quantity Surveyor": "CQS",
  "Legal": "CONTRACTS_MGR",
};

/**
 * Resolve a raw roleName string (which may be a display name, code, or compound
 * like "Client / Owner") to a set of uppercase role codes for comparison.
 * Also applies backbone resolution for new role codes.
 */
function resolveRoleCodes(roleName: string): string[] {
  if (!roleName) return [];
  const parts = roleName.split(/\s*\/\s*/);
  const codes: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    // Direct ROLE_NAME_TO_CODE lookup
    let code = ROLE_NAME_TO_CODE[trimmed] || ROLE_NAME_TO_CODE[trimmed.toUpperCase()] || trimmed.toUpperCase();
    // Display name → new code → backbone
    if (!ROLE_NAME_TO_CODE[trimmed]) {
      const newCode = NEW_ROLE_DISPLAY_TO_CODE[trimmed];
      if (newCode) code = resolvePermissionCode(newCode);
      else code = resolvePermissionCode(code);
    }
    codes.push(code);
  }
  return codes;
}

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

interface LedgerListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LedgerApiEntry[];
}

interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  netPosition: number;
  currency: string;
}



import { formatZAR } from '@/lib/formatCurrency';

const formatSummary = (value: number) => formatZAR(value);

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
  const { userRole } = useUserRoleStore();

  // Use permission matrix instead of hardcoded true
  const projectIdNum = parseInt(projectId) || null;
  const canEdit = usePermission("finance.edit", projectIdNum);
  const canCreate = usePermission("finance.edit", projectIdNum);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

  const listUrl = projectId
    ? `cost-ledger/?project_id=${projectId}`
    : '';

  const { data: listData, isLoading, refetch } = useFetch<LedgerListResponse>(listUrl);

  const { data: summaryData, refetch: refetchSummary } = useFetch<LedgerSummary>(
    projectId ? `cost-ledger/summary/?project_id=${projectId}` : '',
  );

  const { data: projectData } = useFetch<{ name: string; totalBudget: number }>(
    projectId ? `projects/${projectId}/` : '',
  );

  const feeData = useMemo(() => {
    const totalBudget = projectData?.totalBudget ?? 0;
    const spent = summaryData?.totalDebits ?? 0;
    const credits = summaryData?.totalCredits ?? 0;
    const available = totalBudget - spent;
    const progress = totalBudget > 0 ? ((spent / totalBudget) * 100).toFixed(1) : '0';
    return {
      project: projectData?.name ?? '—',
      to_date: formatSummary(spent),
      cap: formatSummary(totalBudget),
      progress,
      view_billing_ledger: true,
      financial_summary: {
        available: formatSummary(available),
        pending: formatSummary(0),
        committed: formatSummary(spent),
        spent: formatSummary(spent),
        total: formatSummary(credits),
      },
    };
  }, [projectData, summaryData]);

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

  const handleDeleteEntry = useCallback(
    async (id: number) => {
      if (!projectId) return;
      try {
        await deleteData({ url: `cost-ledger/${id}/`, data: undefined });
        toast.success('Entry deleted');
        refetch();
        refetchSummary();
      } catch (err) {
        toast.error('Failed to delete entry');
        console.error(err);
      }
    },
    [projectId, refetch, refetchSummary],
  );

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
    <main className="pt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProjectStatusCard
          icon={<CashIcon />}
          title="Total Debits"
          value={summaryData ? formatSummary(summaryData.totalDebits) : '—'}
          badgeText=""
          badgeVariant="default"
          actionText=""
        />
        <ProjectStatusCard
          icon={<CashIcon />}
          title="Total Credits"
          value={summaryData ? formatSummary(summaryData.totalCredits) : '—'}
          badgeText=""
          badgeVariant="default"
          actionText=""
        />
        <ProjectStatusCard
          icon={<CashIcon />}
          title="Net Position"
          value={summaryData ? formatSummary(summaryData.netPosition) : '—'}
          badgeText=""
          badgeVariant="default"
          actionText=""
          valueClassName={summaryData?.netPosition != null && summaryData.netPosition < 0 ? 'text-red-600' : ''}
          className={summaryData?.netPosition != null && summaryData.netPosition < 0 ? 'border border-red-200' : ''}
        />
      </div>

      <header className="flex flex-col sm:flex-row justify-between sm:items-center mt-6 mb-6">

        <div className="flex items-center space-x-2">
          {/* New Entry Button — visible to all project members */}
          {canCreate && (
            <button
              className="flex items-center space-x-2 h-10 px-4 rounded-lg text-sm text-white bg-primary hover:opacity-90 transition-all"
              onClick={handleCreateNew}
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          )}

          {/* View Fees Button */}
          <button
            className="flex items-center space-x-2 h-8 px-4 rounded-lg text-xs bg-white text-foreground border border-border hover:bg-muted transition-all"
            onClick={() => setIsDrawerOpen(true)}
          >
            <ExternalLinkIcon className="w-4 h-4" />
            <span>Fee Schedule</span>
          </button>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center space-x-2 h-8 px-4 rounded-lg text-xs transition-all border ${activeFilterCount > 0
                  ? 'bg-white text-foreground border-foreground'
                  : 'bg-white text-foreground border-border hover:bg-muted'
                  }`}
              >
                <FilterIcon className="w-4 h-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="bg-foreground text-white text-xs font-medium ml-1 px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
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
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 h-8 px-4 rounded-lg text-xs bg-white text-foreground border border-border hover:bg-muted transition-all"
          >
            <ExportIcon className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      <main>
        {!projectId ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
            <p>Select a project to view the cost ledger.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <AwesomeLoader message="Processing Ledger Data" />
          </div>
        ) : ledgerData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm rounded-lg border border-border bg-muted/50">
            <p className="font-medium text-foreground">No cost ledger entries</p>
            <p className="mt-1 text-center max-w-md mx-auto">
              {selectedCategories.length > 0
                ? 'No entries match the current filter.'
                : 'Entries appear when Variation Orders are approved or Payment Certificates are created. You can also manually add entries.'}
            </p>
            <button
              onClick={handleCreateNew}
              className="mt-4 text-primary hover:text-primary font-medium text-sm transition-colors"
            >
              Add your first entry
            </button>
          </div>
        ) : (
          <CostLedgerTable
            entries={ledgerData}
            onEditEntry={handleEditEntry}
            canEdit={canEdit}
          />
        )}
      </main>

      <ViewFeesDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} data={feeData} />

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
