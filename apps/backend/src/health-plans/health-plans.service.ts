import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

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
  private readonly plans = new Map<string, HealthPlan>();
  private readonly patientPlans = new Map<string, PatientPlan>();
  private planCounter = 1;
  private patientPlanCounter = 1;

  create(dto: CreateHealthPlanDto): HealthPlan {
    const existing = Array.from(this.plans.values()).find(p => p.name === dto.name && p.provider === dto.provider);
    if (existing) throw new ConflictException('Health plan with this name and provider already exists');

    const id = `hp_${this.planCounter++}`;
    const plan: HealthPlan = {
      id,
      name: dto.name,
      provider: dto.provider,
      coveragePercentage: dto.coveragePercentage,
      isActive: dto.isActive ?? true,
      createdAt: new Date().toISOString(),
    };
    this.plans.set(id, plan);
    return plan;
  }

  findAll(activeOnly = false): HealthPlan[] {
    const plans = Array.from(this.plans.values());
    if (activeOnly) return plans.filter(p => p.isActive);
    return plans;
  }

  findOne(id: string): HealthPlan {
    const plan = this.plans.get(id);
    if (!plan) throw new NotFoundException(`Health plan ${id} not found`);
    return plan;
  }

  update(id: string, dto: UpdateHealthPlanDto): HealthPlan {
    const plan = this.findOne(id);
    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.provider !== undefined) plan.provider = dto.provider;
    if (dto.coveragePercentage !== undefined) plan.coveragePercentage = dto.coveragePercentage;
    if (dto.isActive !== undefined) plan.isActive = dto.isActive;
    return plan;
  }

  remove(id: string): void {
    if (!this.plans.has(id)) throw new NotFoundException(`Health plan ${id} not found`);
    this.plans.delete(id);
  }

  assignToPatient(dto: AssignPlanDto): PatientPlan {
    const plan = this.findOne(dto.healthPlanId);
    const existing = Array.from(this.patientPlans.values()).find(
      pp => pp.patientId === dto.patientId && pp.healthPlanId === dto.healthPlanId
    );
    if (existing) throw new ConflictException('Patient already has this health plan');

    const id = `pp_${this.patientPlanCounter++}`;
    const patientPlan: PatientPlan = { id, ...dto, healthPlan: plan };
    this.patientPlans.set(id, patientPlan);
    return patientPlan;
  }

  getPatientPlans(patientId: string): PatientPlan[] {
    return Array.from(this.patientPlans.values()).filter(pp => pp.patientId === patientId);
  }

  verifyCoverage(patientId: string, healthPlanId: string): { covered: boolean; coveragePercentage: number } {
    const plan = this.plans.get(healthPlanId);
    if (!plan || !plan.isActive) return { covered: false, coveragePercentage: 0 };
    const hasPlan = Array.from(this.patientPlans.values()).some(
      pp => pp.patientId === patientId && pp.healthPlanId === healthPlanId
    );
    return { covered: hasPlan, coveragePercentage: hasPlan ? plan.coveragePercentage : 0 };
  }

  removePatientPlan(id: string): void {
    if (!this.patientPlans.has(id)) throw new NotFoundException(`Patient plan ${id} not found`);
    this.patientPlans.delete(id);
  }
}
