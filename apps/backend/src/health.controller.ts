import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'odontoaura-api' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Readiness probe that verifies database connectivity' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'error', database: 'down', timestamp: new Date().toISOString() };
    }
  }
}