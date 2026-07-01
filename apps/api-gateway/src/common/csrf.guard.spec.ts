import assert from 'node:assert/strict';
import test from 'node:test';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

function createContext(method: string, csrfHeader?: string, csrfCookie?: string): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers: {
          ...(csrfHeader ? { 'x-csrf-token': csrfHeader } : {}),
          ...(csrfCookie ? { cookie: `dexa_csrf_token=${encodeURIComponent(csrfCookie)}` } : {}),
        },
      }),
    }),
  } as unknown as ExecutionContext;
}

test('csrf guard allows safe requests without csrf token', () => {
  const guard = new CsrfGuard();

  assert.equal(guard.canActivate(createContext('GET')), true);
});

test('csrf guard allows mutating requests with matching header and cookie tokens', () => {
  const guard = new CsrfGuard();

  assert.equal(guard.canActivate(createContext('POST', 'token-1', 'token-1')), true);
});

test('csrf guard rejects mutating requests without matching header and cookie tokens', () => {
  const guard = new CsrfGuard();

  assert.throws(() => guard.canActivate(createContext('POST', 'token-1', 'token-2')), ForbiddenException);
  assert.throws(() => guard.canActivate(createContext('PATCH')), ForbiddenException);
});
