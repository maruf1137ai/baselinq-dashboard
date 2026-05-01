import { create } from "zustand";
import type { Notification } from "@/types/notification";
import {
  getNotifications as fetchNotifications,
  getUnreadCount as fetchUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification,
} from "@/lib/notificationApi";

type GetNotificationsOptions =
  | boolean
  | { unreadOnly?: boolean; projectId?: string | number };

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: (unreadOnlyOrOptions?: GetNotificationsOptions) => Promise<void>;
  fetchUnreadCount: (projectId?: string | number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  refresh: (projectId?: string | number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (unreadOnlyOrOptions?: GetNotificationsOptions) => {
    set({ isLoading: true });
    try {
      const data = await fetchNotifications(unreadOnlyOrOptions);
      set({ notifications: Array.isArray(data) ? data : [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async (projectId?: string | number) => {
    try {
      const { count } = await fetchUnreadCount(projectId);
      set({ unreadCount: count });
    } catch {
      // silently fail — count stays as-is
    }
  },

  markAsRead: async (id: string) => {
    // optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    window.dispatchEvent(new Event("notifications-marked-read"));

    try {
      await apiMarkAsRead(id);
    } catch {
      // revert on failure
      get().refresh();
    }
  },

  markAllAsRead: async () => {
    // optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
    window.dispatchEvent(new Event("notifications-marked-read"));

    try {
      await apiMarkAllAsRead();
    } catch {
      get().refresh();
    }
  },

  deleteNotification: async (id: string) => {
    // Optimistic remove. Decrement unreadCount only if the deleted item
    // was unread, otherwise leave the count alone.
    const wasUnread = !get().notifications.find((n) => n._id === id)?.isRead;
    const previous = get().notifications;
    set((state) => ({
      notifications: state.notifications.filter((n) => n._id !== id),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));
    try {
      await apiDeleteNotification(id);
    } catch {
      // Revert on failure
      set({ notifications: previous });
      get().refresh();
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  refresh: async (projectId?: string | number) => {
    const { fetchNotifications, fetchUnreadCount } = get();
    // Pass projectId to BOTH calls so the list and the count are scoped
    // to the same project. Previously only the count was project-filtered,
    // which made the bell badge and the dropdown show different data.
    await Promise.all([
      fetchNotifications(projectId != null ? { projectId } : undefined),
      fetchUnreadCount(projectId),
    ]);
  },
}));
