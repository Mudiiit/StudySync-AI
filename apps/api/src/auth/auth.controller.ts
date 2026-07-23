import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { GithubOauthGuard } from './guards/github-oauth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return user;
  }

  @Get('oauth/google')
  @UseGuards(GoogleOauthGuard)
  googleAuth() {}

  @Get('oauth/google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    try {
      const tokens = await this.authService.validateOAuth(req.user);
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const access = encodeURIComponent(tokens.accessToken);
      const refresh = encodeURIComponent(tokens.refreshToken);
      return res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${access}&refreshToken=${refresh}`,
      );
    } catch (err: any) {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(err.message || 'OAuth authentication failed')}`,
      );
    }
  }

  @Get('oauth/github')
  @UseGuards(GithubOauthGuard)
  async githubAuth() {}

  @Get('oauth/github/callback')
  @UseGuards(GithubOauthGuard)
  async githubAuthCallback(@Req() req: any, @Res() res: Response) {
    try {
      const tokens = await this.authService.validateOAuth(req.user);
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const access = encodeURIComponent(tokens.accessToken);
      const refresh = encodeURIComponent(tokens.refreshToken);
      return res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${access}&refreshToken=${refresh}`,
      );
    } catch (err: any) {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(err.message || 'OAuth authentication failed')}`,
      );
    }
  }
}
