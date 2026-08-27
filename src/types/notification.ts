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
  | "meeting_transcript_ready"
  // Werner spec rev G — Tasks workflow events. Were missing here despite
  // being live in the backend (notification/models.py) and grouped under
  // notification/surfaces.py's "tasks" surface — the gap directly caused
  // IC notices to be invisible on the Tasks board (useTaskUnreadNotifications
  // couldn't recognize them as task-surface types to show in "Other updates").
  | "gi_created"
  | "ic_created"
  | "claim_created"
  | "ic_risk_high"
  | "vo_auto_created"
  | "vo_signoff_required"
  | "escalation_overdue"
  | "approval_requested"
  | "approval_held"
  | "approval_complete"
  | "approval_rejected"
  | "approval_info_requested";

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
    /** Task wrapper PK — set on task_updated/task_assigned and VO/SI/RFI/DC/CPI creation. */
    taskId?: string | number;
    /** Document PK — written as str in documents/views.py, int in documents/ai_analysis.py. */
    documentId?: string | number;
    /** RiskSignal PK — set unconditionally by risk/engine.py's _send_one. */
    signal_id?: string | number;
    /** Payment certificate PK — see tasks/pc_workflow.py. */
    paymentCertificateId?: string | number;
    /** Meeting PK, snake_case — see meetings/views.py's _fan_out_notifications. */
    meeting_id?: string | number;
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
