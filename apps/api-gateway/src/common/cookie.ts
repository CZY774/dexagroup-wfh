import { Request, Response } from 'express';

export type SameSiteOption = 'lax' | 'strict' | 'none';

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSiteOption;
  maxAgeSeconds?: number;
  path?: string;
  domain?: string;
};

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.cookie;
  if (!header) {
    return {};
  }

  return header.split(';').reduce<Record<string, string>>((cookies, part) => {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) {
      return cookies;
    }

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (name) {
      cookies[name] = safeDecodeURIComponent(value);
    }

    return cookies;
  }, {});
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function appendCookie(response: Response, name: string, value: string, options: CookieOptions) {
  const existing = response.getHeader('Set-Cookie');
  const nextCookie = serializeCookie(name, value, options);
  const cookies = Array.isArray(existing)
    ? [...existing.map(String), nextCookie]
    : existing
      ? [String(existing), nextCookie]
      : [nextCookie];

  response.setHeader('Set-Cookie', cookies);
}

export function clearCookie(response: Response, name: string, options: Pick<CookieOptions, 'path' | 'domain' | 'secure' | 'sameSite' | 'httpOnly'> = {}) {
  appendCookie(response, name, '', {
    ...options,
    maxAgeSeconds: 0,
  });
}

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  segments.push(`Path=${options.path ?? '/'}`);
  if (options.maxAgeSeconds !== undefined) {
    segments.push(`Max-Age=${options.maxAgeSeconds}`);
  }
  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }
  if (options.httpOnly) {
    segments.push('HttpOnly');
  }
  if (options.secure) {
    segments.push('Secure');
  }
  if (options.sameSite) {
    segments.push(`SameSite=${formatSameSite(options.sameSite)}`);
  }

  return segments.join('; ');
}

function formatSameSite(value: SameSiteOption): string {
  if (value === 'none') {
    return 'None';
  }

  return value === 'strict' ? 'Strict' : 'Lax';
}
