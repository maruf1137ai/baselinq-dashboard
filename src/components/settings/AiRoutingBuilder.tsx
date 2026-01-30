"use client";

import { CircleCheck, ExternalLink, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useState, useMemo } from "react";
// import type { Task, ChecklistItem as ChecklistItemType } from './types';
// import { CalendarIcon, CheckIcon } from './components/Icons';
import { CheckIcon, CalendarIcon } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export default function AiRoutingBuilderDrawer() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-primary text-white border border-border_color text-base !py-3 !px-4">
          <span className="mr-1">+</span>
          Add AI Rules
        </Button>
      </DialogTrigger>

      <DialogContent className="fixed right-0 top-0 !left-auto !translate-x-0 !translate-y-0 h-screen w-full max-w-[384px] !rounded-none border-0 bg-white text-[#1A1F36] shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right !p-0">
        {/* Drawer header */}
        {/* <DialogHeader className="flex flex-row items-center justify-between border-b border-gray-800 pb-3">
          <DialogTitle className="text-lg font-semibold">
            Drawer Title
          </DialogTitle>
        </DialogHeader> */}

        {/* Blank content area */}
        <div className="">
          <div className="w-full overflow-auto">
            <div className="p-0 border-b border-border_color py-[18px] px-6">
              <h1 className="text-base text-[#1A1A1A]">AI Rule Builder</h1>
            </div>

            <div className="space-y-4 px-6 pb-6 mt-6">
              <div className="space-y-5">
                {/* Document Title */}
                <div>
                  <Label htmlFor="title" className="text-sm text-[#1A1F36]">
                    IF (Condition)
                  </Label>
                  <Input
                    id="title"
                    placeholder="Select condition..."
                    className="mt-2"
                  />
                </div>

                {/* Document Title */}
                <div>
                  <Label htmlFor="title" className="text-sm text-[#1A1F36]">
                    THEN (Action)
                  </Label>
                  <Input
                    id="title"
                    placeholder="Select action..."
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="p-4 rounded-[10px] bg-[#F3F2F0]">
                💡 AI will learn from your actions and improve routing accuracy
                over time.
              </div>

              {/* Buttons */}
              <div className="flex items-end justify-end border-t pt-4 mt-4">
                <div className="flex gap-2 items-end w-full">
                  {/* <Button variant="outline">Cancel</Button> */}
                  <Button className="w-full">Create Rule</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* <div className="p-6 text-gray-400">Drawer content here</div> */}
      </DialogContent>
    </Dialog>
  );
}
