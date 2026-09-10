import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthPlansService } from './health-plans.service';
import { HealthPlansController } from './health-plans.controller';

@Module({
  imports: [AuthModule],
  providers: [HealthPlansService],
  controllers: [HealthPlansController],
  exports: [HealthPlansService],
})
export class HealthPlansModule {}
