import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { LoginRateLimiter } from './login-rate-limiter';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV', 'development');
        const secret = config.get<string>('JWT_SECRET');
        if (nodeEnv === 'production' && !secret) {
          throw new Error('JWT_SECRET must be set when NODE_ENV=production');
        }
        return {
          secret: secret ?? 'dev-secret',
          signOptions: {
            expiresIn: config.get<string>('JWT_EXPIRATION', '1h') as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'],
            issuer: config.get<string>('JWT_ISSUER', 'odontoaura-api'),
            audience: config.get<string>('JWT_AUDIENCE', 'odontoaura-client'),
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard, LoginRateLimiter],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard, RolesGuard, LoginRateLimiter],
})
export class AuthModule {}