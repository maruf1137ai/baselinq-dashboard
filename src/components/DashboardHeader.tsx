"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, BellOff, Check, X, LogOut, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { CreateDocumentDialog } from "./header/createDocument";
import CreateRequestButton from "./header/CreateRequestButton";
import AiButton from "./AiButton";
import NavbarWeather from "./NavbarWeather";
import { useNotifications } from "@/hooks/useNotifications";
import { useLogout } from "@/hooks/useLogout";
import { useMeetingRsvp } from "@/hooks/useMeetingRsvp";
import useFetch from "@/hooks/useFetch";
import { toast } from "sonner";

// The backend prefixes every notification title with "[Project · Number]"
// (see notification/services.py::create_notification — Werner rev H p.21
// requires the project be surfaced up-front so a user with multiple
// projects open can disambiguate). Rendered inline that read as one run-on
// string, so pull it out and show it as a small separate label instead of
// stripping it — the project context still matters, it just shouldn't be
// competing with the actual notification text for attention.
const PROJECT_PREFIX = /^\[([^\]]+)\]\s*/;
function splitNotificationTitle(title: string): { projectLabel: string | null; mainTitle: string } {
  const match = PROJECT_PREFIX.exec(title || "");
  if (!match) return { projectLabel: null, mainTitle: title || "" };
  return { projectLabel: match[1], mainTitle: title.slice(match[0].length) };
}

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
        <Check className="h-4 w-4" /> Accept
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
        <X className="h-4 w-4" /> Decline
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
  const { projectLabel, mainTitle } = splitNotificationTitle(item.title);

  return (
    <div
      className={`group relative border-b border-border hover:bg-[#E8F1FF4D] transition ${!item.isRead ? "bg-[#E8F1FF4D]" : "bg-card"}`}
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
            {projectLabel && (
              <span className="inline-block text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded mb-1 truncate max-w-full">
                {projectLabel}
              </span>
            )}
            <p className="text-sm font-medium text-foreground leading-snug">{mainTitle}</p>
            {item.body && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.body}</p>
            )}
            <p className="text-[11px] text-muted-foreground/70 mt-1.5">
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
        <Trash2 className="h-4 w-4" />
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
              <LogOut className="h-4 w-4" />
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
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                className="relative h-10 w-10 flex justify-center items-center bg-card border border-border rounded-lg">
                <Bell />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Notification side panel.
          Was a hand-rolled `fixed right-0` div with its own overlay and
          translate-x transition: no role="dialog", no focus trap, and Escape
          did nothing, so keyboard users tabbed straight out of an open panel
          into the page behind it. Radix's Sheet gives all three for free and
          puts the drawer on the app's shared surface and scrim. */}
      <Sheet open={open} onOpenChange={handleDropdownOpen}>
        <SheetContent side="right" size="sm" className="p-0 flex flex-col gap-0">
          <SheetHeader className="px-6 py-5 pr-14 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-8 px-2"
                  onClick={handleMarkAllAsRead}>
                  Mark all read
                </Button>
              )}
            </div>
            <SheetDescription className="sr-only">
              Instructions, variations, certificates and notice deadlines that
              need your attention.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <AwesomeLoader compact message="Loading notifications" />
            ) : notifications.length === 0 ? (
              <EmptyState
                variant="plain"
                size="sm"
                icon={BellOff}
                title="You're up to date"
                description="New instructions, variations, certificates and notice deadlines will appear here as they are raised on your projects."
              />
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
        </SheetContent>
      </Sheet>
    </>
  );
}
