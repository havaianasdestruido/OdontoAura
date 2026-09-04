import { Module } from '@nestjs/common';
import { HealthPlansService } from './health-plans.service';
import { HealthPlansController } from './health-plans.controller';

@Module({
  providers: [HealthPlansService],
  controllers: [HealthPlansController],
  exports: [HealthPlansService],
})
export class HealthPlansModule {}
