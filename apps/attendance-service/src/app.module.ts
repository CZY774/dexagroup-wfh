import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceRecord } from './attendance.entity';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'dexa_user',
      password: process.env.DB_PASSWORD ?? 'dexa_password',
      database: process.env.DB_DATABASE ?? 'dexa_attendance',
      entities: [AttendanceRecord],
      synchronize: process.env.TYPEORM_SYNC === 'true',
      charset: 'utf8mb4',
    }),
    TypeOrmModule.forFeature([AttendanceRecord]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AppModule {}
