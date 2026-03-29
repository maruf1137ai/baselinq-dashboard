import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AiIcon from '@/components/icons/AiIcon';
import { cn } from '@/lib/utils';

interface AIAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

const findings = [
  { title: 'Inconsistent Payment Clause', severity: 'high' as const, code: 'JBCC 25.1', desc: 'Section 4 contradicts retention signed in MoU.' },
  { title: 'Missing Liability Provision', severity: 'high' as const, code: 'JBCC 12.4', desc: 'No clause found for contractor professional indemnity.' },
  { title: 'Ambiguous Notice Period', severity: 'medium' as const, code: 'JBCC 5.2', desc: 'Notice period defined as "reasonable time" without days.' },
  { title: 'Typo in Project Name', severity: 'low' as const, code: 'General', desc: 'Project name misspelled in footer of page 12.' },
];

const severityDotColor = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

const severityBadgeStyle = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-green-50 text-green-700',
};

export const AIAnalysisDrawer: React.FC<AIAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  if (!document) return null;

  const visibleFindings = findings.slice(0, document.aiFlags || 4);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[550px] p-0 flex flex-col border-border bg-white">
        <SheetHeader className="px-6 py-4 border-b border-border pr-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AiIcon size={16} className="text-primary" />
              <SheetTitle className="text-base font-normal text-foreground">AI Analysis</SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary font-normal hover:bg-muted gap-1.5"
            >
              <AiIcon size={14} /> Re-run Analysis
            </Button>
          </div>
          <p className="text-xs text-muted-foreground font-normal">{document.reference} · {document.name}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <p className="text-xs text-muted-foreground font-normal mb-4">
            {visibleFindings.length} findings
          </p>

          {visibleFindings.map((finding, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-border p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', severityDotColor[finding.severity])} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-normal text-foreground">{finding.title}</span>
                      <Badge variant="outline" className={cn('text-xs px-2 py-0.5 rounded-lg font-normal border-0', severityBadgeStyle[finding.severity])}>
                        {finding.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-normal">{finding.desc}</p>
                    <Badge className="bg-muted text-muted-foreground border border-border text-xs rounded-lg px-2 py-0.5 font-normal mt-1">
                      {finding.code}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary font-normal hover:bg-transparent hover:underline shrink-0"
                >
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
