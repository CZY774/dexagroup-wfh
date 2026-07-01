import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { getCsrfCookieToken, getCsrfHeaderToken } from './auth-cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const csrfCookie = getCsrfCookieToken(request);
    const csrfHeader = getCsrfHeaderToken(request);
    if (!csrfCookie || !csrfHeader || !safeTokenEquals(csrfCookie, csrfHeader)) {
      throw new ForbiddenException('Invalid CSRF token.');
    }

    return true;
  }
}

function safeTokenEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
