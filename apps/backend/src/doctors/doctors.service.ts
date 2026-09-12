import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto, UpdateDoctorDto, CreateAvailabilityDto } from './dto/doctor.dto';
import { AuthUser } from '../common/auth-user';

export interface DoctorProfile {
  id: string;
  userId?: string;
  licenseNumber?: string;
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

const SLOT_INTERVAL_MINUTES = 5;

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDoctorDto): Promise<DoctorProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);
    if (user.role !== Role.DOCTOR) {
      throw new BadRequestException('User must have role DOCTOR to have a doctor profile');
    }

    const specialty = await this.prisma.specialty.findUnique({ where: { id: dto.specialtyId } });
    if (!specialty) throw new NotFoundException(`Specialty ${dto.specialtyId} not found`);

    const licenseNumber = dto.licenseNumber.trim().toUpperCase();
    const existingLicense = await this.prisma.doctorProfile.findUnique({ where: { licenseNumber } });
    if (existingLicense) throw new ConflictException(`License ${licenseNumber} is already in use`);

    let doctor;
    try {
      doctor = await this.prisma.doctorProfile.create({
        data: {
          userId: dto.userId,
          licenseNumber,
          bio: dto.bio,
          specialtyId: dto.specialtyId,
        },
        include: { specialty: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Doctor profile already exists for user ${dto.userId} or license ${licenseNumber}`);
      }
      throw e;
    }
    return this.toResult(doctor, []);
  }

  async findAll(actor?: AuthUser, skip = 0, take = 500): Promise<DoctorProfile[]> {
    const doctors = await this.prisma.doctorProfile.findMany({
      include: { specialty: true, availabilitySlots: true },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });
    const results = doctors.map(d => this.toResult(d, d.availabilitySlots));
    return this.sanitizeForRole(results, actor);
  }

  async findOne(id: string, actor?: AuthUser): Promise<DoctorProfile> {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: { specialty: true, availabilitySlots: true },
    });
    if (!doctor) throw new NotFoundException(`Doctor ${id} not found`);
    const [result] = this.sanitizeForRole([this.toResult(doctor, doctor.availabilitySlots)], actor);
    return result;
  }

  async findByUser(userId: string): Promise<DoctorProfile | undefined> {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { userId },
      include: { specialty: true, availabilitySlots: true },
    });
    return doctor ? this.toResult(doctor, doctor.availabilitySlots) : undefined;
  }

  async update(id: string, dto: UpdateDoctorDto, actor: AuthUser): Promise<DoctorProfile> {
    const existing = await this.prisma.doctorProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Doctor ${id} not found`);
    if (actor.role === Role.DOCTOR && existing.userId !== actor.id) {
      throw new ForbiddenException('A doctor can only update their own profile');
    }
    if (dto.specialtyId) {
      const specialty = await this.prisma.specialty.findUnique({ where: { id: dto.specialtyId } });
      if (!specialty) throw new NotFoundException(`Specialty ${dto.specialtyId} not found`);
    }

    const data = {
      ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
      ...(dto.specialtyId ? { specialtyId: dto.specialtyId } : {}),
    };
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    const doctor = await this.prisma.doctorProfile.update({
      where: { id },
      data,
      include: { specialty: true, availabilitySlots: true },
    });
    return this.toResult(doctor, doctor.availabilitySlots);
  }

  async addAvailability(doctorId: string, slot: CreateAvailabilityDto, actor: AuthUser): Promise<AvailabilitySlot> {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id: doctorId }, select: { userId: true } });
    if (!doctor) throw new NotFoundException(`Doctor ${doctorId} not found`);
    if (actor.role === Role.DOCTOR && doctor.userId !== actor.id) {
      throw new ForbiddenException('A doctor can only manage their own availability');
    }
    if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      throw new BadRequestException('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
    }
    if (slot.startTime >= slot.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
    this.assertSlotInterval(slot.startTime, slot.endTime);
    const overlapping = await this.prisma.availabilitySlot.findFirst({
      where: {
        doctorId,
        dayOfWeek: slot.dayOfWeek,
        startTime: { lt: slot.endTime },
        endTime: { gt: slot.startTime },
      },
    });
    if (overlapping) {
      throw new ConflictException(`Availability already exists for day ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`);
    }
    const created = await this.prisma.availabilitySlot.create({
      data: { doctorId, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime },
    });
    return this.toSlot(created);
  }

  async updateAvailability(
    doctorId: string,
    slotId: string,
    slot: CreateAvailabilityDto,
    actor: AuthUser,
  ): Promise<AvailabilitySlot> {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id: doctorId }, select: { userId: true } });
    if (!doctor) throw new NotFoundException(`Doctor ${doctorId} not found`);
    if (actor.role === Role.DOCTOR && doctor.userId !== actor.id) {
      throw new ForbiddenException('A doctor can only manage their own availability');
    }
    const existing = await this.prisma.availabilitySlot.findUnique({ where: { id: slotId } });
    if (!existing) throw new NotFoundException(`Availability slot ${slotId} not found`);
    if (existing.doctorId !== doctorId) {
      throw new BadRequestException('Availability slot does not belong to this doctor');
    }
    if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      throw new BadRequestException('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
    }
    if (slot.startTime >= slot.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
    this.assertSlotInterval(slot.startTime, slot.endTime);

    const overlapping = await this.prisma.availabilitySlot.findFirst({
      where: {
        doctorId,
        id: { not: slotId },
        dayOfWeek: slot.dayOfWeek,
        startTime: { lt: slot.endTime },
        endTime: { gt: slot.startTime },
      },
    });
    if (overlapping) {
      throw new ConflictException(`Availability already exists for day ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`);
    }

    const updated = await this.prisma.availabilitySlot.update({
      where: { id: slotId },
      data: { dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime },
    });
    return this.toSlot(updated);
  }

  async getAvailability(doctorId: string): Promise<AvailabilitySlot[]> {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id: doctorId }, select: { id: true } });
    if (!doctor) throw new NotFoundException(`Doctor ${doctorId} not found`);
    const slots = await this.prisma.availabilitySlot.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return slots.map(this.toSlot);
  }

  async removeAvailability(doctorId: string, slotId: string, actor: AuthUser): Promise<void> {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id: doctorId }, select: { userId: true } });
    if (!doctor) throw new NotFoundException(`Doctor ${doctorId} not found`);
    if (actor.role === Role.DOCTOR && doctor.userId !== actor.id) {
      throw new ForbiddenException('A doctor can only manage their own availability');
    }
    const existing = await this.prisma.availabilitySlot.findUnique({ where: { id: slotId } });
    if (!existing) throw new NotFoundException(`Availability slot ${slotId} not found`);
    if (existing.doctorId !== doctorId) {
      throw new BadRequestException('Availability slot does not belong to this doctor');
    }
    await this.prisma.availabilitySlot.delete({ where: { id: slotId } });
  }

  async remove(id: string): Promise<void> {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id } });
    if (!doctor) throw new NotFoundException(`Doctor ${id} not found`);
    try {
      await this.prisma.doctorProfile.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Doctor has appointments or medical records and cannot be deleted; deactivate the user instead');
      }
      throw e;
    }
  }

  private assertSlotInterval(startTime: string, endTime: string) {
    for (const time of [startTime, endTime]) {
      const minutes = Number(time.slice(3));
      if (minutes % SLOT_INTERVAL_MINUTES !== 0) {
        throw new BadRequestException(`Times must be on a ${SLOT_INTERVAL_MINUTES}-minute grid`);
      }
    }
  }

  private sanitizeForRole(profiles: DoctorProfile[], actor?: AuthUser): DoctorProfile[] {
    if (!actor || actor.role === Role.ADMIN || actor.role === Role.EMPLOYEE || actor.role === Role.DOCTOR) {
      return profiles;
    }
    return profiles.map((profile) => ({
      id: profile.id,
      bio: profile.bio,
      specialties: profile.specialties,
      availability: profile.availability,
      createdAt: profile.createdAt,
    }));
  }

  private toSlot(slot: { id: string; dayOfWeek: number; startTime: string; endTime: string }): AvailabilitySlot {
    return {
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
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
      availability: slots.map(this.toSlot),
      createdAt: doctor.createdAt.toISOString(),
    };
  }
}

export { CreateDoctorDto, UpdateDoctorDto, CreateAvailabilityDto } from './dto/doctor.dto';