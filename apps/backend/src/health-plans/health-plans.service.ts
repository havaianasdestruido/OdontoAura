import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
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

  // TODO: create() uniqueness check (findFirst) races with concurrent creates — catch Prisma P2002 or use a transaction with advisory lock
  async create(dto: CreateHealthPlanDto): Promise<HealthPlan> {
    const existing = await this.prisma.healthPlan.findFirst({
      where: { name: dto.name, provider: dto.provider },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Health plan with this name and provider already exists');

    return this.prisma.healthPlan.create({
      data: {
        name: dto.name,
        provider: dto.provider,
        coveragePercentage: dto.coveragePercentage,
        isActive: dto.isActive ?? true,
      },
    }).then(this.toPlanResult);
  }

  async findAll(activeOnly = false): Promise<HealthPlan[]> {
    // TODO: add pagination (take/skip) to prevent unbounded result sets
    const plans = await this.prisma.healthPlan.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
    return plans.map(this.toPlanResult);
  }

  async findOne(id: string): Promise<HealthPlan> {
    const plan = await this.prisma.healthPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Health plan ${id} not found`);
    return this.toPlanResult(plan);
  }

  // TODO: update() does not re-validate (name, provider) uniqueness — changing name alone could collide with existing plan
  async update(id: string, dto: UpdateHealthPlanDto): Promise<HealthPlan> {
    await this.findOne(id);
    if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');
    const plan = await this.prisma.healthPlan.update({ where: { id }, data: dto });
    return this.toPlanResult(plan);
  }

  // TODO: remove() will throw raw FK constraint error if plan has patientHealthPlan references — handle gracefully or soft-delete
  async remove(id: string): Promise<void> {
    const plan = await this.prisma.healthPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Health plan ${id} not found`);
    await this.prisma.healthPlan.delete({ where: { id } });
  }

  async assignToPatient(dto: AssignPlanDto): Promise<PatientPlan> {
    const plan = await this.findOne(dto.healthPlanId);
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
        expiryDate: new Date(dto.expiryDate),
      },
    });

    return {
      id: patientPlan.id,
      patientId: patientPlan.patientId,
      healthPlanId: patientPlan.healthPlanId,
      cardNumber: patientPlan.cardNumber,
      expiryDate: patientPlan.expiryDate.toISOString(),
      healthPlan: { ...plan, createdAt: plan.createdAt },
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

  async removePatientPlan(id: string): Promise<void> {
    const row = await this.prisma.patientHealthPlan.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Patient plan ${id} not found`);
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