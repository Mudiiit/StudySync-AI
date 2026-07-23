import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('GITHUB_CLIENT_ID') ||
        'placeholder_github_id',
      clientSecret:
        configService.get<string>('GITHUB_CLIENT_SECRET') ||
        'placeholder_github_secret',
      callbackURL:
        configService.get<string>('GITHUB_CALLBACK_URL') ||
        'http://localhost:5001/auth/oauth/github/callback',
      scope: ['user:email'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any): any {
    try {
      const { displayName, username, emails, photos, id } = profile;
      const email = emails?.[0]?.value || `${username}@github.com`;
      const names = (displayName || username || '').split(' ');
      const user = {
        provider: 'GITHUB',
        providerId: id,
        email,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        avatarUrl: photos?.[0]?.value || null,
      };

      return user;
    } catch (err: any) {
      console.error(
        '[GithubStrategy] Exception during validate:',
        err.message,
        err.stack,
      );
      throw err;
    }
  }
}
