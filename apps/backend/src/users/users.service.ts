import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  createdAt: string;
}

export function normalizePhone(value?: string): string | undefined {
  if (!value) return undefined;
  const stripped = value
    .trim()
    .replace(/[\s().-]/g, '');
  if (!stripped) return undefined;
  return stripped.startsWith('+') ? stripped : `+${stripped}`;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const password = dto.password ?? (await bcrypt.hash(Math.random().toString(36).slice(2), 10));
    try {
      return this.prisma.user
        .create({
          data: {
            email,
            name: dto.name,
            phone: normalizePhone(dto.phone),
            role: dto.role,
            password,
          },
        })
        .then(this.toResult);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  async findAll(role?: Role, actor?: { role: Role }, skip = 0, take = 500): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { createdAt: 'asc' },
      skip,
      take,
      select:
        actor?.role === Role.ADMIN
          ? undefined
          : { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return users.map(this.toResult);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.toResult(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');
    const data = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.email !== undefined ? { email: dto.email.toLowerCase() } : {}),
      ...(dto.phone !== undefined ? { phone: normalizePhone(dto.phone) } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
    };
    try {
      const user = await this.prisma.user.update({ where: { id }, data });
      return this.toResult(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(`User ${id} not found`);
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(`User ${id} not found`);
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('User has related appointments, records or plans and cannot be deleted');
      }
      throw e;
    }
  }

  private toResult(user: { id: string; email: string; name: string; phone?: string | null; role: Role; createdAt: Date }): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone ?? undefined,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

export { CreateUserDto, UpdateUserDto } from './dto/user.dto';