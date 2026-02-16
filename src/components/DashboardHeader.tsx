"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Wand2, Command, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import { useNotifications } from "@/hooks/useNotifications";

export function DashboardHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useNotifications();

  const [showWeather, setShowWeather] = useState(
    localStorage.getItem("weatherFeed") === "true" ? true : false,
  );

  const handleNotificationClick = async (item: (typeof notifications)[0]) => {
    if (!item.isRead) {
      await markAsRead(item._id);
    }
    setOpen(false);
    navigate(item.link);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDropdownOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchNotifications();
    }
  };

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
          <DropdownMenu open={open} onOpenChange={handleDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 flex justify-center items-center bg-[#FFFFFF] border border-[#EDEDED]">
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-medium">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="min-w-[384px] w-full p-0 rounded-[19px] z-50">
              <div className="flex items-center justify-between p-6">
                <h3 className="text-lg">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary h-6 px-2"
                      onClick={handleMarkAllAsRead}>
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="max-h-80 h-full overflow-auto border-0">
                <div className="">
                  {isLoading ? (
                    <div className="p-4 text-center text-sm text-[#717784]">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[#717784]">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item._id}
                        onClick={() => handleNotificationClick(item)}
                        className={`w-full text-left block border border-[#EDEDED] p-4 hover:bg-[#E8F1FF4D] transition ${!item.isRead ? "bg-[#E8F1FF4D]" : "bg-white"
                          }`}>
                        <div className="flex items-start gap-3">
                          {!item.isRead && (
                            <div className="h-2 w-2 bg-primary rounded-full mt-1.5 shrink-0"></div>
                          )}
                          <div>
                            <p className="text-sm text-[#1A1A1A]">{item.title}</p>
                            <p className="text-xs text-[#717784] mt-1">
                              {item.body}
                            </p>
                            <p className="text-xs text-[#717784] mt-2">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
