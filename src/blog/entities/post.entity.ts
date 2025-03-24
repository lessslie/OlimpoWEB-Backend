import { ApiProperty } from '@nestjs/swagger';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class Post {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  author_id: string;

  @ApiProperty({ example: 'Beneficios del entrenamiento de fuerza' })
  title: string;

  @ApiProperty({ example: 'slug-del-post' })
  slug: string;

  @ApiProperty({ example: 'Descubre los increíbles beneficios del entrenamiento de fuerza para tu salud...' })
  content: string;

  @ApiProperty({ example: 'https://example.com/images/post-image.jpg', required: false })
  featured_image?: string;

  @ApiProperty({ example: ['musculación', 'entrenamiento', 'salud'], required: false })
  tags?: string[];

  @ApiProperty({ enum: PostStatus, example: PostStatus.PUBLISHED })
  status: PostStatus;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  published_at?: Date;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  updated_at: Date;
}
