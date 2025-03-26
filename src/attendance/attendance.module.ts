import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { ConfigModule } from '@nestjs/config';
import { MembershipsModule } from '../memberships/memberships.module';
import { DebugModule } from 'src/debug/debug.module';

@Module({
  imports: [ConfigModule, DebugModule, MembershipsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
