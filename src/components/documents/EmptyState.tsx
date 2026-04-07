import React from 'react';
import { Upload, FileSearch, FilterX, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AiIcon from '@/components/icons/AiIcon';

interface EmptyStateProps {
  type: 'no-docs' | 'no-results';
  onAction?: () => void;
  onClearFilters?: () => void;
}

export const DocumentEmptyState: React.FC<EmptyStateProps> = ({ type, onAction, onClearFilters }) => {
  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-full border border-gray-100 mt-6">
        <div className="flex flex-col items-center text-center max-w-sm px-4">
          <div className="h-20 w-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
            <FilterX className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-normal text-foreground mb-2">No results found</h3>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            We couldn't find any documents matching your current filters. Try adjusting your search term or criteria.
          </p>
          <div className="flex flex-col w-full gap-3">
            <Button variant="outline" className="font-normal h-12 border-gray-200" onClick={onClearFilters}>
              Clear all filters
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-full border border-gray-100 mt-6 shadow-sm">
      <div className="flex flex-col items-center text-center max-w-sm px-4">
        <div className="h-20 w-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 animate-bounce duration-[3000ms]">
          <Upload className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-normal text-foreground mb-2">No documents yet</h3>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Get started by uploading your project contracts, drawings, or specifications. We'll automatically analyze them with AI.
        </p>
        <Button className="w-full font-normal h-12 shadow-lg shadow-primary/20 rounded-xl" onClick={onAction}>
          <Upload className="h-4 w-4 mr-2" /> Upload First Document
        </Button>
      </div>

      <div className="mt-12 flex gap-8">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-2">
            <AiIcon size={20} />
          </div>
          <span className="text-xs font-normal text-gray-400 uppercase tracking-widest">AI Analysis</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-2">
            <Link2 className="h-5 w-5" />
          </div>
          <span className="text-xs font-normal text-gray-400 uppercase tracking-widest">Linking</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-2">
            <FileSearch className="h-5 w-5" />
          </div>
          <span className="text-xs font-normal text-gray-400 uppercase tracking-widest">Compliance</span>
        </div>
      </div>
    </div>
  );
};
