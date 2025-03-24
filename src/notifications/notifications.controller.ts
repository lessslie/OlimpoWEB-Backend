import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationStatus } from './entities/notification.entity';

class SendEmailDto {
  email: string;
  subject: string;
  message: string;
  userId?: string;
  membershipId?: string;
  templateId?: string;
}

class SendWhatsAppDto {
  phone: string;
  message: string;
  userId?: string;
  membershipId?: string;
  templateId?: string;
}

class SendMembershipExpirationDto {
  email: string;
  name: string;
  expirationDate: Date;
  membershipType: string;
  userId?: string;
  membershipId?: string;
  templateId?: string;
}

class SendMembershipRenewalDto {
  email: string;
  name: string;
  newExpirationDate: Date;
  membershipType: string;
  userId?: string;
  membershipId?: string;
  templateId?: string;
}

class SendBulkEmailDto {
  emails: string[];
  subject: string;
  message: string;
  templateId?: string;
}

class CreateTemplateDto {
  name: string;
  description: string;
  type: NotificationType;
  content: string;
  variables: string[];
  subject?: string;
  isDefault?: boolean;
  createdBy?: string;
}

class UpdateTemplateDto {
  name?: string;
  description?: string;
  content?: string;
  variables?: string[];
  subject?: string;
  isDefault?: boolean;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('email')
  @Roles(Role.ADMIN)
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    const result = await this.notificationsService.sendEmail(
      sendEmailDto.email,
      sendEmailDto.subject,
      sendEmailDto.message,
      sendEmailDto.userId,
      sendEmailDto.membershipId,
      sendEmailDto.templateId,
    );
    return { success: result };
  }

  @Post('whatsapp')
  @Roles(Role.ADMIN)
  async sendWhatsApp(@Body() sendWhatsAppDto: SendWhatsAppDto) {
    const result = await this.notificationsService.sendWhatsApp(
      sendWhatsAppDto.phone,
      sendWhatsAppDto.message,
      sendWhatsAppDto.userId,
      sendWhatsAppDto.membershipId,
      sendWhatsAppDto.templateId,
    );
    return { success: result };
  }

  @Post('membership-expiration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async sendMembershipExpirationNotification(
    @Body() dto: SendMembershipExpirationDto,
  ) {
    const success = await this.notificationsService.sendMembershipExpirationNotification({
      email: dto.email,
      name: dto.name,
      expirationDate: dto.expirationDate,
      membershipType: dto.membershipType,
      userId: dto.userId,
      membershipId: dto.membershipId,
      templateId: dto.templateId,
    });
    return { success };
  }

  @Post('membership-renewal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async sendMembershipRenewalNotification(
    @Body() dto: SendMembershipRenewalDto,
  ) {
    const success = await this.notificationsService.sendMembershipRenewalNotification({
      email: dto.email,
      name: dto.name,
      newExpirationDate: dto.newExpirationDate,
      membershipType: dto.membershipType,
      userId: dto.userId,
      membershipId: dto.membershipId,
      templateId: dto.templateId,
    });
    return { success };
  }

  @Post('bulk-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async sendBulkEmail(@Body() sendBulkEmailDto: SendBulkEmailDto) {
    const result = await this.notificationsService.sendBulkEmail({
      emails: sendBulkEmailDto.emails,
      subject: sendBulkEmailDto.subject,
      message: sendBulkEmailDto.message,
      templateId: sendBulkEmailDto.templateId,
    });
    return result;
  }

  @Get()
  @Roles(Role.ADMIN)
  async getAllNotifications() {
    const notifications = await this.notificationsService.getAllNotifications();
    return { notifications };
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN)
  async getUserNotifications(@Param('userId') userId: string) {
    const notifications = await this.notificationsService.getUserNotifications(userId);
    return { notifications };
  }

  // Endpoints para gestionar plantillas

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createTemplate(@Body() createTemplateDto: CreateTemplateDto) {
    const template = await this.notificationsService.createTemplate({
      name: createTemplateDto.name,
      description: createTemplateDto.description,
      type: createTemplateDto.type,
      content: createTemplateDto.content,
      variables: createTemplateDto.variables,
      subject: createTemplateDto.subject,
      isDefault: createTemplateDto.isDefault,
      createdBy: createTemplateDto.createdBy,
    });
    return { success: !!template, template };
  }

  @Get('templates')
  @Roles(Role.ADMIN)
  async getAllTemplates() {
    const templates = await this.notificationsService.getAllTemplates();
    return { templates };
  }

  @Get('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getTemplateById(@Param('id') id: string) {
    return this.notificationsService.getTemplateById(id);
  }

  @Put('templates/:id')
  @Roles(Role.ADMIN)
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    const template = await this.notificationsService.updateTemplate(id, updateTemplateDto);
    return { success: !!template, template };
  }

  @Delete('templates/:id')
  @Roles(Role.ADMIN)
  async deleteTemplate(@Param('id') id: string) {
    const success = await this.notificationsService.deleteTemplate(id);
    return { success };
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getNotificationLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('membershipId') membershipId?: string,
  ) {
    // Crear un objeto de filtros para pasarlo al servicio
    const filters = {
      type: type as NotificationType,
      status: status as NotificationStatus,
      startDate,
      endDate,
      userId,
      membershipId,
    };
    
    return this.notificationsService.getNotificationLogs(+page, +limit, filters);
  }

  @Get('logs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getNotificationLogById(@Param('id') id: string) {
    // Obtener un log específico por su ID
    try {
      const { data, error } = await this.notificationsService.supabase
        .from('notifications')
        .select('*, users!notifications_user_id_fkey(full_name, email)')
        .eq('id', id)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, log: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
