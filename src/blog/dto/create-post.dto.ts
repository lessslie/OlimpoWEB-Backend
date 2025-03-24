import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { PostStatus } from '../entities/post.entity';

export class CreatePostDto {
  @ApiProperty({ example: 'Beneficios del entrenamiento de fuerza' })
  @IsNotEmpty({ message: 'El título es requerido' })
  @IsString({ message: 'El título debe ser un texto' })
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  @MaxLength(100, { message: 'El título debe tener máximo 100 caracteres' })
  title: string;

  @ApiProperty({ example: 'Descubre los increíbles beneficios del entrenamiento de fuerza para tu salud...' })
  @IsNotEmpty({ message: 'El contenido es requerido' })
  @IsString({ message: 'El contenido debe ser un texto' })
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  content: string;

  @ApiProperty({ example: 'https://example.com/images/post-image.jpg', required: false })
  @IsOptional()
  @IsUrl({}, { message: 'La imagen destacada debe ser una URL válida' })
  featured_image?: string;

  @ApiProperty({ example: ['musculación', 'entrenamiento', 'salud'], required: false })
  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser un texto' })
  tags?: string[];

  @ApiProperty({ enum: PostStatus, example: PostStatus.DRAFT, default: PostStatus.DRAFT })
  @IsOptional()
  @IsEnum(PostStatus, { message: 'Estado inválido' })
  status?: PostStatus = PostStatus.DRAFT;
}
