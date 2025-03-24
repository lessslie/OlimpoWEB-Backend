import { ApiProperty } from '@nestjs/swagger';

export class Attendance {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  user_id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  membership_id: string;

  @ApiProperty({ example: '2025-03-22T15:30:00.000Z' })
  check_in_time: Date;

  @ApiProperty({ example: '2025-03-22T17:30:00.000Z', required: false })
  check_out_time?: Date;

  @ApiProperty({ example: '2025-03-22T15:30:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2025-03-22T15:30:00.000Z' })
  updated_at: Date;
}
