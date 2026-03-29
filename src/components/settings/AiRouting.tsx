import React from "react";
import { Button } from "../ui/button";
import { Sparkles } from "lucide-react";
import AiRoutingBuilderDrawer from "./AiRoutingBuilder";

const StatusBadge = ({ status }: { status: string }) => {
  const base = "px-2 py-0.5 text-xs rounded-full border-0";
  if (status === "Active") return <span className={`${base} bg-green-50 text-green-700`}>{status}</span>;
  if (status === "Inactive") return <span className={`${base} bg-muted text-muted-foreground`}>{status}</span>;
  return <span className={`${base} bg-amber-50 text-amber-700`}>{status}</span>;
};

const data = [
  {
    id: 1,
    title: "Auto-assign RFI",
    badge: "Active",
    IF: 'Document includes "Permit"',
    then: "Auto-assign to Site Manager",
  },
  {
    id: 2,
    title: "Budget Alert",
    badge: "Active",
    IF: "Variation > R100,000",
    then: "Notify Quantity Surveyor + PM",
  },
  {
    id: 3,
    title: "Compliance Trigger",
    badge: "Inactive",
    IF: "JBCC clause violation detected",
    then: "Create task for Compliance Manager",
  },
];

const AiRouting = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="h-10 px-4 text-sm text-foreground border border-border bg-white rounded-lg w-full placeholder:text-muted-foreground"
          placeholder="Search rules..."
        />
        <AiRoutingBuilderDrawer />
      </div>

      {data.map(({ id, title, badge, IF, then }) => (
        <div key={id} className="border border-border rounded-lg bg-white overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{title}</span>
              <StatusBadge status={badge} />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg border-border text-muted-foreground">
              {badge === "Active" ? "Disable" : "Enable"}
            </Button>
          </div>
          {/* Rule */}
          <div className="px-4 py-3 flex gap-8">
            <div>
              <span className="text-xs text-muted-foreground">IF</span>
              <p className="text-sm text-foreground">{IF}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">THEN</span>
              <p className="text-sm text-foreground">{then}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AiRouting;
