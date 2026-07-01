import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RATE_LIMIT_METADATA, RateLimitOptions } from './rate-limit.decorator';

type Bucket = {
  count: number;
  resetAt: number;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 100;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly defaultOptions: RateLimitOptions = {
    limit: resolvePositiveInteger(process.env.RATE_LIMIT_MAX, DEFAULT_LIMIT),
    windowMs: resolvePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
    keyPrefix: 'global',
  };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]) ?? this.defaultOptions;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const now = Date.now();
    const key = this.createKey(request, context, options);
    const bucket = this.resolveBucket(key, now, options.windowMs);

    bucket.count += 1;
    const remaining = Math.max(0, options.limit - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    response.setHeader('RateLimit-Limit', String(options.limit));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > options.limit) {
      response.setHeader('Retry-After', String(resetSeconds));
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private resolveBucket(key: string, now: number, windowMs: number): Bucket {
    const existing = this.buckets.get(key);
    if (existing && existing.resetAt > now) {
      return existing;
    }

    const bucket = {
      count: 0,
      resetAt: now + windowMs,
    };

    this.buckets.set(key, bucket);
    this.cleanup(now);
    return bucket;
  }

  private createKey(request: Request, context: ExecutionContext, options: RateLimitOptions): string {
    const prefix = options.keyPrefix ?? `${context.getClass().name}.${context.getHandler().name}`;
    return `${prefix}:${this.clientAddress(request)}`;
  }

  private clientAddress(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }

    if (Array.isArray(forwardedFor) && forwardedFor[0]) {
      return forwardedFor[0].split(',')[0]?.trim() || 'unknown';
    }

    return request.socket.remoteAddress ?? request.ip ?? 'unknown';
  }

  private cleanup(now: number) {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

function resolvePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
