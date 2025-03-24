import { ApiProperty } from '@nestjs/swagger';

export enum ProductCategory {
  SUPPLEMENTS = 'supplements',
  EQUIPMENT = 'equipment',
  CLOTHING = 'clothing',
  ACCESSORIES = 'accessories',
}

export class Product {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Proteína Whey' })
  name: string;

  @ApiProperty({ example: 'proteina-whey' })
  slug: string;

  @ApiProperty({ example: 'Proteína de suero de leche de alta calidad para ayudar en la recuperación muscular.' })
  description: string;

  @ApiProperty({ example: 5000 })
  price: number;

  @ApiProperty({ example: 'https://example.com/images/product-image.jpg', required: false })
  image?: string;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.SUPPLEMENTS })
  category: ProductCategory;

  @ApiProperty({ example: true })
  available: boolean;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  updated_at: Date;
}
