import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { Attendance } from './entities/attendance.entity';
import * as QRCode from 'qrcode';
import { MembershipsService } from '../memberships/memberships.service';
import { MembershipStatus } from '../memberships/entities/membership.entity';
import { getErrorMessage } from '../common/utils/error-handler.util';

@Injectable()
export class AttendanceService {
  public supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private membershipsService: MembershipsService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async create(
    createAttendanceDto: CreateAttendanceDto,
    adminId?: string,
  ): Promise<Attendance> {
    try {
      console.log('Iniciando creación de asistencia:', {
        dto: createAttendanceDto,
        adminId: adminId || 'No proporcionado',
      });

      // Verificar que el usuario existe antes de crear la asistencia
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', createAttendanceDto.user_id)
        .single();

      if (userError) {
        console.error('Error al verificar usuario:', userError);
        throw new HttpException(
          `Usuario no encontrado: ${getErrorMessage(userError)}`,
          HttpStatus.NOT_FOUND,
        );
      }

      console.log('Usuario encontrado:', userData);

      // Verificar si ya existe una asistencia para el usuario en el día actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log('Verificando asistencias existentes entre:', {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
      });

      const { data: existingAttendance, error: existingError } =
        await this.supabase
          .from('attendances')
          .select('*')
          .eq('user_id', createAttendanceDto.user_id)
          .gte('check_in_time', today.toISOString())
          .lt('check_in_time', tomorrow.toISOString())
          .order('check_in_time', { ascending: false })
          .maybeSingle();

      if (existingError) {
        console.error('Error al verificar asistencias existentes:', existingError);
        // No lanzamos excepción, continuamos con el proceso
      }

      if (existingAttendance) {
        console.log('Ya existe una asistencia para hoy:', existingAttendance);
        
        // Si ya existe una asistencia sin check_out_time, devolvemos esa
        if (!existingAttendance.check_out_time) {
          return existingAttendance;
        }
        
        // Si ya tiene check_out_time, creamos una nueva entrada
        console.log('La asistencia existente ya tiene check_out_time, creando nueva entrada');
      }

      // Buscar membresía activa para el usuario
      let membershipId = createAttendanceDto.membership_id;

      if (!membershipId) {
        console.log('No se proporcionó membership_id, buscando membresía activa');
        try {
          const memberships = await this.membershipsService.findByUser(
            createAttendanceDto.user_id,
          );
          console.log('Membresías encontradas:', memberships.length);

          const activeMembership = memberships.find(
            (m) => m.status === MembershipStatus.ACTIVE,
          );

          if (activeMembership) {
            console.log('Membresía activa encontrada:', activeMembership.id);
            membershipId = activeMembership.id;
          } else if (memberships.length > 0) {
            // Si no hay membresía activa pero hay otras, usar la primera
            console.log(
              'No hay membresía activa, usando la primera disponible:',
              memberships[0].id,
            );
            membershipId = memberships[0].id;
          } else {
            console.log('No se encontraron membresías');
          }
        } catch (membershipError) {
          console.error(
            'Error no crítico al buscar membresías:',
            getErrorMessage(membershipError),
          );
          // Continuamos sin membresía
        }
      }

      console.log('Insertando asistencia con membership_id:', membershipId);

      // Preparar datos para inserción
      const insertData = {
        user_id: createAttendanceDto.user_id,
        membership_id: createAttendanceDto.membership_id || membershipId,
        check_in_time:
          createAttendanceDto.check_in_time || new Date().toISOString(),
      };

      console.log('Datos para inserción:', insertData);

      const { data, error } = await this.supabase
        .from('attendances')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Error en la inserción:', error);

