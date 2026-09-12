import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SpecialtiesService, CreateSpecialtyDto, UpdateSpecialtyDto } from './specialties.service';
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
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiOperation({ summary: 'List all specialties' })
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0,
    @Query('take', new DefaultValuePipe(500), ParseIntPipe) take = 500,
  ) {
    return this.specialtiesService.findAll(skip, take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specialty by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.specialtiesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update specialty (Admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.specialtiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete specialty (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.specialtiesService.remove(id);
  }
}