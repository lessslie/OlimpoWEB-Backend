import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Res,
  Delete,
  HttpException,
  HttpStatus,
  UseGuards,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadsService } from './uploads.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir un archivo a Cloudinary o almacenamiento local' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Archivo subido correctamente' })
  @ApiResponse({ status: 400, description: 'Formato de archivo no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new HttpException(
        'No se ha proporcionado ningún archivo',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Intentar subir a Cloudinary primero
      try {
        const result = await this.uploadsService.uploadToCloudinary(file);
        return result;
      } catch (cloudinaryError) {
        // Si falla Cloudinary, usar almacenamiento local como fallback
        if (cloudinaryError.message.includes('Cloudinary no está configurado')) {
          console.log('Cloudinary no está configurado, usando almacenamiento local como fallback');
          const result = await this.uploadsService.saveFileLocally(file);
          return result;
        } else {
          // Si es otro tipo de error con Cloudinary, propagarlo
          throw cloudinaryError;
        }
      }
    } catch (error) {
      throw new HttpException(
        `Error al subir el archivo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('cloudinary/:publicId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un archivo de Cloudinary' })
  @ApiResponse({ status: 200, description: 'Archivo eliminado correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async deleteFromCloudinary(@Param('publicId') publicId: string) {
    try {
      // Intentar eliminar de Cloudinary
      try {
        return await this.uploadsService.deleteFromCloudinary(publicId);
      } catch (cloudinaryError) {
        // Si Cloudinary no está configurado, verificar si es un archivo local
        if (cloudinaryError.message.includes('Cloudinary no está configurado')) {
          console.log('Cloudinary no está configurado, intentando eliminar archivo local');
          // Comprobar si el publicId corresponde a un nombre de archivo local
          if (this.uploadsService.fileExists(publicId)) {
            return await this.uploadsService.deleteFile(publicId);
          } else {
            throw new HttpException(
              `Archivo ${publicId} no encontrado`,
              HttpStatus.NOT_FOUND,
            );
          }
        } else {
          // Si es otro tipo de error con Cloudinary, propagarlo
          throw cloudinaryError;
        }
      }
    } catch (error) {
      throw new HttpException(
        `Error al eliminar el archivo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Mantener los métodos antiguos para compatibilidad con el código existente
  @Get(':filename')
  @ApiOperation({ summary: 'Obtener un archivo local' })
  @ApiResponse({ status: 200, description: 'Archivo encontrado' })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadsService.getFilePath(filename);

    if (!this.uploadsService.fileExists(filename)) {
      throw new HttpException('Archivo no encontrado', HttpStatus.NOT_FOUND);
    }

    return res.sendFile(filePath);
  }

  @Delete(':filename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un archivo local' })
  @ApiResponse({ status: 200, description: 'Archivo eliminado correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - No tiene permisos suficientes',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async deleteFile(@Param('filename') filename: string) {
    return this.uploadsService.deleteFile(filename);
  }
}
