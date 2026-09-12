import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StatsController } from './stats.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [StatsController],
})
export class StatsModule {}