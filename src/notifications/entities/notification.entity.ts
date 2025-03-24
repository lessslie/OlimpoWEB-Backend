// Entidad para las notificaciones
export enum NotificationType {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class Notification {
  id: string;
  type: NotificationType;
  recipient: string;
  content: string;
  status: NotificationStatus;
  error_message?: string;
  user_id?: string;
  membership_id?: string;
  template_id?: string;
  created_at: Date;
  updated_at: Date;
}
