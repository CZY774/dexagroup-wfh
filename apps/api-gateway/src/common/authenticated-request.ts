import { Request } from 'express';
import { JwtPrincipal } from '@dexa/contracts';

export type AuthenticatedRequest = Request & {
  user: JwtPrincipal;
};
