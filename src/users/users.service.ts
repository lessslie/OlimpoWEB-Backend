// src/users/users.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_admin: boolean;
  created_at: Date;
  updated_at?: Date;
}

@Injectable()
export class UsersService {
  private supabase;
  private readonly logger = new Logger(UsersService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      this.logger.error('Faltan variables de entorno de Supabase');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
      this.logger.log('Cliente Supabase inicializado correctamente');
    }
  }

  async create(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    this.logger.log(`Creando nuevo usuario con email: ${userData.email}`);
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert([
          {
            ...userData,
            is_admin: userData.is_admin || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (error) {
        this.logger.error(`Error al crear usuario: ${error.message}`, error);
        throw error;
      }
      
      this.logger.log(`Usuario creado con ID: ${data[0].id}`);
      return data[0];
    } catch (error) {
      this.logger.error(`Error inesperado al crear usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    this.logger.log('Buscando todos los usuarios');
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*');
      
      if (error) {
        this.logger.error(`Error al buscar usuarios: ${error.message}`, error);
        throw error;
      }
      
      this.logger.log(`Se encontraron ${data.length} usuarios`);
      return data;
    } catch (error) {
      this.logger.error(`Error inesperado al buscar usuarios: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<User | undefined> {
    this.logger.log(`Buscando usuario con ID: ${id}`);
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró el usuario
          this.logger.warn(`Usuario con ID ${id} no encontrado`);
          return undefined;
        }
        
        this.logger.error(`Error al buscar usuario: ${error.message}`, error);
        throw error;
      }
      
      this.logger.log(`Usuario encontrado: ${data.email}`);
      return data;
    } catch (error) {
      this.logger.error(`Error inesperado al buscar usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | undefined> {
    this.logger.log(`Buscando usuario con email: ${email}`);
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);
      
      if (error) {
        this.logger.error(`Error al buscar usuario por email: ${error.message}`, error);
        throw error;
      }
      
      if (data.length === 0) {
        this.logger.warn(`Usuario con email ${email} no encontrado`);
        return undefined;
      }
      
      this.logger.log(`Usuario encontrado: ${data[0].email}`);
      return data[0];
    } catch (error) {
      this.logger.error(`Error inesperado al buscar usuario por email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    this.logger.log(`Actualizando usuario con ID: ${id}`);
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) {
        this.logger.error(`Error al actualizar usuario: ${error.message}`, error);
        throw error;
      }
      
      if (data.length === 0) {
        this.logger.warn(`Usuario con ID ${id} no encontrado para actualizar`);
        return null;
      }
      
      this.logger.log(`Usuario actualizado: ${data[0].email}`);
      return data[0];
    } catch (error) {
      this.logger.error(`Error inesperado al actualizar usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    this.logger.log(`Eliminando usuario con ID: ${id}`);
    
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) {
        this.logger.error(`Error al eliminar usuario: ${error.message}`, error);
        throw error;
      }
      
      this.logger.log(`Usuario eliminado con ID: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error inesperado al eliminar usuario: ${error.message}`, error.stack);
      throw error;
    }
  }
}
