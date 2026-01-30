import React, { useState, useCallback, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "../ui/dropdown-menu";

import { FilterIcon, ChevronDownIcon } from "../icons/icons";

// Your enum can be imported or redefined here
export enum Category {
  Electrical = "Electrical",
  Structure = "Structure",
  Plumbing = "Plumbing",
  Concrete = "Concrete",
  HVAC = "HVAC",
}

const allCategories = Object.values(Category);

const FilterBtns = () => {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const handleToggleCategory = useCallback((category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const activeFilterCount = selectedCategories.length;

  // Optional: use filtered data here if needed
  const filteredData = useMemo(() => {
    // Put your data inside this component if needed
    return selectedCategories;
  }, [selectedCategories]);

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all shadow-[0_0_0_1px_#CBD5E1] ${
              activeFilterCount > 0
                ? "bg-[rgba(87,87,87,0.02)] text-indigo-700 hover:bg-gray-50"
                : "bg-[rgba(87,87,87,0.02)] text-gray-700 hover:bg-gray-50"
            }`}>
            <FilterIcon className="w-4 h-4" />
            <span>Filter</span>

            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-semibold ml-1 px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}

            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-60" align="end">
          <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {allCategories.map((category) => (
            <DropdownMenuCheckboxItem
              key={category}
              checked={selectedCategories.includes(category)}
              onCheckedChange={() => handleToggleCategory(category)}>
              {category}
            </DropdownMenuCheckboxItem>
          ))}

          {activeFilterCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={clearFilters}
                className="text-indigo-600 focus:bg-indigo-50 focus:text-indigo-700 justify-center">
                Clear Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 🔹 Example: preview selected filters */}
      {/* <div className="mt-4 text-sm text-gray-600">
        Active Filters: {selectedCategories.join(", ") || "None"}
      </div> */}
    </div>
  );
};

export default FilterBtns;
