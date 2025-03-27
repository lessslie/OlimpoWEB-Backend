import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductCategory } from './entities/product.entity';
import slugify from 'slugify';
import { getErrorMessage } from '../common/utils/error-handler.util';

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

      // Buscar el ID de la categoría basado en el nombre
      const { data: categoryData } = await this.supabase
        .from('product_categories')
        .select('id')
        .eq('name', createProductDto.category_id)
        .single();

      // Preparar datos para insertar con mapeo correcto
      const productData = {
        name: createProductDto.name,
        slug: finalSlug,
        description: createProductDto.description,
        price: createProductDto.price,
        image_url: createProductDto.image, // Mapear image a image_url
        category_id: categoryData?.id, // Usar category_id en lugar de category
        stock: createProductDto.stock ? 10 : 0, // Convertir booleano a número
        is_featured: false // Valor predeterminado
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

      // Transformar la respuesta para que coincida con la estructura de Product
      return {
        ...data,
        category_id: createProductDto.category_id, // Usar el enum original
        stock: data.stock > 0, // Convertir número a booleano
        image: data.image_url, // Mapear image_url a image
      } as Product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al crear el producto: ${getErrorMessage(error)}`,
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
        // Primero buscar el ID de la categoría
        const { data: categoryData } = await this.supabase
          .from('product_categories')
          .select('id')
          .eq('name', category)
          .single();
          
        if (categoryData) {
          query = query.eq('category_id', categoryData.id);
        }
      }
  
      // Si se solicita solo productos disponibles, filtrar por stock mayor a 0
      if (onlyAvailable) {
        query = query.gt('stock', 0);
      }
  
      const { data, error } = await query;
  
      if (error) {
        throw new HttpException(
          `Error al obtener los productos: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
  
      // Transformar los resultados para que coincidan con la estructura esperada
      const transformedProducts = await Promise.all(data.map(async (product) => {
        const categoryName = await this.getCategoryNameById(product.category_id);
        return {
          ...product,
          stock: product.stock > 0, // Convertir número a booleano
          category_id: categoryName as ProductCategory, // Convertir al enum
          image: product.image_url, // Mapear image_url a image
        } as Product;
      }));
      
      return transformedProducts;
    } catch (error) {
      throw new HttpException(
        `Error al obtener los productos: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para obtener el nombre de la categoría por ID
  private async getCategoryNameById(categoryId: string): Promise<ProductCategory | string> {
    try {
      const { data, error } = await this.supabase
        .from('product_categories')
        .select('name')
        .eq('id', categoryId)
        .single();
      
      if (error || !data) {
        return ProductCategory.ACCESSORIES; // Valor predeterminado si no se encuentra
      }
      
      // Verificar si el nombre de la categoría es un valor válido del enum
      if (Object.values(ProductCategory).includes(data.name as ProductCategory)) {
        return data.name as ProductCategory;
      }
      
      return ProductCategory.ACCESSORIES; // Valor predeterminado si no coincide con el enum
    } catch (error) {
      console.error('Error al obtener el nombre de la categoría:', error);
      return ProductCategory.ACCESSORIES;
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
          `Error al obtener el producto: ${getErrorMessage(error)}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!data) {
        throw new HttpException(
          'Producto no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      // Transformar el resultado para que coincida con la estructura de Product
      const categoryName = await this.getCategoryNameById(data.category_id);
      return {
        ...data,
        stock: data.stock > 0, // Convertir número a booleano
        category_id: categoryName as ProductCategory, // Convertir al enum
        image: data.image_url, // Mapear image_url a image
      } as Product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener el producto: ${getErrorMessage(error)}`,
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

      // Transformar el resultado para que coincida con la estructura de Product
      const categoryName = await this.getCategoryNameById(data.category_id);
      return {
        ...data,
        stock: data.stock > 0, // Convertir número a booleano
        category_id: categoryName as ProductCategory, // Convertir al enum
        image: data.image_url, // Mapear image_url a image
      } as Product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener el producto: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    try {
      // Verificar si el producto existe
      await this.findOne(id);
  
      // Crear un objeto con los datos a actualizar
      let updateData: any = { ...updateProductDto };
      
      // Mapear o eliminar campos que no existen en la base de datos
      if (updateData.image) {
        updateData.image_url = updateData.image;
        delete updateData.image;
      }
      
      // Eliminar cualquier referencia a slug
      delete updateData.slug;
      
      // Mapear available a stock si existe
      if (updateData.available !== undefined) {
        updateData.stock = updateData.available ? 10 : 0;
        delete updateData.available;
      }
      
      // Mapear category a category_id si existe
      if (updateData.category) {
        const { data: categoryData } = await this.supabase
          .from('product_categories')
          .select('id')
          .eq('name', updateData.category)
          .single();
          
        if (categoryData) {
          updateData.category_id = categoryData.id;
        }
        
        delete updateData.category;
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
  
      // Transformar el resultado para coincida con lo que espera el frontend
      const categoryName = await this.getCategoryNameById(data.category_id);
      return {
        ...data,
        image: data.image_url,
        available: data.stock > 0,
        category: categoryName as ProductCategory,
        slug: slugify(data.name) // Generar el slug para el frontend si lo necesita
      } as Product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al actualizar el producto: ${getErrorMessage(error)}`,
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
        `Error al eliminar el producto: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByCategory(category_id: ProductCategory): Promise<Product[]> {
    return this.findAll(category_id, true);
  }

  async toggleAvailability(id: string): Promise<Product> {
    try {
      // Obtener el producto actual
      const product = await this.findOne(id);

      // Cambiar la disponibilidad
      const { data, error } = await this.supabase
        .from('products')
        .update({
          stock: !product.stock,
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

      // Transformar el resultado para que coincida con la estructura de Product
      const categoryName = await this.getCategoryNameById(data.category_id);
      return {
        ...data,
        stock: data.stock > 0, // Convertir número a booleano
        category_id: categoryName as ProductCategory, // Convertir al enum
        image: data.image_url, // Mapear image_url a image
      } as Product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al cambiar la disponibilidad del producto: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllCategories(): Promise<string[]> {
    return Object.values(ProductCategory);
  }
}
