import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  first_name?: string;

  @ApiProperty({ example: 'Pérez', required: false })
  @IsOptional()
  @IsString({ message: 'El apellido debe ser un texto' })
  last_name?: string;

  @ApiProperty({ example: '1123456789', required: false })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto' })
  phone?: string;

  @ApiProperty({ example: 'usuario@ejemplo.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Formato de email inválido' })
  email?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean({ message: 'is_admin debe ser un booleano' })
  is_admin?: boolean;
}
