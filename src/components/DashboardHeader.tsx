"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, Wand2, Command, X, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateDocumentDialog } from "./header/createDocument";
import CreateRequestButton from "./header/CreateRequestButton";
import AskAI from "./icons/AskAI";
import AiButton from "./AiButton";
import WeatherWidget from "./NavbarWeather";
import NavbarWeather from "./NavbarWeather";
import { useNotifications } from "@/hooks/useNotifications";
import { useLogout } from "@/hooks/useLogout";

export function DashboardHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useLogout();
  const isAccountPage = location.pathname.startsWith("/account");
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
      markAsRead(item._id);
    }
    if (item.link) {
      // Switch project context if the notification belongs to a different project
      const notifProjectId = item.data?.projectId ?? item.projectId;
      if (notifProjectId) {
        localStorage.setItem('selectedProjectId', String(notifProjectId));
      }
      setOpen(false);
      navigate(item.link);
    }
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
      <header className="h-16 border-b border-border bg-sidebar flex items-center justify-between px-6 z-50 sticky top-0">
        <div className="flex items-center gap-4 flex-1">
          <SidebarTrigger />
          {showWeather && <NavbarWeather />}
        </div>

        <div className="flex items-center gap-2">
          {isAccountPage ? (
            <Button
              onClick={() => logout()}
              variant="outline"
              className="h-9 px-4 rounded-lg border-border text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all flex items-center gap-2 font-normal text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          ) : (
            <>
              <CreateRequestButton />
              <button>
                <AiButton />
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDropdownOpen(true)}
                className="relative h-10 w-10 flex justify-center items-center bg-[#FFFFFF] border border-border rounded-lg">
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-[55]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Notification side panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[384px] bg-white shadow-xl z-[60] flex flex-col transform transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
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

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((item) => (
              <button
                key={item._id}
                onClick={() => handleNotificationClick(item)}
                className={`w-full text-left border-b border-border p-4 hover:bg-[#E8F1FF4D] transition ${!item.isRead ? "bg-[#E8F1FF4D]" : "bg-white"}`}>
                <div className="flex items-start gap-3">
                  {!item.isRead && (
                    <div className="h-2 w-2 bg-primary rounded-full mt-1.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>
    </>
  );
}
