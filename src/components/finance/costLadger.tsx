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

export enum Category {
  Electrical = 'Electrical',
  Structure = 'Structure',
  Plumbing = 'Plumbing',
  Concrete = 'Concrete',
  HVAC = 'HVAC',
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
  category: Category;
}

const initialLedgerData: LedgerEntry[] = [
  {
    id: 1,
    date: '01/09/25',
    supplier: 'ElectroWorks',
    supplierShort: 'Ltd',
    ref: 'INV-9021',
    period: 'Aug',
    net: 176781,
    total: 176781,
    linkedVO: 'VO-005',
    category: Category.Electrical,
  },
  {
    id: 2,
    date: '05/09/25',
    supplier: 'Steel Dynamics',
    supplierShort: 'SA',
    ref: 'INV-9021',
    period: 'Aug',
    net: 176781,
    total: 176781,
    linkedVO: 'VO-005',
    category: Category.Structure,
  },
  {
    id: 3,
    date: '12/09/25',
    supplier: 'PlumbTech',
    supplierShort: 'Solutions',
    ref: 'INV-9021',
    period: 'Sep',
    net: 176781,
    total: 176781,
    linkedVO: 'VO-005',
    category: Category.Plumbing,
  },
  {
    id: 4,
    date: '18/09/25',
    supplier: 'Concrete',
    supplierShort: 'Masters',
    ref: 'INV-9021',
    period: 'Sep',
    net: 176781,
    total: 176781,
    linkedVO: 'VO-005',
    category: Category.Concrete,
  },
  {
    id: 5,
    date: '25/09/25',
    supplier: 'HVAC Specialists',
    supplierShort: 'Inc',
    ref: 'INV-9021',
    period: 'Sep',
    net: 176781,
    total: 176781,
    linkedVO: 'VO-005',
    category: Category.HVAC,
  },
];

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

const CostLadger = () => {
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>(initialLedgerData);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleFilterChange = useCallback((category: Category) => {
    setSelectedCategories(prev => (prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]));
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const handleDeleteEntry = useCallback((id: number) => {
    setLedgerData(prevData => prevData.filter(entry => entry.id !== id));
  }, []);

  const filteredData = useMemo(() => {
    if (selectedCategories.length === 0) {
      return ledgerData;
    }
    return ledgerData.filter(entry => selectedCategories.includes(entry.category));
  }, [selectedCategories, ledgerData]);

  const exportToCSV = useCallback(() => {
    const headers = ['Date', 'Supplier', 'Ref', 'Period', 'Net', 'Total', 'Linked VO/PC', 'Category'];
    const csvRows = [
      headers.join(','),
      ...filteredData.map(row =>
        [
          `"${row.date}"`,
          `"${row.supplier} ${row.supplierShort || ''}"`.trim(),
          `"${row.ref}"`,
          `"${row.period}"`,
          row.net,
          row.total,
          `"${row.linkedVO}"`,
          `"${row.category}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'cost_ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredData]);

  const activeFilterCount = selectedCategories.length;

  return (
    <main className="p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProjectStatusCard icon={<CashIcon />} title="Total Debits" value="R 1,453,971" />
        <ProjectStatusCard icon={<CashIcon />} title="Total Credits" value="R 0" />
        <ProjectStatusCard icon={<CashIcon />} title="Net Position" value="R 1,453,971" />
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
                  <span className="bg-indigo-600 text-white text-xs font-semibold ml-1 px-2 py-0.5 rounded-full">{activeFilterCount}</span>
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
        <CostLedgerTable entries={filteredData} onDeleteEntry={handleDeleteEntry} />
      </main>

      <ViewFeesDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} data={feeData} />
    </main>
  );
};

export default CostLadger;
