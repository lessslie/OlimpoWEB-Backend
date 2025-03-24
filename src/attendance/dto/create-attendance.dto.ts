import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAttendanceDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  @IsUUID('4', { message: 'El ID del usuario debe ser un UUID válido' })
  user_id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de la membresía debe ser un UUID válido' })
  membership_id?: string;

  @ApiProperty({ example: '2025-03-22T15:30:00.000Z', required: false })
  @IsOptional()
  @IsString({ message: 'La hora de entrada debe ser un string' })
  check_in_time?: string;
}
