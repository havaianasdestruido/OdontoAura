import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const password = dto.password ?? (await bcrypt.hash(Math.random().toString(36).slice(2), 10));
    return this.prisma.user
      .create({
        data: {
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          role: dto.role,
          password,
        },
      })
      .then(this.toResult);
  }

  async findAll(role?: Role): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    return users.map(this.toResult);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.toResult(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`User ${id} not found`);
    if (Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.toResult(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    await this.prisma.user.delete({ where: { id } });
  }

  private toResult(user: { id: string; email: string; name: string; phone: string | null; role: Role; createdAt: Date }): User {
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