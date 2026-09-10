import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// TODO: add @ApiResponse decorators for error codes (404, 403, 409) — swagger docs incomplete
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
  @ApiOperation({ summary: 'Register a new doctor profile (Admin)' })
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(dto);
  }

  // TODO: findAll returns full profiles incl. licenseNumber to any auth'd user — limit fields per role
  @Get()
  @ApiOperation({ summary: 'List all doctors' })
  findAll() {
    return this.doctorsService.findAll();
  }

  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Get doctor profile by user ID' })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.doctorsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get doctor by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctorsService.findOne(id);
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

  // TODO: no PUT/DELETE endpoints for availability — cannot update or remove individual slots
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

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability slots for a doctor' })
  getAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctorsService.getAvailability(id);
  }
}