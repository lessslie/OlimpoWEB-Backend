import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from 'class-validator';
import { ProductCategory } from '../entities/product.entity';

export class UpdateProductDto {
  @ApiProperty({ example: 'Proteína Whey', required: false })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre debe tener máximo 100 caracteres' })
  name?: string;

  @ApiProperty({ example: 'Proteína de suero de leche de alta calidad para ayudar en la recuperación muscular.', required: false })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  description?: string;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;

  @ApiProperty({ example: 'https://example.com/images/product-image.jpg', required: false })
  @IsOptional()
  @IsUrl({}, { message: 'La imagen debe ser una URL válida' })
  image?: string;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.SUPPLEMENTS, required: false })
  @IsOptional()
  @IsEnum(ProductCategory, { message: 'Categoría inválida' })
  category?: ProductCategory;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean({ message: 'La disponibilidad debe ser un booleano' })
  available?: boolean;
}
