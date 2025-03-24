import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

// Definir la interfaz para la respuesta de Cloudinary
interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
}

@Injectable()
export class UploadsService {
  private cloudinaryConfigured: boolean = false;
  private cloudinary: any = null;

  constructor(private configService: ConfigService) {
    // Configurar Cloudinary
    try {
      const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
      const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
      const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

      if (cloudName && apiKey && apiSecret) {
        // Importar cloudinary dinámicamente
        try {
          // Intentar importar cloudinary
          this.cloudinary = require('cloudinary');
          
          if (this.cloudinary) {
            this.cloudinary.v2.config({
              cloud_name: cloudName,
              api_key: apiKey,
              api_secret: apiSecret,
            });
            this.cloudinaryConfigured = true;
            console.log('Cloudinary configurado correctamente');
          } else {
            console.warn('No se pudo cargar el módulo cloudinary');
          }
        } catch (importError) {
          console.warn('Error al importar cloudinary:', importError.message);
        }
      } else {
        console.warn('Faltan credenciales de Cloudinary. El servicio de uploads usará almacenamiento local.');
      }
    } catch (error) {
      console.error('Error al configurar Cloudinary:', error);
      console.warn('El servicio de uploads usará almacenamiento local debido a un error en la configuración de Cloudinary.');
    }
  }

  /**
   * Sube un archivo a Cloudinary
   * @param file Archivo a subir
   * @returns Información del archivo subido
   */
  async uploadToCloudinary(file: any) {
    // Verificar si Cloudinary está configurado
    if (!this.cloudinaryConfigured) {
      console.warn('Intento de subir archivo a Cloudinary, pero Cloudinary no está configurado correctamente');
      throw new Error('Cloudinary no está configurado. No se puede subir el archivo.');
    }

    try {
      // Convertir el buffer del archivo a base64
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      // Subir a Cloudinary
      const result = await new Promise<CloudinaryResponse>((resolve, reject) => {
        this.cloudinary.v2.uploader.upload(
          base64File,
          {
            folder: 'olimpo',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result as CloudinaryResponse);
          }
        );
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new Error(`Error al subir archivo a Cloudinary: ${error.message}`);
    }
  }

  /**
   * Elimina un archivo de Cloudinary
   * @param publicId ID público del archivo en Cloudinary
   * @returns Mensaje de confirmación
   */
  async deleteFromCloudinary(publicId: string): Promise<{ message: string }> {
    // Verificar si Cloudinary está configurado
    if (!this.cloudinaryConfigured) {
      console.warn('Intento de eliminar archivo de Cloudinary, pero Cloudinary no está configurado correctamente');
      throw new Error('Cloudinary no está configurado. No se puede eliminar el archivo.');
    }

    try {
      const result = await new Promise<string>((resolve, reject) => {
        this.cloudinary.v2.uploader.destroy(
          publicId,
          (error, result) => {
            if (error) return reject(error);
            resolve(result?.result || '');
          }
        );
      });

      if (result === 'ok') {
        return { message: `Archivo con ID ${publicId} eliminado correctamente de Cloudinary` };
      } else {
        throw new Error(`No se pudo eliminar el archivo con ID ${publicId}`);
      }
    } catch (error) {
      throw new Error(`Error al eliminar archivo de Cloudinary: ${error.message}`);
    }
  }

  /**
   * Obtiene la ruta completa de un archivo local
   * @param filename Nombre del archivo
   * @returns Ruta completa del archivo
   */
  getFilePath(filename: string): string {
    return join(process.cwd(), 'uploads', filename);
  }

  /**
   * Elimina un archivo del sistema de archivos local
   * @param filename Nombre del archivo a eliminar
   * @returns Mensaje de confirmación
   */
  async deleteFile(filename: string): Promise<{ message: string }> {
    const filePath = this.getFilePath(filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`El archivo ${filename} no existe`);
    }

    try {
      unlinkSync(filePath);
      return { message: `Archivo ${filename} eliminado correctamente` };
    } catch (error) {
      throw new Error(`Error al eliminar el archivo: ${error.message}`);
    }
  }

  /**
   * Verifica si un archivo existe localmente
   * @param filename Nombre del archivo a verificar
   * @returns Booleano indicando si el archivo existe
   */
  fileExists(filename: string): boolean {
    const filePath = this.getFilePath(filename);
    return existsSync(filePath);
  }

  /**
   * Guarda un archivo en el sistema de archivos local
   * @param file Archivo a guardar
   * @returns Información del archivo guardado
   */
  async saveFileLocally(file: any) {
    try {
      // Importar fs y path de manera dinámica para evitar errores si no están disponibles
      const fs = require('fs');
      const path = require('path');
      
      // Crear el directorio de uploads si no existe
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generar un nombre de archivo único
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname);
      const filename = `${path.basename(file.originalname, extension)}-${uniqueSuffix}${extension}`;
      
      // Ruta completa del archivo
      const filePath = path.join(uploadsDir, filename);
      
      // Guardar el archivo
      fs.writeFileSync(filePath, file.buffer);
      
      // Construir la URL del archivo
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://olimpo-gym.onrender.com' 
        : 'http://localhost:3000';
      
      // Devolver información del archivo
      return {
        url: `${baseUrl}/uploads/${filename}`,
        public_id: filename,
        format: extension.replace('.', ''),
        width: 0, // No podemos determinar las dimensiones sin procesar la imagen
        height: 0,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new Error(`Error al guardar archivo localmente: ${error.message}`);
    }
  }
}
