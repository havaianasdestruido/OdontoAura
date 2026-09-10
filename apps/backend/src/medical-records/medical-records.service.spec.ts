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
}

interface StoredAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
}

const doctorActor = (): AuthUser => ({ id: 'usr_doc', email: 'dr@test.com', name: 'Dr', role: Role.DOCTOR });
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
      findUnique: vi.fn(async ({ where }: { where: { appointmentId?: string; id?: string } }) =>
        records.find(
          r => (where.appointmentId && r.appointmentId === where.appointmentId) || (where.id && r.id === where.id),
        ) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where: { patientId: string } }) =>
        records.filter(r => r.patientId === where.patientId),
      ),
      create: vi.fn(async ({ data }: { data: Omit<StoredRecord, 'id' | 'createdAt'> }) => {
        const rec: StoredRecord = { id: `rec_${records.length + 1}`, createdAt: new Date(), ...data };
        records.push(rec);
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Omit<StoredRecord, 'id' | 'createdAt'>> }) => {
        const rec = records.find(r => r.id === where.id)!;
        Object.assign(rec, data);
        return rec;
      }),
      delete: vi.fn(async () => undefined),
    },
    _records: records,
    _appointments: appointments,
  };
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
    // TODO: assert create rejects when appointmentId does not exist (NotFoundException)
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

    it('should reject when the doctor has no profile', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.IN_PROGRESS });
      prismaMock.doctorProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ appointmentId: 'apt_1', anamnesis: 'A', diagnosis: 'D' }, doctorActor()),
      ).rejects.toThrow('Doctor has no profile');
    });

    it('should reject when the appointment belongs to another doctor', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_2', status: AppointmentStatus.IN_PROGRESS });
      await expect(
        service.create({ appointmentId: 'apt_1', anamnesis: 'A', diagnosis: 'D' }, doctorActor()),
      ).rejects.toThrow('Only the appointment doctor');
    });

    it('should reject when a record already exists for the appointment', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.IN_PROGRESS });
      prismaMock._records.push({ id: 'rec_1', appointmentId: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', anamnesis: 'A', diagnosis: 'D', prescription: null, notes: null, createdAt: new Date() });
      await expect(
        service.create({ appointmentId: 'apt_1', anamnesis: 'B', diagnosis: 'C' }, doctorActor()),
      ).rejects.toThrow('already exists');
    });
  });

  describe('update (assertCanEdit)', () => {
    // TODO: add test that update with empty DTO {} throws BadRequestException
    it('should update a record as the owning doctor', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.COMPLETED });
      prismaMock._records.push({ id: 'rec_1', appointmentId: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', anamnesis: 'A', diagnosis: 'D', prescription: null, notes: null, createdAt: new Date() });
      const result = await service.update('rec_1', { anamnesis: 'novo', prescription: 'rx' }, doctorActor());
      expect(result.anamnesis).toBe('novo');
      expect(result.prescription).toBe('rx');
    });

    it('should run the authorization lookups in parallel even when it fails', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.COMPLETED });
      prismaMock._records.push({ id: 'rec_1', appointmentId: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', anamnesis: 'A', diagnosis: 'D', prescription: null, notes: null, createdAt: new Date() });
      prismaMock.doctorProfile.findUnique.mockResolvedValue(null);

      await expect(service.update('rec_1', { anamnesis: 'x' }, doctorActor())).rejects.toThrow('Doctor has no profile');

      expect(prismaMock.doctorProfile.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.appointment.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should forbid a doctor who was not the appointment doctor', async () => {
      prismaMock._appointments.push({ id: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', status: AppointmentStatus.COMPLETED });
      prismaMock._records.push({ id: 'rec_1', appointmentId: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', anamnesis: 'A', diagnosis: 'D', prescription: null, notes: null, createdAt: new Date() });
      prismaMock.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor_profile_2' });

      await expect(service.update('rec_1', { anamnesis: 'x' }, doctorActor())).rejects.toThrow('Only the appointment doctor can edit');
    });
  });

  // TODO: add tests for findByAppointment and findOne — currently zero coverage
  describe('findByPatient', () => {
    it('should forbid a patient from reading another patient\'s records', async () => {
      await expect(service.findByPatient('pat_2', patientActor('pat_1'))).rejects.toThrow('only view your own');
    });

    it('should allow a patient to read their own records', async () => {
      prismaMock._records.push(
        { id: 'rec_1', appointmentId: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', anamnesis: 'A', diagnosis: 'D', prescription: null, notes: null, createdAt: new Date() },
        { id: 'rec_2', appointmentId: 'apt_2', patientId: 'pat_1', doctorId: 'doctor_profile_1', anamnesis: 'B', diagnosis: 'C', prescription: null, notes: null, createdAt: new Date() },
      );
      const result = await service.findByPatient('pat_1', patientActor('pat_1'));
      expect(result).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('should reject removal of an unknown record', async () => {
      await expect(service.remove('rec_missing')).rejects.toThrow('not found');
    });

    it('should delete an existing record', async () => {
      prismaMock._records.push({ id: 'rec_1', appointmentId: 'apt_1', patientId: 'pat_1', doctorId: 'doctor_profile_1', anamnesis: 'A', diagnosis: 'D', prescription: null, notes: null, createdAt: new Date() });
      await service.remove('rec_1');
      expect(prismaMock.medicalRecord.delete).toHaveBeenCalledWith({ where: { id: 'rec_1' } });
    });
  });
});