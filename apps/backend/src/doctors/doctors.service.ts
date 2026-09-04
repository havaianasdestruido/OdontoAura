import { Injectable, NotFoundException } from '@nestjs/common';

export interface CreateDoctorDto {
  userId: string;
  licenseNumber: string;
  bio?: string;
  specialtyIds: string[];
}

export interface UpdateDoctorDto {
  bio?: string;
  specialtyIds?: string[];
}

export interface DoctorProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  bio?: string;
  specialties: { id: string; name: string }[];
  availability: AvailabilitySlot[];
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

@Injectable()
export class DoctorsService {
  private readonly doctors = new Map<string, DoctorProfile & { createdAt: Date }>();
  private readonly availability = new Map<string, AvailabilitySlot[]>();
  private idCounter = 1;
  private slotCounter = 1;

  create(dto: CreateDoctorDto): DoctorProfile {
    const id = `doc_${this.idCounter++}`;
    const doctor = {
      id,
      userId: dto.userId,
      licenseNumber: dto.licenseNumber,
      bio: dto.bio,
      specialties: dto.specialtyIds.map(id => ({ id, name: `Specialty ${id}` })),
      availability: [],
      createdAt: new Date(),
    };
    this.doctors.set(id, doctor);
    this.availability.set(id, []);
    return this.toResult(doctor);
  }

  findAll(): DoctorProfile[] {
    return Array.from(this.doctors.values()).map(d => this.toResult(d));
  }

  findOne(id: string): DoctorProfile {
    const doctor = this.doctors.get(id);
    if (!doctor) throw new NotFoundException(`Doctor ${id} not found`);
    return this.toResult(doctor);
  }

  findByUser(userId: string): DoctorProfile | undefined {
    const doctor = Array.from(this.doctors.values()).find(d => d.userId === userId);
    return doctor ? this.toResult(doctor) : undefined;
  }

  update(id: string, dto: UpdateDoctorDto): DoctorProfile {
    const doctor = this.doctors.get(id);
    if (!doctor) throw new NotFoundException(`Doctor ${id} not found`);
    if (dto.bio !== undefined) doctor.bio = dto.bio;
    if (dto.specialtyIds) doctor.specialties = dto.specialtyIds.map(id => ({ id, name: `Specialty ${id}` }));
    return this.toResult(doctor);
  }

  addAvailability(doctorId: string, slot: Omit<AvailabilitySlot, 'id'>): AvailabilitySlot {
    if (!this.doctors.has(doctorId)) throw new NotFoundException(`Doctor ${doctorId} not found`);
    const newSlot: AvailabilitySlot = { ...slot, id: `slot_${this.slotCounter++}` };
    const slots = this.availability.get(doctorId) || [];
    slots.push(newSlot);
    this.availability.set(doctorId, slots);
    return newSlot;
  }

  getAvailability(doctorId: string): AvailabilitySlot[] {
    if (!this.doctors.has(doctorId)) throw new NotFoundException(`Doctor ${doctorId} not found`);
    return this.availability.get(doctorId) || [];
  }

  remove(id: string): void {
    if (!this.doctors.has(id)) throw new NotFoundException(`Doctor ${id} not found`);
    this.doctors.delete(id);
    this.availability.delete(id);
  }

  private toResult(doctor: any): DoctorProfile {
    return { ...doctor, createdAt: doctor.createdAt.toISOString(), availability: this.availability.get(doctor.id) || [] };
  }
}
