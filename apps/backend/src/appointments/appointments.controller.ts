import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ParseEnumPipe, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AppointmentsService, CreateAppointmentDto, UpdateAppointmentDto, AppointmentStatus } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuthUser } from '../common/auth-user';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.PATIENT, Role.EMPLOYEE, Role.ADMIN)
  @ApiOperation({ summary: 'Schedule a new appointment' })
  create(@Body() dto: CreateAppointmentDto, @Request() req: { user: AuthUser }) {
    return this.appointmentsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments with optional filters' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  findAll(
    @Request() req: { user: AuthUser },
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status', new ParseEnumPipe(AppointmentStatus, { optional: true })) status?: AppointmentStatus,
  ) {
    return this.appointmentsService.findAll({ patientId, doctorId, status }, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    return this.appointmentsService.findOne(id, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update appointment notes or reschedule' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAppointmentDto, @Request() req: { user: AuthUser }) {
    return this.appointmentsService.update(id, dto, req.user);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment (owner or staff)' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    return this.appointmentsService.cancel(id, req.user);
  }

  @Put(':id/confirm')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  @ApiOperation({ summary: 'Confirm an appointment (Reception/Admin)' })
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.updateStatus(id, AppointmentStatus.CONFIRMED);
  }

  @Put(':id/no-show')
  @Roles(Role.EMPLOYEE, Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Mark appointment as no-show (Employee/Admin/Doctor)' })
  noShow(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    return this.appointmentsService.updateStatus(id, AppointmentStatus.NO_SHOW, req.user);
  }

  @Put(':id/start')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Start appointment (Doctor/Admin)' })
  start(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    return this.appointmentsService.updateStatus(id, AppointmentStatus.IN_PROGRESS, req.user);
  }

  @Put(':id/complete')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Complete appointment (Doctor/Admin)' })
  complete(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    return this.appointmentsService.updateStatus(id, AppointmentStatus.COMPLETED, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Delete appointment (Admin/Employee)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.remove(id);
  }
}