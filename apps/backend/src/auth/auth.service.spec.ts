import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService, RegisterDto } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

function createPrismaMock() {
  const users: { id: string; email: string; password: string; name: string; phone: string | null; role: Role }[] = [];
  return {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) =>
        users.find(u => u.email === where.email || u.id === where.id) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: RegisterDto & { id?: string; role?: Role } }) => {
        const user = {
          id: data.id ?? `usr_${users.length + 1}`,
          email: data.email,
          password: data.password,
          name: data.name,
          phone: data.phone ?? null,
          role: data.role || Role.PATIENT,
        };
        users.push(user);
        return user;
      }),
    },
    _users: users,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: vi.fn().mockReturnValue('mock-token') } },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return token', async () => {
      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result).toHaveProperty('access_token', 'mock-token');
      expect(result.user).toHaveProperty('id');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.role).toBe('PATIENT');
    });

    it('should reject duplicate email', async () => {
      await service.register({ email: 'dup@example.com', password: 'pass123', name: 'First' });
      await expect(
        service.register({ email: 'dup@example.com', password: 'pass123', name: 'Second' }),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      await service.register({ email: 'login@example.com', password: 'password123', name: 'Login User' });
      const result = await service.login({ email: 'login@example.com', password: 'password123' });
      expect(result).toHaveProperty('access_token');
      expect(result.user.email).toBe('login@example.com');
    });

    // TODO: test login with an existing user but wrong password to cover bcrypt.compare failure branch
    // TODO: test that register returns user object without password field in the response
    it('should reject invalid credentials', async () => {
      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('validateUser', () => {
    it('should map the JWT payload to an AuthUser without querying the database', () => {
      const result = service.validateUser({ sub: 'usr_1', email: 'a@b.com', name: 'Ana', role: Role.DOCTOR });
      expect(result).toEqual({ id: 'usr_1', email: 'a@b.com', name: 'Ana', role: Role.DOCTOR });
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(0);
    });

    it('should fall back to an empty name for tokens issued without one', () => {
      const legacy = { sub: 'usr_1', email: 'a@b.com', role: Role.PATIENT } as Parameters<typeof service.validateUser>[0];
      const result = service.validateUser(legacy);
      expect(result).toEqual({ id: 'usr_1', email: 'a@b.com', name: '', role: Role.PATIENT });
    });
  });
});