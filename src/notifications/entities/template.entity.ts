// Entidad para las plantillas de notificaciones
import { NotificationType } from './notification.entity';

export class NotificationTemplate {
  id: string;
  name: string;
  description: string;
  type: NotificationType;
  content: string;
  variables: string[];
  subject?: string;
  is_default: boolean;
  whatsapp_template_name?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}
