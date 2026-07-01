import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_PATTERNS, JwtPrincipal, PublicUser, resolveJwtSecret, SERVICE_CLIENTS } from '@dexa/contracts';
import { AuthenticatedRequest } from './authenticated-request';
import { getAuthCookieToken } from './auth-cookies';
import { sendRpc } from './rpc-client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(SERVICE_CLIENTS.AUTH) private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getAuthCookieToken(request) ?? this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token.');
    }

    let payload: JwtPrincipal;
    try {
      payload = await this.jwtService.verifyAsync<JwtPrincipal>(token, {
        secret: resolveJwtSecret(process.env),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const user = await sendRpc<PublicUser>(this.authClient, AUTH_PATTERNS.ME, { userId: payload.sub });
    if (!user.active) {
      throw new ForbiddenException('This account is inactive.');
    }

    request.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return true;
  }

  private extractBearerToken(header: string | undefined): string | null {
    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
