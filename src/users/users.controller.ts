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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService, User } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getErrorMessage } from '../common/utils/error-handler.util';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado correctamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'El usuario ya existe' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createUserDto: User) {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = getErrorMessage(error) as string | undefined;
      if (errorMessage && errorMessage.includes('already exists')) {
        throw new HttpException('El usuario ya existe', HttpStatus.CONFLICT);
      }

      const errorMsg =
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : 'Error al crear usuario';

      throw new HttpException(errorMsg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado correctamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: Partial<User>) {
    const user = await this.usersService.update(id, updateUserDto);
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado correctamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    const user = await this.usersService.remove(id);
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    return { message: 'Usuario eliminado correctamente' };
  }

  // @Get(':id/routine')
  // @ApiOperation({ summary: 'Obtener la rutina de un usuario' })
  // @ApiResponse({ status: 200, description: 'Rutina obtenida correctamente' })
  // @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  // async getUserRoutine(@Param('id') id: string) {
  //   return this.usersService.getUserRoutine(id);
  // }

  // @Post(':id/routine')
  // @ApiOperation({ summary: 'Crear o actualizar la rutina de un usuario' })
  // @ApiResponse({ status: 200, description: 'Rutina actualizada correctamente' })
  // @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  // async setUserRoutine(
  //   @Param('id') id: string,
  //   @Body() routineDto: RoutineDto,
  // ) {
  //   return this.usersService.setUserRoutine(id, routineDto);
  // }

  // @Delete(':id/routine')
  // @ApiOperation({ summary: 'Eliminar la rutina de un usuario' })
  // @ApiResponse({ status: 200, description: 'Rutina eliminada correctamente' })
  // @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  // async deleteUserRoutine(@Param('id') id: string) {
  //   return this.usersService.deleteUserRoutine(id);
  // }
}
