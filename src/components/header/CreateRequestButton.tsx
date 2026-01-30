"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import CreateRequestDialog from "./CreateRequestDialog";
import { Bell, Plus, X } from "lucide-react";

const btns = [
  {
    code: "VO",
    title: "VO - Variation Order",
    description: "Request to modify scope, cost, or materials.",
    time: "Just now",
    active: false,
  },
  {
    code: "SI",
    title: "SI - Site Instruction",
    description: "Instruction issued directly for immediate site work.",
    time: "5 minutes ago",
    active: false,
  },
  {
    code: "RFI",
    title: "RFI - Request for Information",
    description: "Clarification requested regarding project details.",
    time: "10 minutes ago",
    active: false,
  },
  {
    code: "DC",
    title: "DC - Delay Claim",
    description: "Request for extension of time due to delays.",
    time: "15 minutes ago",
    active: false,
  },
  {
    code: "CPI",
    title: "CPI - Critical Path Item",
    description: "Task affecting the critical path timeline.",
    time: "20 minutes ago",
    active: false,
  },
  {
    code: "GI",
    title: "GI - General Instruction",
    description: "General instruction for work or processes.",
    time: "30 minutes ago",
    active: false,
  },
];


export default function CreateRequestButton() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [btnsOpen, setBtnsOpen] = useState(false);

  const handleClick = (btn) => {
    setSelectedType(btn);
    setOpen(true);
    setBtnsOpen(false);
  };

  //   function handleClick(item) {
  //   setBtns((prev) =>
  //     prev.map((b) => ({ ...b, active: b.code === item.code }))
  //   );
  // }


  return (
    <>
      <div className="">
        <DropdownMenu open={btnsOpen} onOpenChange={setBtnsOpen}>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 text-base font-normal">
              {/* <span className="text-xl">+</span> */}
              <Plus />
              Action
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-72 p-0 rounded-[19px] overflow-hidden rounded-[13px]">
            {btns.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onSelect={(e) => {
                  e.preventDefault(); // keeps menu open
                  handleClick(item.title);
                }}
                className="p-0 cursor-pointer"
              >
                <div
                  className={`border border-[#EDEDED] p-4 w-full hover:bg-[#E8F1FF4D] transition ${item.active ? "bg-[#E8F1FF4D]" : "bg-white"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {item.active && (
                      <div className="h-2 w-2 bg-primary rounded-full mt-1.5"></div>
                    )}
                    <div>
                      <p className="text-sm text-[#1A1A1A]">{item.title}</p>

                      {/* {item.description && (
                        <p className="text-xs text-[#717784] mt-1">
                          {item.description}
                        </p>
                      )}

                      {item.time && (
                        <p className="text-xs text-[#717784] mt-2">
                          {item.time}
                        </p>
                      )} */}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>

        </DropdownMenu>
      </div>



      <CreateRequestDialog
        open={open}
        setOpen={setOpen}
        selectedType={selectedType}
      />
    </>
  );
}
