import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsController } from './medical-records.controller';

@Module({
  imports: [AuthModule],
  providers: [MedicalRecordsService],
  controllers: [MedicalRecordsController],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
