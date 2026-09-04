import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { HealthPlansService, CreateHealthPlanDto, UpdateHealthPlanDto, AssignPlanDto } from './health-plans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Health Plans')
@Controller('health-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HealthPlansController {
  constructor(private readonly healthPlansService: HealthPlansService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a health plan (Admin)' })
  create(@Body() dto: CreateHealthPlanDto) {
    return this.healthPlansService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List health plans' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  findAll(@Query('activeOnly') activeOnly?: boolean) {
    return this.healthPlansService.findAll(activeOnly);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get health plan by ID' })
  findOne(@Param('id') id: string) {
    return this.healthPlansService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update health plan (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateHealthPlanDto) {
    return this.healthPlansService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete health plan (Admin)' })
  remove(@Param('id') id: string) {
    return this.healthPlansService.remove(id);
  }

  @Post('assign')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Assign health plan to patient' })
  assign(@Body() dto: AssignPlanDto) {
    return this.healthPlansService.assignToPatient(dto);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get patient health plans' })
  getPatientPlans(@Param('patientId') patientId: string) {
    return this.healthPlansService.getPatientPlans(patientId);
  }

  @Get('verify/:patientId/:healthPlanId')
  @ApiOperation({ summary: 'Verify patient coverage for a health plan' })
  verifyCoverage(@Param('patientId') patientId: string, @Param('healthPlanId') healthPlanId: string) {
    return this.healthPlansService.verifyCoverage(patientId, healthPlanId);
  }

  @Delete('patient-plan/:id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Remove patient health plan' })
  removePatientPlan(@Param('id') id: string) {
    return this.healthPlansService.removePatientPlan(id);
  }
}
