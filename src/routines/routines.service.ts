import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Routine } from './entities/routine.entity';
import { RoutineDto } from './dto/routine.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(Routine)
    private routinesRepository: Repository<Routine>,
    private usersService: UsersService,
  ) {}

  async findByUserId(userId: string): Promise<Routine> {
    // Primero verificamos que el usuario existe
    await this.usersService.findOne(userId);

    const routine = await this.routinesRepository.findOne({
      where: { userId },
    });

    if (!routine) {
      throw new NotFoundException(
        `Rutina para el usuario ${userId} no encontrada`,
      );
    }

    return routine;
  }

  async create(userId: string, routineDto: RoutineDto): Promise<Routine> {
    // Primero verificamos que el usuario existe
    await this.usersService.findOne(userId);

    // Verificamos si ya existe una rutina para este usuario
    try {
      const existingRoutine = await this.findByUserId(userId);
      // Si existe, actualizamos el contenido
      existingRoutine.content = routineDto.content;
      return this.routinesRepository.save(existingRoutine);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Si no existe, creamos una nueva rutina
        const newRoutine = this.routinesRepository.create({
          userId,
          content: routineDto.content,
        });
        return this.routinesRepository.save(newRoutine);
      }
      throw error;
    }
  }

  async remove(userId: string): Promise<void> {
    // Primero verificamos que el usuario existe
    await this.usersService.findOne(userId);

    const result = await this.routinesRepository.delete({ userId });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Rutina para el usuario ${userId} no encontrada`,
      );
    }
  }
}
