import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSpecialtyDto } from './dto/specialty.dto';

export interface Specialty {
  id: string;
  name: string;
  description?: string;
}

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: trim and normalize name before uniqueness check — casing/whitespace creates silent duplicates
  async create(dto: CreateSpecialtyDto): Promise<Specialty> {
    const existing = await this.prisma.specialty.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Specialty "${dto.name}" already exists`);
    const spec = await this.prisma.specialty.create({ data: { name: dto.name, description: dto.description } });
    return this.toResult(spec);
  }

  async findAll(): Promise<Specialty[]> {
    // TODO: add pagination (take/skip) to prevent unbounded result sets
    const specs = await this.prisma.specialty.findMany({ orderBy: { name: 'asc' } });
    return specs.map(this.toResult);
  }

  // TODO: add update() method — specialty name/description immutable after creation
  async findOne(id: string): Promise<Specialty> {
    const spec = await this.prisma.specialty.findUnique({ where: { id } });
    if (!spec) throw new NotFoundException(`Specialty ${id} not found`);
    return this.toResult(spec);
  }

  async remove(id: string): Promise<void> {
    const spec = await this.prisma.specialty.findUnique({ where: { id } });
    if (!spec) throw new NotFoundException(`Specialty ${id} not found`);
    try {
      await this.prisma.specialty.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException(`Specialty ${id} is referenced by doctors or appointments`);
      }
      throw e;
    }
  }

  private toResult(spec: { id: string; name: string; description: string | null }): Specialty {
    return {
      id: spec.id,
      name: spec.name,
      description: spec.description ?? undefined,
    };
  }
}

export { CreateSpecialtyDto } from './dto/specialty.dto';