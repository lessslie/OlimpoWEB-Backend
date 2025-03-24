import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { Membership } from './entities/membership.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';

@ApiTags('memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una nueva membresía' })
  @ApiResponse({ status: 201, description: 'Membresía creada correctamente', type: Membership })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  async create(@Body() createMembershipDto: CreateMembershipDto) {
    try {
      return await this.membershipsService.create(createMembershipDto);
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las membresías' })
  @ApiResponse({ status: 200, description: 'Lista de membresías', type: [Membership] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  async findAll() {
    return await this.membershipsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener una membresía por ID' })
  @ApiResponse({ status: 200, description: 'Membresía encontrada', type: Membership })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Membresía no encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.membershipsService.findOne(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las membresías de un usuario' })
  @ApiResponse({ status: 200, description: 'Lista de membresías del usuario', type: [Membership] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findByUser(@Param('userId') userId: string) {
    return await this.membershipsService.findByUser(userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar una membresía' })
  @ApiResponse({ status: 200, description: 'Membresía actualizada correctamente', type: Membership })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Membresía no encontrada' })
  async update(@Param('id') id: string, @Body() updateMembershipDto: UpdateMembershipDto) {
    return await this.membershipsService.update(id, updateMembershipDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una membresía' })
  @ApiResponse({ status: 200, description: 'Membresía eliminada correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Membresía no encontrada' })
  async remove(@Param('id') id: string) {
    await this.membershipsService.remove(id);
    return { message: 'Membresía eliminada correctamente' };
  }

  @Post(':id/renew')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renovar una membresía' })
  @ApiResponse({ status: 200, description: 'Membresía renovada correctamente', type: Membership })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Membresía no encontrada' })
  async renewMembership(@Param('id') id: string) {
    return await this.membershipsService.renewMembership(id);
  }

  @Post('check-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar y actualizar membresías expiradas' })
  @ApiResponse({ status: 200, description: 'Verificación completada correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  async checkExpiredMemberships() {
    await this.membershipsService.checkExpiredMemberships();
    return { message: 'Verificación de membresías expiradas completada correctamente' };
  }
}
