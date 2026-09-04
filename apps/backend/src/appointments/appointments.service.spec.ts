import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService, AppointmentStatus } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppointmentsService],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new appointment', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = service.create({
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

    it('should reject past dates', () => {
      expect(() =>
        service.create({
          patientId: 'pat_1',
          doctorId: 'doc_1',
          specialtyId: 'spe_1',
          scheduledAt: new Date(Date.now() - 1000).toISOString(),
        }),
      ).toThrow('future date');
    });

    it('should reject double booking', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate });
      expect(() =>
        service.create({ patientId: 'pat_2', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate }),
      ).toThrow('already has an appointment');
    });
  });

  describe('status transitions', () => {
    it('should follow valid state machine', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate });

      const confirmed = service.updateStatus(apt.id, AppointmentStatus.CONFIRMED);
      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);

      const inProgress = service.updateStatus(apt.id, AppointmentStatus.IN_PROGRESS);
      expect(inProgress.status).toBe(AppointmentStatus.IN_PROGRESS);

      const completed = service.updateStatus(apt.id, AppointmentStatus.COMPLETED);
      expect(completed.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('should reject invalid transitions', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate });

      expect(() => service.updateStatus(apt.id, AppointmentStatus.COMPLETED)).toThrow('Cannot transition');
    });
  });

  describe('cancel', () => {
    it('should cancel a scheduled appointment', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const apt = service.create({ patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: futureDate });
      const cancelled = service.cancel(apt.id);
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    });
  });
});
