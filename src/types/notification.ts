export type NotificationType =
  | "channel_message"
  | "channel_urgent"
  | "mention"
  | "vo_created"
  | "si_created"
  | "rfi_created"
  | "dc_created"
  | "cpi_created"
  | "document_created"
  | "document_version_created"
  | "team_member_added"
  | "task_updated"
  | "task_assigned"
  | "meeting_invited"
  | "meeting_updated"
  | "meeting_transcript_ready";

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
