import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { appendCookie, clearCookie, parseCookies, SameSiteOption } from './cookie';

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'dexa_access_token';
export const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME ?? 'dexa_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const DEFAULT_AUTH_MAX_AGE_SECONDS = 8 * 60 * 60;
const DEFAULT_CSRF_MAX_AGE_SECONDS = 8 * 60 * 60;

export function getAuthCookieToken(request: Request): string | null {
  return parseCookies(request)[AUTH_COOKIE_NAME] ?? null;
}

export function getCsrfCookieToken(request: Request): string | null {
  return parseCookies(request)[CSRF_COOKIE_NAME] ?? null;
}

export function getCsrfHeaderToken(request: Request): string | null {
  const value = request.headers[CSRF_HEADER_NAME];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function issueAuthCookie(response: Response, token: string) {
  appendCookie(response, AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAgeSeconds: resolvePositiveInteger(process.env.AUTH_COOKIE_MAX_AGE_SECONDS, DEFAULT_AUTH_MAX_AGE_SECONDS),
  });
}

export function clearAuthCookie(response: Response) {
  clearCookie(response, AUTH_COOKIE_NAME, {
    ...baseCookieOptions(),
    httpOnly: true,
  });
}

export function issueCsrfCookie(response: Response): string {
  const token = randomBytes(32).toString('base64url');
  appendCookie(response, CSRF_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAgeSeconds: resolvePositiveInteger(process.env.CSRF_COOKIE_MAX_AGE_SECONDS, DEFAULT_CSRF_MAX_AGE_SECONDS),
  });

  return token;
}

export function clearCsrfCookie(response: Response) {
  clearCookie(response, CSRF_COOKIE_NAME, {
    ...baseCookieOptions(),
    httpOnly: true,
  });
}

function baseCookieOptions() {
  return {
    secure: resolveBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
    sameSite: resolveSameSite(process.env.COOKIE_SAMESITE),
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    path: '/',
  };
}

function resolveSameSite(value: string | undefined): SameSiteOption {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'strict' || normalized === 'none') {
    return normalized;
  }

  return 'lax';
}

function resolveBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function resolvePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
