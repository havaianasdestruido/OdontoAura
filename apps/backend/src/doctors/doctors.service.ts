import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDoctorDto): Promise<DoctorProfile> {
    const specialty = dto.specialtyIds[0];
    const doctor = await this.prisma.doctorProfile.create({
      data: {
        userId: dto.userId,
        licenseNumber: dto.licenseNumber,
        bio: dto.bio,
        specialtyId: specialty,
      },
      include: { specialty: true },
    });
    return this.toResult(doctor, []);
  }

  async findAll(): Promise<DoctorProfile[]> {
    const doctors = await this.prisma.doctorProfile.findMany({
      include: { specialty: true, availabilitySlots: true },
      orderBy: { createdAt: 'asc' },
    });
    return doctors.map(d => this.toResult(d, d.availabilitySlots));
  }

  async findOne(id: string): Promise<DoctorProfile> {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: { specialty: true, availabilitySlots: true },
    });
    if (!doctor) throw new NotFoundException(`Doctor ${id} not found`);
    return this.toResult(doctor, doctor.availabilitySlots);
  }

  async findByUser(userId: string): Promise<DoctorProfile | undefined> {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { userId },
      include: { specialty: true, availabilitySlots: true },
    });
    return doctor ? this.toResult(doctor, doctor.availabilitySlots) : undefined;
  }

  async update(id: string, dto: UpdateDoctorDto): Promise<DoctorProfile> {
    const existing = await this.prisma.doctorProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Doctor ${id} not found`);

    const doctor = await this.prisma.doctorProfile.update({
      where: { id },
      data: {
        bio: dto.bio,
        ...(dto.specialtyIds?.length ? { specialtyId: dto.specialtyIds[0] } : {}),
      },
      include: { specialty: true, availabilitySlots: true },
    });
    return this.toResult(doctor, doctor.availabilitySlots);
  }

  async addAvailability(doctorId: string, slot: Omit<AvailabilitySlot, 'id'>): Promise<AvailabilitySlot> {
    await this.findOne(doctorId);
    const created = await this.prisma.availabilitySlot.create({
      data: { doctorId, ...slot },
    });
    return {
      id: created.id,
      dayOfWeek: created.dayOfWeek,
      startTime: created.startTime,
      endTime: created.endTime,
    };
  }

  async getAvailability(doctorId: string): Promise<AvailabilitySlot[]> {
    await this.findOne(doctorId);
    const slots = await this.prisma.availabilitySlot.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return slots.map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
  }

  async remove(id: string): Promise<void> {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id } });
    if (!doctor) throw new NotFoundException(`Doctor ${id} not found`);
    await this.prisma.doctorProfile.delete({ where: { id } });
  }

  private toResult(
    doctor: { id: string; userId: string; licenseNumber: string; bio: string | null; createdAt: Date; specialty: { id: string; name: string } },
    slots: { id: string; dayOfWeek: number; startTime: string; endTime: string }[],
  ): DoctorProfile {
    return {
      id: doctor.id,
      userId: doctor.userId,
      licenseNumber: doctor.licenseNumber,
      bio: doctor.bio ?? undefined,
      specialties: [{ id: doctor.specialty.id, name: doctor.specialty.name }],
      availability: slots.map(s => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      createdAt: doctor.createdAt.toISOString(),
    };
  }
}