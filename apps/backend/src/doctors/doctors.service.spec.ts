import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/auth-user';

interface StoredProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  specialtyId: string;
}
interface StoredSlot {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const actor = (role: Role, id = 'usr_x'): AuthUser => ({ id, email: `${id}@test.com`, name: 'A', role });

function createPrismaMock() {
  const profiles: StoredProfile[] = [];
  const slots: StoredSlot[] = [];
  const roleByUser: Record<string, Role> = {};

  const doctorProfile = {
    findUnique: vi.fn(async ({
      where,
      select,
    }: {
      where: { id?: string; userId?: string; licenseNumber?: string };
      select?: { userId?: boolean; id?: boolean };
    }) => {
      const found = profiles.find(
        p => (where.id && p.id === where.id)
          || (where.userId && p.userId === where.userId)
          || (where.licenseNumber && p.licenseNumber === where.licenseNumber),
      );
      if (!found) return null;
      if (select?.userId) return { userId: found.userId };
      if (select?.id) return { id: found.id };
      return found;
    }),
    findMany: vi.fn(async () => profiles),
    create: vi.fn(async ({ data }: { data: Omit<StoredProfile, 'id'> }) => {
      const created: StoredProfile = { id: `doc_${profiles.length + 1}`, ...data };
      profiles.push(created);
      return { ...created, createdAt: new Date(), specialty: { id: data.specialtyId, name: 'Especialidade' } };
    }),
  };

  return {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const role = roleByUser[where.id];
        return role ? { id: where.id, role } : null;
      }),
    },
    specialty: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === 'spe_missing' ? null : { id: where.id, name: 'Especialidade' },
      ),
    },
    doctorProfile,
    availabilitySlot: {
      findMany: vi.fn(async ({ where }: { where: { doctorId: string } }) =>
        slots
          .filter(s => s.doctorId === where.doctorId)
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
      ),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Omit<StoredSlot, 'id'> }) => {
        const created: StoredSlot = { id: `slot_${slots.length + 1}`, ...data };
        slots.push(created);
        return created;
      }),
    },
    roleByUser,
    profiles,
    slots,
  };
}

describe('DoctorsService', () => {
  let service: DoctorsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a profile for a DOCTOR user', async () => {
      prismaMock.roleByUser.usr_doc = Role.DOCTOR;
      const result = await service.create({ userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_1' });
      expect(result.id).toBe('doc_1');
      expect(result.specialties[0].name).toBe('Especialidade');
    });

    it('should reject a user that is not a DOCTOR', async () => {
      prismaMock.roleByUser.usr_pat = Role.PATIENT;
      await expect(
        service.create({ userId: 'usr_pat', licenseNumber: 'CRM-2', specialtyId: 'spe_1' }),
      ).rejects.toThrow('must have role DOCTOR');
    });

    it('should reject a missing user', async () => {
      await expect(
        service.create({ userId: 'usr_nope', licenseNumber: 'CRM-3', specialtyId: 'spe_1' }),
      ).rejects.toThrow('not found');
    });

    // TODO: assert create rejects when specialtyId does not exist
    it('should reject a license already in use', async () => {
      prismaMock.roleByUser.usr_doc = Role.DOCTOR;
      await service.create({ userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_1' });
      await expect(
        service.create({ userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_2' }),
      ).rejects.toThrow('already in use');
    });
  });

  // TODO: add tests for findOne, findAll, findByUser, update, and remove — currently zero coverage
  describe('getAvailability', () => {
    it('should 404 for an unknown doctor', async () => {
      await expect(service.getAvailability('doc_missing')).rejects.toThrow('not found');
    });

    it('should return availability slots sorted by day and time', async () => {
      prismaMock.profiles.push({ id: 'doc_1', userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_1' });
      prismaMock.slots.push(
        { id: 's1', doctorId: 'doc_1', dayOfWeek: 3, startTime: '14:00', endTime: '15:00' },
        { id: 's2', doctorId: 'doc_1', dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
        { id: 's0', doctorId: 'doc_1', dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
      );
      const result = await service.getAvailability('doc_1');
      expect(result.map(s => s.id)).toEqual(['s0', 's2', 's1']);
    });

    it('should use a lightweight existence check instead of a full load', async () => {
      prismaMock.profiles.push({ id: 'doc_1', userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_1' });
      await service.getAvailability('doc_1');
      expect(prismaMock.doctorProfile.findUnique).toHaveBeenCalledWith({ where: { id: 'doc_1' }, select: { id: true } });
    });
  });

  // TODO: no tests asserting permission enforcement on controller-layer role decorators (ADMIN-only create, DOCTOR ownership on update)
  describe('addAvailability', () => {
    it('should let the owning doctor add an availability slot', async () => {
      prismaMock.profiles.push({ id: 'doc_1', userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_1' });
      const result = await service.addAvailability(
        'doc_1',
        { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
        actor(Role.DOCTOR, 'usr_doc'),
      );
      expect(result.id).toBe('slot_1');
      expect(result.dayOfWeek).toBe(2);
    });

    it('should forbid another doctor from managing availability', async () => {
      prismaMock.profiles.push({ id: 'doc_1', userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_1' });
      await expect(
        service.addAvailability('doc_1', { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' }, actor(Role.DOCTOR, 'other_doc')),
      ).rejects.toThrow('only manage their own');
    });

    // TODO: overlap test mocks findFirst — doesn't exercise real time-comparison logic in service
    it('should reject an overlapping slot', async () => {
      prismaMock.profiles.push({ id: 'doc_1', userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_1' });
      prismaMock.availabilitySlot.findFirst.mockResolvedValue({ id: 'existing', doctorId: 'doc_1' } as never);
      await expect(
        service.addAvailability('doc_1', { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' }, actor(Role.DOCTOR, 'usr_doc')),
      ).rejects.toThrow('already exists');
    });

    it('should reject invalid slot bounds', async () => {
      prismaMock.profiles.push({ id: 'doc_1', userId: 'usr_doc', licenseNumber: 'CRM-1', specialtyId: 'spe_1' });
      await expect(
        service.addAvailability('doc_1', { dayOfWeek: 7, startTime: '09:00', endTime: '08:00' }, actor(Role.DOCTOR, 'usr_doc')),
      ).rejects.toThrow('dayOfWeek');
    });

    it('should 404 for an unknown doctor', async () => {
      await expect(
        service.addAvailability('doc_missing', { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' }, actor(Role.ADMIN)),
      ).rejects.toThrow('not found');
    });
  });
});