import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DocumentVersionOption {
  _id: string;
  versionNumber: number;
  isCurrent: boolean;
}

interface DocumentVersionSelectProps {
  versions: DocumentVersionOption[];
  value: string | null;
  onChange: (versionId: string) => void;
}

export const DocumentVersionSelect: React.FC<DocumentVersionSelectProps> = ({ versions, value, onChange }) => {
  if (versions.length <= 1) return null;

  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className="w-[110px] h-8 text-xs border-border bg-card rounded-lg">
        <SelectValue placeholder="Version" />
      </SelectTrigger>
      <SelectContent className="bg-card">
        {versions.map((v) => (
          <SelectItem key={v._id} value={v._id}>
            v{v.versionNumber}{v.isCurrent ? ' (Current)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
