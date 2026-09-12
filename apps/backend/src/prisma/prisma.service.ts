import { Injectable, Logger, NotFoundException, ConflictException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL') ?? '';
    const baseUrl = new URL(url);
    const connectionLimit = config.get<string>('DATABASE_CONNECTION_LIMIT');
    const poolTimeout = config.get<string>('DATABASE_POOL_TIMEOUT');
    if (connectionLimit) baseUrl.searchParams.set('connection_limit', connectionLimit);
    if (poolTimeout) baseUrl.searchParams.set('pool_timeout', poolTimeout);
    super({ datasources: { db: { url: baseUrl.toString() } } });
  }

  async onModuleInit() {
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === 'P2002') {
            throw new ConflictException('Duplicate value violates a unique constraint');
          }
          if (e.code === 'P2025') {
            throw new NotFoundException('Record not found');
          }
        }
        throw e;
      }
    });
    try {
      await this.$connect();
    } catch (e) {
      this.logger.error('Failed to connect to the database', e instanceof Error ? e.stack : undefined);
      throw e;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}