import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

export const DocumentFilters: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Document Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 gap-1 text-xs font-normal border-border bg-white rounded-lg">
              Document Type <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Filter by Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>All</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Contract</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Drawing</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Specification</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Report</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Certificate</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Discipline Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 gap-1 text-xs font-normal border-border bg-white rounded-lg">
              Discipline <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Filter by Discipline</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>All</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Architectural</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Structural</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>MEP</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Civil</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Environmental</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* AI Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 gap-1 text-xs font-normal border-border bg-white rounded-lg">
              AI Status <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Filter by AI Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>All</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Has Flags</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>No Flags</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Analysis Pending</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 gap-1 text-xs font-normal border-border bg-white rounded-lg">
              Status <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>All</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Active</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Finance Gated</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Archived</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-[1px] bg-gray-200 mx-2 hidden lg:block"></div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-1 text-xs font-normal">
              Sort by: <span className="font-normal text-black">Recently Updated</span> <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Name A-Z</DropdownMenuItem>
            <DropdownMenuItem>Reference</DropdownMenuItem>
            <DropdownMenuItem>Most Linked</DropdownMenuItem>
            <DropdownMenuItem>Most AI Flags</DropdownMenuItem>
            <DropdownMenuItem>Oldest First</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative w-full md:w-[320px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-10 py-[9px] border-border rounded-xl bg-white text-sm h-[40px] focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
        />
      </div>
    </div>
  );
};
