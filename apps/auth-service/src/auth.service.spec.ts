import assert from 'node:assert/strict';
import test from 'node:test';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { UserRole } from '@dexa/contracts';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from './user.entity';

function createUser(overrides: Partial<User>): User {
  const now = new Date('2026-06-29T08:00:00.000Z');
  return {
    id: 'user-1',
    email: 'employee@dexa.test',
    passwordHash: '',
    role: UserRole.EMPLOYEE,
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createRepository(initialRows: User[] = []) {
  const rows = [...initialRows];

  return {
    rows,
    repository: {
      findOne: async ({ where }: { where: Partial<User> }) => rows.find((row) => matches(row, where)) ?? null,
      create: (payload: Partial<User>) => payload as User,
      save: async (user: User) => {
        const now = new Date('2026-06-29T08:00:00.000Z');
        const saved = {
          ...user,
          id: user.id ?? `user-${rows.length + 1}`,
          createdAt: user.createdAt ?? now,
          updatedAt: now,
        };
        const index = rows.findIndex((row) => row.id === saved.id);
        if (index >= 0) {
          rows[index] = saved;
        } else {
          rows.push(saved);
        }
        return saved;
      },
    },
  };
}

function matches(row: User, where: Partial<User>): boolean {
  return Object.entries(where).every(([key, value]) => row[key as keyof User] === value);
}

function createService(users: User[]) {
  const { repository } = createRepository(users);
  const jwtService = {
    signAsync: async (payload: { sub: string }) => `signed-token:${payload.sub}`,
  } as JwtService;

  return new AuthService(repository as never, jwtService);
}

function rpcPayload(error: unknown): { statusCode: number; message: string } {
  return (error as RpcException).getError() as { statusCode: number; message: string };
}

test('auth-service logs in an active user with a valid password', async () => {
  const passwordHash = await bcrypt.hash('Employee123!', 12);
  const service = createService([createUser({ passwordHash })]);

  const result = await service.login({
    email: 'EMPLOYEE@DEXA.TEST',
    password: 'Employee123!',
  });

  assert.equal(result.accessToken, 'signed-token:user-1');
  assert.equal(result.user.email, 'employee@dexa.test');
  assert.equal(result.user.role, UserRole.EMPLOYEE);
  assert.equal('passwordHash' in result.user, false);
});

test('auth-service rejects an invalid password', async () => {
  const passwordHash = await bcrypt.hash('Employee123!', 12);
  const service = createService([createUser({ passwordHash })]);

  await assert.rejects(
    service.login({
      email: 'employee@dexa.test',
      password: 'WrongPassword123!',
    }),
    (error) => {
      assert.equal(rpcPayload(error).statusCode, 401);
      return true;
    },
  );
});

test('auth-service rejects inactive users', async () => {
  const passwordHash = await bcrypt.hash('Employee123!', 12);
  const service = createService([createUser({ passwordHash, active: false })]);

  await assert.rejects(
    service.login({
      email: 'employee@dexa.test',
      password: 'Employee123!',
    }),
    (error) => {
      assert.equal(rpcPayload(error).statusCode, 403);
      return true;
    },
  );
});
