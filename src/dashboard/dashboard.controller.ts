import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas generales para el dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('memberships')
  @ApiOperation({ summary: 'Obtener estadísticas de membresías' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async getMembershipStats() {
    return this.dashboardService.getMembershipStats();
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Obtener estadísticas de asistencia' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async getAttendanceStats() {
    return this.dashboardService.getAttendanceStats();
  }

  @Get('blog')
  @ApiOperation({ summary: 'Obtener estadísticas del blog' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async getBlogStats() {
    return this.dashboardService.getBlogStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Obtener estadísticas de nuevos usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async getNewUsersStats() {
    return this.dashboardService.getNewUsersStats();
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Obtener datos para el gráfico de ingresos mensuales',
  })
  @ApiResponse({ status: 200, description: 'Datos obtenidos correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async getMonthlyRevenueData() {
    return this.dashboardService.getMonthlyRevenueData();
  }

  @Get('attendance/daily')
  @ApiOperation({
    summary: 'Obtener datos para el gráfico de asistencia diaria',
  })
  @ApiResponse({ status: 200, description: 'Datos obtenidos correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  async getDailyAttendanceData() {
    return this.dashboardService.getDailyAttendanceData();
  }
}
