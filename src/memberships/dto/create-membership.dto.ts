import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { MembershipType } from '../entities/membership.entity';

export class CreateMembershipDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  @IsUUID('4', { message: 'El ID del usuario debe ser un UUID válido' })
  user_id: string;

  @ApiProperty({ enum: MembershipType, example: MembershipType.MONTHLY })
  @IsNotEmpty({ message: 'El tipo de membresía es requerido' })
  @IsEnum(MembershipType, { message: 'Tipo de membresía inválido' })
  type: MembershipType;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  @IsString({ message: 'La fecha de inicio debe ser un string' })
  start_date: string;

  @ApiProperty({ example: 3, required: false, description: 'Días por semana (solo para membresías de kickboxing)' })
  @IsOptional()
  @IsNumber({}, { message: 'Los días por semana deben ser un número' })
  @Min(1, { message: 'Los días por semana deben ser al menos 1' })
  days_per_week?: number;

  @ApiProperty({ example: 5000 })
  @IsNotEmpty({ message: 'El precio es requerido' })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;
}
