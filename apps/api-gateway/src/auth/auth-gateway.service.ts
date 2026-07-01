import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_PATTERNS, LoginResult, PublicUser, SERVICE_CLIENTS } from '@dexa/contracts';
import { sendRpc } from '../common/rpc-client';

@Injectable()
export class AuthGatewayService {
  constructor(@Inject(SERVICE_CLIENTS.AUTH) private readonly authClient: ClientProxy) {}

  login(payload: { email: string; password: string }): Promise<LoginResult> {
    return sendRpc<LoginResult>(this.authClient, AUTH_PATTERNS.LOGIN, payload);
  }

  me(userId: string): Promise<PublicUser> {
    return sendRpc<PublicUser>(this.authClient, AUTH_PATTERNS.ME, { userId });
  }

  createEmployeeUser(payload: { email: string; password: string }): Promise<PublicUser> {
    return sendRpc<PublicUser>(this.authClient, AUTH_PATTERNS.CREATE_EMPLOYEE_USER, payload);
  }

  updateUserEmail(payload: { userId: string; email: string }): Promise<PublicUser> {
    return sendRpc<PublicUser>(this.authClient, AUTH_PATTERNS.UPDATE_USER_EMAIL, payload);
  }

  setUserActive(payload: { userId: string; active: boolean }): Promise<PublicUser> {
    return sendRpc<PublicUser>(this.authClient, AUTH_PATTERNS.SET_USER_ACTIVE, payload);
  }
}
