import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtPrincipal, LoginResult, PublicUser, UserRole } from '@dexa/contracts';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './user.entity';

type LoginPayload = {
  email: string;
  password: string;
};

type CreateEmployeeUserPayload = {
  email: string;
  password: string;
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    const email = this.normalizeEmail(payload.email);
    if (!payload.password) {
      throw this.unauthorized('Invalid email or password.');
    }

    const user = await this.users.findOne({ where: { email } });

    if (!user) {
      throw this.unauthorized('Invalid email or password.');
    }

    if (!user.active) {
      throw this.forbidden('This account is inactive.');
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw this.unauthorized('Invalid email or password.');
    }

    const principal: JwtPrincipal = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(principal),
      user: this.toPublicUser(user),
    };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw this.notFound('User was not found.');
    }

    return this.toPublicUser(user);
  }

  async createEmployeeUser(payload: CreateEmployeeUserPayload): Promise<PublicUser> {
    const email = this.normalizeEmail(payload.email);
    if (!payload.password || payload.password.length < 8) {
      throw this.badRequest('Password must contain at least 8 characters.');
    }

    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw this.conflict('Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = this.users.create({
      email,
      passwordHash,
      role: UserRole.EMPLOYEE,
      active: true,
    });

    return this.toPublicUser(await this.users.save(user));
  }

  async updateUserEmail(payload: { userId: string; email: string }): Promise<PublicUser> {
    const email = this.normalizeEmail(payload.email);
    const user = await this.users.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw this.notFound('User was not found.');
    }

    const existing = await this.users.findOne({ where: { email } });
    if (existing && existing.id !== payload.userId) {
      throw this.conflict('Email is already registered.');
    }

    user.email = email;
    return this.toPublicUser(await this.users.save(user));
  }

  async setUserActive(payload: { userId: string; active: boolean }): Promise<PublicUser> {
    const user = await this.users.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw this.notFound('User was not found.');
    }

    user.active = payload.active;
    return this.toPublicUser(await this.users.save(user));
  }

  private async seedAdmin() {
    const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@dexa.test').trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email: adminEmail } });
    if (existing) {
      return;
    }

    const password = process.env.ADMIN_PASSWORD ?? 'Admin12345!';
    const admin = this.users.create({
      email: adminEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role: UserRole.HRD_ADMIN,
      active: true,
    });

    await this.users.save(admin);
  }

  private normalizeEmail(email: string): string {
    if (typeof email !== 'string') {
      throw this.badRequest('A valid email is required.');
    }

    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw this.badRequest('A valid email is required.');
    }

    return normalized;
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private unauthorized(message: string): RpcException {
    return new RpcException({ statusCode: 401, message });
  }

  private forbidden(message: string): RpcException {
    return new RpcException({ statusCode: 403, message });
  }

  private notFound(message: string): RpcException {
    return new RpcException({ statusCode: 404, message });
  }

  private badRequest(message: string): RpcException {
    return new RpcException({ statusCode: 400, message });
  }

  private conflict(message: string): RpcException {
    return new RpcException({ statusCode: 409, message });
  }
}
