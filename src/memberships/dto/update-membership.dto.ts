import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MembershipStatus, MembershipType } from '../entities/membership.entity';

export class UpdateMembershipDto {
  @ApiProperty({ enum: MembershipType, example: MembershipType.MONTHLY, required: false })
  @IsOptional()
  @IsEnum(MembershipType, { message: 'Tipo de membresía inválido' })
  type?: MembershipType;

  @ApiProperty({ enum: MembershipStatus, example: MembershipStatus.ACTIVE, required: false })
  @IsOptional()
  @IsEnum(MembershipStatus, { message: 'Estado de membresía inválido' })
  status?: MembershipStatus;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z', required: false })
  @IsOptional()
  @IsString({ message: 'La fecha de inicio debe ser un string' })
  start_date?: string;

  @ApiProperty({ example: '2025-04-22T00:00:00.000Z', required: false })
  @IsOptional()
  @IsString({ message: 'La fecha de fin debe ser un string' })
  end_date?: string;

  @ApiProperty({ example: 3, required: false, description: 'Días por semana (solo para membresías de kickboxing)' })
  @IsOptional()
  @IsNumber({}, { message: 'Los días por semana deben ser un número' })
  @Min(1, { message: 'Los días por semana deben ser al menos 1' })
  days_per_week?: number;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;
}
