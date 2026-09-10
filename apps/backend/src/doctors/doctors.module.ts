import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { SpecialtiesService } from './specialties.service';
import { SpecialtiesController } from './specialties.controller';

@Module({
  imports: [AuthModule],
  providers: [DoctorsService, SpecialtiesService],
  controllers: [DoctorsController, SpecialtiesController],
  exports: [DoctorsService, SpecialtiesService],
})
export class DoctorsModule {}