        // Intentar inserción sin membership_id si ese fue el problema
        if (
          error.message.includes('membership_id') ||
          error.message.includes('foreign key') ||
          error.message.includes('violates not-null constraint')
        ) {
          console.log('Reintentando sin membership_id');
          const { data: retryData, error: retryError } = await this.supabase
            .from('attendances')
            .insert([
              {
                user_id: createAttendanceDto.user_id,
                check_in_time:
                  createAttendanceDto.check_in_time || new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (retryError) {
            console.error('Error al reintentar inserción:', retryError);
            throw new HttpException(
              `Error al reintentar inserción: ${getErrorMessage(retryError)}`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          console.log('Asistencia creada exitosamente (reintento):', retryData);
          return retryData;
        }

        throw new HttpException(
          `Error al registrar la asistencia: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      console.log('Asistencia creada exitosamente:', data);
      return data;
    } catch (error: unknown) {
      console.error('Error completo en create:', error);

      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Error al registrar la asistencia: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Attendance[]> {
    try {
      const { data, error } = await this.supabase
        .from('attendances')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (error) {
        throw new HttpException(
          `Error al obtener las asistencias: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error: unknown) {
      console.error('Error en findAll:', error);
      
      throw new HttpException(
        `Error al obtener las asistencias: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<Attendance> {
    try {
      const { data, error } = await this.supabase
        .from('attendances')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new HttpException(
          `Error al obtener la asistencia: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!data) {
        throw new HttpException(
          'Asistencia no encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      return data;
    } catch (error: unknown) {
      console.error('Error en findOne:', error);
      
      throw new HttpException(
        `Error al obtener la asistencia: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByUser(userId: string): Promise<Attendance[]> {
    try {
      const { data, error } = await this.supabase
        .from('attendances')
        .select('*')
        .eq('user_id', userId)
        .order('check_in_time', { ascending: false });

      if (error) {
        throw new HttpException(
          `Error al obtener las asistencias del usuario: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error: unknown) {
      console.error('Error en findByUser:', error);
      
      throw new HttpException(
        `Error al obtener las asistencias del usuario: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Attendance[]> {
    try {
      const { data, error } = await this.supabase
        .from('attendances')
        .select('*')
        .gte('check_in_time', startDate)
        .lte('check_in_time', endDate)
        .order('check_in_time', { ascending: false });

      if (error) {
        throw new HttpException(
          `Error al obtener las asistencias por rango de fechas: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error: unknown) {
      console.error('Error en findByDateRange:', error);
      
      throw new HttpException(
        `Error al obtener las asistencias por rango de fechas: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateAttendanceDto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    try {
      // Verificar si la asistencia existe
      await this.findOne(id);

      const { data, error } = await this.supabase
        .from('attendances')
        .update(updateAttendanceDto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new HttpException(
          `Error al actualizar la asistencia: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error: unknown) {
      console.error('Error en update:', error);
      
      throw new HttpException(
        `Error al actualizar la asistencia: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Verificar si la asistencia existe
      await this.findOne(id);

      const { error } = await this.supabase
        .from('attendances')
        .delete()
        .eq('id', id);

      if (error) {
        throw new HttpException(
          `Error al eliminar la asistencia: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error: unknown) {
      console.error('Error en remove:', error);
      
      throw new HttpException(
        `Error al eliminar la asistencia: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkOut(id: string): Promise<Attendance> {
    try {
      // Verificar si la asistencia existe
      const attendance = await this.findOne(id);

      // Verificar si ya se registró la salida
      if (attendance.check_out_time) {
        throw new HttpException(
          'La salida ya ha sido registrada',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Registrar la salida
      const { data, error } = await this.supabase
        .from('attendances')
        .update({ check_out_time: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new HttpException(
          `Error al registrar la salida: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error: unknown) {
      console.error('Error en checkOut:', error);
      
      throw new HttpException(
        `Error al registrar la salida: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateQRCode(userId: string): Promise<string> {
    try {
      // Generar un token único para el QR
      const token = `${userId}_${Date.now()}`;

      // Generar el código QR
      const qrCode = await QRCode.toDataURL(token);

      return qrCode;
    } catch (error: unknown) {
      console.error('Error en generateQRCode:', error);
      
      throw new HttpException(
        `Error al generar el código QR: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyQRCode(token: string): Promise<{ userId: string }> {
    try {
      // Verificar el formato del token
      const parts = token.split('_');
      if (parts.length !== 2) {
        throw new HttpException(
          'Formato de token inválido',
          HttpStatus.BAD_REQUEST,
        );
      }

      const userId = parts[0];

      // Verificar si el usuario existe y tiene una membresía activa
      const memberships = await this.membershipsService.findByUser(userId);
      const activeMembership = memberships.find(
        (m) => m.status === MembershipStatus.ACTIVE,
      );

      if (!activeMembership) {
        throw new HttpException(
          'El usuario no tiene una membresía activa',
          HttpStatus.BAD_REQUEST,
        );
      }

      return { userId };
    } catch (error: unknown) {
      console.error('Error en verifyQRCode:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Error al verificar el código QR: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
