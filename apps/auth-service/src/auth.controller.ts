import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_PATTERNS } from '@dexa/contracts';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() payload: { email: string; password: string }) {
    return this.authService.login(payload);
  }

  @MessagePattern(AUTH_PATTERNS.ME)
  me(@Payload() payload: { userId: string }) {
    return this.authService.me(payload.userId);
  }

  @MessagePattern(AUTH_PATTERNS.CREATE_EMPLOYEE_USER)
  createEmployeeUser(@Payload() payload: { email: string; password: string }) {
    return this.authService.createEmployeeUser(payload);
  }

  @MessagePattern(AUTH_PATTERNS.UPDATE_USER_EMAIL)
  updateUserEmail(@Payload() payload: { userId: string; email: string }) {
    return this.authService.updateUserEmail(payload);
  }

  @MessagePattern(AUTH_PATTERNS.SET_USER_ACTIVE)
  setUserActive(@Payload() payload: { userId: string; active: boolean }) {
    return this.authService.setUserActive(payload);
  }

  @MessagePattern(AUTH_PATTERNS.DELETE_USER)
  deleteUser(@Payload() payload: { userId: string }) {
    return this.authService.deleteUser(payload);
  }
}
