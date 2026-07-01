import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeController } from './employee.controller';
import { Employee } from './employee.entity';
import { EmployeeService } from './employee.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'dexa_user',
      password: process.env.DB_PASSWORD ?? 'dexa_password',
      database: process.env.DB_DATABASE ?? 'dexa_employee',
      entities: [Employee],
      synchronize: process.env.TYPEORM_SYNC === 'true',
      charset: 'utf8mb4',
    }),
    TypeOrmModule.forFeature([Employee]),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class AppModule {}
