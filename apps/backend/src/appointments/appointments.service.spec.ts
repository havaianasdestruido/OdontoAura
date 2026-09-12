import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
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

type Fn = ReturnType<typeof vi.fn>;

interface MockPrisma {
  user: { findUnique: Fn };
  doctorProfile: { findUnique: Fn };
  specialty: { findUnique: Fn };
  medicalRecord: { findUnique: Fn };
  availabilitySlot: { findMany: Fn };
  appointment: { findUnique: Fn; findMany: Fn; create: Fn; update: Fn; delete: Fn };
  $transaction: Fn;
  _appointments: StoredAppointment[];
}

function createPrismaMock(): MockPrisma {
  const appointments: StoredAppointment[] = [];
  let counter = 1;

  const prismaMock: MockPrisma = {
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
    availabilitySlot: {
      findMany: vi.fn(async () =>
        Array.from({ length: 7 }, (_, dayOfWeek) => ({
          id: `slot_${dayOfWeek}`,
          doctorId: 'some-doctor',
          dayOfWeek,
          startTime: '00:00',
          endTime: '23:59',
        })),
      ),
    },
    appointment: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        appointments.find(a => a.id === where.id) ?? null,
      ),
      findMany: vi.fn(
        async ({
          where,
          orderBy,
          skip,
          take,
        }: {
          where?: {
            patientId?: string;
            doctorId?: string;
            status?: AppointmentStatus | { in?: AppointmentStatus[]; notIn?: AppointmentStatus[] };
            id?: { not: string };
          };
          orderBy?: { scheduledAt: string };
          skip?: number;
          take?: number;
        }): Promise<StoredAppointment[]> => {
          let rows = [...appointments];
          if (where?.patientId) rows = rows.filter(a => a.patientId === where.patientId);
          if (where?.doctorId) rows = rows.filter(a => a.doctorId === where.doctorId);
          const status = where?.status;
          if (status) {
            if (typeof status === 'string') {
              rows = rows.filter(a => a.status === status);
            } else if (status.in) {
              rows = rows.filter(a => status.in!.includes(a.status));
            } else if (status.notIn) {
              rows = rows.filter(a => !status.notIn!.includes(a.status));
            }
          }
          const excludeId = where?.id?.not;
          if (excludeId) rows = rows.filter(a => a.id !== excludeId);
          if (orderBy?.scheduledAt === 'asc') rows.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
          if (typeof take === 'number') rows = rows.slice(skip || 0, (skip || 0) + take);
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
    $transaction: vi.fn(async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(prismaMock)),
    _appointments: appointments,
  };

  return prismaMock;
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

    it('should reject hours with no covering availability slot', async () => {
      prismaMock.availabilitySlot.findMany.mockResolvedValue([{
        id: 'slot_workday',
        doctorId: 'doc_1',
        dayOfWeek: new Date().getDay(),
        startTime: '08:00',
        endTime: '12:00',
      }]);
      const offSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);
      offSlot.setHours(17, 0, 0, 0);
      await expect(
        service.create({
          patientId: 'pat_1',
          doctorId: 'doc_1',
          specialtyId: 'spe_1',
          scheduledAt: offSlot.toISOString(),
        }, patientActor('pat_1')),
      ).rejects.toThrow('no availability');
    });

    it('should accept a naive (timezone-less) timestamp as UTC', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
      const result = await service.create(
        { patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate },
        patientActor('pat_1'),
      );
      expect(result).toHaveProperty('id');
    });
  });

  describe('findAll and findOne', () => {
    it('should return all appointments for staff', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      await service.create({ patientId: 'pat_2', doctorId: 'doc_2', specialtyId: 'spe_2', scheduledAt: futureDate }, patientActor('pat_2'));

      const rows = await service.findAll({}, { id: 'staff_1', email: 's@t.com', name: 'S', role: Role.EMPLOYEE });
      expect(rows).toHaveLength(2);
    });

    it('should scope patient views to their own appointments', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));

      const mine = await service.findAll({}, patientActor('pat_1'));
      expect(mine).toHaveLength(1);
    });

    it('should scope doctor views to their own appointments', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));

      const doctorActor: AuthUser = { id: 'doc_1', email: 'd@t.com', name: 'D', role: Role.DOCTOR };
      const rows = await service.findAll({}, doctorActor);
      expect(rows).toHaveLength(1);
      expect(rows[0].doctorId).toBe('doc_1');
    });

    it('should filter by status and apply pagination', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const a = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      await service.create({ patientId: 'pat_2', doctorId: 'doc_2', specialtyId: 'spe_2', scheduledAt: futureDate }, patientActor('pat_2'));
      await service.updateStatus(a.id, AppointmentStatus.CONFIRMED, { id: 'staff_1', email: 's@t.com', name: 'S', role: Role.EMPLOYEE });

      const confirmed = await service.findAll({ status: AppointmentStatus.CONFIRMED }, { id: 'staff_1', email: 's@t.com', name: 'S', role: Role.EMPLOYEE });
      expect(confirmed).toHaveLength(1);
      expect(confirmed[0].status).toBe(AppointmentStatus.CONFIRMED);

      const page = await service.findAll({}, { id: 'staff_1', email: 's@t.com', name: 'S', role: Role.EMPLOYEE }, 0, 1);
      expect(page).toHaveLength(1);
    });

    it('should find an appointment by id for the owner', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      const found = await service.findOne(apt.id, patientActor('pat_1'));
      expect(found.id).toBe(apt.id);
    });

    it('should forbid viewing another patient appointment', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      await expect(service.findOne(apt.id, patientActor('pat_9'))).rejects.toThrow('cannot view');
    });
  });

  describe('status transitions', () => {
    it('should follow valid state machine', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));

      const carriedActor = { id: 'staff_1', email: 's@t.com', name: 'S', role: Role.EMPLOYEE };
      const confirmed = await service.updateStatus(apt.id, AppointmentStatus.CONFIRMED, carriedActor);
      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);

      const inProgress = await service.updateStatus(apt.id, AppointmentStatus.IN_PROGRESS, carriedActor);
      expect(inProgress.status).toBe(AppointmentStatus.IN_PROGRESS);

      const completed = await service.updateStatus(apt.id, AppointmentStatus.COMPLETED, carriedActor);
      expect(completed.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('should reject invalid transitions', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));

      await expect(service.updateStatus(apt.id, AppointmentStatus.COMPLETED, patientActor('pat_1'))).rejects.toThrow('Cannot transition');
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

    it('should reject cancelling an appointment that already started', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      prismaMock._appointments[0].scheduledAt = new Date(Date.now() - 60 * 60 * 1000);

      await expect(
        service.cancel(apt.id, { id: 'pat_1', email: 'p@t.com', name: 'P', role: Role.PATIENT }),
      ).rejects.toThrow('before its scheduled time');
    });

    it('should allow admin override with a reason for past appointments', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      prismaMock._appointments[0].scheduledAt = new Date(Date.now() - 60 * 60 * 1000);

      const cancelled = await service.cancel(
        apt.id,
        { id: 'admin_1', email: 'a@t.com', name: 'A', role: Role.ADMIN },
        'Desistiu no balcão',
      );
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    });
  });

  describe('remove', () => {
    it('should delete a scheduled appointment', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      await expect(service.remove(apt.id)).resolves.toBeUndefined();
    });

    it('should reject deleting an in-progress or completed appointment', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      const staff = { id: 'staff_1', email: 's@t.com', name: 'S', role: Role.EMPLOYEE };
      await service.updateStatus(apt.id, AppointmentStatus.CONFIRMED, staff);
      await service.updateStatus(apt.id, AppointmentStatus.IN_PROGRESS, staff);
      await expect(service.remove(apt.id)).rejects.toThrow('in progress or completed');
    });

    it('should reject deleting an appointment with a linked medical record', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = await service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }, patientActor('pat_1'));
      prismaMock.medicalRecord.findUnique.mockResolvedValue({ id: 'mr_1' });
      await expect(service.remove(apt.id)).rejects.toThrow('linked medical record');
    });
  });
});