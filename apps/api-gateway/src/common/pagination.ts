import { BadRequestException } from '@nestjs/common';
import type { PaginationInput } from '@dexa/contracts';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export function parsePaginationQuery(page?: string, limit?: string): PaginationInput {
  const parsedPage = parsePositiveInteger(page, DEFAULT_PAGE, 'Page');
  const parsedLimit = parsePositiveInteger(limit, DEFAULT_LIMIT, 'Limit');

  if (parsedLimit > MAX_LIMIT) {
    throw new BadRequestException(`Limit must be ${MAX_LIMIT} or fewer.`);
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
  };
}

function parsePositiveInteger(value: string | undefined, defaultValue: number, label: string): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    throw new BadRequestException(`${label} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${label} must be a positive integer.`);
  }

  return parsed;
}
