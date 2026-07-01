import assert from 'node:assert/strict';
import test from 'node:test';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@dexa/contracts';
import { RolesGuard } from './roles.guard';

function createGuard(requiredRoles: UserRole[]) {
  const reflector = {
    getAllAndOverride: () => requiredRoles,
  } as unknown as Reflector;

  return new RolesGuard(reflector);
}

function createContext(role: UserRole): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          sub: 'user-1',
          email: 'user@dexa.test',
          role,
        },
      }),
    }),
  } as unknown as ExecutionContext;
}

test('roles guard rejects employee access to HRD-only endpoints', () => {
  const guard = createGuard([UserRole.HRD_ADMIN]);

  assert.equal(guard.canActivate(createContext(UserRole.EMPLOYEE)), false);
});

test('roles guard rejects HRD admin access to employee-only attendance submission', () => {
  const guard = createGuard([UserRole.EMPLOYEE]);

  assert.equal(guard.canActivate(createContext(UserRole.HRD_ADMIN)), false);
});

test('roles guard allows requests with the required role', () => {
  const guard = createGuard([UserRole.HRD_ADMIN]);

  assert.equal(guard.canActivate(createContext(UserRole.HRD_ADMIN)), true);
});
