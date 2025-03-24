import { NotificationType } from '../entities/notification.entity';

export class CreateTemplateDto {
  name: string;
  description: string;
  type: NotificationType;
  content: string;
  variables: string[];
  subject?: string;
  isDefault?: boolean;
  whatsappTemplateName?: string;
  createdBy?: string;
}
