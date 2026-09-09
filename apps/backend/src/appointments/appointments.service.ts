import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { AuthUser } from '../common/auth-user';

export { AppointmentStatus };

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  specialtyId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.SCHEDULED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

const BLOCKING_STATUSES = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS];

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, actor: AuthUser): Promise<Appointment> {
    if (actor.role === Role.PATIENT && dto.patientId !== actor.id) {
      throw new ForbiddenException('Patients can only schedule appointments for themselves');
    }
    const [patient, doctor, specialty] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.patientId }, select: { id: true } }),
      this.prisma.doctorProfile.findUnique({ where: { id: dto.doctorId }, select: { id: true } }),
      this.prisma.specialty.findUnique({ where: { id: dto.specialtyId }, select: { id: true } }),
    ]);
    if (!patient) throw new NotFoundException(`Patient ${dto.patientId} not found`);
    if (!doctor) throw new NotFoundException(`Doctor ${dto.doctorId} not found`);
    if (!specialty) throw new NotFoundException(`Specialty ${dto.specialtyId} not found`);

    const scheduledDate = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      throw new BadRequestException('Appointment must be scheduled for a future date');
    }
    const duration = dto.durationMinutes ?? 30;

    const doctorConflict = await this.findOverlap({ doctorId: dto.doctorId }, scheduledDate, duration);
    if (doctorConflict) throw new ConflictException('Doctor already has an appointment at this time');

    const patientConflict = await this.findOverlap({ patientId: dto.patientId }, scheduledDate, duration);
    if (patientConflict) throw new ConflictException('Patient already has an appointment at this time');

    return this.prisma.appointment
      .create({
        data: {
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          specialtyId: dto.specialtyId,
          scheduledAt: scheduledDate,
          durationMinutes: duration,
          status: AppointmentStatus.SCHEDULED,
          notes: dto.notes,
        },
      })
      .then(this.toResult);
  }

  async findAll(filters?: { patientId?: string; doctorId?: string; status?: AppointmentStatus }, actor?: AuthUser): Promise<Appointment[]> {
    const where: { patientId?: string; doctorId?: string; status?: AppointmentStatus } = {
      patientId: filters?.patientId || undefined,
      doctorId: filters?.doctorId || undefined,
      status: filters?.status,
    };
    if (actor) {
      if (actor.role === Role.PATIENT) where.patientId = actor.id;
      if (actor.role === Role.DOCTOR) {
        const profile = await this.getDoctorProfile(actor);
        where.doctorId = profile.id;
      }
    }
    const appointments = await this.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    });
    return appointments.map(this.toResult);
  }

  async findOne(id: string, actor?: AuthUser): Promise<Appointment> {
    const apt = await this.getAppointment(id);
    this.assertCanView(apt, actor);
    return this.toResult(apt);
  }

  async updateStatus(id: string, status: AppointmentStatus, actor?: AuthUser): Promise<Appointment> {
    const apt = await this.getAppointment(id);
    this.assertCanManage(apt, actor);
    const allowed = VALID_TRANSITIONS[apt.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${apt.status} to ${status}`);
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status },
    });
    return this.toResult(updated);
  }

  async update(id: string, dto: UpdateAppointmentDto, actor?: AuthUser): Promise<Appointment> {
    const apt = await this.getAppointment(id);
    this.assertCanManage(apt, actor);
    if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');

    let scheduledAt: Date | undefined;
    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        throw new BadRequestException('Appointment must be scheduled for a future date');
      }
      if (await this.findOverlap({ doctorId: apt.doctorId }, scheduledAt, apt.durationMinutes, id)) {
        throw new ConflictException('Doctor already has an appointment at this time');
      }
      if (await this.findOverlap({ patientId: apt.patientId }, scheduledAt, apt.durationMinutes, id)) {
        throw new ConflictException('Patient already has an appointment at this time');
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(scheduledAt ? { scheduledAt } : {}),
      },
    });
    return this.toResult(updated);
  }

  async cancel(id: string, actor?: AuthUser): Promise<Appointment> {
    const apt = await this.getAppointment(id);
    const isStaff = actor?.role === Role.ADMIN || actor?.role === Role.EMPLOYEE;
    const isOwner = actor?.id === apt.patientId;
    const isDoctorOwner = actor?.role === Role.DOCTOR && (await this.isDoctorOwner(apt, actor));
    if (!isStaff && !isOwner && !isDoctorOwner) {
      throw new ForbiddenException('You can only cancel your own appointments');
    }
    return this.updateStatus(id, AppointmentStatus.CANCELLED, actor);
  }

  async remove(id: string): Promise<void> {
    const apt = await this.getAppointment(id);
    if (apt.status === AppointmentStatus.IN_PROGRESS || apt.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete an appointment that is in progress or completed');
    }
    const record = await this.prisma.medicalRecord.findUnique({ where: { appointmentId: id }, select: { id: true } });
    if (record) throw new BadRequestException('Cannot delete an appointment with a linked medical record');
    await this.prisma.appointment.delete({ where: { id } });
  }

  private async getAppointment(id: string): Promise<NonNullable<Awaited<ReturnType<PrismaService['appointment']['findUnique']>>>> {
    const apt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!apt) throw new NotFoundException(`Appointment ${id} not found`);
    return apt;
  }

  private async getDoctorProfile(actor: AuthUser): Promise<{ id: string }> {
    const profile = await this.prisma.doctorProfile.findUnique({ where: { userId: actor.id }, select: { id: true } });
    if (!profile) throw new ForbiddenException('Doctor has no profile');
    return profile;
  }

  private async isDoctorOwner(apt: { doctorId: string }, actor: AuthUser): Promise<boolean> {
    try {
      const profile = await this.getDoctorProfile(actor);
      return profile.id === apt.doctorId;
    } catch {
      return false;
    }
  }

  private assertCanView(apt: { patientId: string; doctorId: string }, actor?: AuthUser): void {
    if (!actor) return;
    if (actor.role === Role.ADMIN || actor.role === Role.EMPLOYEE) return;
    if (actor.role === Role.PATIENT) {
      if (apt.patientId !== actor.id) throw new ForbiddenException('You cannot view this appointment');
      return;
    }
  }

  private async assertCanManage(apt: { patientId: string; doctorId: string }, actor?: AuthUser): Promise<void> {
    if (!actor) return;
    if (actor.role === Role.ADMIN || actor.role === Role.EMPLOYEE) return;
    if (actor.role === Role.PATIENT) {
      if (apt.patientId !== actor.id) throw new ForbiddenException('You can only manage your own appointments');
      return;
    }
    if (actor.role === Role.DOCTOR) {
      const isOwner = await this.isDoctorOwner(apt, actor);
      if (!isOwner) throw new ForbiddenException('You can only manage your own appointments');
    }
  }

  private async findOverlap(
    where: { doctorId?: string; patientId?: string },
    scheduledAt: Date,
    durationMinutes: number,
    excludeId?: string,
  ): Promise<boolean> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        ...where,
        status: { in: BLOCKING_STATUSES },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { scheduledAt: true, durationMinutes: true },
    });
    const startA = scheduledAt.getTime();
    const endA = startA + durationMinutes * 60_000;
    return rows.some(r => {
      const startB = new Date(r.scheduledAt).getTime();
      const endB = startB + r.durationMinutes * 60_000;
      return startA < endB && startB < endA;
    });
  }

  private toResult(apt: {
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
  }): Appointment {
    return {
      id: apt.id,
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      specialtyId: apt.specialtyId,
      scheduledAt: apt.scheduledAt.toISOString(),
      durationMinutes: apt.durationMinutes,
      status: apt.status,
      notes: apt.notes ?? undefined,
      createdAt: apt.createdAt.toISOString(),
      updatedAt: apt.updatedAt.toISOString(),
    };
  }
}

export { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';