import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { HealthPlansModule } from './health-plans/health-plans.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';

@Module({
  imports: [
    // TODO: add validationSchema (joi/zod) to ConfigModule.forRoot so missing/invalid env vars fail at boot
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DoctorsModule,
    AppointmentsModule,
    HealthPlansModule,
    MedicalRecordsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
