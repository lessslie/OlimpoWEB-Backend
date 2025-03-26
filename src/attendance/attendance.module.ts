import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ConfigModule } from '@nestjs/config';
import { MembershipsModule } from '../memberships/memberships.module';
import { DebugModule } from '../debug/debug.module'; // Añadir esta línea

@Module({
  imports: [
    ConfigModule,
    MembershipsModule,
    DebugModule, // Añadir esta línea
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
