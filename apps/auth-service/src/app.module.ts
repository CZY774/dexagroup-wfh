import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolveJwtSecret } from '@dexa/contracts';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'dexa_user',
      password: process.env.DB_PASSWORD ?? 'dexa_password',
      database: process.env.DB_DATABASE ?? 'dexa_auth',
      entities: [User],
      synchronize: process.env.TYPEORM_SYNC === 'true',
      charset: 'utf8mb4',
    }),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: resolveJwtSecret(process.env),
      signOptions: {
        expiresIn: parseJwtExpiresInSeconds(process.env.JWT_EXPIRES_IN),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AppModule {}

function parseJwtExpiresInSeconds(value?: string): number {
  const fallbackSeconds = 8 * 60 * 60;
  if (!value) {
    return fallbackSeconds;
  }

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)([smhd])?$/);
  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * multipliers[unit];
}
