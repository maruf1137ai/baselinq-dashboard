import React, { useMemo } from 'react';
import type { ComplianceObligation } from '@/hooks/useCompliance';

type RiskLevel = 'HIGH' | 'MEDIUM' | 'PROTECTED';

interface RiskOverviewProps {
  obligations: ComplianceObligation[];
  onSelect: (obligation: ComplianceObligation) => void;
}

// Example usage: <RiskHeader level="HIGH" count={1} />
const RiskHeader = ({ level, count }: { level: RiskLevel; count: number }) => {
  let colorClass = '';
  switch (level) {
    case 'HIGH':
      colorClass = 'bg-red-50 text-red-700'; // light red background, dark red text, light border
      break;
    case 'MEDIUM':
      colorClass = 'bg-amber-50 text-amber-700 border border-amber-200'; // light yellow/orange
      break;
    case 'PROTECTED':
      colorClass = 'bg-green-50 text-green-700'; // light green
      break;
    default:
      colorClass = 'bg-muted text-gray-700 border-border';
  }

  return (
    <div className="flex items-center space-x-2 mt-6 mb-3">
      <span className={`inline-flex items-center px-2 py-1 text-xs  rounded-full  ${colorClass}`}>{level} RISK</span>
      <span className="text-muted-foreground text-xs">({count})</span>
    </div>
  );
};

// Example usage: <RiskItemCard obligation={item} onSelect={onSelect} />
const RiskItemCard = ({ obligation, onSelect }: { obligation: ComplianceObligation; onSelect: (obligation: ComplianceObligation) => void }) => {
  return (
    <div
      onClick={() => onSelect(obligation)}
      className="bg-card p-3 rounded-xl  border border-border mb-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <p className="text-sm  text-foreground">{obligation.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{obligation.documentReference}</p>
    </div>
  );
};

const RiskOverview: React.FC<RiskOverviewProps> = ({ obligations, onSelect }) => {
  const groupedItems = useMemo(() => {
    const groups: Record<RiskLevel, ComplianceObligation[]> = { HIGH: [], MEDIUM: [], PROTECTED: [] };
    for (const item of obligations) {
      if (item.isOverdue) {
        groups.HIGH.push(item);
      } else if (item.status === 'Completed') {
        groups.PROTECTED.push(item);
      } else if (item.daysUntilDue !== null && item.daysUntilDue <= 7) {
        groups.MEDIUM.push(item);
      }
    }
    return groups;
  }, [obligations]);

  const riskLevels: RiskLevel[] = ['HIGH', 'MEDIUM', 'PROTECTED'];
  const hasAnyRisk = riskLevels.some((level) => groupedItems[level].length > 0);

  return (
    <div className="">
      <h1 className="text-sm font-medium text-foreground mb-6">Risk Overview</h1>

      {!hasAnyRisk && (
        <p className="text-sm text-muted-foreground">No compliance risks right now.</p>
      )}

      {riskLevels.map(level => {
        const items = groupedItems[level];
        if (items.length === 0) return null; // Skip if no items for this level

        return (
          <div key={level}>
            {/* Render the Header */}
            <RiskHeader level={level} count={items.length} />

            {/* Render the Cards for this level */}
            {items.map(item => (
              <RiskItemCard key={item._id} obligation={item} onSelect={onSelect} />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default RiskOverview;
