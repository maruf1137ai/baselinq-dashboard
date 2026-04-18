export type NotificationType =
  | "channel_message"
  | "channel_urgent"
  | "mention"
  | "vo_created"
  | "si_created"
  | "rfi_created"
  | "dc_created"
  | "cpi_created"
  // TODO PR #2: rename to "user_added" alongside backend notification type change
  | "team_member_added";

export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  data: {
    channelId?: number;
    messageId?: number;
    projectId?: string | number;
    entityType?: string;
    entityId?: number;
    voNumber?: string;
    siNumber?: string;
    rfiNumber?: string;
    projectNumber?: string;
    role?: string;
    [key: string]: any;
  };
  projectId?: string | null;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  link: string;
  data: Record<string, any>;
  notificationId: string;
}
