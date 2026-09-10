import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SpecialtiesService, CreateSpecialtyDto } from './specialties.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Specialties')
@Controller('specialties')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new specialty (Admin)' })
  create(@Body() dto: CreateSpecialtyDto) {
    return this.specialtiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all specialties' })
  findAll() {
    return this.specialtiesService.findAll();
  }

  // TODO: add PUT endpoint — cannot update existing specialty name or description
  @Get(':id')
  @ApiOperation({ summary: 'Get specialty by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.specialtiesService.findOne(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete specialty (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.specialtiesService.remove(id);
  }
}
