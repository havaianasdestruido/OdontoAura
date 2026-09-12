import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHealthPlanDto, UpdateHealthPlanDto, AssignPlanDto } from './dto/health-plan.dto';
import { AuthUser } from '../common/auth-user';

export interface HealthPlan {
  id: string;
  name: string;
  provider: string;
  coveragePercentage: number;
  isActive: boolean;
  createdAt: string;
}

export interface PatientPlan {
  id: string;
  patientId: string;
  healthPlanId: string;
  cardNumber: string;
  expiryDate: string;
  healthPlan?: HealthPlan;
}

@Injectable()
export class HealthPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHealthPlanDto): Promise<HealthPlan> {
    const name = dto.name.trim();
    const provider = dto.provider.trim();
    const existing = await this.prisma.healthPlan.findFirst({
      where: { name, provider },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Health plan with this name and provider already exists');

    try {
      return await this.prisma.healthPlan.create({
        data: {
          name,
          provider,
          coveragePercentage: dto.coveragePercentage,
          isActive: dto.isActive ?? true,
        },
      }).then(this.toPlanResult);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Health plan with this name and provider already exists');
      }
      throw e;
    }
  }

  async findAll(activeOnly = false, skip = 0, take = 500): Promise<HealthPlan[]> {
    const plans = await this.prisma.healthPlan.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      skip,
      take,
    });
    return plans.map(this.toPlanResult);
  }

  async findOne(id: string): Promise<HealthPlan> {
    const plan = await this.prisma.healthPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Health plan ${id} not found`);
    return this.toPlanResult(plan);
  }

  async update(id: string, dto: UpdateHealthPlanDto): Promise<HealthPlan> {
    await this.findOne(id);
    if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');
    const name = dto.name !== undefined ? dto.name.trim() : undefined;
    const provider = dto.provider !== undefined ? dto.provider.trim() : undefined;
    if (name || provider) {
      const collision = await this.prisma.healthPlan.findFirst({
        where: {
          id: { not: id },
          ...(name ? { name } : {}),
          ...(provider ? { provider } : {}),
        },
        select: { id: true },
      });
      if (collision) throw new ConflictException('Health plan with this name and provider already exists');
    }
    const plan = await this.prisma.healthPlan.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(provider !== undefined ? { provider } : {}),
        ...(dto.coveragePercentage !== undefined ? { coveragePercentage: dto.coveragePercentage } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.toPlanResult(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.prisma.healthPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Health plan ${id} not found`);
    try {
      await this.prisma.healthPlan.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Health plan is assigned to patients and cannot be deleted; deactivate it instead');
      }
      throw e;
    }
  }

  async assignToPatient(dto: AssignPlanDto): Promise<PatientPlan> {
    const plan = await this.findOne(dto.healthPlanId);
    if (!plan.isActive) throw new BadRequestException('Cannot assign an inactive health plan');

    const expiry = new Date(dto.expiryDate);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      throw new BadRequestException('expiryDate must be in the future');
    }

    const patient = await this.prisma.user.findUnique({ where: { id: dto.patientId }, select: { id: true } });
    if (!patient) throw new NotFoundException(`Patient ${dto.patientId} not found`);

    const existing = await this.prisma.patientHealthPlan.findUnique({
      where: { patientId_healthPlanId: { patientId: dto.patientId, healthPlanId: dto.healthPlanId } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Patient already has this health plan');

    const patientPlan = await this.prisma.patientHealthPlan.create({
      data: {
        patientId: dto.patientId,
        healthPlanId: dto.healthPlanId,
        cardNumber: dto.cardNumber,
        expiryDate: expiry,
      },
    });

    return {
      id: patientPlan.id,
      patientId: patientPlan.patientId,
      healthPlanId: patientPlan.healthPlanId,
      cardNumber: patientPlan.cardNumber,
      expiryDate: patientPlan.expiryDate.toISOString(),
      healthPlan: plan,
    };
  }

  async getPatientPlans(patientId: string, actor: AuthUser): Promise<PatientPlan[]> {
    if (actor.role === Role.PATIENT && actor.id !== patientId) {
      throw new ForbiddenException('You can only view your own health plans');
    }
    const rows = await this.prisma.patientHealthPlan.findMany({
      where: { patientId },
      include: { healthPlan: true },
      orderBy: { healthPlan: { name: 'asc' } },
    });
    return rows.map(r => ({
      id: r.id,
      patientId: r.patientId,
      healthPlanId: r.healthPlanId,
      cardNumber: r.cardNumber,
      expiryDate: r.expiryDate.toISOString(),
      healthPlan: this.toPlanResult(r.healthPlan),
    }));
  }

  async verifyCoverage(patientId: string, healthPlanId: string, actor: AuthUser): Promise<{ covered: boolean; coveragePercentage: number }> {
    if (actor.role === Role.PATIENT && actor.id !== patientId) {
      throw new ForbiddenException('You can only verify your own coverage');
    }
    const plan = await this.prisma.healthPlan.findUnique({ where: { id: healthPlanId } });
    if (!plan || !plan.isActive) return { covered: false, coveragePercentage: 0 };
    const assignment = await this.prisma.patientHealthPlan.findUnique({
      where: { patientId_healthPlanId: { patientId, healthPlanId } },
    });
    if (!assignment) return { covered: false, coveragePercentage: 0 };
    if (assignment.expiryDate < new Date()) return { covered: false, coveragePercentage: 0 };
    return { covered: true, coveragePercentage: plan.coveragePercentage };
  }

  async removePatientPlan(id: string, actor: AuthUser): Promise<void> {
    const row = await this.prisma.patientHealthPlan.findUnique({ where: { id }, select: { id: true, patientId: true } });
    if (!row) throw new NotFoundException(`Patient plan ${id} not found`);
    if (actor.role === Role.PATIENT && row.patientId !== actor.id) {
      throw new ForbiddenException('You can only remove your own health plan');
    }
    await this.prisma.patientHealthPlan.delete({ where: { id } });
  }

  private toPlanResult(plan: {
    id: string;
    name: string;
    provider: string;
    coveragePercentage: number;
    isActive: boolean;
    createdAt: Date;
  }): HealthPlan {
    return {
      id: plan.id,
      name: plan.name,
      provider: plan.provider,
      coveragePercentage: plan.coveragePercentage,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
    };
  }
}

export { CreateHealthPlanDto, UpdateHealthPlanDto, AssignPlanDto } from './dto/health-plan.dto';