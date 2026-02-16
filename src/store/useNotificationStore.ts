import { create } from "zustand";
import type { Notification } from "@/types/notification";
import {
  getNotifications as fetchNotifications,
  getUnreadCount as fetchUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
} from "@/lib/notificationApi";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  refresh: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (unreadOnly?: boolean) => {
    set({ isLoading: true });
    try {
      const data = await fetchNotifications(unreadOnly);
      set({ notifications: Array.isArray(data) ? data : [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { count } = await fetchUnreadCount();
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

    try {
      await apiMarkAllAsRead();
    } catch {
      get().refresh();
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  refresh: async () => {
    const { fetchNotifications, fetchUnreadCount } = get();
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  },
}));
