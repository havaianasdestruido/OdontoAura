import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from './auth.service';

function cookieExtractor(req: { headers: { cookie?: string } }): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('token='));
  if (!token) return null;
  return decodeURIComponent(token.slice('token='.length));
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
      algorithms: ['HS256'],
      issuer: configService.get<string>('JWT_ISSUER', 'odontoaura-api'),
      audience: configService.get<string>('JWT_AUDIENCE', 'odontoaura-client'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}