import { SetMetadata } from '@nestjs/common';

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
};

export const RATE_LIMIT_METADATA = 'dexa:rate-limit';

export function RateLimit(options: RateLimitOptions) {
  return SetMetadata(RATE_LIMIT_METADATA, options);
}
