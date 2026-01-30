import React from "react";
import { Button } from "../ui/button";
import Star from "../icons/star";
import AiRoutingBuilderDrawer from "./AiRoutingBuilder";

export enum OrderStatus {
  Active = "Active",
  Pending = "Pending",
  Inactive = "Inactive",
}

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs rounded-full inline-block";
  if (status === OrderStatus.Active) {
    return (
      <span
        className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]`}>
        {status}
      </span>
    );
  }
  if (status === OrderStatus.Inactive) {
    return (
      <span className={`${baseClasses} bg-[#F3F4F6] text-[#6B7280]`}>
        {status}
      </span>
    );
  }
  return (
    <span
      className={`${baseClasses} bg-[#FFF7ED] text-[#F59E0B] border border-[#FED7AA]`}>
      {status}
    </span>
  );
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
    id: 1,
    title: "Budget Alert",
    badge: "Active",
    IF: "Variation > R100,000",
    then: "Notify Quantity Surveyor + PM",
  },
  {
    id: 1,
    title: "Compliance Trigger",
    badge: "Inactive",
    IF: "JBCC clause violation detected",
    then: "Create task for Compliance Manager",
  },
];

const AiRouting = () => {
  return (
    <div className="routing space-y-4">
      <div className="top flex items-center gap-2.5">
        <input
          type="text"
          className="py-2 px-6 text-base text-[rgba(26,26,26,0.5)] border border-border_color bg-white rounded-[10px] w-full"
          placeholder="Search team members"
        />
        <AiRoutingBuilderDrawer />
      </div>

      <div className="items">
        {data?.map(({ id, title, badge, IF, then }) => (
          <div
            className="item border border-border_color rounded-[14px] mt-4"
            key={id}>
            <div className="p-6 flex gap-3">
              <div className="w-full">
                <div className="title flex items-center gap-4 justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Star />
                    <div className="flex items-center gap-4 text-base text-[#1A1A1A]">
                      {title}
                    </div>
                    <StatusBadge status={badge} />
                  </div>
                  <Button className="bg-transparent text-[#6B7280] border border-border_color hover:border-primary transition-all mt-4 hover:bg-primary hover:text-white">
                    Disable
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-5 mt-2">
                  <div className="item">
                    <div className="text-sm text-[#717784] mb-1">IF</div>
                    <div className="text-base text-[#1A1A1A]">{IF}</div>
                  </div>
                  <div className="item">
                    <div className="text-sm text-[#717784] mb-1">THEN</div>
                    <div className="text-base text-[#1A1A1A]">{then}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiRouting;
