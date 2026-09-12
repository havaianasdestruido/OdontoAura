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
import { StatsModule } from './stats/stats.module';

function validateEnv(config: Record<string, unknown>) {
  const required = ['DATABASE_URL'];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (config['NODE_ENV'] === 'production' && !config['JWT_SECRET']) {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  }

  if (config['PORT'] && Number.isNaN(Number(config['PORT']))) {
    throw new Error('PORT must be a number');
  }

  const expiry = config['JWT_EXPIRATION'] as string | undefined;
  if (expiry && !/^\d+[sSmMhHdDwW]$/.test(expiry)) {
    throw new Error('JWT_EXPIRATION must be a duration string like 1h, 15m');
  }

  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DoctorsModule,
    AppointmentsModule,
    HealthPlansModule,
    MedicalRecordsModule,
    StatsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
