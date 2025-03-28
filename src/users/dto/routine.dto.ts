import { IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RoutineDto {
  @ApiProperty({
    description: 'Array de ejercicios que componen la rutina',
    example: [
      {
        id: '1',
        name: 'Press de banca',
        sets: 4,
        reps: '10-12',
        rest: '60 segundos',
        notes: 'Aumentar peso gradualmente',
        day: 'Lunes',
        mediaUrl: '',
        mediaType: 'image',
      },
    ],
  })
  @IsArray()
  routine: any[];

  @ApiProperty({
    description: 'Indica si el usuario tiene una rutina asignada',
    example: true,
  })
  @IsBoolean()
  has_routine: boolean;
}

export class UpdateRoutineDto {
  @ApiProperty({
    description: 'Array de ejercicios que componen la rutina',
    required: false,
  })
  @IsArray()
  @IsOptional()
  routine?: any[];

  @ApiProperty({
    description: 'Indica si el usuario tiene una rutina asignada',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  has_routine?: boolean;
}
