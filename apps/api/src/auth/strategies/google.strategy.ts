import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') ||
        'placeholder_google_id',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ||
        'placeholder_google_secret',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:5001/auth/oauth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any): any {
    try {
      console.log(
        '[GoogleStrategy] Entering validate. Profile ID:',
        profile.id,
      );
      console.log(
        '[GoogleStrategy] Profile data:',
        JSON.stringify({
          id: profile.id,
          emails: profile.emails,
          name: profile.name,
          photos: profile.photos,
        }),
      );

      const { name, emails, photos, id } = profile;
      const email = emails?.[0]?.value;
      if (!email) {
        throw new Error('No email address returned from Google profile scope.');
      }

      const user = {
        provider: 'GOOGLE',
        providerId: id,
        email,
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        avatarUrl: photos?.[0]?.value || null,
      };

      console.log('[GoogleStrategy] Successfully mapped user:', user);
      return user;
    } catch (err: any) {
      console.error(
        '[GoogleStrategy] Exception during validate:',
        err.message,
        err.stack,
      );
      throw err;
    }
  }
}
