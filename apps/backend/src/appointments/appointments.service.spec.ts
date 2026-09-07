import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService, AppointmentStatus, CreateAppointmentDto } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';

interface StoredAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  specialtyId: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function createPrismaMock() {
  const appointments: StoredAppointment[] = [];
  let counter = 1;
  return {
    appointment: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        appointments.find(a => a.id === where.id) ?? null,
      ),
      findFirst: vi.fn(async ({ where }: { where: { doctorId: string; status: { not: AppointmentStatus }; scheduledAt: Date } }) =>
        appointments.find(
          a =>
            a.doctorId === where.doctorId &&
            a.status !== where.status.not &&
            a.scheduledAt.getTime() === where.scheduledAt.getTime(),
        ) ?? null,
      ),
      findMany: vi.fn(async ({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: { scheduledAt: string } }): Promise<StoredAppointment[]> => {
        let rows = [...appointments];
        if (where?.patientId) rows = rows.filter(a => a.patientId === where.patientId);
        if (where?.doctorId) rows = rows.filter(a => a.doctorId === where.doctorId);
        if (where?.status) rows = rows.filter(a => a.status === where.status);
        if (orderBy?.scheduledAt === 'asc') rows.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
        return rows;
      }),
      create: vi.fn(async ({ data }: { data: CreateAppointmentDto & { status: AppointmentStatus; durationMinutes: number } }) => {
        const now = new Date();
        const apt: StoredAppointment = {
          id: `apt_${counter++}`,
          patientId: data.patientId,
          doctorId: data.doctorId,
          specialtyId: data.specialtyId,
          scheduledAt: data.scheduledAt as Date,
          durationMinutes: data.durationMinutes,
          status: data.status,
          notes: (data.notes as string | undefined) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        appointments.push(apt);
        return apt;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { status?: AppointmentStatus; notes?: string; scheduledAt?: Date } }) => {
        const apt = appointments.find(a => a.id === where.id)!;
        if (data.status !== undefined) apt.status = data.status;
        if (data.notes !== undefined) apt.notes = data.notes;
        if (data.scheduledAt !== undefined) apt.scheduledAt = data.scheduledAt;
        apt.updatedAt = new Date();
        return apt;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const idx = appointments.findIndex(a => a.id === where.id);
        return appointments.splice(idx, 1)[0];
      }),
    },
    _appointments: appointments,
  };
}

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new appointment', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = await service.create({
        patientId: 'pat_1',
        doctorId: 'doc_1',
        specialtyId: 'spe_1',
        scheduledAt: futureDate,
      });

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
      expect(result.patientId).toBe('pat_1');
      expect(result.durationMinutes).toBe(30);
    });

    it('should reject past dates', async () => {
      await expect(
        service.create({
          patientId: 'pat_1',
          doctorId: 'doc_1',
          specialtyId: 'spe_1',
          scheduledAt: new Date(Date.now() - 1000).toISOString(),
        }),
      ).rejects.toThrow('future date');
    });

    it('should reject double booking', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate });
      await expect(
        service.create({ patientId: 'pat_2', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }),
      ).rejects.toThrow('already has an appointment');
    });
  });

  describe('status transitions', () => {
    it('should follow valid state machine', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate });

      const confirmed = await service.updateStatus(apt.id, AppointmentStatus.CONFIRMED);
      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);

      const inProgress = await service.updateStatus(apt.id, AppointmentStatus.IN_PROGRESS);
      expect(inProgress.status).toBe(AppointmentStatus.IN_PROGRESS);

      const completed = await service.updateStatus(apt.id, AppointmentStatus.COMPLETED);
      expect(completed.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('should reject invalid transitions', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate });

      await expect(service.updateStatus(apt.id, AppointmentStatus.COMPLETED)).rejects.toThrow('Cannot transition');
    });
  });

  describe('cancel', () => {
    it('should cancel a scheduled appointment', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate });
      const cancelled = await service.cancel(apt.id);
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    });
  });
});