import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService, AppointmentStatus } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/auth-user';

const patientActor = (id: string): AuthUser => ({ id, email: `${id}@test.com`, name: 'P', role: Role.PATIENT });

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
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        email: `${where.id}@test.com`,
        role: Role.PATIENT,
      })),
    },
    doctorProfile: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; userId?: string } }) => ({
        id: where.id ?? where.userId,
      })),
    },
    specialty: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id })),
    },
    medicalRecord: {
      findUnique: vi.fn(async () => null),
    },
    appointment: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        appointments.find(a => a.id === where.id) ?? null,
      ),
      findMany: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where?: {
            patientId?: string;
            doctorId?: string;
            status?: AppointmentStatus | { in?: AppointmentStatus[]; notIn?: AppointmentStatus[] };
            id?: { not: string };
          };
          orderBy?: { scheduledAt: string };
        }): Promise<StoredAppointment[]> => {
          let rows = [...appointments];
          if (where?.patientId) rows = rows.filter(a => a.patientId === where.patientId);
          if (where?.doctorId) rows = rows.filter(a => a.doctorId === where.doctorId);
          if (where?.status) {
            if ('in' in where.status) rows = rows.filter(a => where.status.in!.includes(a.status));
            else if ('notIn' in where.status) rows = rows.filter(a => !where.status.notIn!.includes(a.status));
            else rows = rows.filter(a => a.status === where.status);
          }
          if (where?.id?.not) rows = rows.filter(a => a.id !== where.id.not);
          if (orderBy?.scheduledAt === 'asc') rows.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
          return rows;
        },
      ),
      create: vi.fn(async ({ data }: { data: Omit<StoredAppointment, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const now = new Date();
        const apt: StoredAppointment = {
          id: `apt_${counter++}`,
          ...data,
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
      }, patientActor('pat_1'));

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
        }, patientActor('pat_1')),
      ).rejects.toThrow('future date');
    });

    it('should reject double booking for the same doctor', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      await expect(
        service.create({ patientId: 'pat_2', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_2')),
      ).rejects.toThrow('already has an appointment');
    });

it('should reject double booking for the same patient', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      await expect(
        service.create({ patientId: 'pat_1', doctorId: 'doc_2', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1')),
      ).rejects.toThrow('already has an appointment');
    });

    it('should forbid a patient scheduling for another patient', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await expect(
        service.create({ patientId: 'pat_2', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1')),
      ).rejects.toThrow('only schedule appointments for themselves');
    });
  });

  describe('status transitions', () => {
    it('should follow valid state machine', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));

      const confirmed = await service.updateStatus(apt.id, AppointmentStatus.CONFIRMED);
      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);

      const inProgress = await service.updateStatus(apt.id, AppointmentStatus.IN_PROGRESS);
      expect(inProgress.status).toBe(AppointmentStatus.IN_PROGRESS);

      const completed = await service.updateStatus(apt.id, AppointmentStatus.COMPLETED);
      expect(completed.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('should reject invalid transitions', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));

      await expect(service.updateStatus(apt.id, AppointmentStatus.COMPLETED)).rejects.toThrow('Cannot transition');
    });
  });

  describe('cancel', () => {
    it('should cancel a scheduled appointment as the owner', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      const cancelled = await service.cancel(apt.id, { id: 'pat_1', email: 'p@t.com', name: 'P', role: Role.PATIENT });
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('should forbid cancel by a stranger', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      await expect(
        service.cancel(apt.id, { id: 'pat_9', email: 'x@y.com', name: 'X', role: Role.PATIENT }),
      ).rejects.toThrow('only cancel your own');
    });
  });
});