import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Get,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado correctamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'El usuario ya existe' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      // Validar que las contraseñas coincidan
      if (registerDto.password !== registerDto.confirmPassword) {
        throw new HttpException(
          'Las contraseñas no coinciden',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.register(registerDto);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.message && error.message.includes('User already registered')) {
        throw new HttpException(
          'Este email ya está registrado',
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        error.message || 'Error al registrar usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (
        error.message &&
        error.message.includes('Invalid login credentials')
      ) {
        throw new HttpException(
          'Credenciales inválidas',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        error.message || 'Error al iniciar sesión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener información del usuario actual' })
  @ApiResponse({ status: 200, description: 'Información del usuario' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiBearerAuth()
  async me(@Headers('authorization') authorization: string) {
    try {
      if (!authorization) {
        throw new HttpException(
          'Token no proporcionado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const token = authorization.replace('Bearer ', '');
      const result = await this.authService.validateToken(token);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Token inválido o expirado',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
