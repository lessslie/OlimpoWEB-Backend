import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoutinesService } from './routines.service';
import { RoutineDto } from './dto/routine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Ajusta la ruta según tu estructura

@ApiTags('routines')
@Controller('users/:userId/routine')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener la rutina de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Rutina obtenida correctamente',
    type: RoutineDto,
  })
  @ApiResponse({ status: 404, description: 'Rutina no encontrada' })
  async findOne(@Param('userId') userId: string) {
    return this.routinesService.findByUserId(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear o actualizar la rutina de un usuario' })
  @ApiResponse({
    status: 201,
    description: 'Rutina creada/actualizada correctamente',
    type: RoutineDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createOrUpdate(
    @Param('userId') userId: string,
    @Body() routineDto: RoutineDto,
  ) {
    return this.routinesService.create(userId, routineDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Eliminar la rutina de un usuario' })
  @ApiResponse({ status: 200, description: 'Rutina eliminada correctamente' })
  @ApiResponse({ status: 404, description: 'Rutina no encontrada' })
  async remove(@Param('userId') userId: string) {
    await this.routinesService.remove(userId);
    return { message: 'Rutina eliminada correctamente' };
  }
}
