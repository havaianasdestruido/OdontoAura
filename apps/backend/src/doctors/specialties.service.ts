import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Specialty {
  id: string;
  name: string;
  description?: string;
}

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, description?: string): Promise<Specialty> {
    const existing = await this.prisma.specialty.findUnique({ where: { name } });
    if (existing) throw new ConflictException(`Specialty "${name}" already exists`);
    const spec = await this.prisma.specialty.create({ data: { name, description } });
    return this.toResult(spec);
  }

  async findAll(): Promise<Specialty[]> {
    const specs = await this.prisma.specialty.findMany({ orderBy: { name: 'asc' } });
    return specs.map(this.toResult);
  }

  async findOne(id: string): Promise<Specialty> {
    const spec = await this.prisma.specialty.findUnique({ where: { id } });
    if (!spec) throw new NotFoundException(`Specialty ${id} not found`);
    return this.toResult(spec);
  }

  async remove(id: string): Promise<void> {
    const spec = await this.prisma.specialty.findUnique({ where: { id } });
    if (!spec) throw new NotFoundException(`Specialty ${id} not found`);
    await this.prisma.specialty.delete({ where: { id } });
  }

  private toResult(spec: { id: string; name: string; description: string | null }): Specialty {
    return {
      id: spec.id,
      name: spec.name,
      description: spec.description ?? undefined,
    };
  }
}