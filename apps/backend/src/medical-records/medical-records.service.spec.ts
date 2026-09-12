import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MedicalRecordsService } from './medical-records.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, Role } from '@prisma/client';
import { AuthUser } from '../common/auth-user';

interface StoredRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  anamnesis: string | null;
  diagnosis: string | null;
  prescription: string | null;
  notes: string | null;
  createdAt: Date;
  voidedAt: Date | null;
}

interface StoredAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
}

const doctorActor = (): AuthUser => ({ id: 'usr_doc', email: 'dr@test.com', name: 'Dr', role: Role.DOCTOR });
const adminActor = (): AuthUser => ({ id: 'usr_admin', email: 'a@test.com', name: 'Admin', role: Role.ADMIN });
const patientActor = (id: string): AuthUser => ({ id, email: `${id}@test.com`, name: 'P', role: Role.PATIENT });

function createPrismaMock() {
  const records: StoredRecord[] = [];
  const appointments: StoredAppointment[] = [];

  return {
    doctorProfile: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: 'doctor_profile_1' })),
    },
    appointment: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        appointments.find(a => a.id === where.id) ?? null,
      ),
      findMany: vi.fn(async () => []),
    },
    medicalRecord: {
      findUnique: vi.fn(async ({ where }: { where: { appointmentId?: string; id?: string } }) => {
        return records.find(
          r => (where.appointmentId && r.appointmentId === where.appointmentId) || (where.id && r.id === where.id),
        ) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where: { patientId: string } }) =>
        records.filter(r => r.patientId === where.patientId && !r.voidedAt),
      ),
      create: vi.fn(async ({ data }: { data: Omit<StoredRecord, 'id' | 'createdAt' | 'voidedAt'> }) => {
        const rec: StoredRecord = {
          id: `rec_${records.length + 1}`,
          createdAt: new Date(),
          voidedAt: null,
          ...data,
        };
        records.push(rec);
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Omit<StoredRecord, 'id' | 'createdAt'>> }) => {
        const rec = records.find(r => r.id === where.id)!;
        if (data.voidedAt !== undefined) rec.voidedAt = data.voidedAt;
        Object.assign(rec, data);
        return rec;
      }),
      delete: vi.fn(async () => undefined),
    },
    _records: records,
    _appointments: appointments,
  };
}

