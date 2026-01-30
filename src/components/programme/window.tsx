import { Calendar, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import React, { useState } from "react";
import { AiIcon } from "../icons/icons";
import { Link } from "react-router-dom";
import Timeline from "./timeline";
import Milestone from "./milestone";

const btns = ["Timeline", "Milestones", "Budget & Cash Flow"];

const Window = () => {
  const [activeTab, setActiveTab] = useState("Timeline");

  return (
    <div>
      <div className="">
        <div className="btns flex items-center gap-2 border-b border-[#EAEAEA]">
          {btns?.map((btn) => (
            <button
              key={btn}
              onClick={() => setActiveTab(btn)}
              className={` text-base py-4 px-6 border-b-2 transition-all  ${
                activeTab == btn
                  ? "border-[#8081F6] text-[#1A1A1A]"
                  : "text-[#717784] border-transparent"
              }`}>
              {btn}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-12">
          <div className="main col-span-8 border-r border-border_color p-[18px] py-8">
            {activeTab == "Timeline" && <Timeline />}
            {activeTab == "Milestones" && <Milestone />}
            {activeTab == "Budget & Cash Flow" && <Timeline />}
          </div>

          <div className="insights col-span-4 border-r border-border_color">
            <div className="header flex items-center gap-2 p-4 border-b border-border_color">
              <AiIcon className="h-5 w-5 fill-[#1A1A1A]" /> AI Insights
            </div>

            <div className="items p-4">
              <div className="item border border-border_color rounded-[14px]">
                <div className="header py-4 px-5 flex items-center justify-between border-b border-border_color">
                  <div className="flex items-center gap-2 text-base">
                    Delay Risks Detected
                    <span className="py-1 px-2 bg-[#F06161] rounded-full text-white text-xs">
                      2
                    </span>
                  </div>

                  <div className="arrow">
                    <ChevronUp className="h-4 w-4 text-[#717784]" />
                  </div>
                </div>
                <div className="content p-6">
                  <div className="">
                    <div className="name text-[#1A1A1A] text-sm mb-2.5">
                      Milestone M3 (Roof Complete) likely delayed by 12 days
                    </div>
                    <div className="flex gap-1">
                      <Link
                        to={"#"}
                        className="text-[#3A6FF7] text-xs py-[2px] px-2 rounded-[4px] bg-[#E8F1FF] flex items-center gap-1 ">
                        RFI-021 <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                      <Link
                        to={"#"}
                        className="text-[#3A6FF7] text-xs py-[2px] px-2 rounded-[4px] bg-[#E8F1FF] flex items-center gap-1 ">
                        DC-014 <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="name text-[#1A1A1A] text-sm mb-2.5">
                      MEP First Fix may slip 14 days
                    </div>
                    <div className="flex gap-1">
                      <Link
                        to={"#"}
                        className="text-[#3A6FF7] text-xs py-[2px] px-2 rounded-[4px] bg-[#E8F1FF] flex items-center gap-1 ">
                        M4 <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                      <Link
                        to={"#"}
                        className="text-[#3A6FF7] text-xs py-[2px] px-2 rounded-[4px] bg-[#E8F1FF] flex items-center gap-1 ">
                        VO-005 <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="item border border-border_color rounded-[14px] mt-4">
                <div className="header py-4 px-5 flex items-center justify-between border-b border-border_color">
                  <div className="flex items-center gap-2 text-base">
                    Cost Risks Detected
                    <span className="py-1 px-2 bg-[#FFB547] rounded-full text-white text-xs">
                      1
                    </span>
                  </div>

                  <div className="arrow">
                    <ChevronUp className="h-4 w-4 text-[#717784]" />
                  </div>
                </div>
                <div className="content p-6">
                  <div className="">
                    <div className="name text-[#1A1A1A] text-sm mb-2.5">
                      Variation VO-005 may push project over contingency by
                      R250,000
                    </div>
                    <div className="flex gap-1">
                      <Link
                        to={"#"}
                        className="text-[#FFB547] text-xs py-[2px] px-2 rounded-[4px] bg-[#FFF3E6] flex items-center gap-1 ">
                        VO-005 <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                      <Link
                        to={"#"}
                        className="text-[#FFB547] text-xs py-[2px] px-2 rounded-[4px] bg-[#FFF3E6] flex items-center gap-1 ">
                        CONT-001 <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="item border border-border_color rounded-[14px] mt-4">
                <div className="header py-4 px-5 flex items-center justify-between border-b border-border_color">
                  <div className="flex items-center gap-2 text-base">
                    Compliance Actions
                    <span className="py-1 px-2 bg-[#3A6FF7] rounded-full text-white text-xs">
                      1
                    </span>
                  </div>

                  <div className="arrow">
                    <ChevronUp className="h-4 w-4 text-[#717784]" />
                  </div>
                </div>
                <div className="content p-6">
                  <div className="">
                    <div className="name text-[#1A1A1A] text-sm mb-2.5">
                      Variation VO-005 may push project over contingency by
                      R250,000
                    </div>
                    <div className="flex gap-1">
                      <Link
                        to={"#"}
                        className="text-[#3A6FF7] text-xs py-[2px] px-2 rounded-[4px] bg-[#E8F1FF] flex items-center gap-1 ">
                        VO-005 <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                      <Link
                        to={"#"}
                        className="text-[#3A6FF7] text-xs py-[2px] px-2 rounded-[4px] bg-[#E8F1FF] flex items-center gap-1 ">
                        CONT-001 <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Window;
