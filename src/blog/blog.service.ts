import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post, PostStatus } from './entities/post.entity';
import slugify from 'slugify';

@Injectable()
export class BlogService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not defined');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    try {
      // Generar slug a partir del título
      const slug = slugify(createPostDto.title, { lower: true, strict: true });
      
      // Verificar si ya existe un post con el mismo slug
      const { data: existingPost } = await this.supabase
        .from('blog_posts')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
  
      // Si ya existe un post con el mismo slug, añadir un sufijo único
      let finalSlug = slug;
      if (existingPost) {
        finalSlug = `${slug}-${Date.now()}`;
      }
  
      // Generar automáticamente un extracto del contenido
      const excerpt = createPostDto.content.substring(0, 150) + '...';
  
      // Preparar datos para insertar
      const postData = {
        author_id: authorId,
        title: createPostDto.title,
        slug: finalSlug,
        content: createPostDto.content,
        image_url: createPostDto.image_url,
        excerpt: excerpt,
        tags: createPostDto.tags || [],
        published: createPostDto.status === PostStatus.PUBLISHED,
      };
  
      const { data, error } = await this.supabase
        .from('blog_posts')
        .insert([postData])
        .select()
        .single();
  
      if (error) {
        throw new HttpException(
          `Error al crear el post: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
  
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al crear el post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async findAll(status?: PostStatus): Promise<Post[]> {
    try {
      let query = this.supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
  
      // Si se especifica un estado, filtrar por published
      if (status) {
        // Convertir el enum PostStatus a boolean para el campo published
        const isPublished = status === PostStatus.PUBLISHED;
        query = query.eq('published', isPublished);
      }
  
      const { data, error } = await query;
  
      if (error) {
        throw new HttpException(
          `Error al obtener los posts: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
  
      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener los posts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findPublished(): Promise<Post[]> {
    try {
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
  
      if (error) {
        throw new HttpException(
          `Error al obtener los posts publicados: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
  
      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener los posts publicados: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<Post> {
    try {
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new HttpException(
          `Error al obtener el post: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!data) {
        throw new HttpException(
          'Post no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener el post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findBySlug(slug: string): Promise<Post> {
    try {
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        throw new HttpException(
          `Error al obtener el post: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!data) {
        throw new HttpException(
          'Post no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener el post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    try {
      // Verificar si el post existe
      await this.findOne(id);
  
      // Si se actualiza el título, actualizar también el slug
      let updateData: any = { ...updatePostDto };
      
      if (updatePostDto.title) {
        const slug = slugify(updatePostDto.title, { lower: true, strict: true });
        
        // Verificar si ya existe otro post con el mismo slug
        const { data: existingPost } = await this.supabase
          .from('blog_posts')
          .select('slug')
          .eq('slug', slug)
          .neq('id', id)
          .maybeSingle();
  
        // Si ya existe otro post con el mismo slug, añadir un sufijo único
        let finalSlug = slug;
        if (existingPost) {
          finalSlug = `${slug}-${Date.now()}`;
        }
  
        updateData.slug = finalSlug;
      }
  
      // Si se actualiza el contenido, actualizar también el excerpt
      if (updatePostDto.content) {
        updateData.excerpt = updatePostDto.content.substring(0, 150) + '...';
      }
  
      // Si se cambia el status, actualizar el campo published
      if (updatePostDto.status !== undefined) {
        updateData.published = updatePostDto.status === PostStatus.PUBLISHED;
        delete updateData.status; // Eliminar el campo status que no existe en la tabla
      }
  
      const { data, error } = await this.supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
  
      if (error) {
        throw new HttpException(
          `Error al actualizar el post: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
  
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al actualizar el post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Verificar si el post existe
      await this.findOne(id);

      const { error } = await this.supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) {
        throw new HttpException(
          `Error al eliminar el post: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al eliminar el post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByTag(tag: string): Promise<Post[]> {
    try {
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select('*')
        .contains('tags', [tag])
        .eq('status', PostStatus.PUBLISHED)
        .order('created_at', { ascending: false });

      if (error) {
        throw new HttpException(
          `Error al obtener los posts por etiqueta: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return data;
    } catch (error) {
      throw new HttpException(
        `Error al obtener los posts por etiqueta: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllTags(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select('tags')
        .eq('status', PostStatus.PUBLISHED);

      if (error) {
        throw new HttpException(
          `Error al obtener las etiquetas: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Extraer todas las etiquetas y eliminar duplicados
      const allTags = data.flatMap(post => post.tags || []);
      const uniqueTags = [...new Set(allTags)];

      return uniqueTags;
    } catch (error) {
      throw new HttpException(
        `Error al obtener las etiquetas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async publishPost(id: string): Promise<Post> {
    try {
      // Verificar si el post existe
      await this.findOne(id);
  
      const { data, error } = await this.supabase
        .from('blog_posts')
        .update({
          published: true,
        })
        .eq('id', id)
        .select()
        .single();
  
      if (error) {
        throw new HttpException(
          `Error al publicar el post: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
  
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al publicar el post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  async unpublishPost(id: string): Promise<Post> {
    try {
      // Verificar si el post existe
      await this.findOne(id);
  
      const { data, error } = await this.supabase
        .from('blog_posts')
        .update({
          published: false,
        })
        .eq('id', id)
        .select()
        .single();
  
      if (error) {
        throw new HttpException(
          `Error al despublicar el post: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
  
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al despublicar el post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
