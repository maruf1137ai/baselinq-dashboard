import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, User, Users } from 'lucide-react';

const DOC_TYPES = ['VO', 'RFI', 'SI', 'DC', 'CPI'] as const;

const DOC_TYPE_COLORS: Record<string, { active: string; inactive: string }> = {
  VO: { active: 'bg-gray-900 text-white border-gray-900', inactive: 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50' },
  RFI: { active: 'bg-gray-900 text-white border-gray-900', inactive: 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50' },
  SI: { active: 'bg-gray-900 text-white border-gray-900', inactive: 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50' },
  DC: { active: 'bg-gray-900 text-white border-gray-900', inactive: 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50' },
  CPI: { active: 'bg-gray-900 text-white border-gray-900', inactive: 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50' },
};

export interface TaskFilters {
  docTypes: string[];
  assignee: string;
  dateRange: string;
  myItems: boolean;
}

export const defaultFilters: TaskFilters = {
  docTypes: [],
  assignee: 'all',
  dateRange: 'all',
  myItems: true,
};

interface TaskFilterBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  assigneeOptions: { id: string; name: string }[];
}

export default function TaskFilterBar({ filters, onFiltersChange, assigneeOptions }: TaskFilterBarProps) {
  const toggleDocType = (type: string) => {
    const current = filters.docTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, docTypes: updated });
  };

  const hasActiveFilters =
    filters.docTypes.length > 0 ||
    filters.assignee !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.myItems;

  return (
    <div className="flex items-center justify-between w-full gap-4 pb-6">
      <div className="flex items-center gap-4 flex-wrap">
        {/* My Items / All Items toggle */}
        <div className="flex items-center bg-[#F2F3F5] rounded-lg p-0.5">
          <button
            onClick={() => onFiltersChange({ ...filters, myItems: false })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${!filters.myItems
              ? 'bg-white text-[#1A1A1A] shadow-sm'
              : 'text-[#717784] hover:text-[#1A1A1A]'
              }`}
          >
            <Users className="h-3.5 w-3.5" />
            All Items
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, myItems: true })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${filters.myItems
              ? 'bg-white text-[#1A1A1A] shadow-sm'
              : 'text-[#717784] hover:text-[#1A1A1A]'
              }`}
          >
            <User className="h-3.5 w-3.5" />
            My Items
          </button>
        </div>

        {/* Document type chips */}
        <div className="flex items-center gap-1.5">
          {DOC_TYPES.map(type => {
            const isActive = filters.docTypes.includes(type);
            const colors = DOC_TYPE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => toggleDocType(type)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${isActive ? colors.active : colors.inactive
                  }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Assignee filter */}
        <Select
          value={filters.assignee}
          onValueChange={val => onFiltersChange({ ...filters, assignee: val })}
        >
          <SelectTrigger className="w-[150px] h-9 text-xs border-[#E6E8EB] bg-white rounded-lg">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Assignees</SelectItem>
            {assigneeOptions.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range filter */}
        <Select
          value={filters.dateRange}
          onValueChange={val => onFiltersChange({ ...filters, dateRange: val })}
        >
          <SelectTrigger className="w-[140px] h-9 text-xs border-[#E6E8EB] bg-white rounded-lg">
            <SelectValue placeholder="Due Date" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Due Today</SelectItem>
            <SelectItem value="this_week">Due This Week</SelectItem>
            <SelectItem value="this_month">Due This Month</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => onFiltersChange(defaultFilters)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-[#717784] hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
