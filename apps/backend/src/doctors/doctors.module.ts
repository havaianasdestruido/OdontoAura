import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { SpecialtiesService } from './specialties.service';
import { SpecialtiesController } from './specialties.controller';

@Module({
  providers: [DoctorsService, SpecialtiesService],
  controllers: [DoctorsController, SpecialtiesController],
  exports: [DoctorsService, SpecialtiesService],
})
export class DoctorsModule {}
