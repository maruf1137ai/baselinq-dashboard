import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, Lock } from 'lucide-react';
import AiIcon from '@/components/icons/AiIcon';
import { cn } from '@/lib/utils';
import { mockDocuments } from '@/data/mockDocuments';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  breakdown?: string;
  badge?: {
    text: string;
    variant: 'default' | 'destructive' | 'success' | 'warning';
  };
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  breakdown,
  badge,
  icon,
  onClick,
  className,
}) => {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-0 bg-sidebar rounded-xl shadow-none overflow-hidden group",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5 text-gray2 text-sm">
            {icon}
            <span>{title}</span>
          </div>
          {badge && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-normal px-2 py-0.5",
                badge.variant === 'warning' && "bg-orange-50 text-orange-700 border-orange-200",
                badge.variant === 'destructive' && "bg-red-50 text-red-700 border-red-200",
                badge.variant === 'success' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                badge.variant === 'default' && "bg-gray-100 text-gray-700 border-gray-200"
              )}
            >
              {badge.text}
            </Badge>
          )}
        </div>

        <div className="bg-white p-4 rounded-md">
          <div className="flex flex-col">
            <h3 className={cn(
              "text-3xl font-normal",
              title.includes("AI Flags") && "text-amber-500",
              title.includes("Overdue") && "text-red-500",
              !title.includes("AI Flags") && !title.includes("Overdue") && "text-foreground"
            )}>
              {value}
            </h3>
            <p className="text-sm text-gray2 mt-1">{subtitle}</p>
            {breakdown && (
              <p className="text-xs text-gray-400 mt-2 font-normal leading-tight">
                {breakdown}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const DocumentSummaryCards: React.FC = () => {
  // Compute stats from shared mock data
  const total = mockDocuments.length;

  // Type breakdown
  const typeCounts = mockDocuments.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});
  const uniqueCategories = Object.keys(typeCounts).length;
  const breakdownParts = Object.entries(typeCounts).map(([type, count]) =>
    `${count} ${count > 1 ? type + 's' : type}`
  );

  // AI flags
  const flaggedDocs = mockDocuments.filter(d => d.aiFlags > 0 && d.aiStatus === 'complete');
  const totalFlags = flaggedDocs.reduce((sum, d) => sum + d.aiFlags, 0);
  const highFlags = mockDocuments.filter(d => d.aiSeverity === 'high' && d.aiStatus === 'complete').reduce((sum, d) => sum + d.aiFlags, 0);
  const mediumFlags = mockDocuments.filter(d => d.aiSeverity === 'medium' && d.aiStatus === 'complete').reduce((sum, d) => sum + d.aiFlags, 0);

  // Finance gated
  const gatedDocs = mockDocuments.filter(d => d.isGated);
  const gatedDoc = gatedDocs[0];

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-6">
      <SummaryCard
        title="Total Docs"
        value={String(total)}
        subtitle={`${total} documents across ${uniqueCategories} categories`}
        breakdown={breakdownParts.join(' · ')}
        icon={<FileText className="w-4 h-4" />}
      />
      <SummaryCard
        title="With AI Flags"
        value={String(totalFlags)}
        subtitle={`${highFlags} high · ${mediumFlags} medium`}
        badge={{ text: `${flaggedDocs.length} flagged`, variant: 'warning' }}
        icon={<AiIcon size={16} className="text-amber-500" />}
      />
      <SummaryCard
        title="Overdue Obligations"
        value="2"
        subtitle="Next due: March 15"
        badge={{ text: "2 Overdue", variant: 'destructive' }}
        icon={<AlertCircle className="w-4 h-4 text-red-500" />}
      />
      <SummaryCard
        title="Finance Gated"
        value={String(gatedDocs.length)}
        subtitle={`${gatedDocs.length} document${gatedDocs.length !== 1 ? 's' : ''} blocked`}
        breakdown={gatedDoc ? `${gatedDoc.reference}, awaiting TCC` : undefined}
        icon={<Lock className="w-4 h-4 text-amber-500" />}
        className="border-l-4 border-amber-400"
      />
    </div>
  );
};
