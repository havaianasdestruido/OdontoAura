import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface CreateUserDto {
  email: string;
  name: string;
  phone?: string;
  role: Role;
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
}

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
  private readonly users = new Map<string, User>();
  private idCounter = 1;

  create(dto: CreateUserDto): User {
    const id = `usr_${this.idCounter++}`;
    const user = { ...dto, id, createdAt: new Date().toISOString() };
    this.users.set(id, user);
    return user;
  }

  findAll(role?: Role): User[] {
    const users = Array.from(this.users.values());
    if (role) return users.filter(u => u.role === role).map(this.toResult);
    return users.map(this.toResult);
  }

  findOne(id: string): User {
    const user = this.users.get(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.toResult(user);
  }

  update(id: string, dto: UpdateUserDto): User {
    const user = this.users.get(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    Object.assign(user, dto);
    return this.toResult(user);
  }

  remove(id: string): void {
    if (!this.users.has(id)) throw new NotFoundException(`User ${id} not found`);
    this.users.delete(id);
  }

  private toResult(user: User): User {
    return user;
  }
}
