import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

export class User {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'usuario@ejemplo.com' })
  email: string;

  @ApiProperty({ example: 'Juan' })
  first_name: string;

  @ApiProperty({ example: 'Pérez' })
  last_name: string;

  @ApiProperty({ example: '1123456789' })
  phone: string;

  @ApiProperty({ example: false })
  is_admin: boolean;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updated_at: Date;
}
