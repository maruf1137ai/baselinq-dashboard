import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, User, Users } from 'lucide-react';

// Werner rev H — full set of contractual doc types per the spec.
// GI / IC / DC (display: Claim) were missing from the original filter
// bar, which caused them to be excluded from the board view by default.
const DOC_TYPES = ['All', 'VO', 'RFI', 'SI', 'GI', 'IC', 'DC', 'CPI'] as const;

const DOC_TYPE_LABEL: Record<string, string> = {
  // DC is the backend code for delay claim; Werner labels it as "Claim"
  // on the UI side. Other types display by their three-letter code.
  DC: 'Claim',
};

const DOC_TYPE_COLOR = { active: 'bg-primary/10 text-primary border-primary', inactive: 'bg-white text-foreground border-border hover:bg-zinc-50' };
const DOC_TYPE_COLORS: Record<string, { active: string; inactive: string }> = {
  All: DOC_TYPE_COLOR,
  VO: DOC_TYPE_COLOR,
  RFI: DOC_TYPE_COLOR,
  SI: DOC_TYPE_COLOR,
  GI: DOC_TYPE_COLOR,
  IC: DOC_TYPE_COLOR,
  DC: DOC_TYPE_COLOR,
  CPI: DOC_TYPE_COLOR,
};

export interface TaskFilters {
  docTypes: string[];
  assignee: string;
  dateRange: string;
  myItems: boolean;
}

export const defaultFilters: TaskFilters = {
  docTypes: ['VO', 'RFI', 'SI', 'GI', 'IC', 'DC', 'CPI'],
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
  const actualDocTypes = DOC_TYPES.filter(t => t !== 'All');

  const allSelected = filters.docTypes.length === actualDocTypes.length;

  const toggleDocType = (type: string) => {
    if (type === 'All') {
      // Select all
      onFiltersChange({ ...filters, docTypes: [...actualDocTypes] });
      return;
    }
    // Toggle individual — if currently showing all, switch to just this one
    if (allSelected) {
      onFiltersChange({ ...filters, docTypes: [type] });
      return;
    }
    const current = filters.docTypes;
    if (current.includes(type)) {
      // Deselecting — if only one left, go back to all
      const updated = current.filter(t => t !== type);
      if (updated.length === 0) {
        onFiltersChange({ ...filters, docTypes: [...actualDocTypes] });
      } else {
        onFiltersChange({ ...filters, docTypes: updated });
      }
    } else {
      const updated = [...current, type];
      onFiltersChange({ ...filters, docTypes: updated });
    }
  };

  const hasActiveFilters =
    filters.docTypes.length !== actualDocTypes.length ||
    filters.assignee !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.myItems;

  return (
    <div className="flex items-center justify-between w-full gap-4 pb-6">
      <div className="flex items-center gap-4 flex-wrap">
        {/* My Items / All Items toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <button
            onClick={() => onFiltersChange({ ...filters, myItems: true })}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs transition-colors ${filters.myItems
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <User className="h-3.5 w-3.5" />
            My Tasks
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, myItems: false })}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs transition-colors ${!filters.myItems
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Users className="h-3.5 w-3.5" />
            All Tasks
          </button>
        </div>

        {/* Document type chips */}
        <div className="flex items-center gap-1.5">
          {DOC_TYPES.map(type => {
            const isActive = type === 'All' ? allSelected : (!allSelected && filters.docTypes.includes(type));
            const colors = DOC_TYPE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => toggleDocType(type)}
                className={`px-3 h-8 rounded-lg text-xs border transition-colors ${isActive ? colors.active : colors.inactive
                  }`}
              >
                {DOC_TYPE_LABEL[type] || type}
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
          <SelectTrigger className="w-[150px] h-8 text-xs border-border bg-white rounded-lg">
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
          <SelectTrigger className="w-[140px] h-8 text-xs border-border bg-white rounded-lg">
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
