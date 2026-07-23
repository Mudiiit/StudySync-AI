import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role || 'STUDENT',
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role, jti: crypto.randomUUID() };
    const accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') || 'access_secret';
    const refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh_secret';

    const [accessToken, refreshTokenString] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessTokenSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshTokenSecret,
        expiresIn: '7d',
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
    };
  }

  async refresh(token: string) {
    const dbToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!dbToken) {
      this.logger.warn('Refresh failed: Refresh token not found in database.');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (dbToken.revokedAt) {
      this.logger.warn('Refresh failed: Refresh token was already revoked.');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (dbToken.expiresAt < new Date()) {
      this.logger.warn(
        `Refresh token expired: Token expired at ${dbToken.expiresAt.toISOString()}.`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new pair
    return this.generateTokens(
      dbToken.user.id,
      dbToken.user.email,
      dbToken.user.role,
    );
  }

  async logout(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async validateOAuth(profile: {
    provider: string;
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  }) {
    try {
      const socialAccount = await this.prisma.socialAccount.findUnique({
        where: { providerId: profile.providerId },
        include: { user: true },
      });

      let user;

      if (socialAccount) {
        user = socialAccount.user;
      } else {
        user = await this.prisma.user.findUnique({
          where: { email: profile.email },
        });

        if (!user) {
          user = await this.prisma.user.create({
            data: {
              email: profile.email,
              isEmailVerified: true,
              profile: {
                create: {
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  avatarUrl: profile.avatarUrl,
                },
              },
              socialAccounts: {
                create: {
                  provider: profile.provider,
                  providerId: profile.providerId,
                },
              },
            },
          });
        } else {
          await this.prisma.socialAccount.create({
            data: {
              userId: user.id,
              provider: profile.provider,
              providerId: profile.providerId,
            },
          });
        }
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return tokens;
    } catch (err: any) {
      console.error(
        '[AuthService] ERROR inside validateOAuth:',
        err.message,
        err.stack,
      );
      throw err;
    }
  }
}
