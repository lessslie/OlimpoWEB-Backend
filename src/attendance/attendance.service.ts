import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { Attendance } from './entities/attendance.entity';
import * as QRCode from 'qrcode';
import { MembershipsService } from '../memberships/memberships.service';
import { MembershipStatus } from '../memberships/entities/membership.entity';

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

  // Método create simplificado para attendance.service.ts
  async create(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    try {
      console.log(
        'Creando asistencia para usuario:',
        createAttendanceDto.user_id,
      );

      // Saltarse verificación de membresía en desarrollo o entorno de prueba
      const skipMembershipCheck =
        this.configService.get<string>('SKIP_MEMBERSHIP_CHECK') === 'true' ||
        this.configService.get<string>('NODE_ENV') === 'development';

      // Declarar membershipId como string | null, no solo null
      let membershipId: string | null = null;

      if (!skipMembershipCheck) {
        try {
          // Intentar obtener membresía activa
          const memberships = await this.membershipsService.findByUser(
            createAttendanceDto.user_id,
          );
          console.log('Membresías encontradas:', memberships.length);

          const activeMembership = memberships.find(
            (m) => m.status === MembershipStatus.ACTIVE,
          );

          if (activeMembership) {
            console.log('Membresía activa encontrada');
            membershipId = activeMembership.id;
          } else if (memberships.length > 0) {
            // Si no hay membresía activa pero hay otras, usar la primera
            console.log(
              'No hay membresía activa, usando la primera disponible',
            );
            membershipId = memberships[0].id;
          } else {
            console.log('No se encontraron membresías');
          }
        } catch (membershipError) {
          console.error(
            'Error no crítico al buscar membresías:',
            membershipError,
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
          error.message.includes('foreign key')
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
            throw new HttpException(
              `Error al reintentar inserción: ${retryError.message}`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          return retryData;
        }

        throw new HttpException(
          `Error al registrar la asistencia: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
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
        `Error al registrar la asistencia: ${error.message}`,
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
          `Error al obtener las asistencias: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener las asistencias: ${error.message}`,
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
          `Error al obtener la asistencia: ${error.message}`,
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener la asistencia: ${error.message}`,
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
          `Error al obtener las asistencias del usuario: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener las asistencias del usuario: ${error.message}`,
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
          `Error al obtener las asistencias por rango de fechas: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener las asistencias por rango de fechas: ${error.message}`,
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
          `Error al actualizar la asistencia: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al actualizar la asistencia: ${error.message}`,
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
          `Error al eliminar la asistencia: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al eliminar la asistencia: ${error.message}`,
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
          `Error al registrar la salida: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al registrar la salida: ${error.message}`,
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
    } catch (error) {
      throw new HttpException(
        `Error al generar el código QR: ${error.message}`,
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
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Error al verificar el código QR: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
