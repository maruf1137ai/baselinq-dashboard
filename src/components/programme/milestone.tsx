import { ChevronUp, CircleCheck } from "lucide-react";
import React from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ViewDetailsDialog } from "./detailsDialog";

const Milestone = () => {
  return (
    <div>
      <div className="item border border-border_color rounded-[14px] overflow-hidden">
        <div className="p-6 flex gap-3">
          <div className="mt-1 min-h-5 min-w-5">
            <CircleCheck className="h-5 w-5 text-[#00C97A]" />
          </div>
          <div className="w-full">
            <div className="title flex items-center gap-4 justify-between w-full">
              <div className="flex items-center gap-4 text-base text-base">
                M2 – Foundation Complete
                <Badge
                  variant="outline"
                  className={`text-sm text-[#00C97A] bg-[rgba(233,247,236,0.42)] border border-[rgba(22,163,74,0.34)]`}>
                  Completed
                </Badge>
              </div>
              <div className="arrow">
                <ChevronUp className="h-4 w-4 text-[#717784]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 mt-5">
              <div className="item">
                <div className="text-sm text-[#717784] mb-1">Planned</div>
                <div className="text-base text-[#1A1A1A]">Oct 15, 2024</div>
              </div>
              <div className="item">
                <div className="text-sm text-[#717784] mb-1">Forecast</div>
                <div className="text-base text-[#1A1A1A]">Oct 15, 2024</div>
              </div>
            </div>

            <div className="progress mt-4">
              <div className="flex justify-between items-center">
                <div className="text-[#717784] text-sm">Progress</div>
                <div className="text-[#1A1A1A] text-sm">100%</div>
              </div>
              <div className="bar bg-gray-100 h-2 w-full rounded-full mt-2">
                <div className="w-[100%] bg-[#8081F6] h-full rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="bottom p-6 bg-[#FAFAFA] border-t border-[#EAEAEA]">
          <div className="text-sm text-[#717784] mb-2.5">Description</div>
          <div className="text-base text-[#1A1A1A]">
            No description available
          </div>

          <div className="flex items-center gap-3 mt-3">
            <ViewDetailsDialog />
            {/* <Button className="bg-transparent border border-border_color hover:bg-primary text-[#1A1A1A] hover:text-white transition-all">
              View Full Details
            </Button> */}
            <Button className="bg-transparent border border-border_color hover:bg-primary text-[#1A1A1A] hover:text-white transition-all">
              Add Notes
            </Button>
            <Button className="bg-transparent border border-border_color hover:bg-primary text-[#1A1A1A] hover:text-white transition-all">
              Add Attachments
            </Button>
          </div>
        </div>
      </div>

      <div className="item border border-border_color rounded-[14px] mt-4">
        <div className="p-6 flex gap-3">
          <div className="mt-1 min-h-5 min-w-5">
            <CircleCheck className="h-5 w-5 text-[#00C97A]" />
          </div>
          <div className="w-full">
            <div className="title flex items-center gap-4 justify-between w-full">
              <div className="flex items-center gap-4 text-base">
                M2 – Foundation Complete
                <Badge
                  variant="outline"
                  className={`text-sm text-[#00C97A] bg-[rgba(233,247,236,0.42)] border border-[rgba(22,163,74,0.34)]`}>
                  Completed
                </Badge>
              </div>
              <div className="arrow">
                <ChevronUp className="h-4 w-4 text-[#717784]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 mt-5">
              <div className="item">
                <div className="text-sm text-[#717784] mb-1">Planned</div>
                <div className="text-base text-[#1A1A1A]">Oct 15, 2024</div>
              </div>
              <div className="item">
                <div className="text-sm text-[#717784] mb-1">Forecast</div>
                <div className="text-base text-[#1A1A1A]">Oct 15, 2024</div>
              </div>
            </div>

            <div className="progress mt-4">
              <div className="flex justify-between items-center">
                <div className="text-[#717784] text-sm">Progress</div>
                <div className="text-[#1A1A1A] text-sm">100%</div>
              </div>
              <div className="bar bg-gray-100 h-2 w-full rounded-full mt-2">
                <div className="w-[100%] bg-[#8081F6] h-full rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Milestone;
