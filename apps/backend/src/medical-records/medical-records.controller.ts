import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MedicalRecordsService, CreateMedicalRecordDto, UpdateMedicalRecordDto } from './medical-records.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuthUser } from '../common/auth-user';

@ApiTags('Medical Records')
@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Create medical record for an appointment (Doctor only)' })
  create(@Body() dto: CreateMedicalRecordDto, @Request() req: { user: AuthUser }) {
    return this.medicalRecordsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List medical records (filter by patient or appointment)' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'appointmentId', required: false })
  findAll(@Request() req: { user: AuthUser }, @Query('patientId') patientId?: string, @Query('appointmentId') appointmentId?: string) {
    if (appointmentId) return this.medicalRecordsService.findByAppointment(appointmentId, req.user);
    if (patientId) return this.medicalRecordsService.findByPatient(patientId, req.user);
    throw new BadRequestException('patientId or appointmentId is required');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medical record by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    return this.medicalRecordsService.findOne(id, req.user);
  }

  @Put(':id')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Update medical record (Doctor only)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMedicalRecordDto, @Request() req: { user: AuthUser }) {
    return this.medicalRecordsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Void medical record (Admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    return this.medicalRecordsService.remove(id, req.user);
  }
}
