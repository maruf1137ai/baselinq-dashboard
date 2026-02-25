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
import CashIcon from '../icons/CashIcon';
import useFetch from '@/hooks/useFetch';

export enum Category {
  Electrical = 'Electrical',
  Structure = 'Structure',
  Plumbing = 'Plumbing',
  Concrete = 'Concrete',
  HVAC = 'HVAC',
  Other = 'Other',
}

export interface LedgerEntry {
  id: number;
  date: string;
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

const feeData = {
  project: 'Baselinq Fees',
  to_date: 'R 23,989',
  cap: 'R 250,000',
  progress: '9.6',
  view_billing_ledger: true,
  financial_summary: {
    available: 'R 226,011',
    pending: 'R 0',
    committed: 'R 0',
    spent: 'R 23,989',
    total: 'R 250,000',
  },
};

const allCategories = Object.values(Category);

const formatSummary = (value: number) =>
  `R ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

const CostLadger = () => {
  const projectId = localStorage.getItem('selectedProjectId') || '';
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: listData, isLoading } = useFetch<LedgerListResponse>(
    projectId ? `cost-ledger/?project_id=${projectId}` : '',
  );

  const { data: summaryData } = useFetch<LedgerSummary>(
    projectId ? `cost-ledger/summary/?project_id=${projectId}` : '',
  );

  const ledgerData: LedgerEntry[] = useMemo(() => {
    if (!listData?.results) return [];
    return listData.results.map((entry) => ({
      ...entry,
      category: entry.category as Category,
    }));
  }, [listData]);

  const handleFilterChange = useCallback((category: Category) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const handleDeleteEntry = useCallback((_id: number) => {
    // TODO: call DELETE /api/cost-ledger/{id}/ and refetch
  }, []);

  const filteredData = useMemo(() => {
    if (selectedCategories.length === 0) return ledgerData;
    return ledgerData.filter(entry => selectedCategories.includes(entry.category));
  }, [selectedCategories, ledgerData]);

  const exportToCSV = useCallback(() => {
    const headers = ['Date', 'Supplier', 'Ref', 'Period', 'Net', 'Total', 'Linked VO/PC', 'Category'];
    const csvRows = [
      headers.join(','),
      ...filteredData.map(row =>
        [
          `"${row.date}"`,
          `"${row.supplier}"`,
          `"${row.ref}"`,
          `"${row.period}"`,
          row.net,
          row.total,
          `"${row.linkedVOOrPC}"`,
          `"${row.category}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'cost_ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredData]);

  const activeFilterCount = selectedCategories.length;

  return (
    <main className="p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProjectStatusCard
          icon={<CashIcon />}
          title="Total Debits"
          value={summaryData ? formatSummary(summaryData.totalDebits) : '—'}
        />
        <ProjectStatusCard
          icon={<CashIcon />}
          title="Total Credits"
          value={summaryData ? formatSummary(summaryData.totalCredits) : '—'}
        />
        <ProjectStatusCard
          icon={<CashIcon />}
          title="Net Position"
          value={summaryData ? formatSummary(summaryData.netPosition) : '—'}
        />
      </div>

      <header className="flex flex-col sm:flex-row justify-between sm:items-center mt-10 mb-6">
        <h1 className="text-base text-[#0E1C2E]">Cost Ledger</h1>
        <div className="flex items-center space-x-2">
          {/* View Fees Button */}
          <button
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm text-black bg-[rgba(87,87,87,0.02)] hover:bg-gray-50 transition-all shadow-[0_0_0_1px_#CBD5E1]"
            onClick={() => setIsDrawerOpen(true)}
          >
            <ExternalLinkIcon className="w-4 h-4" />
            <span>View Fees</span>
          </button>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all shadow-[0_0_0_1px_#CBD5E1] ${
                  activeFilterCount > 0
                    ? 'bg-[rgba(87,87,87,0.02)] text-indigo-700 hover:bg-gray-50'
                    : 'bg-[rgba(87,87,87,0.02)] text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FilterIcon className="w-4 h-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs font-medium ml-1 px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allCategories.map(category => (
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
                    className="text-indigo-600 focus:bg-indigo-50 focus:text-indigo-700 justify-center"
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
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm text-black bg-[rgba(87,87,87,0.02)] hover:bg-gray-50 transition-all shadow-[0_0_0_1px_#CBD5E1]"
          >
            <ExportIcon className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      <main>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            Loading...
          </div>
        ) : (
          <CostLedgerTable entries={filteredData} onDeleteEntry={handleDeleteEntry} />
        )}
      </main>

      <ViewFeesDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} data={feeData} />
    </main>
  );
};

export default CostLadger;
