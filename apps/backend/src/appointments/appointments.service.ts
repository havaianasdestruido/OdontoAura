import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

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
  private readonly appointments = new Map<string, Appointment>();
  private idCounter = 1;

  create(dto: CreateAppointmentDto): Appointment {
    const scheduledDate = new Date(dto.scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new BadRequestException('Appointment must be scheduled for a future date');
    }

    const conflict = Array.from(this.appointments.values()).find(
      a => a.doctorId === dto.doctorId &&
        a.status !== AppointmentStatus.CANCELLED &&
        new Date(a.scheduledAt).getTime() === scheduledDate.getTime()
    );
    if (conflict) throw new ConflictException('Doctor already has an appointment at this time');

    const now = new Date().toISOString();
    const appointment: Appointment = {
      id: `apt_${this.idCounter++}`,
      patientId: dto.patientId,
      doctorId: dto.doctorId,
      specialtyId: dto.specialtyId,
      scheduledAt: dto.scheduledAt,
      durationMinutes: dto.durationMinutes || 30,
      status: AppointmentStatus.SCHEDULED,
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.appointments.set(appointment.id, appointment);
    return appointment;
  }

  findAll(filters?: { patientId?: string; doctorId?: string; status?: AppointmentStatus }): Appointment[] {
    let results = Array.from(this.appointments.values());
    if (filters?.patientId) results = results.filter(a => a.patientId === filters.patientId);
    if (filters?.doctorId) results = results.filter(a => a.doctorId === filters.doctorId);
    if (filters?.status) results = results.filter(a => a.status === filters.status);
    return results.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  findOne(id: string): Appointment {
    const apt = this.appointments.get(id);
    if (!apt) throw new NotFoundException(`Appointment ${id} not found`);
    return apt;
  }

  updateStatus(id: string, status: AppointmentStatus): Appointment {
    const apt = this.findOne(id);
    const allowed = VALID_TRANSITIONS[apt.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${apt.status} to ${status}`);
    }
    apt.status = status;
    apt.updatedAt = new Date().toISOString();
    return apt;
  }

  update(id: string, dto: UpdateAppointmentDto): Appointment {
    const apt = this.findOne(id);
    if (dto.status) return this.updateStatus(id, dto.status);
    if (dto.notes !== undefined) apt.notes = dto.notes;
    if (dto.scheduledAt) apt.scheduledAt = dto.scheduledAt;
    apt.updatedAt = new Date().toISOString();
    return apt;
  }

  cancel(id: string): Appointment {
    return this.updateStatus(id, AppointmentStatus.CANCELLED);
  }

  remove(id: string): void {
    const apt = this.findOne(id);
    if (apt.status === AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete an in-progress appointment');
    }
    this.appointments.delete(id);
  }
}
