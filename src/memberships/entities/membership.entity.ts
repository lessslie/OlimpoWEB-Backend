import { ApiProperty } from '@nestjs/swagger';

export enum MembershipType {
  MONTHLY = 'monthly',
  KICKBOXING = 'kickboxing',
  QUARTERLY = 'quarterly',
  BIANNUAL = 'biannual',
  ANNUAL = 'annual',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export class Membership {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  user_id: string;

  @ApiProperty({ enum: MembershipType, example: MembershipType.MONTHLY })
  type: MembershipType;

  @ApiProperty({ enum: MembershipStatus, example: MembershipStatus.ACTIVE })
  status: MembershipStatus;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  start_date: Date;

  @ApiProperty({ example: '2025-04-22T00:00:00.000Z' })
  end_date: Date;

  @ApiProperty({ example: 3, required: false, description: 'Días por semana (solo para membresías de kickboxing)' })
  days_per_week?: number;

  @ApiProperty({ example: 5000 })
  price: number;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2025-03-22T00:00:00.000Z' })
  updated_at: Date;
}
