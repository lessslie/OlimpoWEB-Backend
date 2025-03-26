import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DebugService } from './debug.service';

@Module({
  imports: [ConfigModule],
  providers: [DebugService],
  exports: [DebugService],
})
export class DebugModule {}