import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: vi.fn(async () => [{ 1: 1 }]) } },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return ok status', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('odontoaura-api');
    expect(result).toHaveProperty('timestamp');
  });
  // TODO: add test for unhealthy state when DB connectivity check fails
});
