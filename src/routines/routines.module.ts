import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutinesService } from './routines.service';
import { RoutinesController } from './routines.controller';
import { Routine } from './entities/routine.entity';
import { UsersModule } from '../users/users.module'; // Ajusta la ruta según tu estructura

@Module({
  imports: [
    TypeOrmModule.forFeature([Routine]),
    UsersModule, // Necesario para poder usar UsersService
  ],
  controllers: [RoutinesController],
  providers: [RoutinesService],
  exports: [RoutinesService],
})
export class RoutinesModule {}
