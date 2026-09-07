import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateHealthPlanDto {
  name: string;
  provider: string;
  coveragePercentage: number;
  isActive?: boolean;
}

export interface UpdateHealthPlanDto {
  name?: string;
  provider?: string;
  coveragePercentage?: number;
  isActive?: boolean;
}

export interface HealthPlan {
  id: string;
  name: string;
  provider: string;
  coveragePercentage: number;
  isActive: boolean;
  createdAt: string;
}

export interface AssignPlanDto {
  patientId: string;
  healthPlanId: string;
  cardNumber: string;
  expiryDate: string;
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

  async update(id: string, dto: UpdateHealthPlanDto): Promise<HealthPlan> {
    await this.findOne(id);
    const plan = await this.prisma.healthPlan.update({ where: { id }, data: dto });
    return this.toPlanResult(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.prisma.healthPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Health plan ${id} not found`);
    await this.prisma.healthPlan.delete({ where: { id } });
  }

  async assignToPatient(dto: AssignPlanDto): Promise<PatientPlan> {
    const plan = await this.findOne(dto.healthPlanId);
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

  async getPatientPlans(patientId: string): Promise<PatientPlan[]> {
    const rows = await this.prisma.patientHealthPlan.findMany({
      where: { patientId },
      include: { healthPlan: true },
      orderBy: { id: 'asc' },
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

  async verifyCoverage(patientId: string, healthPlanId: string): Promise<{ covered: boolean; coveragePercentage: number }> {
    const plan = await this.prisma.healthPlan.findUnique({ where: { id: healthPlanId } });
    if (!plan || !plan.isActive) return { covered: false, coveragePercentage: 0 };
    const hasPlan = await this.prisma.patientHealthPlan.findUnique({
      where: { patientId_healthPlanId: { patientId, healthPlanId } },
      select: { id: true },
    });
    return { covered: !!hasPlan, coveragePercentage: hasPlan ? plan.coveragePercentage : 0 };
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