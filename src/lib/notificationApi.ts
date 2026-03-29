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
 * Optional: unread_only, project_id for project-wise list.
 * Pass a boolean for unreadOnly only, or an object { unreadOnly?, projectId? }.
 */
export const getNotifications = async (
  unreadOnlyOrOptions?: boolean | { unreadOnly?: boolean; projectId?: string | number }
): Promise<Notification[]> => {
  const options =
    typeof unreadOnlyOrOptions === "boolean"
      ? { unreadOnly: unreadOnlyOrOptions }
      : unreadOnlyOrOptions ?? {};
  const params = new URLSearchParams();
  if (options.unreadOnly) params.set("unread_only", "true");
  if (options.projectId != null) params.set("project_id", String(options.projectId));
  const qs = params.toString();
  const url = qs ? `notifications/?${qs}` : "notifications/";
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
 * Optional: project_id (or projectId) for project-wise count
 */
export const getUnreadCount = async (
  projectId?: string | number
): Promise<{ count: number }> => {
  const url =
    projectId != null
      ? `notifications/unread_count/?project_id=${encodeURIComponent(String(projectId))}`
      : "notifications/unread_count/";
  return fetchData(url);
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
