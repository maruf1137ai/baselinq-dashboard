"use client";

import { useState } from "react";
import { Bell, Search, Wand2, Command, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateDocumentDialog } from "./header/createDocument";
import CreateRequestButton from "./header/CreateRequestButton";
import AskAI from "./icons/AskAI";
import AiButton from "./AiButton";
import WeatherWidget from "./NavbarWeather";
import NavbarWeather from "./NavbarWeather";

const notifications = [
  {
    title: "VO-001 approval overdue",
    description: "Client approval for VO-001 is now 2 days overdue",
    time: "2 hours ago",
    active: true,
  },
  {
    title: "New RFI submitted",
    description: "RFI-014 has been submitted by John Davidson",
    time: "5 hours ago",
    active: true,
  },
  {
    title: "Task completed",
    description: "Sarah Kim completed HSE Induction task",
    time: "1 day ago",
  },
  {
    title: "Payment milestone reached",
    description: "Foundation phase milestone marked as complete",
    time: "2 days ago",
  },
];

export function DashboardHeader() {
  const [open, setOpen] = useState(false);
  const [showWeather, setShowWeather] = useState(localStorage.getItem("weatherFeed") === "true" ? true : false);




  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <header className="h-16 border-b border-[#DEDEDE] bg-sidebar flex items-center justify-between px-6 z-50 sticky top-0">
        <div className="flex items-center gap-4 flex-1">
          <SidebarTrigger />
          {/* <div className="relative max-w-md flex-1 hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-10 bg-[#F7F7F7] border-[#EDEDED] rounded-[10px]"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div> */}
          {/* Weather info according to user location */}
          {showWeather && <NavbarWeather />}
        </div>

        <div className="flex items-center gap-2">
          {/* <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <span className="mr-2">+</span>
            Create New Document
          </Button> */}
          <CreateRequestButton />

          {/* <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Logout
          </Button> */}

          <button>
            <AiButton />
          </button>

          {/* Notification Dropdown */}
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 flex justify-center items-center bg-[#FFFFFF] border border-[#EDEDED]">
                <Bell className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="max-w-[384px] w-full p-0 rounded-[19px] z-50">
              <div className="flex items-center justify-between p-6">
                <h3 className="text-lg">Notifications</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="max-h-80 h-full overflow-auto border-0">
                <div className="">
                  {notifications.map((item, index) => (
                    <div
                      key={index}
                      className={`border border-[#EDEDED] p-4 hover:bg-[#E8F1FF4D] transition ${item?.active ? "bg-[#E8F1FF4D]" : "bg-white"
                        }`}>
                      <div className=" flex items-start gap-3">
                        {item?.active && (
                          <div className="h-2 w-2 bg-primary rounded-full mt-1.5"></div>
                        )}
                        <div className="">
                          <p className="text-sm text-[#1A1A1A]">{item.title}</p>
                          <p className="text-xs text-[#717784] mt-1">
                            {item.description}
                          </p>
                          <p className="text-xs text-[#717784] mt-2">
                            {item.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
