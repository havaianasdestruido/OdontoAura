import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // TODO: accept connection_limit and pool_timeout from env config for production tuning
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
  // TODO: add $use middleware to map PrismaClientKnownRequestError — P2002→409, P2025→404 — so services don't repeat this
}