import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

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
  private readonly records = new Map<string, MedicalRecord>();
  private idCounter = 1;

  create(dto: CreateMedicalRecordDto): MedicalRecord {
    const existing = Array.from(this.records.values()).find(r => r.appointmentId === dto.appointmentId);
    if (existing) throw new BadRequestException('Medical record already exists for this appointment');

    const id = `med_${this.idCounter++}`;
    const record: MedicalRecord = {
      id,
      ...dto,
      createdAt: new Date().toISOString(),
    };
    this.records.set(id, record);
    return record;
  }

  findByAppointment(appointmentId: string): MedicalRecord | undefined {
    return Array.from(this.records.values()).find(r => r.appointmentId === appointmentId);
  }

  findByPatient(patientId: string): MedicalRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findOne(id: string): MedicalRecord {
    const record = this.records.get(id);
    if (!record) throw new NotFoundException(`Medical record ${id} not found`);
    return record;
  }

  update(id: string, dto: UpdateMedicalRecordDto): MedicalRecord {
    const record = this.findOne(id);
    if (dto.anamnesis !== undefined) record.anamnesis = dto.anamnesis;
    if (dto.diagnosis !== undefined) record.diagnosis = dto.diagnosis;
    if (dto.prescription !== undefined) record.prescription = dto.prescription;
    if (dto.notes !== undefined) record.notes = dto.notes;
    return record;
  }

  remove(id: string): void {
    if (!this.records.has(id)) throw new NotFoundException(`Medical record ${id} not found`);
    this.records.delete(id);
  }
}
