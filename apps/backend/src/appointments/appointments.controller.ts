import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AppointmentsService, CreateAppointmentDto, AppointmentStatus } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.PATIENT, Role.EMPLOYEE, Role.ADMIN)
  @ApiOperation({ summary: 'Schedule a new appointment' })
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments with optional filters' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  findAll(
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointmentsService.findAll({ patientId, doctorId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update appointment' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.appointmentsService.update(id, dto);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment' })
  cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @Put(':id/confirm')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @ApiOperation({ summary: 'Confirm an appointment (Reception/Admin)' })
  confirm(@Param('id') id: string) {
    return this.appointmentsService.updateStatus(id, AppointmentStatus.CONFIRMED);
  }

  @Put(':id/start')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Start appointment (Doctor/Admin)' })
  start(@Param('id') id: string) {
    return this.appointmentsService.updateStatus(id, AppointmentStatus.IN_PROGRESS);
  }

  @Put(':id/complete')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Complete appointment (Doctor/Admin)' })
  complete(@Param('id') id: string) {
    return this.appointmentsService.updateStatus(id, AppointmentStatus.COMPLETED);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Delete appointment (Admin/Employee)' })
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
