import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from './dto/specialty.dto';

export interface Specialty {
  id: string;
  name: string;
  description?: string;
}

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSpecialtyDto): Promise<Specialty> {
    const name = dto.name.trim();
    const existing = await this.prisma.specialty.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`Specialty "${name}" already exists`);
    const spec = await this.prisma.specialty.create({ data: { name, description: dto.description } });
    return this.toResult(spec);
  }

  async findAll(skip = 0, take = 500): Promise<Specialty[]> {
    const specs = await this.prisma.specialty.findMany({ orderBy: { name: 'asc' }, skip, take });
    return specs.map(this.toResult);
  }

  async findOne(id: string): Promise<Specialty> {
    const spec = await this.prisma.specialty.findUnique({ where: { id } });
    if (!spec) throw new NotFoundException(`Specialty ${id} not found`);
    return this.toResult(spec);
  }

  async update(id: string, dto: UpdateSpecialtyDto): Promise<Specialty> {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Nothing to update');
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const collision = await this.prisma.specialty.findFirst({
        where: { id: { not: id }, name: { equals: name, mode: 'insensitive' } },
      });
      if (collision) throw new ConflictException(`Specialty "${name}" already exists`);
      dto.name = name;
    }
    const spec = await this.prisma.specialty.update({ where: { id }, data: dto });
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

export { CreateSpecialtyDto, UpdateSpecialtyDto } from './dto/specialty.dto';