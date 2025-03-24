import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ConfigModule } from '@nestjs/config';
import { MembershipsModule } from '../memberships/memberships.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { BlogModule } from '../blog/blog.module';

@Module({
  imports: [ConfigModule, MembershipsModule, AttendanceModule, BlogModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
