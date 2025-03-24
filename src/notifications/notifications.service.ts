import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NotificationType, NotificationStatus } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  // Hacer pública la instancia de Supabase para que pueda ser accedida desde el controlador
  public supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    // Inicializar SendGrid
    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendgridApiKey) {
      sgMail.setApiKey(sendgridApiKey);
    }

    // Inicializar Supabase
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    // Usar SUPABASE_SERVICE_KEY si está disponible, sino intentar con SUPABASE_KEY como fallback
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') || 
                        this.configService.get<string>('SUPABASE_KEY') || 
                        this.configService.get<string>('SUPABASE_ANON_KEY') || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Envía un correo electrónico
  // @param to Dirección de correo electrónico del destinatario
  // @param subject Asunto del correo
  // @param text Contenido del correo en formato texto
  // @param userId ID del usuario (opcional)
  // @param membershipId ID de la membresía (opcional)
  // @param templateId ID de la plantilla (opcional)
  async sendEmail(
    to: string,
    subject: string,
    text: string,
    userId?: string,
    membershipId?: string,
    templateId?: string,
  ): Promise<boolean> {
    try {
      // Crear el registro de notificación
      const notificationId = await this.createNotificationRecord({
        type: NotificationType.EMAIL,
        recipient: to,
        content: text,
        status: NotificationStatus.PENDING,
        userId,
        membershipId,
        templateId,
      });

      // Verificar si las credenciales de SendGrid están disponibles
      const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
      if (!sendgridApiKey || sendgridApiKey.includes('your_sendgrid_api_key_here')) {
        console.warn('Credenciales de SendGrid no configuradas. Email no enviado.');
        await this.updateNotificationStatus(
          notificationId,
          NotificationStatus.FAILED,
          'Credenciales de SendGrid no configuradas'
        );
        return false;
      }

      // Configurar el correo
      const msg = {
        to,
        from: this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'info@olimpogym.com',
        subject,
        text,
        html: text.replace(/\n/g, '<br>'),
      };

      // Enviar el correo
      await sgMail.send(msg);

      // Actualizar el registro de notificación como enviado
      await this.updateNotificationStatus(notificationId, NotificationStatus.SENT);

      return true;
    } catch (error) {
      console.error('Error al enviar email:', error);
      
      // Si se creó un registro de notificación, actualizarlo con el error
      if (error.notificationId) {
        await this.updateNotificationStatus(
          error.notificationId, 
          NotificationStatus.FAILED, 
          `Error: ${error.message}`
        );
      }
      
      return false;
    }
  }

  // Envía un mensaje de WhatsApp
  // @param phone Número de teléfono del destinatario
  // @param message Contenido del mensaje
  // @param userId ID del usuario (opcional)
  // @param membershipId ID de la membresía (opcional)
  // @param templateId ID de la plantilla (opcional)
  async sendWhatsApp(
    phone: string,
    message: string,
    userId?: string,
    membershipId?: string,
    templateId?: string,
  ): Promise<boolean> {
    try {
      // Formatear el número de teléfono para WhatsApp
      let formattedPhone = phone.trim();
      
      // Asegurarse de que el número tenga el formato correcto para WhatsApp
      if (!formattedPhone.startsWith('+')) {
        // Si no comienza con +, asumir que es un número argentino y añadir el código de país
        if (formattedPhone.startsWith('0')) {
          // Quitar el 0 inicial y añadir +54
          formattedPhone = '+54' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('15')) {
          // Número argentino con formato 15XXXXXXXX, convertir a +54 9 XXXXXXXX
          formattedPhone = '+549' + formattedPhone.substring(2);
        } else if (!formattedPhone.startsWith('54')) {
          // Si no comienza con 54, añadir +54
          formattedPhone = '+54' + formattedPhone;
        } else {
          // Si comienza con 54 pero no con +, añadir el +
          formattedPhone = '+' + formattedPhone;
        }
      } else {
        // Si tiene el signo +, asegurarse de que el formato sea correcto para WhatsApp
        // WhatsApp espera el formato sin el signo +
        formattedPhone = formattedPhone.substring(1);
      }
      
      // Crear el registro de notificación
      const notificationId = await this.createNotificationRecord({
        type: NotificationType.WHATSAPP,
        recipient: formattedPhone,
        content: message,
        status: NotificationStatus.PENDING,
        userId,
        membershipId,
        templateId,
      });
      
      // Obtener las credenciales de WhatsApp Business API
      const whatsappToken = this.configService.get<string>('WHATSAPP_BUSINESS_API_TOKEN');
      const whatsappPhoneId = this.configService.get<string>('WHATSAPP_BUSINESS_PHONE_ID');
      
      // Verificar si las credenciales son válidas
      if (!whatsappToken || !whatsappPhoneId || 
          whatsappToken.includes('your_whatsapp_business_api_token_here') || 
          whatsappPhoneId.includes('your_whatsapp_phone_id_here')) {
        console.warn('Credenciales de WhatsApp Business API no configuradas o inválidas');
        await this.updateNotificationStatus(
          notificationId,
          NotificationStatus.FAILED,
          'Credenciales de WhatsApp Business API no configuradas o inválidas'
        );
        return false;
      }
      
      try {
        // Verificar si se está utilizando una plantilla
        let response;
        
        if (templateId) {
          // Obtener la plantilla
          const template = await this.getTemplateById(templateId);
          
          if (template && template.whatsapp_template_name) {
            console.log(`Usando plantilla de WhatsApp: ${template.whatsapp_template_name}`);
            
            // Extraer parámetros de la plantilla
            const parameters = this.extractTemplateParameters(message, template.variables);
            console.log('Parámetros extraídos:', JSON.stringify(parameters));
            
            // Enviar mensaje usando plantilla de WhatsApp
            response = await axios.post(
              `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
              {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'template',
                template: {
                  name: template.whatsapp_template_name,
                  language: {
                    code: 'es',
                  },
                  components: [
                    {
                      type: 'body',
                      parameters: parameters
                    }
                  ]
                }
              },
              {
                headers: {
                  'Authorization': `Bearer ${whatsappToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            console.log('Respuesta de WhatsApp API (plantilla):', response.status, response.statusText);
          } else {
            console.log('No se encontró plantilla de WhatsApp, enviando como texto');
            
            // Si no hay nombre de plantilla de WhatsApp, usar el método de texto
            response = await axios.post(
              `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
              {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: {
                  body: message
                }
              },
              {
                headers: {
                  'Authorization': `Bearer ${whatsappToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            console.log('Respuesta de WhatsApp API (texto):', response.status, response.statusText);
          }
        } else {
          console.log('Enviando mensaje de texto normal por WhatsApp');
          
          // Enviar mensaje de texto normal
          response = await axios.post(
            `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: formattedPhone,
              type: 'text',
              text: {
                body: message
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          console.log('Respuesta de WhatsApp API (texto normal):', response.status, response.statusText);
        }
        
        // Verificar la respuesta
        if (response && response.status >= 200 && response.status < 300) {
          // Actualizar el registro de notificación como enviado
          await this.updateNotificationStatus(
            notificationId,
            NotificationStatus.SENT
          );
          
          console.log(`Mensaje de WhatsApp enviado exitosamente a ${formattedPhone}`);
          return true;
        } else {
          // Si la respuesta no es exitosa
          const errorMessage = response ? 
            `Error al enviar WhatsApp: ${response.status} ${response.statusText}` : 
            'Error desconocido al enviar WhatsApp';
          
          console.error(errorMessage);
          await this.updateNotificationStatus(
            notificationId,
            NotificationStatus.FAILED,
            errorMessage
          );
          return false;
        }
      } catch (error) {
        // Capturar errores específicos de la API de WhatsApp
        const errorMessage = error.response ? 
          `Error de WhatsApp API: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}` : 
          `Error al enviar WhatsApp: ${error.message}`;
        
        console.error(errorMessage);
        await this.updateNotificationStatus(
          notificationId,
          NotificationStatus.FAILED,
          errorMessage
        );
        return false;
      }
    } catch (error) {
      console.error(`Error general en sendWhatsApp: ${error.message}`);
      return false;
    }
  }

  // Envía una notificación de expiración de membresía
  async sendMembershipExpirationNotification(params: {
    email: string;
    name: string;
    expirationDate: Date;
    membershipType: string;
    userId?: string;
    membershipId?: string;
    templateId?: string;
  }): Promise<boolean> {
    const { email, name, expirationDate, membershipType, userId, membershipId, templateId } = params;
    
    try {
      // Buscar plantilla para notificación de expiración
      let template;
      if (templateId) {
        template = await this.getTemplateById(templateId);
      } else {
        // Si no se especifica una plantilla, buscar la plantilla predeterminada
        const { data, error } = await this.supabase
          .from('notification_templates')
          .select('*')
          .eq('type', NotificationType.EMAIL)
          .eq('is_default', true)
          .ilike('name', '%expiracion%')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          template = data[0];
        }
      }
      
      // Construir el mensaje
      let subject = 'Tu membresía ha expirado';
      let message = `Hola ${name},\n\nTe informamos que tu membresía ${membershipType} en Olimpo Gym ha expirado el ${new Date(expirationDate).toLocaleDateString()}.\n\nPuedes renovarla visitando nuestras instalaciones o desde nuestra página web.\n\n¡Esperamos verte pronto!\n\nSaludos,\nEl equipo de Olimpo Gym`;
      
      // Si hay una plantilla, usarla
      if (template) {
        subject = template.subject || subject;
        message = template.content || message;
        
        // Reemplazar variables en la plantilla
        message = message
          .replace(/{{nombre}}/g, name)
          .replace(/{{tipo_membresia}}/g, membershipType)
          .replace(/{{fecha_expiracion}}/g, new Date(expirationDate).toLocaleDateString());
      }
      
      // Enviar el correo
      const emailSent = await this.sendEmail(
        email,
        subject,
        message,
        userId,
        membershipId,
        template?.id,
      );
      
      return emailSent;
    } catch (error) {
      console.error(`Error al enviar notificación de expiración: ${error.message}`);
      return false;
    }
  }

  // Envía una notificación de renovación de membresía
  async sendMembershipRenewalNotification(params: {
    email: string;
    name: string;
    newExpirationDate: Date;
    membershipType: string;
    userId?: string;
    membershipId?: string;
    templateId?: string;
  }): Promise<boolean> {
    const { email, name, newExpirationDate, membershipType, userId, membershipId, templateId } = params;
    
    try {
      // Buscar plantilla para notificación de renovación
      let template;
      if (templateId) {
        template = await this.getTemplateById(templateId);
      } else {
        // Si no se especifica una plantilla, buscar la plantilla predeterminada
        const { data, error } = await this.supabase
          .from('notification_templates')
          .select('*')
          .eq('type', NotificationType.EMAIL)
          .eq('is_default', true)
          .ilike('name', '%renovacion%')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          template = data[0];
        }
      }
      
      // Construir el mensaje
      let subject = 'Tu membresía ha sido renovada';
      let message = `Hola ${name},\n\nTe informamos que tu membresía ${membershipType} en Olimpo Gym ha sido renovada exitosamente.\n\nTu nueva fecha de expiración es el ${new Date(newExpirationDate).toLocaleDateString()}.\n\n¡Gracias por seguir confiando en Olimpo Gym!\n\nSaludos,\nEl equipo de Olimpo Gym`;
      
      // Si hay una plantilla, usarla
      if (template) {
        subject = template.subject || subject;
        message = template.content || message;
        
        // Reemplazar variables en la plantilla
        message = message
          .replace(/{{nombre}}/g, name)
          .replace(/{{tipo_membresia}}/g, membershipType)
          .replace(/{{nueva_fecha_expiracion}}/g, new Date(newExpirationDate).toLocaleDateString());
      }
      
      // Enviar el correo
      const emailSent = await this.sendEmail(
        email,
        subject,
        message,
        userId,
        membershipId,
        template?.id,
      );
      
      return emailSent;
    } catch (error) {
      console.error(`Error al enviar notificación de renovación: ${error.message}`);
      return false;
    }
  }

  // Método auxiliar para extraer parámetros de plantilla de WhatsApp
  private extractTemplateParameters(message: string, variables: string[] = []): Array<{type: string, text: string}> {
    const parameters: Array<{type: string, text: string}> = [];
    
    // Si no hay variables definidas, devolver el mensaje completo como un parámetro
    if (!variables || variables.length === 0) {
      return [{ type: 'text', text: message }];
    }
    
    // Crear una copia del mensaje para trabajar con él
    let processedMessage = message;
    
    // Procesar cada variable y extraer su valor real
    variables.forEach((variable) => {
      // Buscar la variable en el mensaje (formato {{variable}})
      const varPattern = new RegExp(`{{\\s*${variable}\\s*}}`, 'g');
      
      // Buscar el valor real que debería reemplazar a la variable
      // Esto depende de cómo se estructura el mensaje
      // Por ejemplo, si el mensaje tiene formato "Nombre: Juan, Fecha: 2023-01-01"
      // y la variable es "nombre", buscaríamos "Nombre: " y extraeríamos "Juan"
      
      // Primero verificamos si la variable está en el mensaje
      if (processedMessage.match(varPattern)) {
        // Intentar extraer el valor basado en patrones comunes
        // Por ejemplo: "variable: valor" o "variable = valor"
        const valuePattern = new RegExp(`${variable}\\s*[:=]\\s*([^,;\\n]+)`, 'i');
        const valueMatch = processedMessage.match(valuePattern);
        
        if (valueMatch && valueMatch[1]) {
          // Extraer el valor y limpiarlo
          const extractedValue = valueMatch[1].trim();
          parameters.push({
            type: 'text',
            text: extractedValue
          });
          
          // Marcar esta parte como procesada para evitar duplicados
          processedMessage = processedMessage.replace(valuePattern, '');
        } else {
          // Si no podemos extraer el valor con el patrón, usar un valor genérico
          parameters.push({
            type: 'text',
            text: `{{${variable}}}`
          });
        }
      } else {
        // Si la variable no está en el mensaje, añadir un valor vacío
        parameters.push({
          type: 'text',
          text: ''
        });
      }
    });
    
    return parameters;
  }

  // Método para enviar correos electrónicos en masa
  async sendBulkEmail(params: {
    emails: string[];
    subject: string;
    message: string;
    templateId?: string;
  }): Promise<{ success: boolean; sent: number; failed: number; errors: any[] }> {
    const { emails, subject, message, templateId } = params;
    const results = { success: true, sent: 0, failed: 0, errors: [] as any[] };
    
    try {
      // Si hay una plantilla, obtenerla
      let template;
      if (templateId) {
        template = await this.getTemplateById(templateId);
      }
      
      // Enviar correos en lotes para evitar sobrecargar la API de SendGrid
      const batchSize = 50;
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        // Preparar los mensajes para este lote
        const messages = batch.map(email => {
          return {
            to: email,
            from: this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'info@olimpogym.com',
            subject: template?.subject || subject,
            text: template?.content || message,
            html: (template?.content || message).replace(/\n/g, '<br>'),
          };
        });
        
        try {
          // Enviar el lote
          await sgMail.send(messages);
          results.sent += batch.length;
          
          // Crear registros de notificación para cada correo enviado
          for (const email of batch) {
            await this.createNotificationRecord({
              type: NotificationType.EMAIL,
              recipient: email,
              content: template?.content || message,
              status: NotificationStatus.SENT,
              templateId: template?.id,
            });
          }
        } catch (batchError) {
          results.failed += batch.length;
          results.errors.push({
            batch: i / batchSize + 1,
            error: batchError.message,
          });
          
          // Crear registros de notificación fallidos
          for (const email of batch) {
            await this.createNotificationRecord({
              type: NotificationType.EMAIL,
              recipient: email,
              content: template?.content || message,
              status: NotificationStatus.FAILED,
              templateId: template?.id,
              errorMessage: batchError.message,
            });
          }
        }
      }
      
      // Determinar si la operación fue exitosa en general
      results.success = results.sent > 0 && results.failed < emails.length * 0.5;
      
      return results;
    } catch (error) {
      console.error(`Error al enviar correos masivos: ${error.message}`);
      return {
        success: false,
        sent: results.sent,
        failed: emails.length - results.sent,
        errors: [...results.errors, { general: error.message }],
      };
    }
  }

  // Método para crear un registro de notificación
  async createNotificationRecord(notification: {
    type: NotificationType;
    recipient: string;
    content: string;
    status: NotificationStatus;
    userId?: string;
    membershipId?: string;
    templateId?: string;
    errorMessage?: string;
  }): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          type: notification.type,
          recipient: notification.recipient,
          content: notification.content,
          status: notification.status,
          user_id: notification.userId,
          membership_id: notification.membershipId,
          template_id: notification.templateId,
          error_message: notification.errorMessage,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error al crear registro de notificación:', error);
        throw error;
      }
      
      return data.id;
    } catch (error) {
      console.error('Error al crear registro de notificación:', error);
      throw error;
    }
  }

  // Método para actualizar el estado de una notificación
  async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          status,
          error_message: errorMessage,
          updated_at: new Date(),
        })
        .eq('id', notificationId);
      
      if (error) {
        console.error('Error al actualizar estado de notificación:', error);
      }
    } catch (error) {
      console.error('Error al actualizar estado de notificación:', error);
    }
  }

  // Método para obtener todas las notificaciones
  async getAllNotifications() {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error al obtener notificaciones:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      return [];
    }
  }

  // Método para obtener las notificaciones de un usuario
  async getUserNotifications(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(`Error al obtener notificaciones del usuario ${userId}:`, error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error(`Error al obtener notificaciones del usuario ${userId}:`, error);
      return [];
    }
  }

  // Método para obtener los registros de notificaciones (logs)
  async getNotificationLogs(page: number = 1, limit: number = 10, filters?: any) {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*, users!notifications_user_id_fkey(full_name, email)', { count: 'exact' });
      
      // Aplicar filtros si existen
      if (filters) {
        if (filters.type) {
          query = query.eq('type', filters.type);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.userId) {
          query = query.eq('user_id', filters.userId);
        }
        if (filters.membershipId) {
          query = query.eq('membership_id', filters.membershipId);
        }
        if (filters.startDate && filters.endDate) {
          query = query.gte('created_at', filters.startDate).lte('created_at', filters.endDate);
        }
      }
      
      // Aplicar paginación
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) {
        console.error('Error al obtener logs de notificaciones:', error);
        return { logs: [], total: 0, page, limit };
      }
      
      return {
        logs: data,
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error al obtener logs de notificaciones:', error);
      return { logs: [], total: 0, page, limit };
    }
  }

  // Métodos para gestionar plantillas

  // Método para crear una plantilla
  async createTemplate(template: {
    name: string;
    description: string;
    type: NotificationType;
    content: string;
    variables: string[];
    subject?: string;
    isDefault?: boolean;
    createdBy?: string;
    whatsappTemplateName?: string;
  }) {
    try {
      // Si la plantilla es predeterminada, desmarcar otras plantillas del mismo tipo
      if (template.isDefault) {
        await this.supabase
          .from('notification_templates')
          .update({ is_default: false })
          .eq('type', template.type)
          .eq('is_default', true);
      }
      
      const { data, error } = await this.supabase
        .from('notification_templates')
        .insert({
          name: template.name,
          description: template.description,
          type: template.type,
          content: template.content,
          variables: template.variables,
          subject: template.subject,
          is_default: template.isDefault || false,
          created_by: template.createdBy,
          whatsapp_template_name: template.whatsappTemplateName,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error al crear plantilla:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error al crear plantilla:', error);
      return null;
    }
  }

  // Método para obtener todas las plantillas
  async getAllTemplates() {
    try {
      const { data, error } = await this.supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error al obtener plantillas:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error al obtener plantillas:', error);
      return [];
    }
  }

  // Método para obtener una plantilla por su ID
  async getTemplateById(templateId: string) {
    try {
      const { data, error } = await this.supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (error) {
        console.error(`Error al obtener plantilla ${templateId}:`, error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Error al obtener plantilla ${templateId}:`, error);
      return null;
    }
  }

  // Método para actualizar una plantilla
  async updateTemplate(templateId: string, updates: any) {
    try {
      // Si la plantilla se marca como predeterminada, desmarcar otras plantillas del mismo tipo
      if (updates.isDefault) {
        const { data: currentTemplate } = await this.supabase
          .from('notification_templates')
          .select('type')
          .eq('id', templateId)
          .single();
        
        if (currentTemplate) {
          await this.supabase
            .from('notification_templates')
            .update({ is_default: false })
            .eq('type', currentTemplate.type)
            .eq('is_default', true)
            .neq('id', templateId);
        }
      }
      
      const { data, error } = await this.supabase
        .from('notification_templates')
        .update({
          name: updates.name,
          description: updates.description,
          content: updates.content,
          variables: updates.variables,
          subject: updates.subject,
          is_default: updates.isDefault,
          updated_at: new Date(),
          whatsapp_template_name: updates.whatsappTemplateName,
        })
        .eq('id', templateId)
        .select()
        .single();
      
      if (error) {
        console.error(`Error al actualizar plantilla ${templateId}:`, error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Error al actualizar plantilla ${templateId}:`, error);
      return null;
    }
  }

  // Método para eliminar una plantilla
  async deleteTemplate(templateId: string) {
    try {
      const { error } = await this.supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) {
        console.error(`Error al eliminar plantilla ${templateId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error al eliminar plantilla ${templateId}:`, error);
      return false;
    }
  }
}
