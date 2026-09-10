import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto } from './dto/medical-record.dto';
import { AuthUser } from '../common/auth-user';

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  anamnesis: string;
  diagnosis: string;
  prescription?: string;
  notes?: string;
  createdAt: string;
}

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMedicalRecordDto, actor: AuthUser): Promise<MedicalRecord> {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment) throw new NotFoundException(`Appointment ${dto.appointmentId} not found`);
    if (appointment.status !== AppointmentStatus.IN_PROGRESS && appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Medical record can only be created for in-progress or completed appointments');
    }

    const doctorProfile = await this.prisma.doctorProfile.findUnique({ where: { userId: actor.id } });
    if (!doctorProfile) throw new ForbiddenException('Doctor has no profile');
    if (doctorProfile.id !== appointment.doctorId) {
      throw new ForbiddenException('Only the appointment doctor can create the medical record');
    }

    const existing = await this.prisma.medicalRecord.findUnique({ where: { appointmentId: dto.appointmentId } });
    if (existing) throw new BadRequestException('Medical record already exists for this appointment');

    const record = await this.prisma.medicalRecord.create({
      data: {
        appointmentId: dto.appointmentId,
        patientId: appointment.patientId,
        doctorId: doctorProfile.id,
        anamnesis: dto.anamnesis,
        diagnosis: dto.diagnosis,
        prescription: dto.prescription,
        notes: dto.notes,
      },
    });
    return this.toResult(record);
  }

  async findByAppointment(appointmentId: string, actor: AuthUser): Promise<MedicalRecord | undefined> {
    const record = await this.prisma.medicalRecord.findUnique({ where: { appointmentId } });
    if (!record) return undefined;
    this.assertCanView(record, actor);
    return this.toResult(record);
  }

  async findByPatient(patientId: string, actor: AuthUser): Promise<MedicalRecord[]> {
    if (actor.role === Role.PATIENT && actor.id !== patientId) {
      throw new ForbiddenException('You can only view your own medical records');
    }
    const records = await this.prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.toResult);
  }

  async findOne(id: string, actor: AuthUser): Promise<MedicalRecord> {
    const record = await this.getRecord(id);
    this.assertCanView(record, actor);
    return this.toResult(record);
  }

  // TODO: update() allows doctor to change all fields equally — restrict which fields DOCTOR vs ADMIN can modify (e.g. prescription edits may require admin)
  async update(id: string, dto: UpdateMedicalRecordDto, actor: AuthUser): Promise<MedicalRecord> {
    const record = await this.getRecord(id);
    await this.assertCanEdit(record.appointmentId, actor);
    if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');
    const updated = await this.prisma.medicalRecord.update({
      where: { id },
      data: {
        ...(dto.anamnesis !== undefined ? { anamnesis: dto.anamnesis } : {}),
        ...(dto.diagnosis !== undefined ? { diagnosis: dto.diagnosis } : {}),
        ...(dto.prescription !== undefined ? { prescription: dto.prescription } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return this.toResult(updated);
  }

  // TODO: remove() has no actor parameter — no service-level authorization check; any module calling this bypasses controller guards
  // TODO: hard-delete of medical records is irreversible — implement soft-delete or mark-void for audit compliance
  async remove(id: string): Promise<void> {
    await this.getRecord(id);
    await this.prisma.medicalRecord.delete({ where: { id } });
  }

  private async getRecord(id: string): Promise<NonNullable<Awaited<ReturnType<PrismaService['medicalRecord']['findUnique']>>>> {
    const record = await this.prisma.medicalRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Medical record ${id} not found`);
    return record;
  }

  private async assertCanEdit(appointmentId: string, actor: AuthUser): Promise<void> {
    const [doctorProfile, appointment] = await Promise.all([
      this.prisma.doctorProfile.findUnique({ where: { userId: actor.id } }),
      this.prisma.appointment.findUnique({ where: { id: appointmentId }, select: { doctorId: true } }),
    ]);
    if (!doctorProfile) throw new ForbiddenException('Doctor has no profile');
    if (!appointment) throw new NotFoundException(`Appointment ${appointmentId} not found`);
    if (appointment.doctorId !== doctorProfile.id) {
      throw new ForbiddenException('Only the appointment doctor can edit this medical record');
    }
  }

  private assertCanView(record: { patientId: string; doctorId: string }, actor: AuthUser): void {
    if (actor.role === Role.ADMIN || actor.role === Role.EMPLOYEE) return;
    if (actor.role === Role.PATIENT) {
      if (record.patientId !== actor.id) throw new ForbiddenException('You can only view your own medical records');
      return;
    }
  }

  private toResult(record: {
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    anamnesis: string | null;
    diagnosis: string | null;
    prescription: string | null;
    notes: string | null;
    createdAt: Date;
  }): MedicalRecord {
    return {
      id: record.id,
      appointmentId: record.appointmentId,
      patientId: record.patientId,
      doctorId: record.doctorId,
      anamnesis: record.anamnesis ?? '',
      diagnosis: record.diagnosis ?? '',
      prescription: record.prescription ?? undefined,
      notes: record.notes ?? undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

export { CreateMedicalRecordDto, UpdateMedicalRecordDto } from './dto/medical-record.dto';