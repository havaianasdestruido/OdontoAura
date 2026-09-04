import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock-token') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
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

    it('should reject invalid credentials', async () => {
      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
