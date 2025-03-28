import { IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RoutineDto {
  @ApiProperty({
    description: 'Contenido de la rutina en formato JSON',
    example: [
      {
        id: '1',
        name: 'Press de banca',
        sets: 4,
        reps: '10-12',
        rest: '60 segundos',
        day: 'Lunes',
        mediaUrl: '',
        mediaType: 'image',
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  content: any[];
}

export class RoutineResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  content: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
