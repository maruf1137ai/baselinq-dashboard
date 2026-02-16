export interface Notification {
  _id: string;
  type: "channel_message" | "channel_urgent" | "mention";
  title: string;
  body: string;
  link: string;
  data: {
    channelId?: number;
    messageId?: number;
    projectId?: number;
    [key: string]: any;
  };
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
