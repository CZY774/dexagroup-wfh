import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { JwtPrincipal } from '@dexa/contracts';
import { Response } from 'express';
import { CurrentUser } from '../common/current-user.decorator';
import { clearAuthCookie, clearCsrfCookie, issueAuthCookie, issueCsrfCookie } from '../common/auth-cookies';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit.decorator';
import { AuthGatewayService } from './auth-gateway.service';
import { LoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authGateway: AuthGatewayService) {}

  @Get('csrf')
  csrf(@Res({ passthrough: true }) response: Response) {
    return {
      csrfToken: issueCsrfCookie(response),
    };
  }

  @Post('login')
  @RateLimit({ limit: 5, windowMs: 60_000, keyPrefix: 'auth-login' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authGateway.login({
      email: dto.email,
      password: dto.password,
    });

    issueAuthCookie(response, result.accessToken);
    return {
      user: result.user,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPrincipal) {
    return this.authGateway.me(user.sub);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthCookie(response);
    clearCsrfCookie(response);
  }
}
