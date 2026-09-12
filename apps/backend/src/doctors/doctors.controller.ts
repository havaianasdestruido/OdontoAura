import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DoctorsService, CreateDoctorDto, UpdateDoctorDto, CreateAvailabilityDto } from './doctors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/auth-user';

@ApiTags('Doctors')
@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 201, description: 'Doctor profile created' })
  @ApiResponse({ status: 400, description: 'User is not a DOCTOR' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User or specialty not found' })
  @ApiResponse({ status: 409, description: 'License already in use or profile exists' })
  @ApiOperation({ summary: 'Register a new doctor profile (Admin)' })
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiOperation({ summary: 'List all doctors' })
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0,
    @Query('take', new DefaultValuePipe(500), ParseIntPipe) take = 500,
    @Request() req: { user: AuthUser },
  ) {
    return this.doctorsService.findAll(req.user, skip, take);
  }

  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Get doctor profile by user ID' })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.doctorsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get doctor by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    return this.doctorsService.findOne(id, req.user);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Update doctor profile' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDoctorDto, @Request() req: { user: AuthUser }) {
    return this.doctorsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove doctor profile (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctorsService.remove(id);
  }

  @Post(':id/availability')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Add availability slot for a doctor' })
  addAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAvailabilityDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.doctorsService.addAvailability(id, dto, req.user);
  }

  @Put(':id/availability/:slotId')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Update an availability slot' })
  updateAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: CreateAvailabilityDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.doctorsService.updateAvailability(id, slotId, dto, req.user);
  }

  @Delete(':id/availability/:slotId')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Remove an availability slot' })
  removeAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.doctorsService.removeAvailability(id, slotId, req.user);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability slots for a doctor' })
  getAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctorsService.getAvailability(id);
  }
}