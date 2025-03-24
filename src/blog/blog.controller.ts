import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, UseGuards, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post as BlogPost, PostStatus } from './entities/post.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { Request } from 'express';

// Extender la interfaz Request para incluir la propiedad user
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
    [key: string]: any;
  };
}

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo post' })
  @ApiResponse({ status: 201, description: 'Post creado correctamente', type: BlogPost })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  async create(@Body() createPostDto: CreatePostDto, @Req() req: RequestWithUser) {
    try {
      return await this.blogService.create(createPostDto, req.user.id);
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

  @Get()
  @ApiOperation({ summary: 'Obtener todos los posts publicados' })
  @ApiResponse({ status: 200, description: 'Lista de posts publicados', type: [BlogPost] })
  async findPublished() {
    return await this.blogService.findPublished();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todos los posts (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: PostStatus })
  @ApiResponse({ status: 200, description: 'Lista de todos los posts', type: [BlogPost] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  async findAll(@Query('status') status?: PostStatus) {
    return await this.blogService.findAll(status);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Obtener todas las etiquetas' })
  @ApiResponse({ status: 200, description: 'Lista de etiquetas' })
  async getAllTags() {
    return await this.blogService.getAllTags();
  }

  @Get('tag/:tag')
  @ApiOperation({ summary: 'Obtener posts por etiqueta' })
  @ApiResponse({ status: 200, description: 'Lista de posts con la etiqueta especificada', type: [BlogPost] })
  async findByTag(@Param('tag') tag: string) {
    return await this.blogService.findByTag(tag);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un post por ID' })
  @ApiResponse({ status: 200, description: 'Post encontrado', type: BlogPost })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.blogService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obtener un post por slug' })
  @ApiResponse({ status: 200, description: 'Post encontrado', type: BlogPost })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async findBySlug(@Param('slug') slug: string) {
    return await this.blogService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar un post' })
  @ApiResponse({ status: 200, description: 'Post actualizado correctamente', type: BlogPost })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return await this.blogService.update(id, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un post' })
  @ApiResponse({ status: 200, description: 'Post eliminado correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async remove(@Param('id') id: string) {
    await this.blogService.remove(id);
    return { message: 'Post eliminado correctamente' };
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publicar un post' })
  @ApiResponse({ status: 200, description: 'Post publicado correctamente', type: BlogPost })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async publishPost(@Param('id') id: string) {
    return await this.blogService.publishPost(id);
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Despublicar un post' })
  @ApiResponse({ status: 200, description: 'Post despublicado correctamente', type: BlogPost })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async unpublishPost(@Param('id') id: string) {
    return await this.blogService.unpublishPost(id);
  }
}
