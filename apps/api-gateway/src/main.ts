import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('api-gateway');
  const app = await NestFactory.create(AppModule);
  const corsOrigins = parseCorsOrigins(
    process.env.CORS_ORIGIN ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173',
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? process.env.API_GATEWAY_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  logger.log(`listening on http://localhost:${port}`);
}

void bootstrap();

function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
