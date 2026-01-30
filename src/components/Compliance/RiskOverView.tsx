import React from 'react';

const riskItems = [
  {
    id: 'COMP-001',
    name: 'Client Approval for VO-001',
    risk: 'HIGH',
  },
  {
    id: 'COMP-002',
    name: 'Environmental Permit',
    risk: 'MEDIUM',
  },
  {
    id: 'COMP-003',
    name: 'Extension Request',
    risk: 'MEDIUM',
  },
  {
    id: 'COMP-004',
    name: 'HSE Induction',
    risk: 'PROTECTED',
  },
];

// Example usage: <RiskHeader level="HIGH" count={1} />
const RiskHeader = ({ level, count }) => {
  let colorClass = '';
  switch (level) {
    case 'HIGH':
      colorClass = 'bg-[#FEE2E2] text-[#DC2626] '; // light red background, dark red text, light border
      break;
    case 'MEDIUM':
      colorClass = 'bg-[#FFF7ED] text-[#FF8C00] border border-[#FED7AA]'; // light yellow/orange
      break;
    case 'PROTECTED':
      colorClass = 'bg-[#E9F7EC] text-[#10B981] '; // light green
      break;
    default:
      colorClass = 'bg-gray-100 text-gray-700 border-gray-200';
  }

  return (
    <div className="flex items-center space-x-2 mt-6 mb-[11px]">
      <span className={`inline-flex items-center px-2 py-1 text-xs  rounded-[28px]  ${colorClass}`}>{level} RISK</span>
      <span className="text-[#717784] text-xs">({count})</span>
    </div>
  );
};

// Example usage: <RiskItemCard name="Client Approval for VO-001" id="COMP-001" />
const RiskItemCard = ({ name, id }) => {
  return (
    <div className="bg-white p-[13px] rounded-[10px]  border border-gray-100 mb-4 cursor-pointer hover:shadow-md transition-shadow">
      <p className="text-sm  text-[#1A1A1A]">{name}</p>
      <p className="text-xs text-[#717784] mt-1">{id}</p>
    </div>
  );
};

// Assuming riskItems is defined as above
const RiskOverview = () => {
  // 1. Group the items by risk level
  const groupedItems = riskItems.reduce((acc, item) => {
    acc[item.risk] = acc[item.risk] || [];
    acc[item.risk].push(item);
    return acc;
  }, {});

  // Define the order of appearance
  const riskLevels = ['HIGH', 'MEDIUM', 'PROTECTED'];

  return (
    <div className="">
      <h1 className="text-base  text-[#1A1A1A] mb-6">Risk Overview</h1>

      {riskLevels.map(level => {
        const items = groupedItems[level] || [];
        if (items.length === 0) return null; // Skip if no items for this level

        return (
          <div key={level}>
            {/* 2. Render the Header */}
            <RiskHeader level={level} count={items.length} />

            {/* 3. Render the Cards for this level */}
            {items.map(item => (
              <RiskItemCard key={item.id} name={item.name} id={item.id} />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default RiskOverview;
