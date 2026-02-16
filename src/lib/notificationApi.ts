import { fetchData, postData } from "./Api";
import type { Notification, PushSubscriptionPayload } from "@/types/notification";

/**
 * GET /api/notifications/vapid-public-key/ (no auth)
 * Returns { publicKey: string }. 503 if VAPID not configured.
 */
export const getVapidPublicKey = async (): Promise<{ publicKey: string }> => {
  return fetchData("notifications/vapid-public-key/");
};

/**
 * POST /api/notifications/subscribe/ (auth required)
 * Body: { endpoint, keys: { p256dh, auth }, user_agent? }
 */
export const subscribeToPush = async (
  subscription: PushSubscriptionPayload
): Promise<{ ok: true }> => {
  return postData({ url: "notifications/subscribe/", data: subscription });
};

/**
 * GET /api/notifications/ (auth required)
 * Optional query param ?unread_only=true
 */
export const getNotifications = async (
  unreadOnly?: boolean
): Promise<Notification[]> => {
  const url = unreadOnly ? "notifications/?unread_only=true" : "notifications/";
  return fetchData(url);
};

/**
 * GET /api/notifications/{id}/ (auth required)
 */
export const getNotification = async (id: string): Promise<Notification> => {
  return fetchData(`notifications/${id}/`);
};

/**
 * GET /api/notifications/unread_count/ (auth required)
 */
export const getUnreadCount = async (): Promise<{ count: number }> => {
  return fetchData("notifications/unread_count/");
};

/**
 * POST /api/notifications/{id}/mark_read/ (auth required)
 */
export const markAsRead = async (id: string): Promise<Notification> => {
  return postData({ url: `notifications/${id}/mark_read/` });
};

/**
 * POST /api/notifications/mark_all_read/ (auth required)
 */
export const markAllAsRead = async (): Promise<{ marked: number }> => {
  return postData({ url: "notifications/mark_all_read/" });
};
