import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  // TODO: add readiness probe endpoint that verifies DB connectivity via PrismaService.$queryRaw
  check() {
    // TODO: add @Header('Cache-Control', 'no-store') — timestamp in body makes response non-cacheable
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'odontoaura-api' };
  }
}