function pushRecord(prismaMock: ReturnType<typeof createPrismaMock>, overrides: Partial<StoredRecord> = {}): StoredRecord {
  const rec: StoredRecord = {
    id: 'rec_1',
    appointmentId: 'apt_1',
    patientId: 'pat_1',
    doctorId: 'doctor_profile_1',
    anamnesis: 'A',
    diagnosis: 'D',
    prescription: null,
    notes: null,
    createdAt: new Date(),
    voidedAt: null,
    ...overrides,
  };
  prismaMock._records.push(rec);
  return rec;
}

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<MedicalRecordsService>(MedicalRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject when the appointment does not exist', async () => {
      await expect(
        service.create({ appointmentId: 'apt_missing', anamnesis: 'A', diagnosis: 'D' }, doctorActor()),
      ).rejects.toThrow('not found');
    });

    it('should reject when the user has no doctor profile', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.IN_PROGRESS });
      prismaMock.doctorProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ appointmentId: 'apt_1', anamnesis: 'A', diagnosis: 'D' }, doctorActor()),
      ).rejects.toThrow('Doctor has no profile');
    });

    it('should create a record for an in-progress appointment owned by the doctor', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.IN_PROGRESS });
      const result = await service.create({ appointmentId: 'apt_1', anamnesis: 'A', diagnosis: 'D' }, doctorActor());
      expect(result.id).toBe('rec_1');
      expect(result.patientId).toBe('pat_1');
      expect(result.diagnosis).toBe('D');
    });

    it('should reject when the appointment is not in progress or completed', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.SCHEDULED });
      await expect(
        service.create({ appointmentId: 'apt_1', anamnesis: 'A', diagnosis: 'D' }, doctorActor()),
      ).rejects.toThrow('only be created for in-progress or completed');
    });

    it('should reject when the appointment belongs to another doctor', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_2', status: AppointmentStatus.IN_PROGRESS });
      await expect(
        service.create({ appointmentId: 'apt_1', anamnesis: 'A', diagnosis: 'D' }, doctorActor()),
      ).rejects.toThrow('Only the appointment doctor');
    });

    it('should reject when a record already exists for the appointment', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.IN_PROGRESS });
      pushRecord(prismaMock);
      await expect(
        service.create({ appointmentId: 'apt_1', anamnesis: 'B', diagnosis: 'C' }, doctorActor()),
      ).rejects.toThrow('already exists');
    });
  });

  describe('findByAppointment and findOne', () => {
    it('should return the record for an appointment', async () => {
      pushRecord(prismaMock, { id: 'rec_1', appointmentId: 'apt_1' });
      const found = await service.findByAppointment('apt_1', doctorActor());
      expect(found?.id).toBe('rec_1');
    });

    it('should return undefined for a voided appointment record', async () => {
      pushRecord(prismaMock, { id: 'rec_1', appointmentId: 'apt_1', voidedAt: new Date() });
      await expect(service.findByAppointment('apt_1', doctorActor())).resolves.toBeUndefined();
    });

    it('should find a record by id for an admin', async () => {
      pushRecord(prismaMock, { id: 'rec_1' });
      const found = await service.findOne('rec_1', adminActor());
      expect(found.id).toBe('rec_1');
    });

    it('should forbid a patient from viewing another patient record', async () => {
      pushRecord(prismaMock, { id: 'rec_1', patientId: 'pat_2' });
      await expect(service.findOne('rec_1', patientActor('pat_1'))).rejects.toThrow('only view your own');
    });

    it('should hide voided records from findOne', async () => {
      pushRecord(prismaMock, { id: 'rec_1', voidedAt: new Date() });
      await expect(service.findOne('rec_1', adminActor())).rejects.toThrow('not found');
    });
  });

  describe('findByPatient', () => {
    it('should forbid a patient from reading another patient\'s records', async () => {
      await expect(service.findByPatient('pat_2', patientActor('pat_1'))).rejects.toThrow('only view your own');
    });

    it('should allow a patient to read their own records', async () => {
      pushRecord(prismaMock, { id: 'rec_1', appointmentId: 'apt_1' });
      pushRecord(prismaMock, { id: 'rec_2', appointmentId: 'apt_2' });
      const result = await service.findByPatient('pat_1', patientActor('pat_1'));
      expect(result).toHaveLength(2);
    });

    it('should exclude voided records', async () => {
      pushRecord(prismaMock, { id: 'rec_1', appointmentId: 'apt_1' });
      pushRecord(prismaMock, { id: 'rec_2', appointmentId: 'apt_2', voidedAt: new Date() });
      const result = await service.findByPatient('pat_1', patientActor('pat_1'));
      expect(result).toHaveLength(1);
    });
  });

  describe('update (assertCanEdit)', () => {
    it('should throw BadRequest for an empty DTO', async () => {
      pushRecord(prismaMock, { id: 'rec_1' });
      await expect(service.update('rec_1', {}, doctorActor())).rejects.toThrow('No fields to update');
    });

    it('should update a record as the owning doctor while the appointment is in progress', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.IN_PROGRESS });
      pushRecord(prismaMock, { id: 'rec_1', appointmentId: 'apt_1' });
      const result = await service.update('rec_1', { anamnesis: 'novo', prescription: 'rx' }, doctorActor());
      expect(result.anamnesis).toBe('novo');
      expect(result.prescription).toBe('rx');
    });

    it('should run the authorization lookups in parallel even when it fails', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.IN_PROGRESS });
      pushRecord(prismaMock, { id: 'rec_1', appointmentId: 'apt_1' });
      prismaMock.doctorProfile.findUnique.mockResolvedValue(null);

      await expect(service.update('rec_1', { anamnesis: 'x' }, doctorActor())).rejects.toThrow('Doctor has no profile');

      expect(prismaMock.doctorProfile.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.appointment.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should forbid a doctor who was not the appointment doctor', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.IN_PROGRESS });
      pushRecord(prismaMock, { id: 'rec_1', appointmentId: 'apt_1' });
      prismaMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor_profile_2' });

      await expect(service.update('rec_1', { anamnesis: 'x' }, doctorActor())).rejects.toThrow('Only the appointment doctor can edit');
    });

    it('should lock completed records for doctors but allow admins', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.COMPLETED });
      pushRecord(prismaMock, { id: 'rec_1', appointmentId: 'apt_1' });

      await expect(service.update('rec_1', { notes: 'x' }, doctorActor())).rejects.toThrow('locked');

      const byAdmin = await service.update('rec_1', { notes: 'corrigido' }, adminActor());
      expect(byAdmin.notes).toBe('corrigido');
    });

    it('should reject editing a voided record', async () => {
      pushRecord(prismaMock, { id: 'rec_1', voidedAt: new Date() });
      await expect(service.update('rec_1', { notes: 'x' }, adminActor())).rejects.toThrow('voided');
    });
  });

  describe('remove', () => {
    it('should reject removal of an unknown record', async () => {
      await expect(service.remove('rec_missing', adminActor())).rejects.toThrow('not found');
    });

    it('should forbid non-admin actors', async () => {
      pushRecord(prismaMock, { id: 'rec_1' });
      await expect(service.remove('rec_1', patientActor('pat_1'))).rejects.toThrow('Only admins');
    });

    it('should soft-delete (void) an existing record', async () => {
      pushRecord(prismaMock, { id: 'rec_1' });
      await service.remove('rec_1', adminActor());
      expect(prismaMock.medicalRecord.delete).not.toHaveBeenCalled();
      expect(prismaMock.medicalRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rec_1' }, data: { voidedAt: expect.any(Date) } }),
      );
      expect(prismaMock.medicalRecord.findUnique).toHaveBeenCalled();
    });

    it('should reject voiding an already-voided record', async () => {
      pushRecord(prismaMock, { id: 'rec_1', voidedAt: new Date() });
      await expect(service.remove('rec_1', adminActor())).rejects.toThrow('already voided');
    });
  });
});