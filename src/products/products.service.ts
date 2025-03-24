import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductCategory } from './entities/product.entity';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not defined');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      // Generar slug a partir del nombre
      const slug = slugify(createProductDto.name, { lower: true, strict: true });
      
      // Verificar si ya existe un producto con el mismo slug
      const { data: existingProduct } = await this.supabase
        .from('products')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      // Si ya existe un producto con el mismo slug, añadir un sufijo único
      let finalSlug = slug;
      if (existingProduct) {
        finalSlug = `${slug}-${Date.now()}`;
      }

      // Preparar datos para insertar
      const productData = {
        name: createProductDto.name,
        slug: finalSlug,
        description: createProductDto.description,
        price: createProductDto.price,
        image: createProductDto.image,
        category: createProductDto.category,
        available: createProductDto.available ?? true,
      };

      const { data, error } = await this.supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        throw new HttpException(
          `Error al crear el producto: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al crear el producto: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(category?: ProductCategory, onlyAvailable = false): Promise<Product[]> {
    try {
      let query = this.supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      // Si se especifica una categoría, filtrar por esa categoría
      if (category) {
        query = query.eq('category', category);
      }

      // Si se solicita solo productos disponibles, filtrar por disponibilidad
      if (onlyAvailable) {
        query = query.eq('available', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new HttpException(
          `Error al obtener los productos: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener los productos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<Product> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new HttpException(
          `Error al obtener el producto: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!data) {
        throw new HttpException(
          'Producto no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener el producto: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findBySlug(slug: string): Promise<Product> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        throw new HttpException(
          `Error al obtener el producto: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!data) {
        throw new HttpException(
          'Producto no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener el producto: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    try {
      // Verificar si el producto existe
      await this.findOne(id);

      // Si se actualiza el nombre, actualizar también el slug
      let updateData: any = { ...updateProductDto };
      
      if (updateProductDto.name) {
        const slug = slugify(updateProductDto.name, { lower: true, strict: true });
        
        // Verificar si ya existe otro producto con el mismo slug
        const { data: existingProduct } = await this.supabase
          .from('products')
          .select('slug')
          .eq('slug', slug)
          .neq('id', id)
          .maybeSingle();

        // Si ya existe otro producto con el mismo slug, añadir un sufijo único
        let finalSlug = slug;
        if (existingProduct) {
          finalSlug = `${slug}-${Date.now()}`;
        }

        updateData.slug = finalSlug;
      }

      const { data, error } = await this.supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new HttpException(
          `Error al actualizar el producto: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al actualizar el producto: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Verificar si el producto existe
      await this.findOne(id);

      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        throw new HttpException(
          `Error al eliminar el producto: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al eliminar el producto: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByCategory(category: ProductCategory): Promise<Product[]> {
    return this.findAll(category, true);
  }

  async toggleAvailability(id: string): Promise<Product> {
    try {
      // Obtener el producto actual
      const product = await this.findOne(id);

      // Cambiar la disponibilidad
      const { data, error } = await this.supabase
        .from('products')
        .update({
          available: !product.available,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new HttpException(
          `Error al cambiar la disponibilidad del producto: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al cambiar la disponibilidad del producto: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllCategories(): Promise<string[]> {
    return Object.values(ProductCategory);
  }
}
