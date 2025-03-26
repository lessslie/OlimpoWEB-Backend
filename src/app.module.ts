import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm'; // Añadir esta importación
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MembershipsModule } from './memberships/memberships.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BlogModule } from './blog/blog.module';
import { ProductsModule } from './products/products.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { DebugModule } from 'src/debug/debug.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Disponible en toda la aplicación
    }),
    // Añadir esta configuración de TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        return {
          type: 'postgres',
          url: databaseUrl,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') !== 'production',
          ssl: {
            rejectUnauthorized: false,
          },
          // Añade un timeout más largo
          connectTimeoutMS: 10000,
        };
      },
    }),
    AuthModule,
    UsersModule,
    MembershipsModule,
    AttendanceModule,
    BlogModule,
    ProductsModule,
    NotificationsModule,
    UploadsModule,
    DebugModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
