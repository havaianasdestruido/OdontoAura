import { describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from './auth.service';

describe('JwtStrategy', () => {
  // TODO: assert validate throws UnauthorizedException when authService.validateUser returns null
  // TODO: test with malformed payload missing required fields (sub, email, role) to verify graceful handling
  it('should resolve an AuthUser from the signed payload without any database access', async () => {
    const authService = {
      validateUser: vi.fn((payload: JwtPayload) => ({
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      })),
    };
    const strategy = new JwtStrategy(
      { get: () => 'test-secret' } as never,
      authService as never,
    );

    const user = await strategy.validate({ sub: 'usr_1', email: 'a@b.com', name: 'Ana', role: Role.DOCTOR });

    expect(user).toEqual({ id: 'usr_1', email: 'a@b.com', name: 'Ana', role: Role.DOCTOR });
    expect(authService.validateUser).toHaveBeenCalledTimes(1);
    expect(authService.validateUser).toHaveBeenCalledWith({ sub: 'usr_1', email: 'a@b.com', name: 'Ana', role: Role.DOCTOR });
  });
});