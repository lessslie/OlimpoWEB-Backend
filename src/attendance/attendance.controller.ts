import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { Attendance } from './entities/attendance.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { DebugService } from 'src/debug/debug.service';
import { Request as ExpressRequest } from 'express';
import { getErrorMessage } from '../common/utils/error-handler.util';

interface CustomRequest extends ExpressRequest {
  user: {
    id: string;
    is_admin: boolean;
  };
}

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly debugService: DebugService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar una nueva asistencia' })
  @ApiResponse({
    status: 201,
    description: 'Asistencia registrada correctamente',
    type: Attendance,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async create(@Body() createAttendanceDto: CreateAttendanceDto) {
    try {
      return await this.attendanceService.create(createAttendanceDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al registrar la asistencia: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las asistencias' })
  @ApiResponse({
    status: 200,
    description: 'Lista de asistencias',
    type: [Attendance],
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async findAll() {
    return await this.attendanceService.findAll();
  }

  @Get('date-range')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener asistencias por rango de fechas' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Fecha de inicio (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'Fecha de fin (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de asistencias',
    type: [Attendance],
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new HttpException(
        'Se requieren las fechas de inicio y fin',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.attendanceService.findByDateRange(startDate, endDate);
  }

  @Get('check-in')
  @ApiOperation({
    summary: 'Registrar asistencia mediante escaneo de QR (sin autenticación)',
  })
  @ApiResponse({
    status: 201,
    description: 'Asistencia registrada correctamente',
    type: Attendance,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o usuario sin membresía activa',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async checkInWithQR(@Query('data') encodedData: string) {
    try {
      if (!encodedData) {
        throw new HttpException(
          'No se proporcionaron datos para el registro de asistencia',
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log('QR Raw data:', encodedData);

      // Decodificar los datos del QR
      const decodedData = decodeURIComponent(encodedData);
      console.log('QR Decoded data:', decodedData);

      let qrData;

      try {
        // Intentar parsear como JSON directamente
        qrData = JSON.parse(decodedData);
        console.log('QR Parsed data:', qrData);
      } catch (e) {
        console.error('JSON parse error:', e.message);
        
        // Si falla, puede ser que el formato sea diferente
        // Intentar extraer el JSON de la URL si es necesario
        try {
          // Buscar si hay un patrón como data={"key":"value"}
          const match = decodedData.match(/data=(.+)$/);
          if (match && match[1]) {
            const jsonStr = decodeURIComponent(match[1]);
            console.log('Extracted JSON string:', jsonStr);
            qrData = JSON.parse(jsonStr);
            console.log('QR Parsed data from URL:', qrData);
          } else {
            throw new Error('No se pudo extraer datos JSON de la URL');
          }
        } catch (extractError) {
          console.error('Error extracting JSON from URL:', extractError);
          throw new HttpException(
            'Formato de datos inválido en el QR: ' + e.message,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Verificar que exista el user_id
      if (!qrData.user_id) {
        // Si no existe user_id, intentar buscar en otras propiedades
        if (qrData.userId) {
          qrData.user_id = qrData.userId;
        } else {
          console.error('No se encontró user_id en los datos:', qrData);
          throw new HttpException(
            'Error: No se proporcionó el ID de usuario en el código QR',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      console.log('Datos procesados para registro de asistencia:', {
        user_id: qrData.user_id,
        check_in_time: new Date().toISOString(),
      });

      // Registrar la asistencia con una verificación mínima
      try {
        const attendance = await this.attendanceService.create({
          user_id: qrData.user_id,
          check_in_time: new Date().toISOString(),
        });

        return {
          success: true,
          message: 'Asistencia registrada correctamente',
          attendance,
        };
      } catch (error) {
        console.error('Error al crear asistencia:', error);

        // Si es un error de membresía, intentar una solución alternativa
        if (
          error instanceof Error && 
          error.message && 
          error.message.includes('membresía activa')
        ) {
          console.log(
            'Intentando registrar asistencia sin verificación de membresía',
          );

          // Insertar directamente en la base de datos
          const { data, error: insertError } =
            await this.attendanceService.supabase
              .from('attendances')
              .insert([
                {
                  user_id: qrData.user_id,
                  check_in_time: new Date().toISOString(),
                },
              ])
              .select()
              .single();

          if (insertError) {
            console.error('Error en inserción directa:', insertError);
            throw new HttpException(
              `Error al registrar asistencia directamente: ${getErrorMessage(
                insertError,
              )}`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          return {
            success: true,
            message: 'Asistencia registrada directamente',
            attendance: data,
          };
        }

        throw error;
      }
    } catch (error) {
      console.error('Error completo en checkInWithQR:', error);

      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al registrar asistencia: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener una asistencia por ID' })
  @ApiResponse({
    status: 200,
    description: 'Asistencia encontrada',
    type: Attendance,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Asistencia no encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.attendanceService.findOne(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las asistencias de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de asistencias del usuario',
    type: [Attendance],
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findByUser(@Param('userId') userId: string) {
    return await this.attendanceService.findByUser(userId);
  }

  @Get('user/:userId/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener historial de asistencias de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Historial de asistencias obtenido correctamente',
    type: [Attendance],
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getUserAttendanceHistory(
    @Param('userId') userId: string,
    @Request() req,
  ) {
    try {
      // Verificar que el usuario esté solicitando su propio historial o sea un administrador
      if (req.user.id !== userId && req.user.role !== Role.ADMIN) {
        throw new HttpException(
          'No tienes permiso para ver el historial de asistencias de este usuario',
          HttpStatus.FORBIDDEN,
        );
      }

      // Obtener el historial de asistencias del usuario
      const attendanceHistory = await this.attendanceService.findByUser(userId);

      return attendanceHistory;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener el historial de asistencias: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar una asistencia' })
  @ApiResponse({
    status: 200,
    description: 'Asistencia actualizada correctamente',
    type: Attendance,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  @ApiResponse({ status: 404, description: 'Asistencia no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return await this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una asistencia' })
  @ApiResponse({
    status: 200,
    description: 'Asistencia eliminada correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  @ApiResponse({ status: 404, description: 'Asistencia no encontrada' })
  async remove(@Param('id') id: string) {
    await this.attendanceService.remove(id);
    return { message: 'Asistencia eliminada correctamente' };
  }

  @Post(':id/check-out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar la salida de una asistencia' })
  @ApiResponse({
    status: 200,
    description: 'Salida registrada correctamente',
    type: Attendance,
  })
  @ApiResponse({ status: 400, description: 'La salida ya ha sido registrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  @ApiResponse({ status: 404, description: 'Asistencia no encontrada' })
  async checkOut(@Param('id') id: string) {
    return await this.attendanceService.checkOut(id);
  }

  @Post('qr/generate/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar un código QR para un usuario' })
  @ApiResponse({ status: 200, description: 'Código QR generado correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async generateQRCode(@Param('userId') userId: string) {
    const qrCode = await this.attendanceService.generateQRCode(userId);
    return { qrCode };
  }

  @Post('qr/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar un código QR y registrar asistencia' })
  @ApiResponse({
    status: 200,
    description: 'Asistencia registrada correctamente',
    type: Attendance,
  })
  @ApiResponse({
    status: 400,
    description: 'Código QR inválido o usuario sin membresía activa',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async verifyQRCode(@Body() body: { token: string }) {
    try {
      const { userId } = await this.attendanceService.verifyQRCode(body.token);

      // Registrar la asistencia
      return await this.attendanceService.create({ user_id: userId });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al verificar el código QR: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Registrar asistencia de un usuario autenticado' })
  @ApiResponse({
    status: 201,
    description: 'Asistencia registrada correctamente',
    type: Attendance,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async registerAttendance(
    @Body() body: { qrData: { type: string }; userId: string },
    @Request() req: CustomRequest,
  ) {
    try {
      console.log('Recibido registro de asistencia:', body);

      // Verificar que el QR sea válido
      if (!body.qrData || body.qrData.type !== 'gym_attendance') {
        throw new HttpException(
          'Código QR inválido para registro de asistencia',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verificar que el usuario esté registrando su propia asistencia o sea un administrador
      if (req.user.id !== body.userId && !req.user.is_admin) {
        throw new HttpException(
          'No tienes permiso para registrar la asistencia de otro usuario',
          HttpStatus.FORBIDDEN,
        );
      }

      // Registrar la asistencia
      const attendance = await this.attendanceService.create({
        user_id: body.userId,
        check_in_time: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error al registrar asistencia:', error);
      throw error;
    }
  }
}
