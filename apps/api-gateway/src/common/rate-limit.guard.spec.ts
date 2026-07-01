import assert from 'node:assert/strict';
import test from 'node:test';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';

function createGuard() {
  const reflector = {
    getAllAndOverride: () => ({
      limit: 2,
      windowMs: 60_000,
      keyPrefix: 'test',
    }),
  } as unknown as Reflector;

  return new RateLimitGuard(reflector);
}

function createContext(remoteAddress = '127.0.0.1'): ExecutionContext {
  const responseHeaders: Record<string, string> = {};

  return {
    getType: () => 'http',
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        socket: {
          remoteAddress,
        },
      }),
      getResponse: () => ({
        setHeader: (name: string, value: string) => {
          responseHeaders[name] = value;
        },
      }),
    }),
  } as unknown as ExecutionContext;
}

test('rate limit guard rejects requests after the configured limit', () => {
  const guard = createGuard();
  const context = createContext();

  assert.equal(guard.canActivate(context), true);
  assert.equal(guard.canActivate(context), true);
  assert.throws(() => guard.canActivate(context), (error) => error instanceof HttpException && error.getStatus() === 429);
});

test('rate limit guard tracks clients separately', () => {
  const guard = createGuard();

  assert.equal(guard.canActivate(createContext('127.0.0.1')), true);
  assert.equal(guard.canActivate(createContext('127.0.0.1')), true);
  assert.equal(guard.canActivate(createContext('127.0.0.2')), true);
});
