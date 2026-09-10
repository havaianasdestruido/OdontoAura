import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ParseBoolPipe, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { HealthPlansService, CreateHealthPlanDto, UpdateHealthPlanDto, AssignPlanDto } from './health-plans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuthUser } from '../common/auth-user';

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
  findAll(@Query('activeOnly', new ParseBoolPipe({ optional: true })) activeOnly?: boolean) {
    return this.healthPlansService.findAll(activeOnly);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get health plan by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthPlansService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update health plan (Admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHealthPlanDto) {
    return this.healthPlansService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete health plan (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
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
  getPatientPlans(@Param('patientId', ParseUUIDPipe) patientId: string, @Request() req: { user: AuthUser }) {
    return this.healthPlansService.getPatientPlans(patientId, req.user);
  }

  @Get('verify/:patientId/:healthPlanId')
  @ApiOperation({ summary: 'Verify patient coverage for a health plan' })
  verifyCoverage(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('healthPlanId', ParseUUIDPipe) healthPlanId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.healthPlansService.verifyCoverage(patientId, healthPlanId, req.user);
  }

  // TODO: removePatientPlan() has no actor auth — any EMPLOYEE can remove any patient's plan assignment without ownership check
  @Delete('patient-plan/:id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Remove patient health plan' })
  removePatientPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthPlansService.removePatientPlan(id);
  }
}