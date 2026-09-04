import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

export interface Specialty {
  id: string;
  name: string;
  description?: string;
}

@Injectable()
export class SpecialtiesService {
  private readonly specialties = new Map<string, Specialty>();
  private idCounter = 1;

  create(name: string, description?: string): Specialty {
    const existing = Array.from(this.specialties.values()).find(s => s.name === name);
    if (existing) throw new ConflictException(`Specialty "${name}" already exists`);
    const id = `spe_${this.idCounter++}`;
    const specialty = { id, name, description };
    this.specialties.set(id, specialty);
    return specialty;
  }

  findAll(): Specialty[] {
    return Array.from(this.specialties.values());
  }

  findOne(id: string): Specialty {
    const spec = this.specialties.get(id);
    if (!spec) throw new NotFoundException(`Specialty ${id} not found`);
    return spec;
  }

  remove(id: string): void {
    if (!this.specialties.has(id)) throw new NotFoundException(`Specialty ${id} not found`);
    this.specialties.delete(id);
  }
}
