import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MedicalRecordsService, CreateMedicalRecordDto, UpdateMedicalRecordDto } from './medical-records.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Medical Records')
@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Create medical record for an appointment (Doctor only)' })
  create(@Body() dto: CreateMedicalRecordDto) {
    return this.medicalRecordsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List medical records' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'appointmentId', required: false })
  findAll(@Query('patientId') patientId?: string, @Query('appointmentId') appointmentId?: string) {
    if (appointmentId) return this.medicalRecordsService.findByAppointment(appointmentId);
    if (patientId) return this.medicalRecordsService.findByPatient(patientId);
    return [];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medical record by ID' })
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Update medical record (Doctor only)' })
  update(@Param('id') id: string, @Body() dto: UpdateMedicalRecordDto) {
    return this.medicalRecordsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete medical record (Admin only)' })
  remove(@Param('id') id: string) {
    return this.medicalRecordsService.remove(id);
  }
}
