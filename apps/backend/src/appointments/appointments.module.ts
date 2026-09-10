// TODO: explicitly import PrismaModule instead of relying on global-scope registration
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [AuthModule],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
