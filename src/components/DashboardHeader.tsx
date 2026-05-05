"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Check, X, LogOut, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateDocumentDialog } from "./header/createDocument";
import CreateRequestButton from "./header/CreateRequestButton";
import AiButton from "./AiButton";
import NavbarWeather from "./NavbarWeather";
import { useNotifications } from "@/hooks/useNotifications";
import { useLogout } from "@/hooks/useLogout";
import { useMeetingRsvp } from "@/hooks/useMeetingRsvp";
import useFetch from "@/hooks/useFetch";
import { toast } from "sonner";

function MeetingRsvpButtons({ meetingId }: { meetingId: number }) {
  const { mutate, isPending } = useMeetingRsvp(meetingId);
  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          mutate("accepted", {
            onSuccess: () => toast.success("Meeting accepted"),
            onError: () => toast.error("Failed to update RSVP"),
          });
        }}
        className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
      >
        <Check className="h-3 w-3" /> Accept
      </button>
      <button
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          mutate("declined", {
            onSuccess: () => toast.success("Meeting declined"),
            onError: () => toast.error("Failed to update RSVP"),
          });
        }}
        className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        <X className="h-3 w-3" /> Decline
      </button>
    </div>
  );
}

function NotificationItem({
  item,
  onNavigate,
  onDelete,
}: {
  item: any;
  onNavigate: (item: any) => void;
  onDelete: (id: string) => void;
}) {
  const meetingId: number | undefined = item.data?.meeting_id;
  const isMeetingInvite = item.type === "meeting_invited" && !!meetingId;

  // Always call useFetch (hooks can't be conditional); disable when not a meeting invite
  const { data: meetingData } = useFetch<{ my_rsvp: string | null }>(
    isMeetingInvite ? `meetings/${meetingId}/` : "",
    { enabled: isMeetingInvite, staleTime: 30000 }
  );

  // Hide buttons once the user has responded (fetched from server, survives panel close/reopen)
  const alreadyRsvpd = meetingData?.my_rsvp === "accepted" || meetingData?.my_rsvp === "declined";
  const showRsvp = isMeetingInvite && !alreadyRsvpd;

  return (
    <div
      className={`group relative border-b border-border hover:bg-[#E8F1FF4D] transition ${!item.isRead ? "bg-[#E8F1FF4D]" : "bg-white"}`}
    >
      <button
        onClick={() => onNavigate(item)}
        className="w-full text-left p-4 pr-10"
      >
        <div className="flex items-start gap-3">
          {!item.isRead && (
            <div className="h-2 w-2 bg-primary rounded-full mt-1.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
            {showRsvp && (
              <MeetingRsvpButtons meetingId={meetingId!} />
            )}
          </div>
        </div>
      </button>
      <button
        type="button"
        aria-label="Delete notification"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item._id);
        }}
        className="absolute right-2 top-3 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-opacity"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

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
    deleteNotification,
    fetchNotifications,
  } = useNotifications();

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
      // Always fetch scoped to the currently selected project so the bell
      // dropdown matches the unread-count badge and the rest of the app.
      const projectId = localStorage.getItem("selectedProjectId") || undefined;
      fetchNotifications(projectId ? { projectId } : undefined);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-sidebar flex items-center justify-between px-6 z-50 sticky top-0">
        <div className="flex items-center gap-4 flex-1">
          <SidebarTrigger />
          <NavbarWeather />
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
              <NotificationItem
                key={item._id}
                item={item}
                onNavigate={handleNotificationClick}
                onDelete={deleteNotification}
              />
            ))
          )}
        </ScrollArea>
      </div>
    </>
  );
}
