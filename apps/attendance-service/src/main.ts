import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('attendance-service');
  const host = process.env.ATTENDANCE_SERVICE_BIND_HOST ?? process.env.ATTENDANCE_SERVICE_HOST ?? '127.0.0.1';
  const port = Number(process.env.ATTENDANCE_SERVICE_PORT ?? 3103);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host,
      port,
    },
  });

  await app.listen();
  logger.log(`listening on ${host}:${port}`);
}

void bootstrap();
