import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import {
  Membership,
  MembershipStatus,
  MembershipType,
} from './entities/membership.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MembershipsService {
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async create(createMembershipDto: CreateMembershipDto): Promise<Membership> {
    try {
      // Calcular la fecha de finalización basada en el tipo de membresía
      const startDate = new Date(createMembershipDto.start_date);
      const endDate = new Date(startDate);

      if (createMembershipDto.type === MembershipType.MONTHLY) {
        // Para membresías mensuales, agregar 30 días
        endDate.setDate(startDate.getDate() + 30);
      } else if (createMembershipDto.type === MembershipType.KICKBOXING) {
        // Para membresías de kickboxing, verificar que se especifiquen los días por semana
        if (!createMembershipDto.days_per_week) {
          throw new HttpException(
            'Los días por semana son requeridos para membresías de kickboxing',
            HttpStatus.BAD_REQUEST,
          );
        }
        // Agregar 30 días para membresías de kickboxing también
        endDate.setDate(startDate.getDate() + 30);
      }

      const { data, error } = await this.supabase
        .from('memberships')
        .insert([
          {
            user_id: createMembershipDto.user_id,
            type: createMembershipDto.type,
            status: MembershipStatus.ACTIVE,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            days_per_week: createMembershipDto.days_per_week,
            price: createMembershipDto.price,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new HttpException(
          `Error al crear la membresía: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al crear la membresía: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Membership[]> {
    try {
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*');

      if (error) {
        throw new HttpException(
          `Error al obtener las membresías: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener las membresías: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<Membership> {
    try {
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new HttpException(
          `Error al obtener la membresía: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!data) {
        throw new HttpException(
          'Membresía no encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener la membresía: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByUser(userId: string): Promise<Membership[]> {
    try {
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new HttpException(
          `Error al obtener las membresías del usuario: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener las membresías del usuario: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateMembershipDto: UpdateMembershipDto,
  ): Promise<Membership> {
    try {
      // Verificar si la membresía existe
      await this.findOne(id);

      const { data, error } = await this.supabase
        .from('memberships')
        .update(updateMembershipDto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new HttpException(
          `Error al actualizar la membresía: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al actualizar la membresía: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Verificar si la membresía existe
      await this.findOne(id);

      const { error } = await this.supabase
        .from('memberships')
        .delete()
        .eq('id', id);

      if (error) {
        throw new HttpException(
          `Error al eliminar la membresía: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al eliminar la membresía: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Encuentra membresías que expirarán entre dos fechas y envía notificaciones
   * @param startDate Fecha de inicio del rango
   * @param endDate Fecha de fin del rango
   * @param sendNotifications Si es true, envía notificaciones a los usuarios
   * @returns Lista de membresías que expirarán en el rango especificado
   */
  async findExpiringMemberships(
    startDate: Date,
    endDate: Date,
    sendNotifications: boolean = false,
  ): Promise<Membership[]> {
    try {
      // Buscar membresías activas que expirarán en el rango de fechas
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('status', MembershipStatus.ACTIVE)
        .gte('end_date', startDate.toISOString())
        .lte('end_date', endDate.toISOString());

      if (error) {
        throw new HttpException(
          `Error al buscar membresías por expirar: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const memberships = data.map((membership) => ({
        ...membership,
        start_date: new Date(membership.start_date),
        end_date: new Date(membership.end_date),
        created_at: new Date(membership.created_at),
        updated_at: new Date(membership.updated_at),
      }));

      console.log(
        `Se encontraron ${memberships.length} membresías que expirarán entre ${startDate.toLocaleDateString()} y ${endDate.toLocaleDateString()}`,
      );

      // Si se solicita enviar notificaciones
      if (sendNotifications && memberships.length > 0) {
        console.log('Enviando notificaciones de expiración próxima...');

        for (const membership of memberships) {
          try {
            // Obtener información del usuario
            const { data: userData, error: userError } = await this.supabase
              .from('users')
              .select('id, email, full_name, first_name, last_name, phone')
              .eq('id', membership.user_id)
              .single();

            if (userError) {
              console.error(
                `Error al obtener datos del usuario para la membresía ${membership.id}: ${userError.message}`,
              );
              continue;
            }

            if (userData && userData.email) {
              // Construir el nombre completo si no está disponible
              const fullName =
                userData.full_name ||
                `${userData.first_name} ${userData.last_name}`.trim();

              // Calcular días restantes
              const today = new Date();
              const daysRemaining = Math.ceil(
                (membership.end_date.getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24),
              );

              // Enviar notificación por email
              await this.notificationsService.sendEmail(
                userData.email,
                'Tu membresía está por expirar - Olimpo Gym',
                `Hola ${fullName},

Te recordamos que tu membresía ${membership.type} en Olimpo Gym expirará en ${daysRemaining} días (${membership.end_date.toLocaleDateString()}).

Para evitar interrupciones en tu acceso al gimnasio, te recomendamos renovar tu membresía antes de la fecha de expiración.

Puedes renovarla visitando nuestras instalaciones o desde nuestra página web.

¡Gracias por ser parte de Olimpo Gym!

Saludos,
El equipo de Olimpo Gym`,
              );

              console.log(
                `Notificación de expiración próxima enviada por email a ${userData.email}`,
              );

              // Si el usuario tiene teléfono, enviar también por WhatsApp
              if (userData.phone) {
                try {
                  // Buscar si existe una plantilla para notificaciones de expiración por WhatsApp
                  const { data: templates, error: templateError } = await this.supabase
                    .from('notification_templates')
                    .select('*')
                    .eq('type', 'WHATSAPP')
                    .eq('is_default', true)
                    .ilike('name', '%expiracion%')
                    .limit(1);
                  
                  let templateId: string | undefined = undefined;
                  if (!templateError && templates && templates.length > 0) {
                    templateId = templates[0].id;
                  }
                  
                  // Construir mensaje para WhatsApp
                  const message = `Hola ${fullName},\n\nTe informamos que tu membresía ${membership.type} en Olimpo Gym expirará en ${daysRemaining} días (${membership.end_date.toLocaleDateString()}).\n\nPuedes renovarla visitando nuestras instalaciones o desde nuestra página web.\n\n¡Gracias por ser parte de Olimpo Gym!\n\nSaludos,\nEl equipo de Olimpo Gym`;

                  // Enviar notificación por WhatsApp
                  const whatsappSuccess = await this.notificationsService.sendWhatsApp(
                    userData.phone,
                    message,
                    userData.id,
                    membership.id,
                    templateId
                  );
                  
                  if (whatsappSuccess) {
                    console.log(
                      `Notificación de expiración enviada por WhatsApp a ${userData.phone}`,
                    );
                  } else {
                    console.warn(
                      `No se pudo enviar la notificación de expiración por WhatsApp a ${userData.phone}`,
                    );
                  }
                } catch (whatsappError) {
                  console.error(
                    `Error al enviar notificación por WhatsApp para la membresía ${membership.id}: ${whatsappError.message}`,
                  );
                  // Continuar con el proceso aunque falle el envío por WhatsApp
                }
              }
            }
          } catch (notificationError) {
            console.error(
              `Error al enviar notificación para la membresía ${membership.id}: ${notificationError.message}`,
            );
          }
        }
      }

      return memberships;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al buscar membresías por expirar: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAutoRenewMemberships(
    startDate: Date,
    endDate: Date,
  ): Promise<Membership[]> {
    try {
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('status', MembershipStatus.ACTIVE)
        .eq('auto_renew', true)
        .gte('end_date', startDate.toISOString())
        .lte('end_date', endDate.toISOString());

      if (error) {
        throw new HttpException(
          `Error al buscar membresías para renovación automática: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data.map((membership) => ({
        ...membership,
        start_date: new Date(membership.start_date),
        end_date: new Date(membership.end_date),
        created_at: new Date(membership.created_at),
        updated_at: new Date(membership.updated_at),
      }));
    } catch (error) {
      throw new HttpException(
        `Error al buscar membresías para renovación automática: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async renewMembership(id: string): Promise<Membership> {
    try {
      // Obtener la membresía actual
      const { data: membership, error: fetchError } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new HttpException(
          `Error al obtener la membresía: ${fetchError.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!membership) {
        throw new HttpException(
          `No se encontró la membresía con ID: ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Calcular la nueva fecha de finalización
      const currentEndDate = new Date(membership.end_date);
      const newEndDate = new Date(currentEndDate);

      if (
        membership.type === MembershipType.MONTHLY ||
        membership.type === MembershipType.KICKBOXING
      ) {
        // Para membresías mensuales o kickboxing, agregar 30 días
        newEndDate.setDate(currentEndDate.getDate() + 30);
      } else if (membership.type === MembershipType.QUARTERLY) {
        // Para membresías trimestrales, agregar 90 días
        newEndDate.setDate(currentEndDate.getDate() + 90);
      } else if (membership.type === MembershipType.BIANNUAL) {
        // Para membresías semestrales, agregar 180 días
        newEndDate.setDate(currentEndDate.getDate() + 180);
      } else if (membership.type === MembershipType.ANNUAL) {
        // Para membresías anuales, agregar 365 días
        newEndDate.setDate(currentEndDate.getDate() + 365);
      }

      // Actualizar la membresía con la nueva fecha de finalización
      const { data: updatedMembership, error: updateError } =
        await this.supabase
          .from('memberships')
          .update({
            end_date: newEndDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

      if (updateError) {
        throw new HttpException(
          `Error al renovar la membresía: ${updateError.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        ...updatedMembership,
        start_date: new Date(updatedMembership.start_date),
        end_date: new Date(updatedMembership.end_date),
        created_at: new Date(updatedMembership.created_at),
        updated_at: new Date(updatedMembership.updated_at),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al renovar la membresía: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkExpiredMemberships(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar membresías activas que hayan expirado
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('status', MembershipStatus.ACTIVE)
        .lt('end_date', today.toISOString());

      if (error) {
        throw new HttpException(
          `Error al verificar membresías expiradas: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      console.log(`Se encontraron ${data.length} membresías expiradas`);

      // Actualizar el estado de las membresías expiradas
      for (const membership of data) {
        // Actualizar el estado de la membresía a expirado
        const { error: updateError } = await this.supabase
          .from('memberships')
          .update({
            status: MembershipStatus.EXPIRED,
            updated_at: new Date().toISOString(),
          })
          .eq('id', membership.id);

        if (updateError) {
          console.error(
            `Error al actualizar la membresía ${membership.id}: ${updateError.message}`,
          );
          continue;
        }

        console.log(`Membresía ${membership.id} marcada como expirada`);

        // Obtener información del usuario para enviar notificación
        try {
          const { data: userData, error: userError } = await this.supabase
            .from('users')
            .select('id, email, full_name, first_name, last_name, phone')
            .eq('id', membership.user_id)
            .single();

          if (userError) {
            console.error(
              `Error al obtener datos del usuario para la membresía ${membership.id}: ${userError.message}`,
            );
            continue;
          }

          if (userData && userData.email) {
            // Construir el nombre completo si no está disponible
            const fullName =
              userData.full_name ||
              `${userData.first_name} ${userData.last_name}`.trim();

            // Enviar notificación por email
            await this.notificationsService.sendMembershipExpirationNotification({
              email: userData.email,
              name: fullName,
              expirationDate: new Date(membership.end_date),
              membershipType: membership.type,
              userId: userData.id || undefined,
              membershipId: membership.id
            });

            console.log(
              `Notificación de expiración enviada por email a ${userData.email}`,
            );

            // Si el usuario tiene teléfono, enviar también por WhatsApp
            if (userData.phone) {
              try {
                // Buscar si existe una plantilla para notificaciones de expiración por WhatsApp
                const { data: templates, error: templateError } = await this.supabase
                  .from('notification_templates')
                  .select('*')
                  .eq('type', 'WHATSAPP')
                  .eq('is_default', true)
                  .ilike('name', '%expiracion%')
                  .limit(1);
                
                let templateId: string | undefined = undefined;
                if (!templateError && templates && templates.length > 0) {
                  templateId = templates[0].id;
                }
                
                // Construir mensaje para WhatsApp
                const message = `Hola ${fullName},\n\nTe informamos que tu membresía ${membership.type} en Olimpo Gym ha expirado el ${new Date(membership.end_date).toLocaleDateString()}.\n\nPuedes renovarla visitando nuestras instalaciones o desde nuestra página web.\n\n¡Esperamos verte pronto!\n\nSaludos,\nEl equipo de Olimpo Gym`;

                // Enviar notificación por WhatsApp
                const whatsappSuccess = await this.notificationsService.sendWhatsApp(
                  userData.phone,
                  message,
                  userData.id,
                  membership.id,
                  templateId
                );
                
                if (whatsappSuccess) {
                  console.log(
                    `Notificación de expiración enviada por WhatsApp a ${userData.phone}`,
                  );
                } else {
                  console.warn(
                    `No se pudo enviar la notificación de expiración por WhatsApp a ${userData.phone}`,
                  );
                }
              } catch (whatsappError) {
                console.error(
                  `Error al enviar notificación por WhatsApp para la membresía ${membership.id}: ${whatsappError.message}`,
                );
                // Continuar con el proceso aunque falle el envío por WhatsApp
              }
            }
          }
        } catch (notificationError) {
          console.error(
            `Error al enviar notificación para la membresía ${membership.id}: ${notificationError.message}`,
          );
        }
      }

      console.log(`Se actualizaron ${data.length} membresías expiradas`);
    } catch (error) {
      console.error('Error al verificar membresías expiradas:', error);
    }
  }

  async autoRenewMemberships(): Promise<void> {
    try {
      // Obtener membresías expiradas con auto_renew activado
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('status', MembershipStatus.EXPIRED)
        .eq('auto_renew', true);

      if (error) {
        throw new HttpException(
          `Error al obtener membresías para renovación automática: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      console.log(
        `Se encontraron ${data.length} membresías para renovación automática`,
      );

      // Renovar cada membresía
      for (const membership of data) {
        try {
          // Renovar la membresía
          const renewedMembership = await this.renewMembership(membership.id);

          // Obtener información del usuario para la notificación
          const { data: userData, error: userError } = await this.supabase
            .from('users')
            .select('id, email, full_name, first_name, last_name, phone')
            .eq('id', membership.user_id)
            .single();

          if (userError) {
            console.error(
              `Error al obtener datos del usuario para la membresía ${membership.id}: ${userError.message}`,
            );
            continue;
          }

          if (userData && userData.email) {
            // Construir el nombre completo si no está disponible
            const fullName =
              userData.full_name ||
              `${userData.first_name} ${userData.last_name}`.trim();

            // Enviar notificación por email
            await this.notificationsService.sendMembershipRenewalNotification({
              email: userData.email,
              name: fullName,
              newExpirationDate: renewedMembership.end_date,
              membershipType: renewedMembership.type,
              userId: userData.id || undefined,
              membershipId: renewedMembership.id
            });

            console.log(
              `Notificación de renovación enviada por email a ${userData.email}`,
            );

            // Si el usuario tiene teléfono, enviar también por WhatsApp
            if (userData.phone) {
              try {
                // Buscar si existe una plantilla para notificaciones de expiración por WhatsApp
                const { data: templates, error: templateError } = await this.supabase
                  .from('notification_templates')
                  .select('*')
                  .eq('type', 'WHATSAPP')
                  .eq('is_default', true)
                  .ilike('name', '%expiracion%')
                  .limit(1);
                
                let templateId: string | undefined = undefined;
                if (!templateError && templates && templates.length > 0) {
                  templateId = templates[0].id;
                }
                
                // Construir mensaje para WhatsApp
                const message = `Hola ${fullName},\n\nTe informamos que tu membresía ${renewedMembership.type} en Olimpo Gym ha sido renovada exitosamente.\n\nTu nueva fecha de expiración es el ${renewedMembership.end_date.toLocaleDateString()}.\n\n¡Gracias por seguir confiando en Olimpo Gym!\n\nSaludos,\nEl equipo de Olimpo Gym`;

                // Enviar notificación por WhatsApp
                const whatsappSuccess = await this.notificationsService.sendWhatsApp(
                  userData.phone,
                  message,
                  userData.id,
                  membership.id,
                  templateId
                );
                
                if (whatsappSuccess) {
                  console.log(
                    `Notificación de renovación enviada por WhatsApp a ${userData.phone}`,
                  );
                } else {
                  console.warn(
                    `No se pudo enviar la notificación de renovación por WhatsApp a ${userData.phone}`,
                  );
                }
              } catch (whatsappError) {
                console.error(
                  `Error al enviar notificación por WhatsApp para la membresía ${membership.id}: ${whatsappError.message}`,
                );
                // Continuar con el proceso aunque falle el envío por WhatsApp
              }
            }

            console.log(`Membresía ${membership.id} renovada automáticamente`);
          }
        } catch (renewError) {
          console.error(
            `Error al renovar la membresía ${membership.id}: ${renewError.message}`,
          );
        }
      }

      console.log(`Proceso de renovación automática completado`);
    } catch (error) {
      console.error(
        `Error en la renovación automática de membresías: ${error.message}`,
      );
      throw new HttpException(
        `Error en la renovación automática de membresías: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
