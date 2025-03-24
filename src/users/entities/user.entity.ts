// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @ApiProperty({ example: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ example: 'Juan' })
  @Column()
  first_name: string;

  @ApiProperty({ example: 'Pérez' })
  @Column()
  last_name: string;

  @ApiProperty({ example: '1123456789' })
  @Column()
  phone: string;

  @ApiProperty({ example: false })
  @Column({ default: false })
  is_admin: boolean;

  @ApiProperty({ enum: Role, example: Role.USER })
  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER
  })
  role: Role;

  @Column()
  password: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updated_at: Date;
}