import { Calendar } from "lucide-react";
import React from "react";

const badgesData = [
  {
    id: 1,
    color: "#F06161",
    title: "Critical Path Tasks",
  },
  {
    id: 2,
    color: "#FFB547",
    title: "Unresolved Compliance",
  },
  {
    id: 3,
    color: "#9CA3AF",
    title: "Baseline",
  },
  {
    id: 4,
    color: "#8081F6",
    title: "Forecast",
  },
];

const Timeline = () => {
  return (
    <>
      <div className="p-6 border border-border_color rounded-[14px] mb-0">
        <div className="text-base text-[#1A1A1A] mb-4">Timeline Legend</div>
        <div className="badges flex items-center gap-6">
          {badgesData?.map(({ id, title, color }) => (
            <div className="badge flex items-center gap-2" key={id}>
              <div
                className={`h-4 w-4 rounded-[4px] ${`bg-[${color}]`}`}
                style={{ backgroundColor: color }}></div>
              <div className="text-[#717784] text-sm">{title}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 border border-border_color rounded-[14px] mt-6">
        <div className="flex justify-center items-center flex-col">
          <div className="icon h-16 w-16 rounded-full bg-[#FAFAFA] flex items-center justify-center">
            <Calendar />
          </div>
          <p className="text-base text-[#1A1A1A] mt-4">Gantt Timeline View</p>
          <p className="text-base mt-2.5 text-[#717784] text-center">
            Interactive Gantt chart will display here showing all milestones,
            tasks, and dependencies with critical path highlighting.
          </p>

          <div className="border-2 border-dashed border-border_color h-[88px] max-w-[639px] w-full bg-[#FAFAFA] rounded-[10px] mt-7"></div>
        </div>
      </div>
    </>
  );
};

export default Timeline;
