import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateMedicalRecordDto {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  anamnesis: string;
  diagnosis: string;
  prescription?: string;
  notes?: string;
}

export interface UpdateMedicalRecordDto {
  anamnesis?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
}

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

  async create(dto: CreateMedicalRecordDto): Promise<MedicalRecord> {
    const existing = await this.prisma.medicalRecord.findUnique({ where: { appointmentId: dto.appointmentId } });
    if (existing) throw new BadRequestException('Medical record already exists for this appointment');

    const record = await this.prisma.medicalRecord.create({ data: dto });
    return this.toResult(record);
  }

  async findByAppointment(appointmentId: string): Promise<MedicalRecord | undefined> {
    const record = await this.prisma.medicalRecord.findUnique({ where: { appointmentId } });
    return record ? this.toResult(record) : undefined;
  }

  async findByPatient(patientId: string): Promise<MedicalRecord[]> {
    const records = await this.prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.toResult);
  }

  async findOne(id: string): Promise<MedicalRecord> {
    const record = await this.prisma.medicalRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Medical record ${id} not found`);
    return this.toResult(record);
  }

  async update(id: string, dto: UpdateMedicalRecordDto): Promise<MedicalRecord> {
    await this.findOne(id);
    const record = await this.prisma.medicalRecord.update({ where: { id }, data: dto });
    return this.toResult(record);
  }

  async remove(id: string): Promise<void> {
    const record = await this.prisma.medicalRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Medical record ${id} not found`);
    await this.prisma.medicalRecord.delete({ where: { id } });
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