import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { resolveJwtSecret, SERVICE_CLIENTS } from '@dexa/contracts';
import { AttendanceController } from './attendance/attendance.controller';
import { AttendanceGatewayService } from './attendance/attendance-gateway.service';
import { AuthController } from './auth/auth.controller';
import { AuthGatewayService } from './auth/auth-gateway.service';
import { CsrfGuard } from './common/csrf.guard';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { RateLimitGuard } from './common/rate-limit.guard';
import { RolesGuard } from './common/roles.guard';
import { EmployeeGatewayService } from './employees/employee-gateway.service';
import { EmployeesController } from './employees/employees.controller';
import { HealthController } from './health.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret(process.env),
    }),
    ClientsModule.register([
      {
        name: SERVICE_CLIENTS.AUTH,
        transport: Transport.TCP,
        options: {
          host: process.env.AUTH_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.AUTH_SERVICE_PORT ?? 3101),
        },
      },
      {
        name: SERVICE_CLIENTS.EMPLOYEE,
        transport: Transport.TCP,
        options: {
          host: process.env.EMPLOYEE_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.EMPLOYEE_SERVICE_PORT ?? 3102),
        },
      },
      {
        name: SERVICE_CLIENTS.ATTENDANCE,
        transport: Transport.TCP,
        options: {
          host: process.env.ATTENDANCE_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.ATTENDANCE_SERVICE_PORT ?? 3103),
        },
      },
    ]),
  ],
  controllers: [HealthController, AuthController, EmployeesController, AttendanceController],
  providers: [
    AuthGatewayService,
    EmployeeGatewayService,
    AttendanceGatewayService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AppModule {}
