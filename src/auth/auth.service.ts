import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, User } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      this.logger.log(`Intentando registrar usuario con email: ${registerDto.email}`);
      
      // Verificar si el usuario ya existe
      const existingUser = await this.usersService.findByEmail(registerDto.email);
      if (existingUser) {
        this.logger.warn(`Intento de registro con email ya existente: ${registerDto.email}`);
        throw new HttpException(
          'Este email ya está registrado',
          HttpStatus.CONFLICT
        );
      }

      // Hash de la contraseña
      this.logger.log('Generando hash de contraseña');
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Crear usuario
      this.logger.log('Creando nuevo usuario en la base de datos');
      const user = await this.usersService.create({
        email: registerDto.email,
        password: hashedPassword,
        first_name: registerDto.first_name,
        last_name: registerDto.last_name,
        phone: registerDto.phone,
        is_admin: false, // Agregamos esta propiedad que faltaba
      });

      // Generar token JWT
      this.logger.log(`Usuario creado con ID: ${user.id}, generando token JWT`);
      const token = this.generateToken(user);

      return {
        message: 'Usuario registrado correctamente',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          is_admin: user.is_admin,
        },
        token: {
          access_token: token
        },
      };
    } catch (error) {
      this.logger.error(`Error en registro: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al registrar usuario',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async login(loginDto: LoginDto) {
    try {
      this.logger.log(`Intento de inicio de sesión para: ${loginDto.email}`);
      
      // Buscar usuario por email
      this.logger.log(`Buscando usuario con email: ${loginDto.email}`);
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${loginDto.email}`);
        throw new HttpException(
          'Credenciales inválidas',
          HttpStatus.UNAUTHORIZED
        );
      }

      // Verificar contraseña
      this.logger.log('Verificando contraseña');
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`Contraseña incorrecta para usuario: ${loginDto.email}`);
        throw new HttpException(
          'Credenciales inválidas',
          HttpStatus.UNAUTHORIZED
        );
      }

      // Generar token JWT
      this.logger.log(`Inicio de sesión exitoso para usuario: ${loginDto.email}, generando token JWT`);
      const token = this.generateToken(user);

      return {
        message: 'Inicio de sesión exitoso',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          is_admin: user.is_admin,
        },
        token: {
          access_token: token
        },
      };
    } catch (error) {
      this.logger.error(`Error en inicio de sesión: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al iniciar sesión',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async validateToken(token: string) {
    try {
      this.logger.log('Validando token JWT');
      const payload = this.jwtService.verify(token);
      this.logger.log(`Token válido para usuario ID: ${payload.sub}`);
      const user = await this.usersService.findOne(payload.sub);
      
      if (!user) {
        this.logger.warn(`Usuario no encontrado para token con ID: ${payload.sub}`);
        throw new HttpException(
          'Token inválido o expirado',
          HttpStatus.UNAUTHORIZED
        );
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          is_admin: user.is_admin,
        },
      };
    } catch (error) {
      this.logger.error(`Error validando token: ${error.message}`, error.stack);
      throw new HttpException(
        'Token inválido o expirado',
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  private generateToken(user: User) {
    this.logger.log(`Generando token JWT para usuario ID: ${user.id}`);
    const payload = {
      email: user.email,
      sub: user.id,
      is_admin: user.is_admin,
    };
    return this.jwtService.sign(payload);
  }
}