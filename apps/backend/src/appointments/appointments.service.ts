import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export { AppointmentStatus };

export interface CreateAppointmentDto {
  patientId: string;
  doctorId: string;
  specialtyId: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
}

export interface UpdateAppointmentDto {
  status?: AppointmentStatus;
  notes?: string;
  scheduledAt?: string;
}

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

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    const scheduledDate = new Date(dto.scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new BadRequestException('Appointment must be scheduled for a future date');
    }

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        status: { not: AppointmentStatus.CANCELLED },
        scheduledAt: scheduledDate,
      },
      select: { id: true },
    });
    if (conflict) throw new ConflictException('Doctor already has an appointment at this time');

    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        specialtyId: dto.specialtyId,
        scheduledAt: scheduledDate,
        durationMinutes: dto.durationMinutes || 30,
        status: AppointmentStatus.SCHEDULED,
        notes: dto.notes,
      },
    }).then(this.toResult);
  }

  async findAll(filters?: { patientId?: string; doctorId?: string; status?: AppointmentStatus }): Promise<Appointment[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId: filters?.patientId,
        doctorId: filters?.doctorId,
        status: filters?.status,
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return appointments.map(this.toResult);
  }

  async findOne(id: string): Promise<Appointment> {
    const apt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!apt) throw new NotFoundException(`Appointment ${id} not found`);
    return this.toResult(apt);
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const apt = await this.findOne(id);
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

  async update(id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    await this.findOne(id);
    if (dto.status) return this.updateStatus(id, dto.status);
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
      },
    });
    return this.toResult(updated);
  }

  cancel(id: string): Promise<Appointment> {
    return this.updateStatus(id, AppointmentStatus.CANCELLED);
  }

  async remove(id: string): Promise<void> {
    const apt = await this.findOne(id);
    if (apt.status === AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete an in-progress appointment');
    }
    await this.prisma.appointment.delete({ where: { id } });
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